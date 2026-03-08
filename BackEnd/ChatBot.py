import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


#sends circuit_json, arduino_code, and convo history to Gemini
def chat_with_circuit(circuit_json: dict, arduino_code: str, messages: list[dict]) -> str:


    # System prompt gives Gemini full context about the circuit
    system_prompt = f"""You are an expert circuit debugging assistant.
You have been given the following circuit in JSON format:

{circuit_json}

And the following Arduino code that runs on the circuit:

{arduino_code}

This represents a real breadboard circuit. Your job is to:
1. Identify what is wrong with the circuit
3. Answer any follow-up questions they have about their circuit
4. If you cannot detect a clear issue, suggest the most common possible causes 
   based on the circuit type and components present (e.g. loose connections, 
   wrong resistor value, incorrect pin assignment)

   Use and return this EXACT format, nothing else should be returned:
   {{
  "specific_point_feedback": {
    "mistake": {
      "description": "Arduino GND wire (c1772945948739) is connected to hole (38, j) while the RGB LED common pin (c1772945983306) is at hole (38, f). These points are separated by the breadboard’s center gap and are not electrically connected.",
      "x": 38,
      "y": "j"
    }
  },
  "general_feedback": {
    "The Arduino GND and the RGB LED common pin appear to be in the same column but are actually separated by the breadboard’s central gap, so they are not electrically connected. Move the end of wire c1772945948739 from (38, j) to (38, f), or add a jumper wire to bridge the gap between the two points so the LED’s common pin is properly connected to ground."
  }
}}
Be specific — reference component IDs (e.g. comp_1, comp_2) when explaining issues.
Keep responses concise and beginner-friendly."""

    gemini_messages = []
    for msg in messages:
        role = "model" if msg["role"] == "assistant" else "user"
        gemini_messages.append(
            types.Content(role=role, parts=[types.Part(text=msg["content"])])
        )

    # Send request to Gemini with system prompt and conversation history
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=gemini_messages,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt
        )
    )

    return response.text

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

print(chat_with_circuit(circuit_json, arduino_code, [{"role": "user", "content": "I dont understand why these pins are in the incorrect place"}]))