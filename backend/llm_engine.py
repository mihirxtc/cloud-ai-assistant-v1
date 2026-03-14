import httpx
import json

class LLMEngine:
    def __init__(self, model="codellama:7b", base_url="http://localhost:11434"):
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
                # Route to Groq if model looks like a Groq model
                if "llama3" in self.model or "mixtral" in self.model:
                    import os
                    api_key = os.getenv("GROQ_API_KEY")
                    if not api_key:
                        return json.dumps({"error": "GROQ_API_KEY not set"})
                    
                    groq_url = "https://api.groq.com/openai/v1/chat/completions"
                    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
                    
                    # Groq/OpenAI payload is slightly different from Ollama
                    payload = {
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.7,
                        "response_format": {"type": "json_object"}
                    }
                    response = await client.post(groq_url, json=payload, headers=headers)
                else:
                    response = await client.post(self.base_url, json=payload)
                
                response.raise_for_status()
                result = response.json()
                
                if "choices" in result: # OpenAI/Groq format
                    return result.get("choices", [{}])[0].get("message", {}).get("content", "{}")
                return result.get("message", {}).get("content", "{}") # Ollama format
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
