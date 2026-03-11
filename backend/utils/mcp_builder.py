"""
Model Context Protocol (MCP) - Structured context builder for LLM interactions.
Builds structured context from AWS resources for AI analysis.
"""
import json
from typing import Dict, List, Any


class MCPContextBuilder:
    """Builds Model Context Protocol formatted context for LLM consumption."""
    
    def __init__(self, resources: Dict[str, Any]):
        self.resources = resources
    
    def build_security_context(self) -> Dict[str, Any]:
        """Build security-focused context with detailed network and access info."""
        context = {
            "context_type": "security_analysis",
            "timestamp": self._get_timestamp(),
            "resources": {
                "ec2": self._format_ec2_for_security(),
                "s3": self._format_s3_for_security(),
                "security_groups": self._format_security_groups(),
                "vpcs": self._format_vpcs()
            },
            "analysis_focus": [
                "open_ports",
                "public_exposure",
                "encryption_status",
                "access_policies",
                "network_isolation"
            ]
        }
        return context
    
    def build_cost_context(self) -> Dict[str, Any]:
        """Build cost optimization context with pricing-relevant details."""
        context = {
            "context_type": "cost_optimization",
            "timestamp": self._get_timestamp(),
            "resources": {
                "ec2": self._format_ec2_for_cost(),
                "s3": self._format_s3_for_cost()
            },
            "pricing_factors": {
                "ec2_pricing_dimensions": [
                    "instance_type",
                    "running_hours",
                    "storage_type",
                    "data_transfer"
                ],
                "s3_pricing_dimensions": [
                    "storage_class",
                    "data_volume",
                    "access_frequency",
                    "transfer_costs"
                ]
            },
            "comparison_clouds": ["aws", "gcp", "azure"]
        }
        return context
    
    def build_terraform_context(self, user_request: str) -> Dict[str, Any]:
        """Build context for Terraform generation from natural language."""
        context = {
            "context_type": "terraform_generation",
            "timestamp": self._get_timestamp(),
            "user_request": user_request,
            "current_infrastructure": {
                "ec2_count": len(self.resources.get("ec2_instances", [])),
                "s3_count": len(self.resources.get("s3_buckets", [])),
                "vpc_count": len(self.resources.get("vpcs", [])),
                "security_group_count": len(self.resources.get("security_groups", []))
            },
            "existing_resources_summary": self._summarize_resources(),
            "terraform_requirements": {
                "provider": "aws",
                "version_constraints": {
                    "terraform": ">= 1.0",
                    "aws_provider": "~> 5.0"
                }
            }
        }
        return context
    
    def _format_ec2_for_security(self) -> List[Dict]:
        """Format EC2 instances with security-relevant fields."""
        instances = self.resources.get("ec2_instances", [])
        formatted = []
        
        for instance in instances:
            if isinstance(instance, dict) and "error" not in instance:
                formatted.append({
                    "instance_id": instance.get("InstanceId"),
                    "instance_type": instance.get("InstanceType"),
                    "state": instance.get("State"),
                    "public_ip": instance.get("PublicIpAddress"),
                    "private_ip": instance.get("PrivateIpAddress"),
                    "vpc_id": instance.get("VpcId"),
                    "security_groups": instance.get("SecurityGroups", []),
                    "platform": instance.get("Platform", "linux"),
                    "launch_time": str(instance.get("LaunchTime", "")),
                    "ebs_optimized": instance.get("EbsOptimized", False)
                })
        return formatted
    
    def _format_ec2_for_cost(self) -> List[Dict]:
        """Format EC2 instances with cost-relevant fields."""
        instances = self.resources.get("ec2_instances", [])
        formatted = []
        
        for instance in instances:
            if isinstance(instance, dict) and "error" not in instance:
                formatted.append({
                    "instance_id": instance.get("InstanceId"),
                    "instance_type": instance.get("InstanceType"),
                    "state": instance.get("State"),
                    "launch_time": str(instance.get("LaunchTime", "")),
                    "platform": instance.get("Platform", "linux"),
                    "ebs_optimized": instance.get("EbsOptimized", False),
                    "tags": instance.get("Tags", [])
                })
        return formatted
    
    def _format_s3_for_security(self) -> List[Dict]:
        """Format S3 buckets with security-relevant fields."""
        buckets = self.resources.get("s3_buckets", [])
        formatted = []
        
        for bucket in buckets:
            if isinstance(bucket, dict) and "error" not in bucket:
                formatted.append({
                    "name": bucket.get("Name"),
                    "creation_date": bucket.get("CreationDate"),
                    "public_access": bucket.get("PublicAccess", "unknown"),
                    "encryption": bucket.get("Encryption", "unknown"),
                    "versioning": bucket.get("Versioning", "unknown"),
                    "region": bucket.get("Region", "unknown")
                })
        return formatted
    
    def _format_s3_for_cost(self) -> List[Dict]:
        """Format S3 buckets with cost-relevant fields."""
        buckets = self.resources.get("s3_buckets", [])
        formatted = []
        
        for bucket in buckets:
            if isinstance(bucket, dict) and "error" not in bucket:
                formatted.append({
                    "name": bucket.get("Name"),
                    "creation_date": bucket.get("CreationDate"),
                    "storage_class": bucket.get("StorageClass", "STANDARD"),
                    "approximate_size": bucket.get("Size", "unknown"),
                    "region": bucket.get("Region", "unknown")
                })
        return formatted
    
    def _format_security_groups(self) -> List[Dict]:
        """Format security groups with detailed rule analysis."""
        sgs = self.resources.get("security_groups", [])
        formatted = []
        
        for sg in sgs:
            if isinstance(sg, dict) and "error" not in sg:
                inbound = sg.get("IpPermissions", [])
                outbound = sg.get("IpPermissionsEgress", [])
                
                formatted.append({
                    "group_id": sg.get("GroupId"),
                    "group_name": sg.get("GroupName"),
                    "vpc_id": sg.get("VpcId"),
                    "description": sg.get("Description"),
                    "inbound_rules": self._format_rules(inbound),
                    "outbound_rules": self._format_rules(outbound),
                    "is_default": sg.get("GroupName") == "default"
                })
        return formatted
    
    def _format_rules(self, rules: List[Dict]) -> List[Dict]:
        """Format security group rules for analysis."""
        formatted = []
        for rule in rules:
            formatted.append({
                "protocol": rule.get("IpProtocol"),
                "from_port": rule.get("FromPort"),
                "to_port": rule.get("ToPort"),
                "sources": [
                    {
                        "type": "cidr" if "CidrIp" in range else "sg",
                        "value": range.get("CidrIp") or range.get("GroupId"),
                        "is_open": range.get("CidrIp") == "0.0.0.0/0" if "CidrIp" in range else False
                    }
                    for range in rule.get("IpRanges", []) + rule.get("UserIdGroupPairs", [])
                ]
            })
        return formatted
    
    def _format_vpcs(self) -> List[Dict]:
        """Format VPCs with network topology info."""
        vpcs = self.resources.get("vpcs", [])
        formatted = []
        
        for vpc in vpcs:
            if isinstance(vpc, dict) and "error" not in vpc:
                formatted.append({
                    "vpc_id": vpc.get("VpcId"),
                    "cidr_block": vpc.get("CidrBlock"),
                    "is_default": vpc.get("IsDefault"),
                    "state": vpc.get("State"),
                    "tags": vpc.get("Tags", []),
                    "dhcp_options": vpc.get("DhcpOptionsId")
                })
        return formatted
    
    def _summarize_resources(self) -> Dict[str, int]:
        """Create a summary count of resources."""
        return {
            "total_ec2": len(self.resources.get("ec2_instances", [])),
            "total_s3": len(self.resources.get("s3_buckets", [])),
            "total_vpcs": len(self.resources.get("vpcs", [])),
            "total_security_groups": len(self.resources.get("security_groups", []))
        }
    
    def _get_timestamp(self) -> str:
        """Get current timestamp."""
        from datetime import datetime
        return datetime.utcnow().isoformat()
    
    def to_json(self, context_type: str = "security") -> str:
        """Convert context to JSON string for LLM consumption."""
        if context_type == "security":
            context = self.build_security_context()
        elif context_type == "cost":
            context = self.build_cost_context()
        else:
            context = self.build_terraform_context("")
        
        return json.dumps(context, indent=2)
