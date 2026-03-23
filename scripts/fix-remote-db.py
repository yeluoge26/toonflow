#!/usr/bin/env python
"""Fix remote DB: configure AI models"""
import paramiko, sys, io, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('45.76.154.156', port=22, username='root', password='=X6rdw(n!yXAxKXU', timeout=30, banner_timeout=60)

def run(cmd, t=120):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=t)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    code = stdout.channel.recv_exit_status()
    if out: print(out[-500:])
    if err and code != 0: print('ERR:', err[-300:])
    return out, code

# Write a Node script on the server to check/fix DB
run("""cat > /tmp/fix-db.js << 'JSEOF'
const Database = require('better-sqlite3');
const db = new Database('/opt/toonflow/db.sqlite');

// List tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tables:', tables.map(t=>t.name).join(', '));

// Check t_aiModel
try {
  const rows = db.prepare("SELECT * FROM t_aiModel").all();
  console.log('t_aiModel:', rows.length, 'rows');
  if (rows.length === 0) {
    // Insert default AI model config for Qwen
    db.prepare("INSERT INTO t_aiModel (id, moduleKey, moduleName, configId) VALUES (?, ?, ?, ?)").run(1, 'outlineScriptAgent', '大纲剧本Agent', null);
    db.prepare("INSERT INTO t_aiModel (id, moduleKey, moduleName, configId) VALUES (?, ?, ?, ?)").run(2, 'storyboardAgent', '分镜Agent', null);
    db.prepare("INSERT INTO t_aiModel (id, moduleKey, moduleName, configId) VALUES (?, ?, ?, ?)").run(3, 'imageGeneration', '图片生成', null);
    db.prepare("INSERT INTO t_aiModel (id, moduleKey, moduleName, configId) VALUES (?, ?, ?, ?)").run(4, 'videoGeneration', '视频生成', null);
    console.log('Inserted default aiModel entries');
  }
} catch(e) {
  console.log('t_aiModel error:', e.message);
}

// Check t_config for AI keys
try {
  const configs = db.prepare("SELECT * FROM t_config").all();
  console.log('t_config:', configs.length, 'rows');
  if (configs.length === 0) {
    // Insert Qwen config
    db.prepare("INSERT INTO t_config (id, type, model, modelType, apiKey, baseUrl, manufacturer, createTime, userId) VALUES (?,?,?,?,?,?,?,?,?)").run(
      1, 'text', 'qwen-plus', 'text',
      'sk-159e09c50bca4bf5980d19cf345d32ae',
      'https://dashscope.aliyuncs.com/compatible-mode/v1',
      'qwen', Date.now(), 1
    );
    // Insert Gemini image config
    db.prepare("INSERT INTO t_config (id, type, model, modelType, apiKey, baseUrl, manufacturer, createTime, userId) VALUES (?,?,?,?,?,?,?,?,?)").run(
      2, 'image', 'gemini-2.5-flash-image', 'image',
      'AIzaSyAaPSnrmBjIeoQXgSktssjXPgAgVSA1dME',
      '', 'gemini', Date.now(), 1
    );
    console.log('Inserted Qwen + Gemini configs');

    // Link aiModel to config
    db.prepare("UPDATE t_aiModel SET configId = 1 WHERE moduleKey IN ('outlineScriptAgent', 'storyboardAgent')").run();
    db.prepare("UPDATE t_aiModel SET configId = 2 WHERE moduleKey = 'imageGeneration'").run();
    console.log('Linked aiModel to configs');
  }
} catch(e) {
  console.log('t_config error:', e.message);
}

// Check t_setting
try {
  const settings = db.prepare("SELECT * FROM t_setting").all();
  console.log('t_setting:', settings.length, 'rows');
} catch(e) {
  console.log('t_setting error:', e.message);
}

db.close();
console.log('Done!');
JSEOF
""")

print('=== Checking/Fixing DB ===')
run('cd /opt/toonflow && node /tmp/fix-db.js')

print('\n=== Restarting ===')
run('pm2 restart toonflow')
time.sleep(5)

# Test oneClickGenerate
print('\n=== Testing API ===')
run('''curl -s -X POST http://localhost:60000/other/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' | head -c 200''')

client.close()
print('\nDone!')
