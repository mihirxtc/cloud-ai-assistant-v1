import os
import subprocess

class TerraformExec:
    def __init__(self, terraform_dir=None):
        if terraform_dir is None:
            # Get project root (parent of backend directory)
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            terraform_dir = os.path.join(backend_dir, "terraform")
        self.terraform_dir = terraform_dir
        if not os.path.exists(self.terraform_dir):
            os.makedirs(self.terraform_dir)

    def run_command(self, command):
        try:
            process = subprocess.run(
                command,
                cwd=self.terraform_dir,
                capture_output=True,
                shell=True,
                text=True,
                check=False
            )
            return {
                "stdout": process.stdout,
                "stderr": process.stderr,
                "exit_code": process.returncode
            }
        except Exception as e:
            return {"error": str(e), "stdout": "", "stderr": str(e), "exit_code": -1}

    def init(self):
        return self.run_command("terraform init")

    def plan(self):
        return self.run_command("terraform plan")

    def apply(self):
        return self.run_command("terraform apply -auto-approve")
