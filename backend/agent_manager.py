import json
import os
from tools.aws_scanner import AWSScanner
from tools.terraform_exec import TerraformExec
from llm_engine import LLMEngine

class AgentManager:
    def __init__(self):
        self.llm = LLMEngine()
        self.aws = AWSScanner()
        self.tf = TerraformExec()

    async def run_scan(self):
        resources = self.aws.scan_resources()
        
        system_prompt = "You are a Cloud Security Analyst. Analyze the following AWS resources and report security issues and suggestions in JSON format."
        prompt = f"AWS Resources: {json.dumps(resources)}"
        
        analysis_raw = await self.llm.generate_response(prompt, system_prompt)
        try:
            analysis = json.loads(analysis_raw)
        except json.JSONDecodeError:
            # Fallback for non-JSON response
            analysis = {"summary": analysis_raw}
            
        return {
            "resources": resources,
            "analysis": analysis
        }

    async def generate_iac(self, user_request, cloud_context=None):
        system_prompt = (
            "You are a Terraform Expert. Generate a single Terraform configuration file based on the user request. "
            "Return JSON with a 'terraform_code' field. Do not include markdown formatting in the code itself."
        )
        prompt = f"User Request: {user_request}\nContext: {json.dumps(cloud_context) if cloud_context else 'None'}"
        
        response_json = await self.llm.generate_response(prompt, system_prompt)
        try:
            data = json.loads(response_json)
        except json.JSONDecodeError:
            data = {"error": "Invalid JSON from LLM", "raw_response": response_json}
        
        tf_code = data.get("terraform_code", "")
        if tf_code:
            # Use absolute path based on this file's location
            backend_dir = os.path.dirname(os.path.abspath(__file__))
            terraform_dir = os.path.join(os.path.dirname(backend_dir), "terraform")
            os.makedirs(terraform_dir, exist_ok=True)
            main_tf_path = os.path.join(terraform_dir, "main.tf")
            with open(main_tf_path, "w") as f:
                f.write(tf_code)
        
        return data

    async def execute_iac(self):
        init_res = self.tf.init()
        if init_res.get("exit_code") != 0:
            return {"status": "error", "phase": "init", "output": init_res}
        
        plan_res = self.tf.plan()
        apply_res = self.tf.apply()
        
        return {
            "status": "success",
            "init": init_res,
            "plan": plan_res,
            "apply": apply_res
        }
