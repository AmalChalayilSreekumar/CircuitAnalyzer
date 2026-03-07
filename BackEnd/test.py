import os
import sys
import base64
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def createJSON(image_path):
    with open(image_path, "rb") as f:
        image_b64 = base64.b64encode(f.read()).decode("ascii")

    image_part = types.Part.from_bytes(data=base64.b64decode(image_b64), mime_type="image/jpeg")

    JSON_TEMPLATE = """
    {
        "hardware": {
        "components": [
            {
            "id": "comp_1",
            "type": "wire",
            "start": { "row": "w", "col": 1 },
            "end": { "row": "w", "col": 10 }
            },
            {
            "id": "comp_2",
            "type": "wire",
            "start": { "row": "x", "col": 1 },
            "end": { "row": "a", "col": 5 }
            },
            {
            "id": "comp_3",
            "type": "resistor",
            "start": { "row": "a", "col": 5 },
            "end": { "row": "a", "col": 9 }
            }
        ]
        }
    }
    """

    prompt = f"""Analyze the circuit image. Respond with ONLY a JSON object using this EXACT structure:
    {JSON_TEMPLATE}
    Breadboard layout: top rails = rows w,x (negative/positive); bottom rails = y,z; middle = rows a-f, columns = numbers.
    ONLY output JSON. No explanation, no markdown."""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[image_part, prompt]
    )

    sys.stdout.reconfigure(encoding="utf-8")
    return response.text


