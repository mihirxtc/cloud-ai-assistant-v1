# AI Cloud Infrastructure Assistant - Quick Start Guide

## Overview

The Cloud AI Assistant is now an **Agentic AI-powered platform** with:
- Multiple LLM model support (Ollama, Claude, GPT-4)
- AI-powered security analysis
- Cost optimization with cross-cloud comparison
- Infrastructure-as-Code generation
- Agentic task execution with confirmation

## New Features

### 1. Multi-Model LLM Support
Select from free local models (Ollama) or paid API models (Claude, GPT-4)

### 2. AI Agent Chat
Ask natural language questions about your infrastructure

### 3. Security Analysis
- Automated vulnerability scanning
- Security score (0-100)
- Remediation recommendations

### 4. Cost Optimization
- AWS spending analysis
- Savings opportunities
- Cross-cloud price comparison (AWS vs GCP vs Azure)

### 5. Dashboard Visualizations
- Resource distribution charts
- Security score gauge
- Quick action buttons

### 6. Agentic Terraform Execution
- Natural language to Terraform
- Confirmation dialog before deployment
- Execution logs and history

---

## Prerequisites

Before starting, ensure you have:

1. **Ollama** installed and running with `codellama:7b` model
2. **AWS credentials** configured (`aws configure`)
3. **Terraform** installed and in PATH
4. **Python 3.10+** installed
5. **Node.js 18+** installed

---

## Step 1: Start Ollama (Terminal 1)

```bash
# Check if Ollama is running
ollama list

# If codellama:7b is not installed, pull it
ollama pull codellama:7b

# Start Ollama server (if not already running)
ollama serve
```

**Verify:** Open http://localhost:11434 in browser - should show "Ollama is running"

---

## Step 2: Start Backend (Terminal 2)

```bash
cd /home/mihirxtc/Dev/agentic-cloud-assistant/backend

# Create virtual environment (first time only)
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies (first time only)
pip install -r requirements.txt

# Start the backend server
python run.py
```

**Expected output:**
```
Starting AI Cloud Infrastructure Assistant Backend...
INFO:     Started server process [XXXXX]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Verify:** Open http://localhost:8000/health in browser - should show `{"status":"ok"}`

---

## Step 3: Start Frontend (Terminal 3)

```bash
cd /home/mihirxtc/Dev/agentic-cloud-assistant/frontend

# Install dependencies (first time only)
npm install

# Start the development server
npm run dev
```

**Expected output:**
```
VITE v4.5.14  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

## Step 4: Open the Application

Open your browser and go to: **http://localhost:5173**

You will see 6 tabs:
- **Dashboard** - Overview with charts and metrics
- **Resources** - Detailed AWS resource listing
- **Security** - Security analysis results
- **Cost** - Cost optimization recommendations
- **AI Agent** - Chat interface for queries
- **Terraform** - IaC generation and execution

---

## Quick Start Workflow

### 1. Scan Your AWS Resources
1. Click **"Scan Environment"** button
2. Wait for scan to complete
3. View resources in the **Resources** tab

### 2. Select Your LLM Model
1. Click the **brain icon** dropdown in the header
2. Choose from:
   - Free models: Qwen 2.5, Llama 3.1, Mistral, CodeLlama
   - Paid models: Claude, GPT-4 (requires API key)

### 3. Run Security Analysis
1. Go to **Dashboard** tab
2. Click **"Run Security Analysis"**
3. View findings in **Security** tab

### 4. Analyze Costs
1. Go to **Dashboard** tab
2. Click **"Analyze Costs"**
3. View savings opportunities in **Cost** tab

### 5. Chat with AI Agent
1. Go to **AI Agent** tab
2. Type questions like:
   - "Which instances are publicly exposed?"
   - "Find open ports on my security groups"
   - "Suggest cheaper alternatives for my S3 storage"

### 6. Generate Infrastructure
1. Go to **Terraform** tab
2. Type request: "Create an EC2 instance with 8GB RAM"
3. Review generated Terraform code
4. Click **"Plan"** to preview changes
5. Click **"Execute"** and confirm to deploy

