"""
Cloud AI Assistant - Main API with Agentic AI capabilities.
FastAPI backend with multiple agents, LLM model selection, and Terraform execution.
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os
import json

# Services
from services.llm_service import LLMService, AVAILABLE_MODELS
from services.aws_service import AWSService
from services.terraform_service import TerraformService

# Agents
from agents import AgentOrchestrator

# Utils
from utils.mcp_builder import MCPContextBuilder

app = FastAPI(
    title="Cloud AI Assistant API",
    description="Agentic AI-powered cloud infrastructure management with multi-model LLM support",
    version="2.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global services
llm_service = LLMService()
aws_service = AWSService()
terraform_service = TerraformService()
agent_orchestrator = AgentOrchestrator(llm_service)

# Cached resources (for agent context)
cached_resources = None


# Request Models
class QueryRequest(BaseModel):
    query: str
    model_name: Optional[str] = None
    context: Optional[Dict] = None


class ModelSelectRequest(BaseModel):
    model_name: str


class TerraformGenerateRequest(BaseModel):
    prompt: str
    model_name: Optional[str] = None
    context: Optional[Dict] = None


class TerraformExecuteRequest(BaseModel):
    confirm: bool = False
    code: Optional[str] = None

# Health check
@app.get("/health")
async def health():
    """Health check endpoint."""
    llm_status = await llm_service.test_connection()
    return {
        "status": "ok",
        "llm_status": llm_status,
        "default_model": llm_service.model_name
    }


# Model Management
@app.get("/models")
async def get_models(include_paid: bool = True):
    """Get available LLM models."""
    models = llm_service.get_available_models(include_paid=include_paid)
    return {
        "models": models,
        "current_model": llm_service.model_name,
        "categories": {
            "free": [k for k, m in AVAILABLE_MODELS.items() if not m.is_paid],
            "paid": [k for k, m in AVAILABLE_MODELS.items() if m.is_paid]
        }
    }


@app.post("/models/select")
async def select_model(request: ModelSelectRequest):
    """Change the active LLM model."""
    success = llm_service.set_model(request.model_name)
    if success:
        # Reinitialize orchestrator with new model
        global agent_orchestrator
        agent_orchestrator = AgentOrchestrator(llm_service)
        return {"success": True, "selected_model": request.model_name}
    return {"success": False, "error": "Invalid model name"}


# Resource Scanning
@app.post("/scan-cloud")
async def scan_cloud():
    """Scan AWS cloud resources with detailed information."""
    global cached_resources
    try:
        resources = aws_service.scan_all_resources()
        cached_resources = resources
        
        return {
            "resources": resources,
            "summary": {
                "ec2_count": len(resources.get("ec2_instances", [])),
                "s3_count": len(resources.get("s3_buckets", [])),
                "vpc_count": len(resources.get("vpcs", [])),
                "security_group_count": len(resources.get("security_groups", [])),
                "ebs_volume_count": len(resources.get("ebs_volumes", [])),
                "load_balancer_count": len(resources.get("load_balancers", [])),
                "rds_count": len(resources.get("rds_instances", []))
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/resources")
async def get_cached_resources():
    """Get cached resources without rescanning."""
    if cached_resources:
        return {"resources": cached_resources}
    return {"resources": None, "message": "No cached resources. Run scan first."}


# Agent Queries
@app.post("/agent/query")
async def agent_query(request: QueryRequest):
    """Process a query through the agent orchestrator."""
    try:
        # Use specified model if different from current
        if request.model_name and request.model_name != llm_service.model_name:
            llm_service.set_model(request.model_name)
            global agent_orchestrator
            agent_orchestrator = AgentOrchestrator(llm_service)
        
        # Get resources from cache or scan
        resources = cached_resources or aws_service.scan_all_resources()
        
        # Route query to appropriate agent
        result = await agent_orchestrator.route_query(
            query=request.query,
            context={"resources": resources, **(request.context or {})}
        )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Security Analysis
@app.post("/analyze/security")
async def analyze_security(model_name: Optional[str] = None):
    """Perform comprehensive security analysis."""
    try:
        if model_name:
            llm_service.set_model(model_name)
        
        resources = cached_resources or aws_service.scan_all_resources()
        
        result = await agent_orchestrator.agents["security"].process(
            query="Analyze AWS infrastructure security and identify vulnerabilities",
            context={"resources": resources}
        )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Cost Analysis
@app.post("/analyze/cost")
async def analyze_cost(model_name: Optional[str] = None):
    """Perform cost optimization analysis."""
    try:
        if model_name:
            llm_service.set_model(model_name)
        
        resources = cached_resources or aws_service.scan_all_resources()
        
        result = await agent_orchestrator.agents["cost"].process(
            query="Analyze infrastructure costs and provide optimization recommendations",
            context={"resources": resources}
        )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Terraform Generation
@app.post("/generate-terraform")
async def generate_terraform(request: TerraformGenerateRequest):
    """Generate Terraform code from natural language request."""
    try:
        if request.model_name:
            llm_service.set_model(request.model_name)
        
        resources = cached_resources or {}
        
        result = await agent_orchestrator.agents["terraform"].process(
            query=request.prompt,
            context={"resources": resources}
        )
        
        # Save code to file
        if result.get("terraform_code"):
            write_result = terraform_service.write_terraform_file(result["terraform_code"])
            result["file_saved"] = write_result.get("success", False)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Terraform Execution
@app.post("/terraform/plan")
async def terraform_plan():
    """Run terraform plan to preview changes."""
    try:
        result = terraform_service.get_plan_summary()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/terraform/execute")
async def terraform_execute(request: TerraformExecuteRequest):
    """Execute terraform with optional confirmation."""
    try:
        # If code provided, write it first
        if request.code:
            terraform_service.write_terraform_file(request.code)
        
        # Execute with or without confirmation
        result = terraform_service.execute_with_confirmation(
            confirmation=request.confirm
        )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/terraform/status")
async def terraform_status():
    """Get current Terraform state and execution history."""
    try:
        state = terraform_service.get_state()
        history = terraform_service.get_execution_history()
        
        return {
            "state": state,
            "execution_history": history[-10:],  # Last 10 commands
            "execution_count": len(history)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# MCP Context Builder
@app.post("/mcp/build-context")
async def build_mcp_context(context_type: str = "security"):
    """Build Model Context Protocol formatted context."""
    try:
        resources = cached_resources or aws_service.scan_all_resources()
        
        mcp = MCPContextBuilder(resources)
        
        if context_type == "security":
            context = mcp.build_security_context()
        elif context_type == "cost":
            context = mcp.build_cost_context()
        elif context_type == "terraform":
            context = mcp.build_terraform_context("infrastructure analysis")
        else:
            context = mcp.build_security_context()
        
        return {
            "context_type": context_type,
            "context": context,
            "json": mcp.to_json(context_type)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Dashboard Data
@app.get("/dashboard")
async def get_dashboard_data():
    """Get aggregated data for dashboard visualization."""
    try:
        resources = cached_resources or aws_service.scan_all_resources()
        
        # Calculate metrics
        ec2_instances = resources.get("ec2_instances", [])
        s3_buckets = resources.get("s3_buckets", [])
        security_groups = resources.get("security_groups", [])
        
        # Security score calculation
        security_issues = 0
        for sg in security_groups:
            if isinstance(sg, dict):
                for rule in sg.get("IpPermissions", []):
                    for ip_range in rule.get("IpRanges", []):
                        if ip_range.get("CidrIp") == "0.0.0.0/0":
                            security_issues += 1
        
        # EC2 state breakdown
        ec2_states = {}
        for ec2 in ec2_instances:
            if isinstance(ec2, dict):
                state = ec2.get("State", "unknown")
                ec2_states[state] = ec2_states.get(state, 0) + 1
        
        return {
            "metrics": {
                "total_resources": len(ec2_instances) + len(s3_buckets) + len(security_groups),
                "ec2_count": len(ec2_instances),
                "s3_count": len(s3_buckets),
                "security_group_count": len(security_groups),
                "security_issues": security_issues,
                "security_score": max(0, 100 - (security_issues * 10))
            },
            "breakdown": {
                "ec2_by_state": ec2_states,
                "s3_encryption": len([b for b in s3_buckets if isinstance(b, dict) and b.get("Encryption") != "none"]),
                "public_s3": len([b for b in s3_buckets if isinstance(b, dict) and b.get("PublicAccess") == "public"])
            },
            "timestamp": resources.get("scan_timestamp")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
