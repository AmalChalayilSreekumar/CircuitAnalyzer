"""
Arduino code static parser.

Extracts pin behaviors from Arduino C code using regex without executing it.
Handles: pinMode, digitalWrite, analogWrite, delay, delayMicroseconds.
"""

import re
from typing import TypedDict


class PinEvent(TypedDict):
    state: str        # "HIGH" | "LOW" | "PWM"
    duration_ms: int  # milliseconds this state lasts (0 = unknown/infinite)
    brightness: float # 0.0–1.0 (only meaningful for PWM)


class ParseResult(TypedDict):
    parse_errors: list[str]
    output_pins: list[str]   # pins set as OUTPUT
    pin_timelines: dict[str, list[PinEvent]]  # pin -> ordered events in loop


# ── Helpers ──────────────────────────────────────────────────────────────────

def _normalize_pin(pin_str: str, aliases: dict[str, str] | None = None) -> str:
    """Convert pin number/name to string key. '9' -> '9', 'LED_BUILTIN' -> '13'.
    Also resolves user-defined int constants (e.g. const int RED_PIN = 9;)."""
    pin_str = pin_str.strip()
    known = {"LED_BUILTIN": "13", "A0": "14", "A1": "15", "A2": "16",
             "A3": "17", "A4": "18", "A5": "19"}
    return known.get(pin_str, (aliases or {}).get(pin_str, pin_str))


def _extract_pin_aliases(code: str) -> dict[str, str]:
    """Extract simple integer constant declarations that likely represent pin numbers.

    Handles patterns like:
        const int RED_PIN = 9;
        int greenPin = 10;
        byte BLUE = 11;
    Returns a mapping of variable name -> pin number string.
    """
    aliases: dict[str, str] = {}
    pattern = re.compile(r'(?:const\s+)?(?:int|byte)\s+(\w+)\s*=\s*(\d+)\s*;')
    for m in pattern.finditer(code):
        aliases[m.group(1)] = m.group(2)
    return aliases


def _strip_comments(code: str) -> str:
    """Remove // and /* */ comments."""
    code = re.sub(r'//[^\n]*', '', code)
    code = re.sub(r'/\*.*?\*/', '', code, flags=re.DOTALL)
    return code


def _check_syntax(code: str) -> list[str]:
    """Basic syntax checks — brace balance and obvious missing semicolons."""
    errors = []
    opens = code.count('{')
    closes = code.count('}')
    if opens != closes:
        errors.append(f"Unmatched braces: {opens} '{{' vs {closes} '}}'")

    # Look for lines ending with a keyword that should have a semicolon
    # e.g. a statement line that doesn't end with ; { } or a comment
    for i, line in enumerate(code.splitlines(), 1):
        stripped = line.strip()
        if not stripped:
            continue
        # Lines that are pure function calls / assignments should end with ;
        if (re.match(r'^(digitalWrite|analogWrite|pinMode|delay|Serial\.print)\s*\(', stripped)
                and not stripped.endswith((';', '{', '}', ','))):
            errors.append(f"Line {i}: Missing semicolon — {stripped[:60]}")

    return errors


def _extract_setup(code: str) -> str:
    """Return the body of the setup() function."""
    m = re.search(r'void\s+setup\s*\(\s*\)\s*\{', code)
    if not m:
        return ''
    start = m.end()
    depth = 1
    i = start
    while i < len(code) and depth > 0:
        if code[i] == '{':
            depth += 1
        elif code[i] == '}':
            depth -= 1
        i += 1
    return code[start:i - 1]


def _extract_loop(code: str) -> str:
    """Return the body of the loop() function."""
    m = re.search(r'void\s+loop\s*\(\s*\)\s*\{', code)
    if not m:
        return ''
    start = m.end()
    depth = 1
    i = start
    while i < len(code) and depth > 0:
        if code[i] == '{':
            depth += 1
        elif code[i] == '}':
            depth -= 1
        i += 1
    return code[start:i - 1]


# ── Main parser ───────────────────────────────────────────────────────────────

