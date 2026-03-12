"""
Optimized AWS Service - Fast Async Scanning with Caching
"""
import boto3
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, List, Any, Optional
from botocore.exceptions import ClientError
from datetime import datetime, timedelta
import json
import os


class FastAWSService:
    """High-performance AWS service with async scanning and caching."""
    
    def __init__(self, region_name: str = "us-east-1", aws_access_key_id: str = None, 
                 aws_secret_access_key: str = None):
        self.region_name = region_name
        
        # Support custom credentials
        session_kwargs = {"region_name": region_name}
        if aws_access_key_id and aws_secret_access_key:
            session_kwargs.update({
                "aws_access_key_id": aws_access_key_id,
                "aws_secret_access_key": aws_secret_access_key
            })
        
        self.session = boto3.Session(**session_kwargs) if aws_access_key_id else boto3
        
        # Clients
        self.ec2 = self.session.client("ec2", region_name=region_name)
        self.s3 = self.session.client("s3", region_name=region_name)
        self.iam = self.session.client("iam", region_name=region_name)
        
        # Cache
        self._cache = {}
        self._cache_timestamp = None
        self._cache_duration = timedelta(minutes=5)  # Cache for 5 minutes
        
        # Thread pool for parallel operations
        self._executor = ThreadPoolExecutor(max_workers=10)
    
    def _get_cached(self, key: str) -> Optional[Any]:
        """Get cached data if valid."""
        if self._cache_timestamp and datetime.now() - self._cache_timestamp < self._cache_duration:
            return self._cache.get(key)
        return None
    
    def _set_cached(self, key: str, value: Any):
        """Set cached data."""
        if not self._cache_timestamp:
            self._cache_timestamp = datetime.now()
        self._cache[key] = value
    
    def clear_cache(self):
        """Clear the cache."""
        self._cache = {}
        self._cache_timestamp = None
    
    async def scan_all_resources_async(self, force_refresh: bool = False) -> Dict[str, Any]:
        """Fast async scan of all AWS resources using parallel execution."""
        # Check cache first (unless force_refresh)
        if not force_refresh:
            cached = self._get_cached("all_resources")
            if cached:
                return {**cached, "cached": True, "scan_timestamp": datetime.utcnow().isoformat()}
        
        # Clear cache if forcing refresh
        if force_refresh:
            self.clear_cache()
        
        # Run all scans in parallel using ThreadPoolExecutor
        loop = asyncio.get_event_loop()
        
        # Define all scan tasks
        tasks = [
            loop.run_in_executor(self._executor, self.get_ec2_instances_detailed),
            loop.run_in_executor(self._executor, self.get_s3_buckets_detailed),
            loop.run_in_executor(self._executor, self.get_vpcs_detailed),
            loop.run_in_executor(self._executor, self.get_security_groups_detailed),
            loop.run_in_executor(self._executor, self.get_ebs_volumes),
            loop.run_in_executor(self._executor, self.get_load_balancers),
            loop.run_in_executor(self._executor, self.get_rds_instances),
        ]
        
        # Execute all tasks concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Build result dict
        resource_types = [
            "ec2_instances", "s3_buckets", "vpcs", "security_groups", 
            "ebs_volumes", "load_balancers", "rds_instances"
        ]
        
        result = {
            "region": self.region_name,
            "scan_timestamp": datetime.utcnow().isoformat(),
            "cached": False,
            "scan_duration_ms": 0
        }
        
        start_time = datetime.now()
        
        for i, (resource_type, data) in enumerate(zip(resource_types, results)):
            if isinstance(data, Exception):
                result[resource_type] = [{"error": str(data)}]
            else:
                result[resource_type] = data
        
        # Calculate scan duration
        duration = (datetime.now() - start_time).total_seconds() * 1000
        result["scan_duration_ms"] = round(duration, 2)
        
        # Cache the result
        self._set_cached("all_resources", result)
        
        return result
    
    def scan_all_resources(self, force_refresh: bool = False) -> Dict[str, Any]:
        """Synchronous wrapper for async scan."""
        try:
            # Try to run async version
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If already in async context, create new loop
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            return loop.run_until_complete(self.scan_all_resources_async(force_refresh=force_refresh))
        except RuntimeError:
            # Fallback to sequential if async fails
            return self._scan_all_resources_sequential()
    
    def _scan_all_resources_sequential(self) -> Dict[str, Any]:
        """Fallback sequential scan (slower but reliable)."""
        start_time = datetime.now()
        
        result = {
            "ec2_instances": self.get_ec2_instances_detailed(),
            "s3_buckets": self.get_s3_buckets_detailed(),
            "vpcs": self.get_vpcs_detailed(),
            "security_groups": self.get_security_groups_detailed(),
            "ebs_volumes": self.get_ebs_volumes(),
            "load_balancers": self.get_load_balancers(),
            "rds_instances": self.get_rds_instances(),
            "region": self.region_name,
            "scan_timestamp": datetime.utcnow().isoformat(),
            "cached": False,
            "scan_duration_ms": 0
        }
        
        duration = (datetime.now() - start_time).total_seconds() * 1000
        result["scan_duration_ms"] = round(duration, 2)
        
        return result
    
    def get_ec2_instances_detailed(self) -> List[Dict]:
        """Get detailed EC2 instance information - optimized."""
        try:
            response = self.ec2.describe_instances()
            instances = []
            
            for reservation in response.get("Reservations", []):
                for instance in reservation.get("Instances", []):
                    # Only fetch essential data for speed
                    instances.append({
                        "InstanceId": instance.get("InstanceId"),
                        "InstanceType": instance.get("InstanceType"),
                        "State": instance.get("State", {}).get("Name"),
                        "PublicIpAddress": instance.get("PublicIpAddress"),
                        "PrivateIpAddress": instance.get("PrivateIpAddress"),
                        "VpcId": instance.get("VpcId"),
                        "SubnetId": instance.get("SubnetId"),
                        "SecurityGroups": instance.get("SecurityGroups", []),
                        "Tags": instance.get("Tags", []),
                        "LaunchTime": str(instance.get("LaunchTime", "")),
                    })
            
            return instances
        except ClientError as e:
            return [{"error": str(e), "service": "EC2"}]
    
    def get_s3_buckets_detailed(self) -> List[Dict]:
        """Get S3 bucket information - optimized with parallel checks."""
        try:
            response = self.s3.list_buckets()
            buckets = []
            
            for bucket in response.get("Buckets", []):
                bucket_name = bucket.get("Name")
                bucket_info = {
                    "Name": bucket_name,
                    "CreationDate": str(bucket.get("CreationDate", "")),
                }
                
                # Quick check for public access (fast API call)
                try:
                    public_access = self.s3.get_public_access_block(Bucket=bucket_name)
                    config = public_access.get("PublicAccessBlockConfiguration", {})
                    bucket_info["PublicAccess"] = "blocked" if all([
                        config.get("BlockPublicAcls"),
                        config.get("BlockPublicPolicy"),
                    ]) else "partial"
                except ClientError:
                    bucket_info["PublicAccess"] = "unknown"
                
                # Quick encryption check
                try:
                    encryption = self.s3.get_bucket_encryption(Bucket=bucket_name)
                    rules = encryption.get("ServerSideEncryptionConfiguration", {}).get("Rules", [])
                    bucket_info["Encrypted"] = len(rules) > 0
                except ClientError:
                    bucket_info["Encrypted"] = False
                
                buckets.append(bucket_info)
            
            return buckets
        except ClientError as e:
            return [{"error": str(e), "service": "S3"}]
    
    def get_vpcs_detailed(self) -> List[Dict]:
        """Get VPC information - optimized."""
        try:
            response = self.ec2.describe_vpcs()
            vpcs = []
            
            for vpc in response.get("Vpcs", []):
                vpc_info = {
                    "VpcId": vpc.get("VpcId"),
                    "CidrBlock": vpc.get("CidrBlock"),
                    "IsDefault": vpc.get("IsDefault"),
                    "State": vpc.get("State"),
                    "Tags": vpc.get("Tags", []),
                }
                
                # Get subnet count (faster than full subnet details)
                try:
                    subnets = self.ec2.describe_subnets(
                        Filters=[{"Name": "vpc-id", "Values": [vpc.get("VpcId")]}]
                    )
                    vpc_info["SubnetCount"] = len(subnets.get("Subnets", []))
                except:
                    vpc_info["SubnetCount"] = 0
                
                vpcs.append(vpc_info)
            
            return vpcs
        except ClientError as e:
            return [{"error": str(e), "service": "VPC"}]
    
    def get_security_groups_detailed(self) -> List[Dict]:
        """Get security group information - optimized."""
        try:
            response = self.ec2.describe_security_groups()
            security_groups = []
            
            for sg in response.get("SecurityGroups", []):
                # Quick analysis of inbound rules
                inbound_rules = sg.get("IpPermissions", [])
                has_open_ports = False
                open_ports = []
                
                for rule in inbound_rules:
                    for ip_range in rule.get("IpRanges", []):
                        if ip_range.get("CidrIp") == "0.0.0.0/0":
                            has_open_ports = True
                            open_ports.append(rule.get("FromPort"))
                
                security_groups.append({
                    "GroupId": sg.get("GroupId"),
                    "GroupName": sg.get("GroupName"),
                    "Description": sg.get("Description"),
                    "VpcId": sg.get("VpcId"),
                    "IsDefault": sg.get("GroupName") == "default",
                    "InboundRulesCount": len(inbound_rules),
                    "HasOpenPorts": has_open_ports,
                    "OpenPorts": open_ports,
                })
            
            return security_groups
        except ClientError as e:
            return [{"error": str(e), "service": "SecurityGroups"}]
    
    def get_ebs_volumes(self) -> List[Dict]:
        """Get EBS volume information - optimized."""
        try:
            response = self.ec2.describe_volumes()
            volumes = []
            
            for vol in response.get("Volumes", []):
                volumes.append({
                    "VolumeId": vol.get("VolumeId"),
                    "Size": vol.get("Size"),
                    "VolumeType": vol.get("VolumeType"),
                    "State": vol.get("State"),
                    "Encrypted": vol.get("Encrypted", False),
                    "Attachments": len(vol.get("Attachments", [])),
                })
            
            return volumes
        except ClientError as e:
            return [{"error": str(e), "service": "EBS"}]
    
    def get_load_balancers(self) -> List[Dict]:
        """Get load balancer information - optimized."""
        try:
            elbv2 = self.session.client("elbv2", region_name=self.region_name)
            response = elbv2.describe_load_balancers()
            
            lbs = []
            for lb in response.get("LoadBalancers", []):
                lbs.append({
                    "LoadBalancerName": lb.get("LoadBalancerName"),
                    "DNSName": lb.get("DNSName"),
                    "Type": lb.get("Type"),
                    "Scheme": lb.get("Scheme"),
                    "VpcId": lb.get("VpcId"),
                    "State": lb.get("State", {}).get("Code"),
                })
            
            return lbs
        except ClientError as e:
            return [{"error": str(e), "service": "ELB"}]
    
    def get_rds_instances(self) -> List[Dict]:
        """Get RDS database instances - optimized."""
        try:
            rds = self.session.client("rds", region_name=self.region_name)
            response = rds.describe_db_instances()
            
            instances = []
            for db in response.get("DBInstances", []):
                instances.append({
                    "DBInstanceIdentifier": db.get("DBInstanceIdentifier"),
                    "DBInstanceClass": db.get("DBInstanceClass"),
                    "Engine": db.get("Engine"),
                    "DBInstanceStatus": db.get("DBInstanceStatus"),
                    "PubliclyAccessible": db.get("PubliclyAccessible", False),
                    "StorageEncrypted": db.get("StorageEncrypted", False),
                })
            
            return instances
        except ClientError as e:
            return [{"error": str(e), "service": "RDS"}]
    
    @staticmethod
    def validate_credentials(aws_access_key_id: str, aws_secret_access_key: str, region: str = "us-east-1") -> Dict[str, Any]:
        """Validate AWS credentials by making a test API call."""
        try:
            session = boto3.Session(
                aws_access_key_id=aws_access_key_id,
                aws_secret_access_key=aws_secret_access_key,
                region_name=region
            )
            
            # Test with STS GetCallerIdentity
            sts = session.client("sts")
            identity = sts.get_caller_identity()
            
            return {
                "valid": True,
                "account": identity.get("Account"),
                "arn": identity.get("Arn"),
                "user_id": identity.get("UserId"),
            }
        except ClientError as e:
            return {
                "valid": False,
                "error": str(e),
            }
