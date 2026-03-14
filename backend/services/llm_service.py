"""
LLM Service - Unified interface for multiple LLM providers with model selection.
Supports: Ollama (local), Claude (Anthropic), GPT-4 (OpenAI)
"""
import httpx
import json
from typing import Dict, Any, Optional
from enum import Enum


class LLMProvider(Enum):
    """Supported LLM providers."""
    OLLAMA = "ollama"
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    GROQ = "groq"


class LLMModel:
    """Represents an LLM model configuration."""
    
    def __init__(self, name: str, provider: LLMProvider, display_name: str, 
                 is_paid: bool = False, context_window: int = 4096):
        self.name = name
        self.provider = provider
        self.display_name = display_name
        self.is_paid = is_paid
        self.context_window = context_window
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "provider": self.provider.value,
            "display_name": self.display_name,
            "is_paid": self.is_paid,
            "context_window": self.context_window
        }


# Available models registry
AVAILABLE_MODELS = {
    # Free / Local models (Ollama)
    "qwen2.5-coder:7b": LLMModel(
        name="qwen2.5-coder:7b",
        provider=LLMProvider.OLLAMA,
        display_name="Qwen 2.5 Coder 7B (Free/Local)",
        is_paid=False,
        context_window=32768
    ),
    "llama3.1:8b": LLMModel(
        name="llama3.1:8b",
        provider=LLMProvider.OLLAMA,
        display_name="Llama 3.1 8B (Free/Local)",
        is_paid=False,
        context_window=128000
    ),
    "mistral:7b": LLMModel(
        name="mistral:7b",
        provider=LLMProvider.OLLAMA,
        display_name="Mistral 7B (Free/Local)",
        is_paid=False,
        context_window=32768
    ),
    "codellama:7b": LLMModel(
        name="codellama:7b",
        provider=LLMProvider.OLLAMA,
        display_name="CodeLlama 7B (Free/Local)",
        is_paid=False,
        context_window=16384
    ),
    
    # Paid models (Anthropic)
    "claude-3-haiku-20240307": LLMModel(
        name="claude-3-haiku-20240307",
        provider=LLMProvider.ANTHROPIC,
        display_name="Claude 3 Haiku (Paid)",
        is_paid=True,
        context_window=200000
    ),
    "claude-3-sonnet-20240229": LLMModel(
        name="claude-3-sonnet-20240229",
        provider=LLMProvider.ANTHROPIC,
        display_name="Claude 3 Sonnet (Paid)",
        is_paid=True,
        context_window=200000
    ),
    
    # Paid models (OpenAI)
    "gpt-4o-mini": LLMModel(
        name="gpt-4o-mini",
        provider=LLMProvider.OPENAI,
        display_name="GPT-4o Mini (Paid)",
        is_paid=True,
        context_window=128000
    ),
    "gpt-4o": LLMModel(
        name="gpt-4o",
        provider=LLMProvider.OPENAI,
        display_name="GPT-4o (Paid)",
        is_paid=True,
        context_window=128000
    ),
    
    # Fast / Semi-paid models (Groq)
    "llama3-70b-8192": LLMModel(
        name="llama3-70b-8192",
        provider=LLMProvider.GROQ,
        display_name="Llama 3 70B (Groq/Fast)",
        is_paid=True,
        context_window=8192
    ),
    "mixtral-8x7b-32768": LLMModel(
        name="mixtral-8x7b-32768",
        provider=LLMProvider.GROQ,
        display_name="Mixtral 8x7B (Groq/Fast)",
        is_paid=True,
        context_window=32768
    ),
}


