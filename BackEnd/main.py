"""
CircuitAnalyzer simulation backend.

Run with:
    uvicorn main:app --reload --port 8000

Endpoints:
    POST /api/simulate
    POST /api/create-post
"""

import io
import json
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from PIL import Image as PILImage
from dotenv import load_dotenv
from arduino_parser import parse_arduino
from circuit_analyzer import analyze_circuit
from PicToGemini import createJSON, base64Trans
from Connection import addCircuit, supabase as _supa
from ChatBot import chat_with_circuit

load_dotenv()

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

def _normalize_circuit_json(obj, parent_key: str = "") -> object:
    """
    Recursively normalize string values in circuit JSON:
    - All string values are lowercased
    - EXCEPT values whose parent key is 'pin' — those are uppercased (e.g. "D9", "GND", "5V")
    """
    if isinstance(obj, dict):
        return {k: _normalize_circuit_json(v, parent_key=k) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_normalize_circuit_json(item, parent_key=parent_key) for item in obj]
    if isinstance(obj, str):
        return obj.upper() if parent_key == "pin" else obj.lower()
    return obj


#when chat is called from frontend, it will include the following fields
class ChatRequest(BaseModel):
    circuit_json: dict
    arduino_code: str
    messages: list[dict]

class ChatResponse(BaseModel):
    response: str

@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    reply = chat_with_circuit(req.circuit_json, req.arduino_code, req.messages)
    return ChatResponse(response=reply)

@app.post("/api/create-post")
async def create_post(
    auth0_user_id: str = Form(...),
    title: str = Form(...),
    short_description: str = Form(...),
    arduino_code: str = Form(...),
    image: UploadFile = File(...),
):
    # 1. Resolve Supabase user UUID from auth0_user_id
    user_res = _supa.table("users").select("id").eq("auth0_user_id", auth0_user_id).single().execute()
    if not user_res.data:
        raise HTTPException(status_code=404, detail="User not found. Ensure you are logged in and your account is synced.")
    supabase_user_id = user_res.data["id"]

    # 2. Read image bytes → PIL → base64 → Gemini circuit JSON
    image_bytes = await image.read()
    pil_image = PILImage.open(io.BytesIO(image_bytes))
    image_base64 = base64Trans(pil_image)
    circuit_json_str = createJSON(image_base64)

    # 3. Parse JSON string (Gemini occasionally wraps it in markdown fences)
    try:
        circuit_json = json.loads(circuit_json_str)
    except json.JSONDecodeError:
        stripped = circuit_json_str.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        circuit_json = json.loads(stripped)

    circuit_json = _normalize_circuit_json(circuit_json)

    # 4. Insert post into Supabase (image not stored — image_url is empty)
    row = addCircuit(supabase_user_id, title, short_description, arduino_code, "", circuit_json)
    if not row:
        raise HTTPException(status_code=500, detail="Failed to save post to database.")
    post_id = row["id"]

    # 5. Create the private post_chats row for this post
    chat_res = _supa.table("post_chats").insert({
        "post_id": post_id,
        "owner_user_id": supabase_user_id,
    }).execute()
    chat_id = chat_res.data[0]["id"]

    # 6. Run initial AI analysis of the circuit
    initial_msg = [{"role": "user", "content": "Please analyze this circuit and identify any issues."}]
    ai_reply_str = chat_with_circuit(circuit_json, arduino_code, initial_msg)
    ai_reply = json.loads(ai_reply_str)
    general = ai_reply.get("general_feedback", {})
    ai_body = list(general.values())[0] if general else ai_reply_str

    # 7. Look up Gemini pseudo-user and store AI message in chat_messages
    gemini_res = _supa.table("users").select("id").eq("email", "gemini@system.local").single().execute()
    gemini_user_id = gemini_res.data["id"]
    _supa.table("chat_messages").insert({
        "chat_id": chat_id,
        "sender_user_id": gemini_user_id,
        "body": ai_body,
    }).execute()

    return {"id": post_id}


@app.get("/health")
def health():
    return {"status": "ok"}
