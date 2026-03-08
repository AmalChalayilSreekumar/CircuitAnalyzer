"""
CircuitAnalyzer simulation backend.

Run with:
    uvicorn main:app --reload --port 8000

Endpoint:
    POST /api/simulate
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from arduino_parser import parse_arduino
from circuit_analyzer import analyze_circuit

app = FastAPI(title="CircuitAnalyzer Simulator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)


# ── Request / Response models ─────────────────────────────────────────────────

class SimulateRequest(BaseModel):
    components: list[dict]
    arduino_code: str


class ComponentState(BaseModel):
    state: str          # "on" | "off" | "blown" | "blinking"
    on_ms: int = 0      # for blinking: how long it's on per cycle
    off_ms: int = 0     # for blinking: how long it's off per cycle
    brightness: float = 1.0  # 0.0–1.0


class RgbLedComponentState(BaseModel):
    r: ComponentState
    g: ComponentState
    b: ComponentState


class SimulateResponse(BaseModel):
    success: bool
    parse_errors: list[str]
    warnings: list[str]
    component_states: dict[str, ComponentState | RgbLedComponentState]


# ── Simulation logic ──────────────────────────────────────────────────────────

def _determine_led_state(
    led_id: str,
    led_analysis: dict,
    pin_timelines: dict,
    output_pins: list[str],
    warnings: list[str],
) -> ComponentState:
    """
    Combine circuit topology analysis with Arduino pin timeline to get LED state.
    """
    connected_pin = led_analysis.get('connected_pin')
    has_gnd       = led_analysis.get('has_gnd_path', False)
    has_resistor  = led_analysis.get('has_series_resistor', False)
    is_reversed   = led_analysis.get('reversed', False)

    if is_reversed:
        warnings.append(f"{led_id}: LED is wired backwards — anode (+) should connect to the signal pin")
        return ComponentState(state='reversed')

    if not connected_pin:
        return ComponentState(state='off')

    if not has_gnd:
        warnings.append(f"{led_id}: No GND path detected — LED will not light up")
        return ComponentState(state='off')

    # Normalize pin name: component JSON uses "D9", Arduino code uses "9"
    pin_key = connected_pin.lstrip('D') if connected_pin.startswith('D') else connected_pin
    timeline = pin_timelines.get(pin_key, pin_timelines.get(connected_pin, []))

    if not timeline:
        # Pin set OUTPUT but no digitalWrite in loop — treat as off
        return ComponentState(state='off')

    # Determine if pin is ever HIGH
    high_events  = [e for e in timeline if e['state'] == 'HIGH']
    low_events   = [e for e in timeline if e['state'] == 'LOW']
    pwm_events   = [e for e in timeline if e['state'] == 'PWM']

    if not high_events and not pwm_events:
        return ComponentState(state='off')

    # Check for blown (HIGH without resistor)
    if high_events and not has_resistor:
        warnings.append(f"{led_id}: No series resistor — LED may burn out (shown as blown)")
        return ComponentState(state='blown')

    # PWM (analogWrite)
    if pwm_events and not high_events:
        brightness = pwm_events[0]['brightness']
        if brightness == 0:
            return ComponentState(state='off')
        if not has_resistor:
            warnings.append(f"{led_id}: No series resistor — LED may burn out")
            return ComponentState(state='blown')
        return ComponentState(state='on', brightness=brightness)

    # Blinking: alternating HIGH + LOW with delays
    if high_events and low_events:
        on_ms  = sum(e['duration_ms'] for e in high_events if e['duration_ms'] > 0)
        off_ms = sum(e['duration_ms'] for e in low_events  if e['duration_ms'] > 0)
        if on_ms > 0 and off_ms > 0:
            return ComponentState(state='blinking', on_ms=on_ms, off_ms=off_ms, brightness=1.0)

    # Steady HIGH
    return ComponentState(state='on', brightness=1.0)


def _determine_rgb_led_state(
    led_id: str,
    rgb_analysis: dict,
    pin_timelines: dict,
    output_pins: list[str],
    warnings: list[str],
) -> RgbLedComponentState:
    """
    Determine per-channel (R, G, B) states for an RGB LED component.
    Each channel is analyzed independently using the same logic as a regular LED.
    """
    channel_states: dict[str, ComponentState] = {}
    channel_labels = {'r': 'Red', 'g': 'Green', 'b': 'Blue'}

    for channel in ('r', 'g', 'b'):
        analysis = rgb_analysis.get(channel, {})
        label = f"{led_id}[{channel_labels[channel]}]"
        channel_states[channel] = _determine_led_state(
            label, analysis, pin_timelines, output_pins, warnings
        )

    return RgbLedComponentState(
        r=channel_states['r'],
        g=channel_states['g'],
        b=channel_states['b'],
    )


# ── Route ─────────────────────────────────────────────────────────────────────

@app.post("/api/simulate", response_model=SimulateResponse)
def simulate(req: SimulateRequest):
    warnings: list[str] = []

    # 1. Parse Arduino code
    parsed = parse_arduino(req.arduino_code)

    # 2. Analyze circuit topology
    led_analyses = analyze_circuit(req.components)

    # 3. Determine state for each LED / RGB LED
    component_states: dict[str, ComponentState | RgbLedComponentState] = {}
    for led_id, analysis in led_analyses.items():
        if 'r' in analysis and 'g' in analysis and 'b' in analysis:
            component_states[led_id] = _determine_rgb_led_state(
                led_id,
                analysis,
                parsed['pin_timelines'],
                parsed['output_pins'],
                warnings,
            )
        else:
            component_states[led_id] = _determine_led_state(
                led_id,
                analysis,
                parsed['pin_timelines'],
                parsed['output_pins'],
                warnings,
            )

    return SimulateResponse(
        success=len(parsed['parse_errors']) == 0,
        parse_errors=parsed['parse_errors'],
        warnings=warnings,
        component_states=component_states,
    )

#when chat is called from frontend, it will include the following fields
class ChatRequest(BaseModel):
    circuit_json: dict
    arduino_code: str
    messages: list[dict]

class ChatResponse(BaseModel):
    response: str

@app.get("/health")
def health():
    return {"status": "ok"}
