import os
import json
from google import genai
from google.genai import types
from dotenv import load_dotenv
from supabase import create_client, Client


url = "https://ccmmvivuqonrkvddcmwv.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjbW12aXZ1cW9ucmt2ZGRjbXd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4ODM2NDIsImV4cCI6MjA4ODQ1OTY0Mn0.1beYKNuxka-Vz8uGpXGt0Gx9cm_b6j7clICvtRGdQdQ"

supabase: Client = create_client(url, key)

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))



def breadboard_pos(col, row):
    PITCH = 22
    BOARD_PADDING_X = 40
    BOARD_PADDING_Y = 32

    row_y_index = {
        "w": 0,
        "x": 1,
        "a": 2.6,
        "b": 3.6,
        "c": 4.6,
        "d": 5.6,
        "e": 6.6,
        "f": 8.6,
        "g": 9.6,
        "h": 10.6,
        "i": 11.6,
        "j": 12.6,
        "y": 14.2,
        "z": 15.2
    }

    x = BOARD_PADDING_X + (col - 1) * PITCH
    y = BOARD_PADDING_Y + row_y_index[row] * PITCH

    return x, y

#sends circuit_json, arduino_code, and convo history to Gemini
def chat_with_circuit(circuit_json: dict, arduino_code: str, messages) -> str:
    # System prompt gives Gemini full context about the circuit
    system_prompt = f"""You are an expert circuit debugging assistant.
You have been given the following circuit in JSON format:

{circuit_json}

And the following Arduino code that runs on the circuit:

{arduino_code}

This represents a real breadboard circuit. Your job is to:
1. Identify what is wrong with the circuit
2. Answer any follow-up questions they have about their circuit
3. If you cannot detect a clear issue, suggest the most common possible causes
   based on the circuit type and components present (e.g. loose connections,
   wrong resistor value, incorrect pin assignment)

You MUST respond with ONLY a valid JSON object in this exact schema:
{{
  "specific_point_feedback": {{
    "description": "string describing the specific issue at this location",
    "col": 38,
    "row": "j"
  }},
  "general_feedback": "string with your full explanation and fix recommendation"
}}

Rules:
- "general_feedback" must be a plain string, not an object.
- If there is no specific point to highlight, set "specific_point_feedback" to null.
- Be specific — reference component IDs when explaining issues.
- Keep responses concise and beginner-friendly.
- Output ONLY the JSON object. No markdown, no explanation outside the JSON."""

    # Gemini requires conversations to start with a user message.
    # Drop any leading assistant messages (e.g. the frontend's initial greeting).
    user_started = False
    gemini_messages = []
    for msg in messages:
        role = "model" if msg["role"] == "assistant" else "user"
        if not user_started:
            if role != "user":
                continue
            user_started = True
        gemini_messages.append(
            types.Content(role=role, parts=[types.Part(text=msg["content"])])
        )

    # Send request to Gemini with system prompt and conversation history
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=gemini_messages,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            response_mime_type="application/json",
        )
    )

    # Convert col/row in specific_point_feedback to pixel x/y using breadboard_pos
    result = json.loads(response.text)
    feedback = result.get("specific_point_feedback", {})
    if "col" in feedback and "row" in feedback:
        x, y = breadboard_pos(feedback["col"], feedback["row"])
        feedback["x"] = x
        feedback["y"] = y
        del feedback["col"]
        del feedback["row"]

    return json.dumps(result)



arduino_code= '''
const int RED_PIN   = 9;
const int GREEN_PIN = 10;
const int BLUE_PIN  = 11;

void setup() {
  pinMode(RED_PIN, OUTPUT);
  pinMode(GREEN_PIN, OUTPUT);
  pinMode(BLUE_PIN, OUTPUT);
}

void loop() {
  analogWrite(RED_PIN, 255); analogWrite(GREEN_PIN, 255);   analogWrite(BLUE_PIN, 0);
}
'''

circuit_json = '''
{
  "hardware": {
    "components": [
      {
        "id": "c1772945627830",
        "end": {
          "col": 1,
          "row": "x"
        },
        "type": "wire",
        "start": {
          "col": 1,
          "row": "z"
        }
      },
      {
        "id": "c1772945916452",
        "end": {
          "col": 35,
          "row": "i"
        },
        "type": "wire",
        "start": {
          "pin": "D9"
        }
      },
      {
        "id": "c1772945920136",
        "end": {
          "col": 36,
          "row": "i"
        },
        "type": "wire",
        "start": {
          "pin": "D10"
        }
      },
      {
        "id": "c1772945922538",
        "end": {
          "col": 37,
          "row": "i"
        },
        "type": "wire",
        "start": {
          "pin": "D11"
        }
      },
      {
        "id": "c1772945948739",
        "end": {
          "col": 38,
          "row": "j"
        },
        "type": "wire",
        "start": {
          "pin": "GND"
        }
      },
      {
        "id": "c1772945971021",
        "end": {
          "col": 27,
          "row": "g"
        },
        "type": "resistor",
        "start": {
          "col": 35,
          "row": "h"
        }
      },
      {
        "id": "c1772945973623",
        "end": {
          "col": 29,
          "row": "g"
        },
        "type": "resistor",
        "start": {
          "col": 36,
          "row": "h"
        }
      },
      {
        "id": "c1772945976788",
        "end": {
          "col": 31,
          "row": "g"
        },
        "type": "resistor",
        "start": {
          "col": 37,
          "row": "h"
        }
      },
      {
        "b": {
          "col": 31,
          "row": "f"
        },
        "g": {
          "col": 29,
          "row": "f"
        },
        "r": {
          "col": 27,
          "row": "f"
        },
        "id": "c1772945983306",
        "type": "rgb-led",
        "common": {
          "col": 38,
          "row": "f"
        }
      }
    ]
  }
}
'''

if __name__ == "__main__":
    print(chat_with_circuit(circuit_json, arduino_code, [{"role": "user", "content": "I dont understand why these pins are in the incorrect place"}]))