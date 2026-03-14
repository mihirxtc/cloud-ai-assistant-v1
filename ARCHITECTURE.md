# Cloud AI Assistant - Architecture Documentation

## Overview

The Cloud AI Assistant has been extended into an **Agentic AI-powered cloud infrastructure management system** with support for multiple LLM models, security analysis, cost optimization, and Infrastructure-as-Code generation.

## New Architecture

### Backend Structure

```
backend/
├── agents/
│   └── __init__.py          # BaseAgent, CloudAnalysisAgent, SecurityAgent, CostOptimizationAgent, TerraformAgent, AgentOrchestrator
├── services/
│   ├── __init__.py
│   ├── llm_service.py       # Multi-model LLM support (Ollama, Anthropic, OpenAI)
│   ├── aws_service.py       # Enhanced AWS resource scanning
│   └── terraform_service.py # Terraform execution with confirmation flow
├── utils/
│   ├── __init__.py
│   └── mcp_builder.py       # Model Context Protocol context builder
├── tools/                   # Existing AWS scanner (deprecated, merged into aws_service)
├── main.py                  # API endpoints
├── run.py                   # Startup script
└── requirements.txt
```

### Frontend Structure

```
frontend/src/
├── App.jsx                 # Main application with all features
├── index.css               # Tailwind styles
├── main.jsx                # React entry point
└── components/             # (can be extracted from App.jsx)
    ├── ModelSelector.jsx
    ├── DashboardCharts.jsx
    ├── AgentChat.jsx
    └── ConfirmationModal.jsx
```

## Features Implemented

### 1. LLM Model Selection ✅

**Free/Local Models (Ollama):**
- codellama:7b (default)
- qwen2.5-coder:7b
- llama3.1:8b
- mistral:7b

**Paid API Models:**
- Claude 3 Haiku
- Claude 3 Sonnet
- GPT-4o Mini
- GPT-4o

**API Endpoints:**
- `GET /models` - List available models
- `POST /models/select` - Change active model

### 2. Agentic AI Workflow ✅

**Agents:**
- `CloudAnalysisAgent` - General infrastructure analysis
- `SecurityAgent` - Security vulnerability detection
- `CostOptimizationAgent` - Cost analysis and savings
- `TerraformAgent` - IaC generation

**Workflow:**
1. User query received
2. `AgentOrchestrator.route_query()` determines agent
3. Agent uses `MCPContextBuilder` to structure context
4. LLM receives formatted context via `LLMService`
5. Agent returns structured JSON response

### 3. MCP (Model Context Protocol) ✅

**Context Types:**
- `security_context` - Security-relevant resource data
- `cost_context` - Cost-relevant resource data
- `terraform_context` - IaC generation context

**Includes:**
- EC2: instance type, public IP, security groups, volumes
- S3: encryption, public access, versioning
- Security Groups: detailed rule analysis
- VPCs: subnets, gateways, CIDR blocks

### 4. Security Analysis ✅

**Automated Detection:**
- Open ports (0.0.0.0/0) - Critical ports flagged
- Public S3 buckets without encryption
- Public EC2 instances
- Unrestricted security groups

**AI-Powered Analysis:**
- Security score (0-100)
- Risk level classification
- Critical findings with CWE IDs
- Compliance status (SOC2, ISO27001)
- Remediation steps

**API:**
- `POST /analyze/security?model_name={model}`

### 5. Cost Optimization ✅

**Analysis Includes:**
- EC2 instance right-sizing
- Idle instance detection
- EBS volume utilization
- S3 storage class optimization
- Spot/Reserved instance recommendations

**Cross-Cloud Comparison:**
- AWS vs GCP vs Azure pricing
- Cloud-specific pros/cons
- Migration recommendations

**API:**
- `POST /analyze/cost?model_name={model}`

### 6. Dashboard Visualizations ✅

**Charts:**
- Resource distribution (Bar chart)
- Security score (Doughnut chart)
- EC2 state breakdown
- S3 encryption status

**Metrics Cards:**
- EC2, S3, Security Groups, VPC counts
- Security score with color coding
- Quick action buttons

**Libraries:**
- Chart.js 4.x
- react-chartjs-2

### 7. Natural Language Infrastructure ✅

**Example Queries:**
- "Create EC2 instance with 8GB RAM and 30GB storage using Linux AMI"
- "Create an S3 bucket with versioning and encryption"
- "Set up a VPC with 2 public subnets"

**Output:**
- Valid Terraform HCL code
- Resource summary
- Security notes
- Estimated cost

**API:**
- `POST /generate-terraform` (prompt, model_name)

### 8. Agentic Task Execution ✅

**Confirmation Flow:**
1. Generate Terraform code
2. Click "Execute Terraform"
3. Modal shows:
   - Resources to create
   - Estimated cost
   - Warning about AWS charges
4. User confirms YES/NO
5. Backend executes:
   - `terraform init`
   - `terraform validate`
   - `terraform plan`
   - `terraform apply` (if confirmed)

**APIs:**
- `POST /terraform/plan` - Preview changes
- `POST /terraform/execute` (confirm: bool)
- `GET /terraform/status` - Execution history

## API Endpoints Summary

### Model Management
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/models` | GET | List all models |
| `/models/select` | POST | Select active model |

### Resource Scanning
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/scan-cloud` | POST | Full AWS scan |
| `/resources` | GET | Cached resources |
| `/dashboard` | GET | Aggregated metrics |

### Agent Queries
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/agent/query` | POST | Route query to agent |
| `/analyze/security` | POST | Security analysis |
| `/analyze/cost` | POST | Cost optimization |

### Terraform
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/generate-terraform` | POST | Generate IaC |
| `/terraform/plan` | POST | Preview changes |
| `/terraform/execute` | POST | Execute with confirmation |
| `/terraform/status` | GET | Execution history |

### MCP
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/mcp/build-context` | POST | Build MCP context |

## Running the Application

### Prerequisites
1. Ollama running with `codellama:7b` pulled
2. AWS credentials configured
3. Terraform installed
4. Python 3.10+, Node.js 18+

### Start Services

**Terminal 1 - Ollama:**
```bash
ollama serve
```

**Terminal 2 - Backend:**
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
python run.py
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Access
- Frontend: http://localhost:5173
- Backend: http://localhost:8000

## UI Navigation

The frontend now has 6 main tabs:

1. **Dashboard** - Overview with charts and metrics
2. **Resources** - Detailed AWS resource listing
3. **Security** - Security analysis results
4. **Cost** - Cost optimization recommendations
5. **AI Agent** - Chat interface for queries
6. **Terraform** - IaC generation and execution

## Configuration

### Environment Variables (optional)

For paid models, set API keys:
```bash
export ANTHROPIC_API_KEY=your_key
export OPENAI_API_KEY=your_key
```

## Security Considerations

1. **Terraform Execution**: Always review generated code before applying
2. **AWS Permissions**: Use least-privilege IAM roles
3. **API Keys**: Store in environment variables, never commit
4. **Confirmation**: Execution requires explicit user confirmation

## Testing

Example workflow:
1. Click "Scan Environment" to load AWS resources
2. Select LLM model from dropdown
3. Click "Run Security Analysis" on Dashboard
4. Go to Security tab to see findings
5. Click "Analyze Costs" to see savings
6. In AI Agent tab, ask "Create an S3 bucket"
7. Go to Terraform tab to see generated code
8. Click "Execute" and confirm to deploy
