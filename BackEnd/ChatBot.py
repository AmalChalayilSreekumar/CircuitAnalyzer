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
2. Explain issues clearly to the user
3. Answer any follow-up questions they have about their circuit
4. If you cannot detect a clear issue, suggest the most common possible causes 
   based on the circuit type and components present (e.g. loose connections, 
   wrong resistor value, incorrect pin assignment)

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