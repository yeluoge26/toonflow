#!/usr/bin/env python
"""Deploy ToonFlow to remote server via SSH"""

import paramiko
import sys
import time

HOST = '45.76.154.156'
USER = 'root'
PASS = '=X6rdw(n!yXAxKXU'
REPO = 'https://github.com/yeluoge26/toonflow.git'
DEPLOY_DIR = '/opt/toonflow'

def run(client, cmd, timeout=120):
    """Execute command and print output"""
    print(f'  $ {cmd}')
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    exit_code = stdout.channel.recv_exit_status()
    if out:
        for line in out.split('\n')[-10:]:
            try:
                print(f'    {line}')
            except UnicodeEncodeError:
                print(f'    {line.encode("ascii", errors="replace").decode()}')
    if err and exit_code != 0:
        for line in err.split('\n')[-5:]:
            try:
                print(f'    [ERR] {line}')
            except UnicodeEncodeError:
                print(f'    [ERR] {line.encode("ascii", errors="replace").decode()}')
    return out, err, exit_code

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    print(f'[1/8] Connecting to {HOST}...')
    client.connect(HOST, port=22, username=USER, password=PASS, timeout=30, banner_timeout=60)
    print('  Connected!')

    # Check environment
    print('\n[2/8] Checking environment...')
    run(client, 'uname -a')
    run(client, 'free -h | head -2')
    run(client, 'df -h / | tail -1')

    # Install Node.js if needed
    print('\n[3/8] Checking Node.js...')
    out, _, code = run(client, 'node -v 2>/dev/null')
    if code != 0 or not out:
        print('  Node.js not found, installing...')
        run(client, 'curl -fsSL https://deb.nodesource.com/setup_22.x | bash -', timeout=120)
        run(client, 'apt-get install -y nodejs', timeout=180)
        run(client, 'node -v')
        run(client, 'npm install -g yarn pm2', timeout=120)
    else:
        print(f'  Node.js {out} already installed')
        # Ensure yarn and pm2
        run(client, 'which yarn || npm install -g yarn', timeout=60)
        run(client, 'which pm2 || npm install -g pm2', timeout=60)

    # Install Redis if needed
    print('\n[4/8] Checking Redis...')
    out, _, code = run(client, 'redis-cli ping 2>/dev/null')
    if 'PONG' not in (out or ''):
        print('  Redis not running, installing...')
        run(client, 'apt-get update && apt-get install -y redis-server', timeout=180)
        run(client, 'systemctl enable redis-server && systemctl start redis-server')
        run(client, 'redis-cli ping')
    else:
        print('  Redis is running')

    # Install git if needed
    run(client, 'which git || apt-get install -y git', timeout=60)

    # Clone or update repo
    print('\n[5/8] Deploying code...')
    out, _, code = run(client, f'test -d {DEPLOY_DIR}/.git && echo EXISTS || echo NEW')
    if 'EXISTS' in out:
        print('  Updating existing repo...')
        run(client, f'cd {DEPLOY_DIR} && git fetch origin && git reset --hard origin/master', timeout=60)
    else:
        print('  Cloning fresh repo...')
        run(client, f'rm -rf {DEPLOY_DIR}', timeout=10)
        run(client, f'git clone {REPO} {DEPLOY_DIR}', timeout=120)

    run(client, f'cd {DEPLOY_DIR} && git log --oneline -3')

    # Install dependencies
    print('\n[6/8] Installing dependencies...')
    run(client, f'cd {DEPLOY_DIR} && yarn install --production=false 2>&1 | tail -5', timeout=300)

    # Build
    print('\n[7/8] Building...')
    run(client, f'cd {DEPLOY_DIR} && yarn build 2>&1 | tail -10', timeout=120)

    # Configure environment
    print('\n[8/8] Starting service...')
    run(client, f'mkdir -p {DEPLOY_DIR}/env')
    run(client, f'cat > {DEPLOY_DIR}/env/.env.prod << EOF\nNODE_ENV=prod\nPORT=60000\nOSSURL=http://45.76.154.156:60000/\nEOF')

    # Stop existing
    run(client, 'pm2 delete toonflow 2>/dev/null; true')

    # Start with PM2
    run(client, f'cd {DEPLOY_DIR} && NODE_ENV=prod pm2 start build/app.js --name toonflow --max-memory-restart 1G')
    run(client, 'pm2 save')

    # Verify
    time.sleep(5)
    run(client, 'pm2 list')
    run(client, 'curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:60000/ 2>/dev/null || echo "Service starting..."')

    # Open firewall
    run(client, 'ufw allow 60000/tcp 2>/dev/null; iptables -I INPUT -p tcp --dport 60000 -j ACCEPT 2>/dev/null; true')

    print(f'\n{"="*50}')
    print(f'Deployment complete!')
    print(f'Access: http://{HOST}:60000')
    print(f'Admin:  http://{HOST}:60000/admin.html')
    print(f'Login:  admin / admin123')
    print(f'{"="*50}')

    client.close()

if __name__ == '__main__':
    main()
