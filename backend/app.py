import json

from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import ollama
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

conversation_sessions = {}


class ChatRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=100)
    prompt: str = Field(min_length=1, max_length=10000)

@app.get("/")
def home():
    return {"message": "Backend is running"}


@app.post("/api/chat")
def chat(request: ChatRequest):
    prompt = request.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=422, detail="Prompt cannot be empty")

    history = conversation_sessions.setdefault(request.session_id, [])
    history.append({"role": "user", "content": prompt})

    try:
        response = ollama.chat(model="qwen3:4b", messages=history, stream=True)
    except Exception:
        history.pop()
        raise HTTPException(status_code=502, detail="Unable to reach Ollama")

    def stream_response():
        response_parts = []

        try:
            for chunk in response:
                text = chunk.get("message", {}).get("content", "")
                if text:
                    response_parts.append(text)
                    yield json.dumps({"text": text}) + "\n"

            reply = "".join(response_parts).strip()
            history.append({"role": "assistant", "content": reply})
            yield json.dumps({"done": True}) + "\n"
        except Exception:
            if history and history[-1]["role"] == "user":
                history.pop()
            yield json.dumps({"error": "Unable to finish the Ollama response"}) + "\n"

    return StreamingResponse(stream_response(), media_type="application/x-ndjson")
