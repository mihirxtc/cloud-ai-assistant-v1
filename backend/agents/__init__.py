"""
Base Agent class and agent implementations for Cloud AI Assistant.
Implements agentic AI workflow with tools.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List
import json


class AgentTool:
    """Represents a tool that an agent can use."""
    
    def __init__(self, name: str, description: str, function):
        self.name = name
        self.description = description
        self.function = function
    
    async def execute(self, **kwargs) -> Any:
        """Execute the tool function."""
        return await self.function(**kwargs) if hasattr(self.function, '__call__') else self.function(**kwargs)


class BaseAgent(ABC):
    """Base class for all AI agents."""
    
    def __init__(self, llm_service, name: str = "BaseAgent"):
        self.llm_service = llm_service
        self.name = name
        self.tools: Dict[str, AgentTool] = {}
        self.system_prompt = "You are a helpful AI assistant."
    
    def register_tool(self, tool: AgentTool):
        """Register a tool for this agent."""
        self.tools[tool.name] = tool
    
    @abstractmethod
    async def process(self, query: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Process a user query and return results."""
        pass
    
    async def call_llm(self, prompt: str, json_format: bool = True) -> Dict[str, Any]:
        """Call LLM with the agent's system prompt."""
        response = await self.llm_service.generate_response(
            prompt=prompt,
            system_prompt=self.system_prompt,
            json_format=json_format
        )
        
        if json_format:
            try:
                return json.loads(response)
            except json.JSONDecodeError:
                return {"raw_response": response, "error": "Failed to parse JSON"}
        return {"response": response}


