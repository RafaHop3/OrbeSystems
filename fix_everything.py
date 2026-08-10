import os
import subprocess

base = r"d:\OrbeSystems\orbe-systems"
os.chdir(base)

# Force main branch clean
subprocess.run("git checkout main", shell=True)
subprocess.run("git reset --hard HEAD", shell=True)
subprocess.run("git pull origin main --rebase", shell=True)

# Move the directory using precise python os commands if it exists
src_dir = r"frontend\src\app\remover-dados-[broker]"
dest_parent = r"frontend\src\app\remover-dados"
dest_dir = r"frontend\src\app\remover-dados\[broker]"

if os.path.exists(src_dir):
    if not os.path.exists(dest_parent):
        os.makedirs(dest_parent)
    subprocess.run(f'git mv "{src_dir}" "{dest_dir}"', shell=True)
    subprocess.run('git add .', shell=True)
    subprocess.run('git commit -m "fix(frontend): properly restructure dynamic route directory"', shell=True)
    subprocess.run('git push origin main', shell=True)

# Now crush the corrupt dev branch with the pristine main branch
subprocess.run("git checkout dev", shell=True)
subprocess.run("git fetch origin main", shell=True)
subprocess.run("git reset --hard main", shell=True)
subprocess.run("git push -f origin dev", shell=True)
subprocess.run("git checkout main", shell=True)
