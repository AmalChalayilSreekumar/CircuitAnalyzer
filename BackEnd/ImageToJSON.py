import os
import sys
import base64
import io
from google import genai
from google.genai import types
from dotenv import load_dotenv
from PIL import Image

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def base64Trans(image_object):
    """
    Convert a PIL Image object to a Base64 encoded string.
    """
    buffered = io.BytesIO()
    # Save the image data into the in-memory stream as JPEG format
    image_object.save(buffered, format="JPEG")
    # Retrieve the byte content
    img_bytes = buffered.getvalue()
    # Encode the bytes to Base64 and decode to a string
    img_str = base64.b64encode(img_bytes).decode("utf-8")
    return img_str




def createJSON(imageBase64):

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
            "start": { "pin": "d5" },
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

    image_part = types.Part.from_bytes(
        data=base64.b64decode(imageBase64),
        mime_type="image/jpeg"
    )

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[image_part, prompt]
    )

    sys.stdout.reconfigure(encoding="utf-8")
    return response.text


script_dir = os.path.dirname(os.path.abspath(__file__))
image = Image.open(os.path.join(script_dir, "CircuitTest.jpeg"))
print(createJSON(base64Trans(image)))