class LLMService:
    """Service for interacting with multiple LLM providers."""
    
    def __init__(self, model_name: str = "llama3-70b-8192"):
        self.model_name = model_name
        self.model = AVAILABLE_MODELS.get(model_name, AVAILABLE_MODELS["codellama:7b"])
        
        # API keys for paid models (should be loaded from environment)
        self.anthropic_api_key = None  # Load from ANTHROPIC_API_KEY env var
        self.openai_api_key = None     # Load from OPENAI_API_KEY env var
        self.groq_api_key = None       # Load from GROQ_API_KEY env var
        
        # Ollama config
        self.ollama_base_url = "http://localhost:11434"
    
    def set_model(self, model_name: str) -> bool:
        """Change the active model."""
        if model_name in AVAILABLE_MODELS:
            self.model_name = model_name
            self.model = AVAILABLE_MODELS[model_name]
            return True
        return False
    
    async def get_available_models(self, include_paid: bool = True) -> Dict[str, Dict]:
        """Get list of available models with installation status."""
        models = {}
        installed_locals = []
        
        # Try to get installed models if Ollama is running
        try:
            installed_locals = await self.get_installed_ollama_models()
        except:
            pass

        for name, model in AVAILABLE_MODELS.items():
            if not include_paid and model.is_paid:
                continue
            
            model_data = model.to_dict()
            
            # Check installation status for Ollama models
            if model.provider == LLMProvider.OLLAMA:
                # Handle cases where model name might have :latest or similar
                is_installed = any(name in local or local in name for local in installed_locals)
                model_data["is_installed"] = is_installed
            else:
                # Paid models are "installed" if they are available via API
                model_data["is_installed"] = True
                
            models[name] = model_data
        return models
    
    async def get_installed_ollama_models(self) -> list[str]:
        """Fetch list of models actually installed on local Ollama."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.ollama_base_url}/api/tags")
                if response.status_code == 200:
                    tags = response.json().get("models", [])
                    return [t["name"] for t in tags]
                return []
        except Exception:
            return []

    async def pull_model(self, model_name: str):
        """Trigger Ollama to pull a model."""
        url = f"{self.ollama_base_url}/api/pull"
        payload = {"name": model_name, "stream": False}
        
        try:
            async with httpx.AsyncClient(timeout=600.0) as client:
                response = await client.post(url, json=payload)
                return response.status_code == 200
        except Exception as e:
            return False
    
    async def generate_response(self, prompt: str, system_prompt: str = None,
                                temperature: float = 0.7, json_format: bool = False) -> str:
        """Generate response from the active LLM."""
        
        if self.model.provider == LLMProvider.OLLAMA:
            return await self._call_ollama(prompt, system_prompt, temperature, json_format)
        elif self.model.provider == LLMProvider.ANTHROPIC:
            return await self._call_anthropic(prompt, system_prompt, temperature, json_format)
        elif self.model.provider == LLMProvider.OPENAI:
            return await self._call_openai(prompt, system_prompt, temperature, json_format)
        elif self.model.provider == LLMProvider.GROQ:
            return await self._call_groq(prompt, system_prompt, temperature, json_format)
        else:
            return json.dumps({"error": f"Unknown provider: {self.model.provider}"})
    
    async def _call_ollama(self, prompt: str, system_prompt: str = None,
                           temperature: float = 0.7, json_format: bool = False) -> str:
        """Call Ollama API."""
        url = f"{self.ollama_base_url}/api/chat"
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": self.model.name,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature
            }
        }
        
        if json_format:
            payload["format"] = "json"
        
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                result = response.json()
                return result.get("message", {}).get("content", "{}")
        except Exception as e:
            return json.dumps({"error": f"Ollama error: {str(e)}"})
    
    async def _call_anthropic(self, prompt: str, system_prompt: str = None,
                              temperature: float = 0.7, json_format: bool = False) -> str:
        """Call Anthropic Claude API."""
        import os
        api_key = self.anthropic_api_key or os.getenv("ANTHROPIC_API_KEY")
        
        if not api_key:
            return json.dumps({"error": "ANTHROPIC_API_KEY not set"})
        
        url = "https://api.anthropic.com/v1/messages"
        
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        
        messages = [{"role": "user", "content": prompt}]
        
        payload = {
            "model": self.model.name,
            "max_tokens": 4096,
            "temperature": temperature,
            "messages": messages
        }
        
        if system_prompt:
            payload["system"] = system_prompt
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                result = response.json()
                content = result.get("content", [{}])[0].get("text", "")
                
                if json_format and not content.strip().startswith("{"):
                    # Try to extract JSON from markdown code blocks
                    import re
                    json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
                    if json_match:
                        content = json_match.group(1)
                
                return content if not json_format else content
        except Exception as e:
            return json.dumps({"error": f"Anthropic error: {str(e)}"})
    
    async def _call_openai(self, prompt: str, system_prompt: str = None,
                           temperature: float = 0.7, json_format: bool = False) -> str:
        """Call OpenAI API."""
        import os
        api_key = self.openai_api_key or os.getenv("OPENAI_API_KEY")
        
        if not api_key:
            return json.dumps({"error": "OPENAI_API_KEY not set"})
        
        url = "https://api.openai.com/v1/chat/completions"
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": self.model.name,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 4096
        }
        
        if json_format:
            payload["response_format"] = {"type": "json_object"}
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                result = response.json()
                return result.get("choices", [{}])[0].get("message", {}).get("content", "{}")
        except Exception as e:
            return json.dumps({"error": f"OpenAI error: {str(e)}"})
    
    async def _call_groq(self, prompt: str, system_prompt: str = None,
                          temperature: float = 0.7, json_format: bool = False) -> str:
        """Call Groq API (OpenAI-compatible)."""
        import os
        api_key = self.groq_api_key or os.getenv("GROQ_API_KEY")
        
        if not api_key:
            return json.dumps({"error": "GROQ_API_KEY not set"})
        
        url = "https://api.groq.com/openai/v1/chat/completions"
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": self.model.name,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 4096
        }
        
        if json_format:
            payload["response_format"] = {"type": "json_object"}
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                result = response.json()
                return result.get("choices", [{}])[0].get("message", {}).get("content", "{}")
        except Exception as e:
            return json.dumps({"error": f"Groq error: {str(e)}"})
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test connection to the current LLM provider."""
        try:
            if self.model.provider == LLMProvider.OLLAMA:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(f"{self.ollama_base_url}/api/tags")
                    if response.status_code == 200:
                        models = response.json().get("models", [])
                        model_names = [m["name"] for m in models]
                        
                        # Check if selected model is actually installed
                        is_installed = any(self.model_name in m or m in self.model_name for m in model_names)
                        
                        return {
                            "status": "connected",
                            "available_models": model_names,
                            "selected_model": self.model_name,
                            "is_installed": is_installed
                        }
                    return {"status": "error", "message": f"HTTP {response.status_code}"}
            
            elif self.model.provider == LLMProvider.ANTHROPIC:
                api_key = self.anthropic_api_key or __import__('os').getenv("ANTHROPIC_API_KEY")
                if not api_key:
                    return {"status": "error", "message": "API key not configured"}
                return {"status": "connected", "selected_model": self.model_name}
            
            elif self.model.provider == LLMProvider.OPENAI:
                api_key = self.openai_api_key or __import__('os').getenv("OPENAI_API_KEY")
                if not api_key:
                    return {"status": "error", "message": "API key not configured"}
                return {"status": "connected", "selected_model": self.model_name}
            
            elif self.model.provider == LLMProvider.GROQ:
                api_key = self.groq_api_key or __import__('os').getenv("GROQ_API_KEY")
                if not api_key:
                    return {"status": "error", "message": "API key not configured"}
                return {"status": "connected", "selected_model": self.model_name}
            
        except Exception as e:
            return {"status": "error", "message": str(e)}
