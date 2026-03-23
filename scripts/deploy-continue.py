#!/usr/bin/env python
"""Continue deployment from step 7 (build already ran)"""

import paramiko
import time

HOST = '45.76.154.156'
USER = 'root'
PASS = '=X6rdw(n!yXAxKXU'
DEPLOY_DIR = '/opt/toonflow'

def run(client, cmd, timeout=120):
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
                print(f'    [ERR] ...')
    return out, err, exit_code

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    print(f'Connecting to {HOST}...')
    client.connect(HOST, port=22, username=USER, password=PASS, timeout=30, banner_timeout=60)
    print('Connected!')

    # Fix frontend localhost references for remote deployment
    print('\n[0] Fixing frontend API URLs...')
    run(client, f"sed -i 's|http://localhost:60000||g' {DEPLOY_DIR}/scripts/web/index.html")
    run(client, f"sed -i 's|ws://localhost:60000|ws://{HOST}:60000|g' {DEPLOY_DIR}/scripts/web/index.html")
    out, _, _ = run(client, f'grep -c "localhost:60000" {DEPLOY_DIR}/scripts/web/index.html')
    print(f'  Remaining localhost refs: {out} (placeholders only)')

    # Check if build succeeded
    print('\n[1] Checking build status...')
    out, _, code = run(client, f'ls -la {DEPLOY_DIR}/build/app.js 2>/dev/null')
    if code != 0:
        print('  Build not found, running build...')
        run(client, f'cd {DEPLOY_DIR} && npx cross-env NODE_ENV=prod npx tsx scripts/build.ts 2>&1 | tail -10', timeout=300)
        out, _, code = run(client, f'ls -la {DEPLOY_DIR}/build/app.js 2>/dev/null')
        if code != 0:
            # Try direct tsx start instead
            print('  Build failed, will use tsx directly...')

    # Configure environment
    print('\n[2] Configuring environment...')
    run(client, f'mkdir -p {DEPLOY_DIR}/env')
    run(client, f"""cat > {DEPLOY_DIR}/env/.env.prod << 'ENVEOF'
NODE_ENV=prod
PORT=60000
OSSURL=http://45.76.154.156:60000/
ENVEOF""")

    # Stop existing
    print('\n[3] Starting service...')
    run(client, 'pm2 delete toonflow 2>/dev/null; true')

    # Check if build exists
    out, _, code = run(client, f'test -f {DEPLOY_DIR}/build/app.js && echo YES || echo NO')
    if 'YES' in out:
        print('  Starting from build...')
        run(client, f'cd {DEPLOY_DIR} && NODE_ENV=prod pm2 start build/app.js --name toonflow --max-memory-restart 1G')
    else:
        print('  Starting with tsx (dev mode)...')
        run(client, f'cd {DEPLOY_DIR} && pm2 start "npx tsx src/app.ts" --name toonflow --max-memory-restart 1G --env NODE_ENV=prod')

    run(client, 'pm2 save')
    run(client, 'pm2 startup 2>/dev/null; true')

    # Wait and verify
    print('\n[4] Verifying...')
    time.sleep(8)
    run(client, 'pm2 list')
    out, _, _ = run(client, 'curl -s -o /dev/null -w "%{http_code}" http://localhost:60000/ 2>/dev/null')

    # Open firewall
    run(client, 'ufw allow 60000/tcp 2>/dev/null; true')
    run(client, 'iptables -I INPUT -p tcp --dport 60000 -j ACCEPT 2>/dev/null; true')

    print(f'\n{"="*50}')
    if '200' in out:
        print(f'Deployment SUCCESS!')
    else:
        print(f'Service may still be starting...')
        run(client, f'pm2 logs toonflow --lines 10 --nostream')
    print(f'Access: http://{HOST}:60000')
    print(f'Admin:  http://{HOST}:60000/admin.html')
    print(f'Login:  admin / admin123')
    print(f'{"="*50}')

    client.close()

if __name__ == '__main__':
    main()
