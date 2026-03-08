"""
Circuit topology analyzer using Union-Find.

Takes the components list from circuit_json.hardware.components and builds
a net graph that correctly models breadboard internal connections:
  - Top half columns: rows a-e in the same column number share a net
  - Bottom half columns: rows f-j in the same column number share a net
  - Power rails: all holes in the same rail row (w/x/y/z) share a net
  - Center gap: a-e and f-j at same column are NOT connected
  - Arduino pins are individual nodes

For each LED component, returns:
  - which Arduino digital/PWM pin drives it (if any)
  - whether there is a GND path on the other side
  - whether a series resistor is present between pin and LED anode
"""

from typing import TypedDict, Optional

# ── Breadboard row groupings ──────────────────────────────────────────────────
TOP_MAIN_ROWS    = {'a', 'b', 'c', 'd', 'e'}
BOTTOM_MAIN_ROWS = {'f', 'g', 'h', 'i', 'j'}
# Positive rails: w (top), y (bottom) — negative rails: x (top), z (bottom)
GND_RAIL_ROWS    = {'x', 'z'}
POS_RAIL_ROWS    = {'w', 'y'}
POWER_ROWS       = GND_RAIL_ROWS | POS_RAIL_ROWS

# Arduino GND / power pin names
ARDUINO_GND_PINS = {'GND', 'GND.1', 'GND.2'}
ARDUINO_5V_PINS  = {'5V', '3.3V', 'IOREF', 'VIN'}


# ── Union-Find ────────────────────────────────────────────────────────────────

class UnionFind:
    def __init__(self):
        self._parent: dict[str, str] = {}

    def _ensure(self, key: str):
        if key not in self._parent:
            self._parent[key] = key

    def find(self, key: str) -> str:
        self._ensure(key)
        root = key
        while self._parent[root] != root:
            root = self._parent[root]
        # Path compression
        cur = key
        while self._parent[cur] != root:
            nxt = self._parent[cur]
            self._parent[cur] = root
            cur = nxt
        return root

    def union(self, a: str, b: str):
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self._parent[rb] = ra

    def same(self, a: str, b: str) -> bool:
        return self.find(a) == self.find(b)


# ── Node key helpers ──────────────────────────────────────────────────────────

def _endpoint_key(endpoint: dict) -> str:
    """Convert a component endpoint dict to a unique string node key."""
    if 'pin' in endpoint:
        return f"pin:{endpoint['pin']}"
    row = endpoint.get('row', '')
    col = endpoint.get('col', 0)
    return f"hole:{row}:{col}"


def _breadboard_net_key(row: str, col: int) -> str:
    """
    Return the canonical internal net key for a breadboard hole.
    Holes in the same column + same half are internally connected.
    Power rails are connected across the whole rail.
    """
    if row in TOP_MAIN_ROWS:
        return f"net:top:{col}"
    if row in BOTTOM_MAIN_ROWS:
        return f"net:bot:{col}"
    if row in POWER_ROWS:
        return f"net:rail:{row}"
    # Fallback (shouldn't happen with valid data)
    return f"hole:{row}:{col}"


# ── LED analysis result ───────────────────────────────────────────────────────

class LedAnalysis(TypedDict):
    connected_pin: Optional[str]   # e.g. "9", "13", None
    has_gnd_path: bool
    has_series_resistor: bool
    reversed: bool                 # True if anode/cathode are swapped


# ── Main analyzer ─────────────────────────────────────────────────────────────

