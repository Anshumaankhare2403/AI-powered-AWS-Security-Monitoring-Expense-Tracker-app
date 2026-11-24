import subprocess
import sys
import os

# Ensure bin is in PATH
bin_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "bin"))
if bin_dir not in os.environ.get("PATH", ""):
    os.environ["PATH"] = bin_dir + os.pathsep + os.environ.get("PATH", "")

cmd = [
    "aws", "ssm", "start-session",
    "--region", "us-east-1",
    "--target", "i-07494c72890414cc5",
    "--document-name", "AWS-StartPortForwardingSessionToRemoteHost",
    "--parameters", '{"host":["dev-expense-tracker-mysql.c2l604kqkskw.us-east-1.rds.amazonaws.com"],"portNumber":["3306"],"localPortNumber":["3307"]}'
]

print("Starting AWS SSM port-forwarding to RDS via EC2 i-07494c72890414cc5...", flush=True)
proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

try:
    for line in iter(proc.stdout.readline, ''):
        print(line, end='', flush=True)
except KeyboardInterrupt:
    proc.terminate()
