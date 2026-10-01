import subprocess
try:
    out = subprocess.run(["python", "test_sqlalchemy.py"], capture_output=True, text=True, check=False)
    with open("sa_out.txt", "w") as f:
        f.write("STDOUT:\n" + out.stdout + "\nSTDERR:\n" + out.stderr)
    print("Dumped to sa_out.txt")
except Exception as e:
    print(e)
