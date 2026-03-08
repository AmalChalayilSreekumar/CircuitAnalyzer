from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ChatBot import chat_with_circuit

app = FastAPI(title="CircuitAnalyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)

#when chat is called from frontend, it will include the following fields
class ChatRequest(BaseModel):
    circuit_json: dict
    arduino_code: str
    messages: list[dict]


class ChatResponse(BaseModel):
    response: str

#POST API call to automatically validate the request matches ChatRequest
@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    reply = chat_with_circuit(req.circuit_json, req.arduino_code, req.messages)
    return ChatResponse(response=reply)

@app.get("/health")
def health():
    return {"status": "ok"}