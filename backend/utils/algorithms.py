import json
from typing import Dict, List, Any

class InfrastructureGraphSolver:
    """Solves reachability and dependency paths between cloud resources."""
    
    def __init__(self, resources: Dict[str, Any]):
        self.resources = resources
        self.nodes = {}
        self.edges = []
        self._build_graph()

    def _build_graph(self):
        """Constructs a graph representation of the infrastructure."""
        # Add EC2 nodes
        for instance in self.resources.get("ec2_instances", []):
            if isinstance(instance, dict) and "InstanceId" in instance:
                self.nodes[instance["InstanceId"]] = {"type": "ec2", "data": instance}
        
        # Add Security Group nodes and edges
        for sg in self.resources.get("security_groups", []):
            if isinstance(sg, dict) and "GroupId" in sg:
                self.nodes[sg["GroupId"]] = {"type": "security_group", "data": sg}
                # Link SG to instances
                for instance_id, node in self.nodes.items():
                    if node["type"] == "ec2":
                        if any(s.get("GroupId") == sg["GroupId"] if isinstance(s, dict) else s == sg["GroupId"] for s in node["data"].get("SecurityGroups", [])):
                            self.edges.append({"from": sg["GroupId"], "to": instance_id, "label": "protects"})

    def trace_reachability(self, resource_id: str) -> List[Dict[str, Any]]:
        """Traces the connectivity path from internet gateways to a specific resource."""
        if resource_id not in self.nodes:
            return [{"error": "Resource not found in graph"}]
            
        # 1. Identify VPC
        vpc_id = self.nodes[resource_id]["data"].get("VpcId")
        if not vpc_id:
            return [{"type": "ec2", "id": resource_id, "reachable": False, "reason": "No VPC"}]

        # 2. Check for Internet Gateway in VPC
        igws = [rt["RouteTableId"] for rt in self.resources.get("route_tables", []) 
                if rt.get("VpcId") == vpc_id and any(r.get("GatewayId", "").startswith("igw-") for r in rt.get("Routes", []))]
        
        path = []
        if igws:
            path.append({"type": "igw", "status": "present", "id": igws[0]})
            # 3. Check Security Groups
            sgs = [sg for sg_id, node in self.nodes.items() if node["type"] == "security_group" 
                   and any(e["to"] == resource_id for e in self.edges if e["from"] == sg_id)]
            
            is_exposed = False
            for sg in sgs:
                rules = sg["data"].get("IpPermissions", [])
                for rule in rules:
                    for ip_range in rule.get("IpRanges", []):
                        if ip_range.get("CidrIp") == "0.0.0.0/0":
                            is_exposed = True
                            path.append({"type": "security_group", "id": sg["data"]["GroupId"], "exposed": True})
                            break
                    if is_exposed: break
            
            return path
        return [{"type": "vpc", "id": vpc_id, "reachable": False, "reason": "No Internet Gateway"}]

class CloudCostPredictor:
    """Calculates granular cost estimates and projections."""
    
    def __init__(self, resources: Dict[str, Any]):
        self.resources = resources
        self.prices = {
            "t2.micro": 0.0116,
            "t3.medium": 0.0416,
            "ebs_gp3_per_gb": 0.08 / 730,
            "s3_standard_per_gb": 0.023
        }

    def predict_monthly(self) -> Dict[str, Any]:
        """Detailed monthly cost projection."""
        total = 0
        breakdown = {}
        
        # EC2 Costs
        ec2_total = 0
        for inst in self.resources.get("ec2_instances", []):
            if inst.get("State") == "running":
                rate = self.prices.get(inst.get("InstanceType"), 0.05)
                ec2_total += rate * 730
        
        breakdown["ec2"] = ec2_total
        # EBS, S3, RDS...
        return {"total": sum(breakdown.values()), "breakdown": breakdown}

class ComplianceRules:
    """Applies CIS and best-practice rules to scanned resources."""
    
    def __init__(self, resources: Dict[str, Any]):
        self.resources = resources

    def audit(self) -> List[Dict[str, Any]]:
        findings = []
        
        # Rule: Public S3 buckets
        for bucket in self.resources.get("s3_buckets", []):
            if bucket.get("PublicAccess") == "public":
                findings.append({
                    "id": "SEC-001",
                    "severity": "CRITICAL",
                    "resource": bucket["Name"],
                    "message": "S3 Bucket is publicly accessible"
                })
        
        # Rule: Open SSH/RDP
        for sg in self.resources.get("security_groups", []):
            for rule in sg.get("IpPermissions", []):
                for ip_range in rule.get("IpRanges", []):
                    if ip_range.get("CidrIp") == "0.0.0.0/0":
                        from_port = rule.get("FromPort")
                        to_port = rule.get("ToPort")
                        # Check if port is 22, 3389 or if it's a range including them
                        is_vulnerable = False
                        if from_port is None: # All ports
                            is_vulnerable = True
                        elif from_port <= 22 <= (to_port or from_port):
                            is_vulnerable = True
                        elif from_port <= 3389 <= (to_port or from_port):
                            is_vulnerable = True
                            
                        if is_vulnerable:
                            findings.append({
                                "id": "SEC-002",
                                "severity": "HIGH",
                                "resource": sg["GroupId"],
                                "message": f"Port {from_port or 'all'} is open to the world (0.0.0.0/0)"
                            })
                            break # One finding per SG is enough for this rule
        
        return findings