class CloudAnalysisAgent(BaseAgent):
    """Agent for analyzing cloud infrastructure and providing insights."""
    
    def __init__(self, llm_service):
        super().__init__(llm_service, "CloudAnalysisAgent")
        self.system_prompt = """You are a Cloud Infrastructure Analyst AI. 
Your task is to analyze AWS cloud resources and provide actionable insights.
Always respond in valid JSON format with structured findings."""
    
    async def process(self, query: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Process cloud analysis query."""
        
        # Use CloudScannerTool to get resources
        if "CloudScannerTool" in self.tools:
            resources = await self.tools["CloudScannerTool"].execute()
        else:
            resources = context.get("resources", {}) if context else {}
        
        # Build MCP context
        from utils.mcp_builder import MCPContextBuilder
        mcp = MCPContextBuilder(resources)
        
        # Determine analysis type from query
        query_lower = query.lower()
        if "security" in query_lower or "vulnerability" in query_lower:
            mcp_context = mcp.build_security_context()
            analysis_prompt = self._build_security_prompt(mcp_context, query)
        elif "cost" in query_lower or "price" in query_lower or "optimization" in query_lower:
            mcp_context = mcp.build_cost_context()
            analysis_prompt = self._build_cost_prompt(mcp_context, query)
        else:
            mcp_context = mcp.build_security_context()
            analysis_prompt = self._build_general_analysis_prompt(mcp_context, query)
        
        # Call LLM
        result = await self.call_llm(analysis_prompt)
        
        return {
            "agent": self.name,
            "query": query,
            "resources_analyzed": mcp._summarize_resources(),
            "analysis": result,
            "mcp_context_type": mcp_context.get("context_type", "unknown")
        }
    
    def _build_security_prompt(self, context: Dict, query: str) -> str:
        """Build security analysis prompt."""
        return f"""Analyze the following AWS infrastructure for security issues and vulnerabilities.

USER QUERY: {query}

INFRASTRUCTURE DATA:
{json.dumps(context, indent=2)}

Analyze and identify:
1. Open ports exposed to internet (0.0.0.0/0)
2. Public S3 buckets without encryption
3. Unrestricted security groups
4. Public EC2 instances with sensitive ports
5. Missing encryption on storage
6. IAM misconfigurations

For each issue found, provide:
- Issue description
- Severity (critical, high, medium, low)
- Affected resources
- Recommended fix

Respond in this JSON format:
{{
  "summary": "brief overview",
  "risk_score": 0-100,
  "critical_issues": [...],
  "warnings": [...],
  "recommendations": [...]
}}"""
    
    def _build_cost_prompt(self, context: Dict, query: str) -> str:
        """Build cost optimization prompt."""
        return f"""Analyze the following AWS infrastructure for cost optimization opportunities.

USER QUERY: {query}

INFRASTRUCTURE DATA:
{json.dumps(context, indent=2)}

Analyze and identify:
1. Idle or stopped EC2 instances incurring costs
2. Over-provisioned instances (large instances with low utilization)
3. Unused EBS volumes
4. S3 storage without lifecycle policies
5. Opportunities for Reserved Instances or Spot
6. Cross-cloud comparison (AWS vs GCP vs Azure pricing)

For each finding, provide:
- Current estimated cost
- Potential savings
- Alternative recommendations
- Cloud comparison (if applicable)

Respond in this JSON format:
{{
  "summary": "brief overview",
  "estimated_monthly_cost": "$X",
  "potential_savings": "$X",
  "recommendations": [...],
  "cross_cloud_comparison": {{
    "aws": "estimated_cost",
    "gcp": "estimated_cost", 
    "azure": "estimated_cost"
  }}
}}"""
    
    def _build_general_analysis_prompt(self, context: Dict, query: str) -> str:
        """Build general infrastructure analysis prompt."""
        return f"""Analyze the following AWS infrastructure.

USER QUERY: {query}

INFRASTRUCTURE DATA:
{json.dumps(context, indent=2)}

Provide a comprehensive analysis including:
1. Resource inventory summary
2. Architecture patterns identified
3. Potential improvements
4. Best practices compliance

Respond in structured JSON format."""


class SecurityAgent(BaseAgent):
    """Specialized agent for security analysis and vulnerability detection."""
    
    def __init__(self, llm_service):
        super().__init__(llm_service, "SecurityAgent")
        self.system_prompt = """You are a Cloud Security Expert AI.
Your task is to identify security vulnerabilities, misconfigurations, and compliance issues.
Focus on practical, actionable findings with clear severity ratings.
Always respond in valid JSON format."""
    
    async def process(self, query: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Perform security analysis."""
        
        resources = context.get("resources", {}) if context else {}
        
        from utils.mcp_builder import MCPContextBuilder
        mcp = MCPContextBuilder(resources)
        security_context = mcp.build_security_context()
        
        # Perform automated security checks
        auto_findings = self._automated_security_scan(resources)
        
        prompt = f"""Perform a comprehensive security audit of this AWS infrastructure.

QUERY: {query}

AUTOMATED SCAN FINDINGS:
{json.dumps(auto_findings, indent=2)}

FULL INFRASTRUCTURE CONTEXT:
{json.dumps(security_context, indent=2)}

Analyze and provide:
1. Overall security risk score (0-100, lower is better)
2. Critical vulnerabilities requiring immediate attention
3. High priority security improvements
4. Compliance gaps (SOC2, ISO27001, etc.)
5. Network security assessment
6. Data protection status

Respond in this JSON format:
{{
  "security_score": 0-100,
  "risk_level": "critical|high|medium|low",
  "critical_findings": [
    {{
      "issue": "description",
      "severity": "critical|high|medium|low",
      "affected_resources": [...],
      "remediation": "specific steps to fix",
      "cwe_id": "CWE-XXX (if applicable)"
    }}
  ],
  "recommendations": [
    {{
      "priority": 1-10,
      "action": "description",
      "effort": "low|medium|high",
      "impact": "description"
    }}
  ],
  "compliance_status": {{
    "soc2": "compliant|partial|non_compliant",
    "iso27001": "compliant|partial|non_compliant"
  }}
}}"""
        
        result = await self.call_llm(prompt)
        
        return {
            "agent": self.name,
            "query": query,
            "automated_findings": auto_findings,
            "llm_analysis": result,
            "total_resources_scanned": len(resources.get("ec2_instances", [])) + 
                                      len(resources.get("s3_buckets", [])) +
                                      len(resources.get("security_groups", []))
        }
    
    def _automated_security_scan(self, resources: Dict) -> List[Dict]:
        """Perform automated security checks."""
        findings = []
        
        # Check security groups for open ports
        for sg in resources.get("security_groups", []):
            if isinstance(sg, dict) and "error" not in sg:
                for rule in sg.get("IpPermissions", []):
                    for ip_range in rule.get("IpRanges", []):
                        if ip_range.get("CidrIp") == "0.0.0.0/0":
                            from_port = rule.get("FromPort", "all")
                            to_port = rule.get("ToPort", "all")
                            protocol = rule.get("IpProtocol")
                            
                            # Critical ports
                            critical_ports = [22, 3389, 3306, 5432, 27017, 6379, 11211]
                            if from_port in critical_ports or to_port in critical_ports:
                                severity = "critical"
                            elif from_port in [80, 443]:
                                severity = "medium"
                            else:
                                severity = "high"
                            
                            findings.append({
                                "type": "open_port",
                                "severity": severity,
                                "resource": f"Security Group: {sg.get('GroupId')}",
                                "details": f"Port {from_port}-{to_port}/{protocol} open to 0.0.0.0/0",
                                "remediation": f"Restrict access to specific IP ranges for port {from_port}"
                            })
        
        # Check S3 buckets
        for bucket in resources.get("s3_buckets", []):
            if isinstance(bucket, dict) and "error" not in bucket:
                if bucket.get("PublicAccess") == "public":
                    findings.append({
                        "type": "public_s3",
                        "severity": "high",
                        "resource": f"S3 Bucket: {bucket.get('Name')}",
                        "details": "Bucket is publicly accessible",
                        "remediation": "Enable Block Public Access settings"
                    })
        
        # Check EC2 instances
        for instance in resources.get("ec2_instances", []):
            if isinstance(instance, dict) and "error" not in instance:
                if instance.get("PublicIpAddress") and instance.get("State") == "running":
                    findings.append({
                        "type": "public_ec2",
                        "severity": "medium",
                        "resource": f"EC2: {instance.get('InstanceId')}",
                        "details": f"Instance has public IP ({instance.get('PublicIpAddress')})",
                        "remediation": "Use NAT Gateway or Load Balancer instead of public IPs"
                    })
        
        return findings


class CostOptimizationAgent(BaseAgent):
    """Specialized agent for cost analysis and optimization recommendations."""
    
    def __init__(self, llm_service):
        super().__init__(llm_service, "CostOptimizationAgent")
        self.system_prompt = """You are a Cloud Cost Optimization Expert AI.
Your task is to analyze cloud spending and identify cost savings opportunities.
Provide specific dollar estimates and actionable recommendations.
Always respond in valid JSON format."""
    
    async def process(self, query: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Perform cost optimization analysis."""
        
        resources = context.get("resources", {}) if context else {}
        
        from utils.mcp_builder import MCPContextBuilder
        mcp = MCPContextBuilder(resources)
        cost_context = mcp.build_cost_context()
        
        # Calculate automated cost estimates
        cost_analysis = self._analyze_costs(resources)
        
        prompt = f"""Analyze this AWS infrastructure for cost optimization opportunities.

QUERY: {query}

ESTIMATED COSTS (Automated Analysis):
{json.dumps(cost_analysis, indent=2)}

INFRASTRUCTURE CONTEXT:
{json.dumps(cost_context, indent=2)}

AWS Pricing Reference (approximate monthly):
- t2.micro: ~$8.50
- t3.medium: ~$30
- t3.large: ~$60
- m5.large: ~$70
- m5.xlarge: ~$140
- S3 Standard: $0.023/GB
- EBS gp3: $0.08/GB

Provide analysis in this JSON format:
{{
  "summary": "overall assessment",
  "current_estimated_monthly_cost": "$X",
  "projected_monthly_cost": "$X (after optimizations)",
  "potential_monthly_savings": "$X",
  "savings_percentage": "X%",
  "findings": [
    {{
      "category": "ec2|s3|network|other",
      "finding": "description",
      "current_cost": "$X",
      "optimized_cost": "$X",
      "monthly_savings": "$X",
      "implementation_effort": "low|medium|high",
      "confidence": "high|medium|low"
    }}
  ],
  "cross_cloud_comparison": {{
    "aws": {{
      "estimated_monthly": "$X",
      "pros": [...],
      "cons": [...]
    }},
    "gcp": {{
      "estimated_monthly": "$X",
      "savings_vs_aws": "$X",
      "pros": [...],
      "cons": [...]
    }},
    "azure": {{
      "estimated_monthly": "$X",
      "savings_vs_aws": "$X",
      "pros": [...],
      "cons": [...]
    }}
  }},
  "immediate_actions": [
    {{
      "action": "description",
      "estimated_savings": "$X/month",
      "effort": "hours/days",
      "steps": [...]
    }}
  ]
}}"""
        
        result = await self.call_llm(prompt)
        
        return {
            "agent": self.name,
            "query": query,
            "cost_analysis": cost_analysis,
            "llm_recommendations": result
        }
    
    def _analyze_costs(self, resources: Dict) -> Dict:
        """Calculate automated cost estimates."""
        
        ec2_monthly = 0
        ec2_details = []
        
        # EC2 pricing (approximate)
        pricing = {
            "t2.micro": 8.50,
            "t2.small": 17,
            "t3.medium": 30,
            "t3.large": 60,
            "m5.large": 70,
            "m5.xlarge": 140,
            "m5.2xlarge": 280,
        }
        
        for instance in resources.get("ec2_instances", []):
            if isinstance(instance, dict) and "error" not in instance:
                instance_type = instance.get("InstanceType", "unknown")
                state = instance.get("State", "unknown")
                
                base_cost = pricing.get(instance_type, 50)  # Default to $50 if unknown
                
                # Running instances full cost, stopped instances only EBS cost (~$5)
                monthly_cost = base_cost if state == "running" else 5
                ec2_monthly += monthly_cost
                
                ec2_details.append({
                    "instance_id": instance.get("InstanceId"),
                    "type": instance_type,
                    "state": state,
                    "monthly_cost": f"${monthly_cost:.2f}"
                })
        
        s3_count = len([b for b in resources.get("s3_buckets", []) 
                       if isinstance(b, dict) and "error" not in b])
        
        return {
            "ec2": {
                "monthly_cost": f"${ec2_monthly:.2f}",
                "instance_count": len(ec2_details),
                "running_count": len([i for i in ec2_details if i["state"] == "running"]),
                "details": ec2_details
            },
            "s3": {
                "bucket_count": s3_count,
                "estimated_monthly": "Unknown (need size data)",
                "note": "Use AWS Cost Explorer for accurate S3 costs"
            },
            "recommendations": [
                "Consider using Spot Instances for non-critical workloads (60-90% savings)",
                "Right-size instances based on CloudWatch metrics",
                "Use Reserved Instances for predictable workloads (30-60% savings)"
            ]
        }


class TerraformAgent(BaseAgent):
    """Agent for generating and managing Infrastructure-as-Code."""
    
    def __init__(self, llm_service):
        super().__init__(llm_service, "TerraformAgent")
        self.system_prompt = """You are a Terraform Expert AI.
Your task is to generate production-ready, well-structured Terraform code.
Follow best practices: use variables, add comments, include proper formatting.
Always respond with valid Terraform HCL code and a JSON summary."""
    
    async def process(self, query: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Process infrastructure request and generate Terraform."""
        
        resources = context.get("resources", {}) if context else {}
        
        from utils.mcp_builder import MCPContextBuilder
        mcp = MCPContextBuilder(resources)
        tf_context = mcp.build_terraform_context(query)
        
        prompt = f"""Generate Terraform configuration based on this infrastructure request.

USER REQUEST: {query}

CURRENT INFRASTRUCTURE (for context):
{json.dumps(tf_context['current_infrastructure'], indent=2)}

Requirements:
1. Use AWS provider
2. Follow Terraform best practices
3. Include appropriate tags
4. Use variables for customizable values
5. Add comments explaining each resource
6. Ensure security best practices (no hardcoded secrets)

Generate Terraform code in this format:

```hcl
# Provider configuration
terraform {{
  required_version = ">= 1.0"
  required_providers {{
    aws = {{
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }}
  }}
}}

provider "aws" {{
  region = var.aws_region
}}

# Variables
variable "aws_region" {{
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}}

# Generated resources based on user request
...
```

Also provide a JSON summary:
{{
  "resources_to_create": [...],
  "estimated_cost": "approximate monthly cost",
  "security_notes": [...],
  "dependencies": [...]
}}

Response format: First the Terraform HCL code block, then the JSON summary."""
        
        result = await self.call_llm(prompt, json_format=False)
        
        # Parse Terraform code and JSON from response
        terraform_code, json_summary = self._parse_response(result.get("response", "") if isinstance(result, dict) else result)
        
        return {
            "agent": self.name,
            "query": query,
            "terraform_code": terraform_code,
            "summary": json_summary,
            "requires_confirmation": True,
            "estimated_execution_time": "2-5 minutes"
        }
    
    def _parse_response(self, response: str) -> tuple:
        """Parse Terraform code and JSON from LLM response."""
        import re
        
        # Extract Terraform code
        tf_match = re.search(r'```(?:hcl|terraform)?\s*(.*?)```', response, re.DOTALL)
        terraform_code = tf_match.group(1).strip() if tf_match else response
        
        # Extract JSON summary
        json_match = re.search(r'```json\s*(\{.*?\})\s*```', response, re.DOTALL)
        if not json_match:
            json_match = re.search(r'(\{[\s\S]*"resources_to_create"[\s\S]*\})', response)
        
        try:
            json_summary = json.loads(json_match.group(1)) if json_match else {}
        except:
            json_summary = {"note": "Summary parsing failed", "raw_excerpt": response[-500:]}
        
        return terraform_code, json_summary


class AgentOrchestrator:
    """Orchestrates multiple agents and routes queries to appropriate agent."""
    
    def __init__(self, llm_service):
        self.llm_service = llm_service
        self.agents: Dict[str, BaseAgent] = {
            "cloud_analysis": CloudAnalysisAgent(llm_service),
            "security": SecurityAgent(llm_service),
            "cost": CostOptimizationAgent(llm_service),
            "terraform": TerraformAgent(llm_service)
        }
    
    async def route_query(self, query: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Route query to appropriate agent based on content."""
        
        query_lower = query.lower()
        
        # Determine which agent to use
        if any(word in query_lower for word in ["terraform", "create", "provision", "deploy", "build", "infrastructure as code"]):
            agent = self.agents["terraform"]
        elif any(word in query_lower for word in ["security", "vulnerability", "exposed", "open port", "risk", "threat"]):
            agent = self.agents["security"]
        elif any(word in query_lower for word in ["cost", "price", "expensive", "billing", "save money", "optimization", "reduce spend"]):
            agent = self.agents["cost"]
        else:
            agent = self.agents["cloud_analysis"]
        
        # Process with selected agent
        result = await agent.process(query, context)
        result["agent_used"] = agent.name
        
        return result
    
    def get_agent_info(self) -> Dict[str, str]:
        """Get information about available agents."""
        return {
            name: agent.__doc__ or f"{name} agent"
            for name, agent in self.agents.items()
        }
