"""
AWS Service - Wrapper for AWS operations with enhanced data collection.
"""
import boto3
from typing import Dict, List, Any
from botocore.exceptions import ClientError


class AWSService:
    """Enhanced AWS service for comprehensive resource scanning."""
    
    def __init__(self, region_name: str = "us-east-1"):
        self.region_name = region_name
        self.ec2 = boto3.client("ec2", region_name=region_name)
        self.s3 = boto3.client("s3", region_name=region_name)
        self.iam = boto3.client("iam", region_name=region_name)
    
    def scan_all_resources(self) -> Dict[str, Any]:
        """Comprehensive scan of all AWS resources."""
        return {
            "ec2_instances": self.get_ec2_instances_detailed(),
            "s3_buckets": self.get_s3_buckets_detailed(),
            "vpcs": self.get_vpcs_detailed(),
            "security_groups": self.get_security_groups_detailed(),
            "ebs_volumes": self.get_ebs_volumes(),
            "load_balancers": self.get_load_balancers(),
            "rds_instances": self.get_rds_instances(),
            "route_tables": self.get_route_tables(),
            "iam_summary": self.get_iam_summary(),
            "region": self.region_name,
            "scan_timestamp": self._get_timestamp()
        }
    
    def get_ec2_instances_detailed(self) -> List[Dict]:
        """Get detailed EC2 instance information."""
        try:
            response = self.ec2.describe_instances()
            instances = []
            
            for reservation in response["Reservations"]:
                for instance in reservation["Instances"]:
                    # Get security group details
                    sg_ids = [sg["GroupId"] for sg in instance.get("SecurityGroups", [])]
                    
                    # Get attached volumes
                    volumes = []
                    for bdm in instance.get("BlockDeviceMappings", []):
                        volumes.append({
                            "volume_id": bdm.get("Ebs", {}).get("VolumeId"),
                            "device": bdm.get("DeviceName")
                        })
                    
                    instances.append({
                        "InstanceId": instance["InstanceId"],
                        "InstanceType": instance["InstanceType"],
                        "State": instance["State"]["Name"],
                        "PublicIpAddress": instance.get("PublicIpAddress"),
                        "PrivateIpAddress": instance.get("PrivateIpAddress"),
                        "VpcId": instance.get("VpcId"),
                        "SubnetId": instance.get("SubnetId"),
                        "SecurityGroups": instance.get("SecurityGroups", []),
                        "SecurityGroupIds": sg_ids,
                        "Platform": instance.get("Platform", "Linux/Unix"),
                        "Architecture": instance.get("Architecture"),
                        "LaunchTime": str(instance.get("LaunchTime")),
                        "EbsOptimized": instance.get("EbsOptimized", False),
                        "Volumes": volumes,
                        "Tags": instance.get("Tags", []),
                        "KeyName": instance.get("KeyName"),
                        "CpuOptions": instance.get("CpuOptions", {}),
                        "MetadataOptions": instance.get("MetadataOptions", {})
                    })
            return instances
        except ClientError as e:
            return [{"error": str(e)}]
    
    def get_s3_buckets_detailed(self) -> List[Dict]:
        """Get detailed S3 bucket information including security settings."""
        try:
            response = self.s3.list_buckets()
            buckets = []
            
            for bucket in response["Buckets"]:
                bucket_name = bucket["Name"]
                bucket_info = {
                    "Name": bucket_name,
                    "CreationDate": str(bucket["CreationDate"]),
                    "Region": "unknown"
                }
                
                # Get bucket location
                try:
                    location = self.s3.get_bucket_location(Bucket=bucket_name)
                    bucket_info["Region"] = location.get("LocationConstraint") or "us-east-1"
                except:
                    pass
                
                # Check public access block
                try:
                    public_access = self.s3.get_public_access_block(Bucket=bucket_name)
                    config = public_access.get("PublicAccessBlockConfiguration", {})
                    bucket_info["PublicAccessBlock"] = config
                    bucket_info["PublicAccess"] = "blocked" if all([
                        config.get("BlockPublicAcls"),
                        config.get("BlockPublicPolicy"),
                        config.get("IgnorePublicAcls"),
                        config.get("RestrictPublicBuckets")
                    ]) else "partial"
                except ClientError:
                    bucket_info["PublicAccess"] = "unknown"
                
                # Check encryption
                try:
                    encryption = self.s3.get_bucket_encryption(Bucket=bucket_name)
                    rules = encryption.get("ServerSideEncryptionConfiguration", {}).get("Rules", [])
                    bucket_info["Encryption"] = rules[0].get("ApplyServerSideEncryptionByDefault", {}).get("SSEAlgorithm", "unknown")
                except ClientError:
                    bucket_info["Encryption"] = "none"
                
                # Check versioning
                try:
                    versioning = self.s3.get_bucket_versioning(Bucket=bucket_name)
                    bucket_info["Versioning"] = versioning.get("Status", "disabled")
                except:
                    bucket_info["Versioning"] = "unknown"
                
                buckets.append(bucket_info)
            
            return buckets
        except ClientError as e:
            return [{"error": str(e)}]
    
    def get_vpcs_detailed(self) -> List[Dict]:
        """Get detailed VPC information."""
        try:
            response = self.ec2.describe_vpcs()
            vpcs = []
            
            for vpc in response["Vpcs"]:
                vpc_id = vpc["VpcId"]
                vpc_info = {
                    "VpcId": vpc_id,
                    "CidrBlock": vpc["CidrBlock"],
                    "IsDefault": vpc["IsDefault"],
                    "State": vpc["State"],
                    "Tags": vpc.get("Tags", []),
                    "DhcpOptionsId": vpc.get("DhcpOptionsId")
                }
                
                # Get subnets
                try:
                    subnets_response = self.ec2.describe_subnets(Filters=[{"Name": "vpc-id", "Values": [vpc_id]}])
                    vpc_info["Subnets"] = [
                        {
                            "SubnetId": s["SubnetId"],
                            "CidrBlock": s["CidrBlock"],
                            "AvailabilityZone": s["AvailabilityZone"],
                            "MapPublicIpOnLaunch": s["MapPublicIpOnLaunch"],
                            "Tags": s.get("Tags", [])
                        }
                        for s in subnets_response.get("Subnets", [])
                    ]
                except:
                    vpc_info["Subnets"] = []
                
                # Get internet gateways
                try:
                    igw_response = self.ec2.describe_internet_gateways(
                        Filters=[{"Name": "attachment.vpc-id", "Values": [vpc_id]}]
                    )
                    vpc_info["InternetGateways"] = [
                        {"IgwId": igw["InternetGatewayId"]} 
                        for igw in igw_response.get("InternetGateways", [])
                    ]
                except:
                    vpc_info["InternetGateways"] = []
                
                vpcs.append(vpc_info)
            
            return vpcs
        except ClientError as e:
            return [{"error": str(e)}]
    
    def get_security_groups_detailed(self) -> List[Dict]:
        """Get detailed security group information with rule analysis."""
        try:
            response = self.ec2.describe_security_groups()
            security_groups = []
            
            for sg in response["SecurityGroups"]:
                # Format inbound rules
                inbound_rules = []
                for rule in sg.get("IpPermissions", []):
                    rule_info = {
                        "Protocol": rule.get("IpProtocol"),
                        "FromPort": rule.get("FromPort"),
                        "ToPort": rule.get("ToPort"),
                        "Sources": []
                    }
                    
                    # IP ranges
                    for ip_range in rule.get("IpRanges", []):
                        cidr = ip_range.get("CidrIp")
                        rule_info["Sources"].append({
                            "Type": "CidrIp",
                            "Value": cidr,
                            "IsOpen": cidr == "0.0.0.0/0",
                            "Description": ip_range.get("Description", "")
                        })
                    
                    # IPv6 ranges
                    for ipv6_range in rule.get("Ipv6Ranges", []):
                        cidr = ipv6_range.get("CidrIpv6")
                        rule_info["Sources"].append({
                            "Type": "CidrIpv6",
                            "Value": cidr,
                            "IsOpen": cidr == "::/0",
                            "Description": ipv6_range.get("Description", "")
                        })
                    
                    # Security group references
                    for group in rule.get("UserIdGroupPairs", []):
                        rule_info["Sources"].append({
                            "Type": "SecurityGroup",
                            "Value": group.get("GroupId"),
                            "IsOpen": False,
                            "Description": group.get("Description", "")
                        })
                    
                    inbound_rules.append(rule_info)
                
                security_groups.append({
                    "GroupId": sg["GroupId"],
                    "GroupName": sg["GroupName"],
                    "Description": sg["Description"],
                    "VpcId": sg.get("VpcId"),
                    "IsDefault": sg["GroupName"] == "default",
                    "InboundRules": inbound_rules,
                    "OutboundRules": len(sg.get("IpPermissionsEgress", [])),
                    "Tags": sg.get("Tags", [])
                })
            
            return security_groups
        except ClientError as e:
            return [{"error": str(e)}]
    
    def get_ebs_volumes(self) -> List[Dict]:
        """Get EBS volume information."""
        try:
            response = self.ec2.describe_volumes()
            volumes = []
            
            for vol in response["Volumes"]:
                volumes.append({
                    "VolumeId": vol["VolumeId"],
                    "Size": vol["Size"],
                    "VolumeType": vol["VolumeType"],
                    "State": vol["State"],
                    "Iops": vol.get("Iops"),
                    "Encrypted": vol.get("Encrypted", False),
                    "KmsKeyId": vol.get("KmsKeyId"),
                    "Attachments": [
                        {
                            "InstanceId": a.get("InstanceId"),
                            "Device": a.get("Device"),
                            "State": a.get("State")
                        }
                        for a in vol.get("Attachments", [])
                    ],
                    "CreateTime": str(vol.get("CreateTime")),
                    "Tags": vol.get("Tags", [])
                })
            
            return volumes
        except ClientError as e:
            return [{"error": str(e)}]
    
    def get_load_balancers(self) -> List[Dict]:
        """Get load balancer information."""
        try:
            elbv2 = boto3.client("elbv2", region_name=self.region_name)
            response = elbv2.describe_load_balancers()
            
            lbs = []
            for lb in response["LoadBalancers"]:
                lbs.append({
                    "LoadBalancerName": lb["LoadBalancerName"],
                    "DNSName": lb["DNSName"],
                    "Type": lb["Type"],
                    "Scheme": lb["Scheme"],
                    "VpcId": lb.get("VpcId"),
                    "State": lb["State"]["Code"],
                    "AvailabilityZones": [az["ZoneName"] for az in lb.get("AvailabilityZones", [])],
                    "CreatedTime": str(lb.get("CreatedTime"))
                })
            
            return lbs
        except ClientError as e:
            return [{"error": str(e)}]
    
    def get_rds_instances(self) -> List[Dict]:
        """Get RDS database instances."""
        try:
            rds = boto3.client("rds", region_name=self.region_name)
            response = rds.describe_db_instances()
            
            instances = []
            for db in response["DBInstances"]:
                instances.append({
                    "DBInstanceIdentifier": db["DBInstanceIdentifier"],
                    "DBInstanceClass": db["DBInstanceClass"],
                    "Engine": db["Engine"],
                    "EngineVersion": db.get("EngineVersion"),
                    "DBInstanceStatus": db["DBInstanceStatus"],
                    "AllocatedStorage": db.get("AllocatedStorage"),
                    "PubliclyAccessible": db.get("PubliclyAccessible", False),
                    "StorageEncrypted": db.get("StorageEncrypted", False),
                    "VpcSecurityGroups": [sg["VpcSecurityGroupId"] for sg in db.get("VpcSecurityGroups", [])],
                    "InstanceCreateTime": str(db.get("InstanceCreateTime"))
                })
            
            return instances
        except ClientError as e:
            return [{"error": str(e)}]
    
    def get_route_tables(self) -> List[Dict]:
        """Get VPC Route Tables for reachability analysis."""
        try:
            response = self.ec2.describe_route_tables()
            return [
                {
                    "RouteTableId": rt["RouteTableId"],
                    "VpcId": rt["VpcId"],
                    "Routes": rt.get("Routes", []),
                    "Associations": rt.get("Associations", [])
                }
                for rt in response.get("RouteTables", [])
            ]
        except ClientError as e:
            return [{"error": str(e)}]

    def get_iam_summary(self) -> Dict[str, Any]:
        """Get summary of IAM users and roles for security analysis."""
        try:
            users = self.iam.list_users().get("Users", [])
            roles = self.iam.list_roles().get("Roles", [])
            return {
                "user_count": len(users),
                "role_count": len(roles),
                "has_admin_roles": any("Admin" in r["RoleName"] for r in roles)
            }
        except ClientError as e:
            return {"error": str(e)}

    def _get_timestamp(self) -> str:
        """Get current timestamp."""
        from datetime import datetime
        return datetime.utcnow().isoformat()