def analyze_circuit(components: list[dict]) -> dict[str, LedAnalysis]:
    """
    Returns a dict mapping each LED component id to its LedAnalysis.
    """
    uf = UnionFind()

    # Step 1: Apply breadboard internal connections.
    # For every hole endpoint in the component list, union it with its net key.
    for comp in components:
        for ep_key in ('start', 'end'):
            ep = comp.get(ep_key, {})
            if 'row' in ep and 'col' in ep:
                hole_key = _endpoint_key(ep)
                net_key  = _breadboard_net_key(ep['row'], int(ep['col']))
                uf.union(hole_key, net_key)

    # Step 2: For each component, union its two endpoints (the wire/resistor/LED connects them).
    # Switches only connect when closed; an open switch breaks the circuit path.
    for comp in components:
        if comp.get('type') == 'switch' and not comp.get('closed', False):
            continue
        start_ep = comp.get('start', {})
        end_ep   = comp.get('end', {})
        if not start_ep or not end_ep:
            continue
        sk = _endpoint_key(start_ep)
        ek = _endpoint_key(end_ep)
        uf.union(sk, ek)

    # Step 3: Union Arduino GND pins together so we can check any of them.
    gnd_anchor = 'pin:GND'
    for g in ARDUINO_GND_PINS:
        uf.union(gnd_anchor, f'pin:{g}')

    # Also union GND rails with Arduino GND pins (if a wire connects them).
    # The wire connections above already handled this through the union in step 2,
    # but we also pre-union rail nets with pin:GND so that any rail connected
    # directly to the GND anchor is reachable even without an explicit wire.
    # (Users must place a wire for this to actually work — this is done in step 2.)

    # Step 4: Identify which nets contain Arduino output pins and GND.
    # Collect all Arduino pin net roots.
    arduino_pin_nets: dict[str, str] = {}  # pin_name -> root net key
    gnd_root = uf.find(gnd_anchor)

    for comp in components:
        for ep_key in ('start', 'end'):
            ep = comp.get(ep_key, {})
            if 'pin' in ep:
                pin = ep['pin']
                arduino_pin_nets[pin] = uf.find(f'pin:{pin}')

    # Step 5: For each LED, determine its anode/cathode net and check connectivity.
    results: dict[str, LedAnalysis] = {}

    leds = [c for c in components if c.get('type') == 'led']

    for led in leds:
        start_ep = led.get('start', {})
        end_ep   = led.get('end', {})
        sk = _endpoint_key(start_ep)
        ek = _endpoint_key(end_ep)
        start_root = uf.find(sk)
        end_root   = uf.find(ek)

        # Convention: start = anode (+), end = cathode (−)
        # Check if an Arduino output pin is on the anode (start) side
        connected_pin: Optional[str] = None
        pin_on_cathode: Optional[str] = None  # pin wired to wrong end
        for pin, pin_root in arduino_pin_nets.items():
            if pin in ARDUINO_GND_PINS or pin in ARDUINO_5V_PINS:
                continue
            if pin_root == start_root:
                connected_pin = pin
                break
            if pin_root == end_root:
                pin_on_cathode = pin  # reversed

        # Check GND on cathode (end) side only — correct polarity
        has_gnd_correct = (end_root == gnd_root)
        # GND on anode side = also reversed
        has_gnd_reversed = (start_root == gnd_root)

        # Determine if polarity is reversed
        is_reversed = (pin_on_cathode is not None and has_gnd_reversed) or \
                      (connected_pin is None and pin_on_cathode is not None)

        # If reversed, still report which pin so we can show the warning
        effective_pin = connected_pin or (pin_on_cathode if is_reversed else None)

        # Check for series resistor between the Arduino pin and the LED anode
        has_resistor = False
        if effective_pin:
            pin_root_eff = arduino_pin_nets[effective_pin]
            for comp in components:
                if comp.get('type') != 'resistor':
                    continue
                r_sk = uf.find(_endpoint_key(comp['start']))
                r_ek = uf.find(_endpoint_key(comp['end']))
                if (r_sk == pin_root_eff and (r_ek == start_root or r_ek == end_root)) or \
                   (r_ek == pin_root_eff and (r_sk == start_root or r_sk == end_root)):
                    has_resistor = True
                    break

        results[led['id']] = LedAnalysis(
            connected_pin=effective_pin,
            has_gnd_path=has_gnd_correct or has_gnd_reversed,
            has_series_resistor=has_resistor,
            reversed=is_reversed,
        )

    return results
