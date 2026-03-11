"""
Terraform Service - Enhanced Terraform execution with state management.
"""
import os
import subprocess
from typing import Dict, Any, Optional
import json


class TerraformService:
    """Service for executing Terraform operations with safety controls."""
    
    def __init__(self, terraform_dir: str = None):
        if terraform_dir is None:
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            terraform_dir = os.path.join(backend_dir, "terraform")
        
        self.terraform_dir = terraform_dir
        self._ensure_directory()
        
        # Execution history
        self.execution_history = []
    
    def _ensure_directory(self):
        """Ensure terraform directory exists."""
        if not os.path.exists(self.terraform_dir):
            os.makedirs(self.terraform_dir)
    
    def write_terraform_file(self, code: str, filename: str = "main.tf") -> Dict[str, Any]:
        """Write Terraform code to file."""
        try:
            filepath = os.path.join(self.terraform_dir, filename)
            
            # Backup existing file if present
            if os.path.exists(filepath):
                backup_path = filepath + ".backup"
                with open(filepath, 'r') as f:
                    existing = f.read()
                with open(backup_path, 'w') as f:
                    f.write(existing)
            
            # Write new code
            with open(filepath, 'w') as f:
                f.write(code)
            
            return {
                "success": True,
                "filepath": filepath,
                "lines_written": len(code.split('\n'))
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def run_command(self, command: str, timeout: int = 300) -> Dict[str, Any]:
        """Run a Terraform command."""
        try:
            process = subprocess.run(
                command,
                cwd=self.terraform_dir,
                capture_output=True,
                shell=True,
                text=True,
                timeout=timeout,
                check=False
            )
            
            result = {
                "command": command,
                "exit_code": process.returncode,
                "stdout": process.stdout,
                "stderr": process.stderr,
                "success": process.returncode == 0
            }
            
            # Log execution
            self.execution_history.append(result)
            
            return result
            
        except subprocess.TimeoutExpired:
            return {
                "command": command,
                "exit_code": -1,
                "stdout": "",
                "stderr": f"Command timed out after {timeout} seconds",
                "success": False
            }
        except Exception as e:
            return {
                "command": command,
                "exit_code": -1,
                "stdout": "",
                "stderr": str(e),
                "success": False
            }
    
    def init(self) -> Dict[str, Any]:
        """Run terraform init."""
        return self.run_command("terraform init -input=false")
    
    def validate(self) -> Dict[str, Any]:
        """Run terraform validate."""
        return self.run_command("terraform validate")
    
    def plan(self) -> Dict[str, Any]:
        """Run terraform plan."""
        return self.run_command("terraform plan -input=false -no-color")
    
    def apply(self, auto_approve: bool = False) -> Dict[str, Any]:
        """Run terraform apply."""
        flag = "-auto-approve" if auto_approve else ""
        return self.run_command(f"terraform apply -input=false -no-color {flag}".strip())
    
    def destroy(self, auto_approve: bool = False) -> Dict[str, Any]:
        """Run terraform destroy."""
        flag = "-auto-approve" if auto_approve else ""
        return self.run_command(f"terraform destroy -input=false -no-color {flag}".strip())
    
    def get_state(self) -> Dict[str, Any]:
        """Get current Terraform state."""
        state_file = os.path.join(self.terraform_dir, "terraform.tfstate")
        if os.path.exists(state_file):
            try:
                with open(state_file, 'r') as f:
                    return json.load(f)
            except:
                return {"error": "Failed to parse state file"}
        return {"resources": []}
    
    def get_plan_summary(self) -> Dict[str, Any]:
        """Get a summary of what would be created/changed."""
        plan_result = self.plan()
        
        stdout = plan_result.get("stdout", "")
        
        # Parse plan output for resource counts
        add_count = stdout.count("will be created")
        change_count = stdout.count("will be changed")
        destroy_count = stdout.count("will be destroyed")
        
        return {
            "plan_output": plan_result,
            "summary": {
                "resources_to_add": add_count,
                "resources_to_change": change_count,
                "resources_to_destroy": destroy_count
            },
            "requires_confirmation": add_count > 0 or change_count > 0 or destroy_count > 0
        }
    
    def execute_with_confirmation(self, confirmation: bool = False) -> Dict[str, Any]:
        """Execute Terraform with optional auto-approval."""
        results = {
            "phases": []
        }
        
        # Phase 1: Init
        init_result = self.init()
        results["phases"].append({"phase": "init", "result": init_result})
        
        if not init_result["success"]:
            results["success"] = False
            results["failed_at"] = "init"
            return results
        
        # Phase 2: Validate
        validate_result = self.validate()
        results["phases"].append({"phase": "validate", "result": validate_result})
        
        if not validate_result["success"]:
            results["success"] = False
            results["failed_at"] = "validate"
            return results
        
        # Phase 3: Plan
        plan_result = self.plan()
        results["phases"].append({"phase": "plan", "result": plan_result})
        
        if not plan_result["success"]:
            results["success"] = False
            results["failed_at"] = "plan"
            return results
        
        # Phase 4: Apply (with confirmation)
        apply_result = self.apply(auto_approve=confirmation)
        results["phases"].append({"phase": "apply", "result": apply_result})
        results["success"] = apply_result["success"]
        results["requires_confirmation"] = not confirmation
        
        return results
    
    def get_execution_history(self) -> list:
        """Get history of executed commands."""
        return self.execution_history
    
    def format_for_display(self, result: Dict[str, Any]) -> str:
        """Format command result for frontend display."""
        output = []
        
        if result.get("command"):
            output.append(f"$ {result['command']}")
            output.append("-" * 50)
        
        if result.get("stdout"):
            output.append(result["stdout"])
        
        if result.get("stderr"):
            output.append("STDERR:")
            output.append(result["stderr"])
        
        output.append(f"Exit code: {result.get('exit_code', 'unknown')}")
        
        return "\n".join(output)
