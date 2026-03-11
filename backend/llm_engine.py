import httpx
import json

class LLMEngine:
    def __init__(self, model="qwen2.5-coder:7b", base_url="http://localhost:11434"):
        self.model = model
        self.base_url = f"{base_url}/api/chat"

    async def generate_response(self, prompt, system_prompt="You are an AI Cloud Infrastructure Assistant."):
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "stream": False,
            "format": "json"
        }
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                response = await client.post(self.base_url, json=payload)
                response.raise_for_status()
                result = response.json()
                return result.get("message", {}).get("content", "{}")
            except Exception as e:
                return json.dumps({"error": str(e)})

    async def chat(self, prompt, system_prompt="You are a helpful AI Cloud Assistant."):
        # Standard text response (non-structured) using correct chat endpoint
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "stream": False
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(self.base_url, json=payload)
                response.raise_for_status()
                result = response.json()
                return result.get("message", {}).get("content", "Error: No response from LLM.")
            except Exception as e:
                return f"Error connecting to Ollama: {str(e)}"