def parse_arduino(code: str) -> ParseResult:
    clean = _strip_comments(code)
    errors = _check_syntax(clean)

    # Extract user-defined pin name constants (e.g. const int RED_PIN = 9;)
    # This allows RGB LED sketches that define named pin variables to be parsed correctly.
    aliases = _extract_pin_aliases(clean)

    def norm(pin_str: str) -> str:
        return _normalize_pin(pin_str, aliases)

    setup_body = _extract_setup(clean)
    loop_body = _extract_loop(clean)

    # --- setup(): collect OUTPUT pins ---
    output_pins: set[str] = set()
    for m in re.finditer(r'pinMode\s*\(\s*(\w+)\s*,\s*(OUTPUT|INPUT|INPUT_PULLUP)\s*\)', setup_body):
        pin = norm(m.group(1))
        mode = m.group(2)
        if mode == 'OUTPUT':
            output_pins.add(pin)

    # Also catch pinMode calls in loop (rare but valid)
    for m in re.finditer(r'pinMode\s*\(\s*(\w+)\s*,\s*OUTPUT\s*\)', loop_body):
        output_pins.add(norm(m.group(1)))

    # --- loop(): build per-pin event timelines ---
    # We walk the loop body line by line and track:
    #   - digitalWrite(pin, HIGH|LOW)
    #   - analogWrite(pin, value)
    #   - delay(ms) / delayMicroseconds(us)
    #
    # Strategy: collect all "statements" in order as (type, data) tuples,
    # then pair each write with the delay that follows it.

    # Tokenise loop body into ordered events
    Statement = tuple  # ('write', pin, state, brightness) | ('delay', ms)
    statements: list[Statement] = []

    # We iterate over all matches sorted by position
    patterns = [
        ('dwrite', re.compile(r'digitalWrite\s*\(\s*(\w+)\s*,\s*(HIGH|LOW)\s*\)')),
        ('awrite', re.compile(r'analogWrite\s*\(\s*(\w+)\s*,\s*(\d+)\s*\)')),
        ('delay',  re.compile(r'delay\s*\(\s*(\d+)\s*\)')),
        ('delayus', re.compile(r'delayMicroseconds\s*\(\s*(\d+)\s*\)')),
    ]

    events: list[tuple[int, str, re.Match]] = []
    for kind, pat in patterns:
        for m in pat.finditer(loop_body):
            events.append((m.start(), kind, m))
    events.sort(key=lambda t: t[0])

    for _, kind, m in events:
        if kind == 'dwrite':
            pin = norm(m.group(1))
            state = m.group(2)
            statements.append(('write', pin, state, 1.0 if state == 'HIGH' else 0.0))
        elif kind == 'awrite':
            pin = norm(m.group(1))
            value = int(m.group(2))
            brightness = round(value / 255.0, 4)
            statements.append(('write', pin, 'PWM', brightness))
        elif kind == 'delay':
            statements.append(('delay', int(m.group(1))))
        elif kind == 'delayus':
            statements.append(('delay', int(m.group(1)) // 1000))  # convert to ms

    # Now build timelines: group writes by pin, pair each with the next delay
    # We walk statements and maintain "pending writes" waiting for a delay.
    pin_timelines: dict[str, list[PinEvent]] = {}

    # pending: dict pin -> (state, brightness) awaiting a delay
    pending: dict[str, tuple[str, float]] = {}

    for stmt in statements:
        if stmt[0] == 'write':
            _, pin, state, brightness = stmt
            pending[pin] = (state, brightness)
        elif stmt[0] == 'delay':
            ms = stmt[1]
            # Assign this delay to all currently pending pins
            for pin, (state, brightness) in pending.items():
                if pin not in pin_timelines:
                    pin_timelines[pin] = []
                pin_timelines[pin].append(PinEvent(state=state, duration_ms=ms, brightness=brightness))
            pending.clear()

    # Flush remaining pending writes with duration 0 (stays on indefinitely)
    for pin, (state, brightness) in pending.items():
        if pin not in pin_timelines:
            pin_timelines[pin] = []
        pin_timelines[pin].append(PinEvent(state=state, duration_ms=0, brightness=brightness))

    # If a pin appears in timeline but not in output_pins, infer it's OUTPUT
    for pin in pin_timelines:
        output_pins.add(pin)

    return ParseResult(
        parse_errors=errors,
        output_pins=list(output_pins),
        pin_timelines=pin_timelines,
    )
