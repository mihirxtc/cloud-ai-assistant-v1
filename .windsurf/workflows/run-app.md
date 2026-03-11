---
description: How to run the AI Cloud Assistant frontend and backend
---

# Running the AI Cloud Infrastructure Assistant

This application consists of three services that need to run simultaneously:
1. Ollama (LLM server)
2. Backend (FastAPI Python server)
3. Frontend (React Vite dev server)

## Quick Start (3 Terminals Required)

### Terminal 1 - Ollama LLM Server
```bash
# Check if qwen2.5-coder:7b model is available
ollama list

# If not installed, pull it
ollama pull qwen2.5-coder:7b

# Start Ollama server
ollama serve
```

### Terminal 2 - Backend
```bash
cd backend
source venv/bin/activate
python run.py
```

### Terminal 3 - Frontend
```bash
cd frontend
npm run dev
```

## Access the Application

Once all three services are running, open your browser to:
**http://localhost:5173**

## Troubleshooting

### Port Already in Use
If you see "Port 5173 is in use", the frontend will automatically use the next available port (e.g., 5174). Check the terminal output for the actual URL.

### Backend Shows "Disconnected"
1. Check Terminal 2 for error messages
2. Ensure Ollama is running (Terminal 1)
3. Try restarting: `Ctrl+C` then `python run.py`

### Blank Page or Styling Issues
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### AWS Scanning Fails
Ensure AWS credentials are configured:
```bash
aws configure
```

## Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5173 | User interface |
| Backend API | http://localhost:8000 | API endpoints |
| Backend Health | http://localhost:8000/health | Status check |
| Ollama | http://localhost:11434 | LLM server |
