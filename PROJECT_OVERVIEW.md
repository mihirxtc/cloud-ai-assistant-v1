# Cloud AI Assistant - Project Overview

## What is This Project?

An **Agentic AI-powered Cloud Infrastructure Assistant** that helps you manage AWS resources using natural language. Think of it as a smart DevOps engineer that can scan your cloud, find security issues, optimize costs, and even create new infrastructure for you.

## Current Status

✅ **Core Features Implemented:**
- Multi-model LLM support (Ollama, Claude, GPT-4)
- AWS resource scanning (EC2, S3, VPC, Security Groups, EBS, RDS, ELB)
- AI-powered security analysis with vulnerability detection
- Cost optimization with cross-cloud price comparison
- Natural language to Terraform generation
- Agentic task execution with confirmation flow
- Dashboard with Chart.js visualizations
- Real-time AI agent chat interface

## Quick Start (How to Run)

### Prerequisites
1. **Ollama** installed: https://ollama.com
2. **AWS CLI** configured: `aws configure`
3. **Terraform** installed: https://terraform.io
4. **Node.js 18+**: https://nodejs.org

### Step 1: Start Ollama (Terminal 1)
```bash
# Install model if not already present
ollama pull qwen2.5-coder:7b

# Start Ollama server
ollama serve
```

### Step 2: Start Backend (Terminal 2)
```bash
cd /home/mihirxtc/Dev/agentic-cloud-assistant

# Activate virtual environment
source .venv/bin/activate

# Install dependencies (first time only)
pip install -r backend/requirements.txt

# Start backend
cd backend
python run.py
```

Backend runs at: http://localhost:8000

### Step 3: Start Frontend (Terminal 3)
```bash
cd /home/mihirxtc/Dev/agentic-cloud-assistant/frontend

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

Frontend runs at: http://localhost:5173

### Step 4: Open Browser
Navigate to: http://localhost:5173

## Project Structure

```
agentic-cloud-assistant/
├── backend/
│   ├── agents/           # AI agents (Security, Cost, Terraform, Cloud Analysis)
│   ├── services/         # AWS, LLM, Terraform services
│   ├── utils/            # MCP context builder
│   ├── main.py           # FastAPI endpoints
│   └── requirements.txt  # Python dependencies
├── frontend/
│   └── src/
│       └── App.jsx       # React frontend with 6 tabs
├── terraform/            # Generated Terraform files
├── ARCHITECTURE.md       # Detailed architecture docs
└── QUICKSTART.md         # Full setup guide
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Check backend status |
| `/models` | GET | List available LLM models |
| `/models/select` | POST | Change active model |
| `/scan-cloud` | POST | Scan all AWS resources |
| `/dashboard` | GET | Get dashboard metrics |
| `/agent/query` | POST | Send query to AI agent |
| `/analyze/security` | POST | Run security analysis |
| `/analyze/cost` | POST | Run cost optimization |
| `/generate-terraform` | POST | Generate Terraform from natural language |
| `/terraform/execute` | POST | Execute Terraform with confirmation |

## How to Use

1. **Select LLM Model**: Click the brain icon in header, choose a model
2. **Scan AWS**: Click "Scan Environment" button
3. **Ask Questions**: Go to "AI Agent" tab, type questions like:
   - "Which instances are publicly exposed?"
   - "How can I reduce my AWS bill?"
4. **Run Analysis**: Click "Run Security Analysis" or "Analyze Costs"
5. **Generate Infrastructure**: Go to "Terraform" tab, type requests like:
   - "Create an EC2 instance with 8GB RAM"

## Technologies Used

- **Backend**: Python, FastAPI, Boto3, httpx
- **Frontend**: React, Vite, Tailwind CSS, Chart.js
- **AI**: Ollama (local LLMs), support for Anthropic/OpenAI
- **Cloud**: AWS (EC2, S3, VPC, etc.)
- **IaC**: Terraform

## Troubleshooting

### Backend won't start
```bash
cd backend
source ../.venv/bin/activate
pip install -r requirements.txt
python run.py
```

### Frontend shows blank page
```bash
cd frontend
rm -rf node_modules
npm install
npm run dev
```

### Ollama not responding
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama
ollama serve
```

## Next Steps (For Dissertation)

See `ARCHITECTURE.md` for detailed technical documentation and `QUICKSTART.md` for full setup instructions.

## License

MSc Dissertation Project - De Montfort University Leicester
