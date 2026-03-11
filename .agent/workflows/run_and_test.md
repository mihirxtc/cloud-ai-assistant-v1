---
description: How to run and test the AI Cloud Infrastructure Assistant
---

# 🚀 Getting Started

Follow these steps to run the backend and frontend, and then test the application.

## 1. Prerequisites
- **AWS Credentials**: Ensure you have AWS credentials configured (e.g., via `aws configure` or environment variables).
- **Ollama**: Ensure [Ollama](https://ollama.com/) is running locally with the `qwen2.5-coder:7b` model pulled (`ollama pull qwen2.5-coder:7b`).
- **Terraform**: Ensure `terraform` is installed on your system.

## 2. Start the Backend
The backend is a FastAPI application.

```bash
# From the project root
python3 -m backend.run
```
The backend will be available at `http://localhost:8000`. You can verify it's running by visiting `http://localhost:8000/health`.

## 3. Start the Frontend
The frontend is a React application built with Vite.

```bash
# In a new terminal, from the project root
cd frontend
npm install  # If not already done
npm run dev
```
The frontend will be available at the URL provided by Vite (usually `http://localhost:5173`).

## 4. Testing the Application
1. **Open the Frontend**: Navigate to `http://localhost:5173` in your browser.
2. **Scan Environment**: Click the **"Scan Environment"** button. This will:
   - Trigger the backend to scan your AWS resources (EC2, S3, VPCs, Security Groups).
   - Use the AI (via Ollama) to analyze the resources for security insights.
3. **Generate IaC**:
   - In the "AI Assistant" section, type a request like: `Create a new S3 bucket named 'my-test-bucket-123'` or `Generate a VPC with 2 public subnets`.
   - Click **"Generate IaC"**. The generated Terraform code will appear in the "Terraform Output" panel.
4. **Execute IaC**:
   - Once code is generated, click the **"Run"** button in the Terraform panel.
   - This will execute `terraform init`, `plan`, and `apply` in the backend. 
   - **Note**: This will actually create/modify resources in your AWS account. Check the "Execution Logs" for output.

## Troubleshooting
- **Backend fails to start**: Ensure you have installed dependencies with `pip3 install --break-system-packages -r backend/requirements.txt`.
- **Ollama Connection**: If the AI analysis or generation fails, check if Ollama is running at `http://localhost:11434`.