---

## Example Queries for AI Agent

**Security Questions:**
- "Analyze my security posture"
- "Find vulnerabilities in my infrastructure"
- "Which ports are open to the internet?"

**Cost Questions:**
- "How can I reduce my AWS bill?"
- "Which instances are idle?"
- "Compare my costs to GCP"

**Infrastructure Requests:**
- "Create a VPC with 2 public subnets"
- "Set up an S3 bucket with encryption"
- "Deploy a t3.medium EC2 with 50GB storage"

---

## Common Issues & Solutions

### Issue: "Backend Disconnected" in UI
**Solution:**
```bash
# Terminal 2
cd /home/mihirxtc/Dev/agentic-cloud-assistant/backend
source venv/bin/activate
python run.py
```

### Issue: "No module named 'uvicorn'"
**Solution:**
```bash
cd /home/mihirxtc/Dev/agentic-cloud-assistant/backend
source venv/bin/activate
pip install -r requirements.txt
```

### Issue: Frontend shows blank page
**Solution:**
```bash
# Terminal 3
cd /home/mihirxtc/Dev/agentic-cloud-assistant/frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Issue: "Connection refused" to Ollama
**Solution:**
```bash
# Check if Ollama is running
ollama serve

# Test in another terminal
curl http://localhost:11434/api/tags
```

### Issue: AWS credentials error
**Solution:**
```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key, region, and output format
```

### Issue: Terraform not found
**Solution:**
```bash
# Install Terraform
brew install terraform
# or download from https://terraform.io

# Verify
terraform --version
```

---

## File Structure

```
agentic-cloud-assistant/
├── backend/
│   ├── agents/
│   │   └── __init__.py          # Agent classes (Security, Cost, Terraform)
│   ├── services/
│   │   ├── llm_service.py       # Multi-model LLM support
│   │   ├── aws_service.py       # Enhanced AWS scanning
│   │   └── terraform_service.py # Terraform execution
│   ├── utils/
│   │   └── mcp_builder.py       # Model Context Protocol
│   ├── main.py                  # API endpoints
│   ├── run.py                   # Startup script
│   └── requirements.txt
├── frontend/
│   └── src/
│       └── App.jsx              # Main app with charts & agents
├── ARCHITECTURE.md              # Detailed architecture docs
└── QUICKSTART.md                # This file
```

---

## API Endpoints

### Model Management
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/models` | GET | List available LLM models |
| `/models/select` | POST | Change active model |

### Resource Scanning
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/scan-cloud` | POST | Full AWS resource scan |
| `/dashboard` | GET | Aggregated metrics |

### Agent Analysis
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/agent/query` | POST | Send query to AI agent |
| `/analyze/security` | POST | Security vulnerability scan |
| `/analyze/cost` | POST | Cost optimization analysis |

### Terraform
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/generate-terraform` | POST | Generate IaC from natural language |
| `/terraform/plan` | POST | Preview changes |
| `/terraform/execute` | POST | Execute with confirmation |
| `/terraform/status` | GET | Execution history |

---

## Stopping the Application

1. **Stop Frontend:** Press `Ctrl+C` in Terminal 3
2. **Stop Backend:** Press `Ctrl+C` in Terminal 2
3. **Stop Ollama:** Press `Ctrl+C` in Terminal 1 (or `ollama stop`)

---

## Next Steps

1. ✅ Click **"Scan Environment"** to load AWS resources
2. ✅ Select your preferred **LLM model**
3. ✅ Run **Security Analysis** to find vulnerabilities
4. ✅ Run **Cost Analysis** to find savings
5. ✅ Chat with **AI Agent** for insights
6. ✅ Generate and **Execute Terraform** code

**Enjoy your Agentic AI Cloud Infrastructure Assistant!**

---

## Troubleshooting

### Paid API Models
To use Claude or GPT-4:
```bash
export ANTHROPIC_API_KEY=your_key
export OPENAI_API_KEY=your_key
```

### Backend Import Errors
If you see import errors:
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend Charts Not Loading
```bash
cd frontend
npm install chart.js react-chartjs-2
```
