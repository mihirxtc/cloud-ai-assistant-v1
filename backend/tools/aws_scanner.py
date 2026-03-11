import boto3
import json
from botocore.exceptions import ClientError

class AWSScanner:
    def __init__(self, region_name="us-east-1"):
        self.region_name = region_name
        self.ec2 = boto3.client("ec2", region_name=region_name)
        self.s3 = boto3.client("s3", region_name=region_name)

    def scan_resources(self):
        resources = {
            "ec2_instances": self._get_ec2_instances(),
            "s3_buckets": self._get_s3_buckets(),
            "vpcs": self._get_vpcs(),
            "security_groups": self._get_security_groups()
        }
        return resources

    def _get_ec2_instances(self):
        try:
            response = self.ec2.describe_instances()
            instances = []
            for reservation in response["Reservations"]:
                for instance in reservation["Instances"]:
                    instances.append({
                        "InstanceId": instance["InstanceId"],
                        "InstanceType": instance["InstanceType"],
                        "State": instance["State"]["Name"],
                        "PublicIpAddress": instance.get("PublicIpAddress", "N/A")
                    })
            return instances
        except ClientError as e:
            return {"error": str(e)}

    def _get_s3_buckets(self):
        try:
            response = self.s3.list_buckets()
            buckets = []
            for bucket in response["Buckets"]:
                buckets.append({
                    "Name": bucket["Name"],
                    "CreationDate": str(bucket["CreationDate"])
                })
            return buckets
        except ClientError as e:
            return {"error": str(e)}

    def _get_vpcs(self):
        try:
            response = self.ec2.describe_vpcs()
            vpcs = []
            for vpc in response["Vpcs"]:
                vpcs.append({
                    "VpcId": vpc["VpcId"],
                    "CidrBlock": vpc["CidrBlock"],
                    "IsDefault": vpc["IsDefault"]
                })
            return vpcs
        except ClientError as e:
            return {"error": str(e)}

    def _get_security_groups(self):
        try:
            response = self.ec2.describe_security_groups()
            sgs = []
            for sg in response["SecurityGroups"]:
                sgs.append({
                    "GroupId": sg["GroupId"],
                    "GroupName": sg["GroupName"],
                    "Description": sg["Description"],
                    "IpPermissions": sg["IpPermissions"]
                })
            return sgs
        except ClientError as e:
            return {"error": str(e)}
