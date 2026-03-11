# AI-Powered Cloud Infrastructure Assistant Prototype

A minimal working prototype that demonstrates LLM-assisted Infrastructure Analysis and IaC Generation.

## Features
- **Cloud Scanning**: Retrieves EC2, S3, VPC, and Security Group info via AWS SDK (Boto3).
- **AI Analysis**: Uses Ollama (qwen2.5-coder:7b) to analyze cloud state for security and cost.
- **IaC Generation**: Automatically generates Terraform configurations based on natural language.
- **Terraform Execution**: Orchestrates `terraform init/plan/apply` directly from the UI.
- **Premium Dashboard**: Glassmorphic UI with real-time resource visualization.

## Prerequisites
1. **Ollama**: Running locally with `qwen2.5-coder:7b` pulled (`ollama pull qwen2.5-coder:7b`).
2. **AWS Credentials**: Configured in your environment (`aws configure`).
3. **Terraform**: Installed and in your PATH.
4. **Node.js**: For the frontend.
5. **Python 3.10+**: For the backend.

## Structure
- `/backend`: FastAPI service with tool integration.
- `/frontend`: React (Vite) dashboard.
- `/terraform`: Temporary storage for generated IaC files.

## Setup Instructions

### 1. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python run.py
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Usage
1. Open the frontend URL (usually `http://localhost:5173`).
2. Click **"Scan Environment"** to see your current AWS resources.
3. Use the **AI Assistant** input to request new infrastructure (e.g., "Create a public S3 bucket").
4. Review the generated code and click **"Run"** to execute terraform.

## Tech Stack
- **Frontend**: React, Vite, Framer Motion, Lucide-React, Axios.
- **Backend**: Python FastAPI, Boto3, httpx, uvicorn.
- **LLM**: Ollama (`qwen2.5-coder:7b`).
- **IaC**: Terraform.
