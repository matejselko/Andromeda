'use strict';
const express  = require('express');
const fs       = require('fs');
const path     = require('path');
const https    = require('https');
const http     = require('http');
const { rateLimit } = require('express-rate-limit');

// ── Config ────────────────────────────────────────────
const FRONTEND   = path.join(__dirname, '../frontend');
const DATA_FILE  = process.env.DATA_FILE  || '/data/vault.enc';
const DATA_DIR   = path.dirname(DATA_FILE);
const CERT_DIR   = process.env.CERT_DIR   || '/data/certs';
const PORT       = parseInt(process.env.PORT       || '3000', 10); // HTTPS (main)
const HEALTH_PORT= parseInt(process.env.HEALTH_PORT|| '3002', 10); // HTTP  (healthcheck only)

// Ensure directories exist
try { fs.mkdirSync(DATA_DIR,  { recursive: true }); } catch {}
try { fs.mkdirSync(CERT_DIR,  { recursive: true }); } catch {}

// ── Express app ───────────────────────────────────────
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(FRONTEND));

// Headers that allow crypto.subtle on any origin (secure context hint)
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy',  'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// ── Rate limiter ──────────────────────────────────────
const vaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 300,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests, try again later.' }
});

// ── Routes ────────────────────────────────────────────
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', writable: canWrite() });
});

app.get('/api/vault/exists', vaultLimiter, (_, res) => {
  res.json({ exists: fs.existsSync(DATA_FILE) });
});

app.post('/api/vault/save', vaultLimiter, (req, res) => {
  const { blob } = req.body;
  if (!blob || typeof blob !== 'string')
    return res.status(400).json({ error: 'No blob provided' });
  try {
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, blob, 'utf8');
    fs.renameSync(tmp, DATA_FILE);
    res.json({ ok: true });
  } catch (e) {
    console.error('Save error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/vault/load', vaultLimiter, (_, res) => {
  if (!fs.existsSync(DATA_FILE)) return res.json({ blob: null });
  try { res.json({ blob: fs.readFileSync(DATA_FILE, 'utf8') }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('*', (_, res) =>
  res.sendFile(path.join(FRONTEND, 'index.html'))
);

// ── Helpers ───────────────────────────────────────────
function canWrite() {
  try { fs.accessSync(DATA_DIR, fs.constants.W_OK); return true; }
  catch { return false; }
}

// ── TLS cert (generated once, stored in volume) ───────
const CERT_FILE = path.join(CERT_DIR, 'cert.pem');
const KEY_FILE  = path.join(CERT_DIR,  'key.pem');

function genCert() {
  try {
    const { execSync } = require('child_process');
    execSync(
      `openssl req -x509 -newkey rsa:2048 -keyout "${KEY_FILE}" -out "${CERT_FILE}" ` +
      `-days 3650 -nodes -subj "/CN=andromeda-vault" 2>/dev/null`,
      { timeout: 20000 }
    );
    return true;
  } catch (e) {
    console.error('  ✗  openssl failed:', e.message);
    return false;
  }
}

function loadCert() {
  if (fs.existsSync(CERT_FILE) && fs.existsSync(KEY_FILE))
    return { cert: fs.readFileSync(CERT_FILE), key: fs.readFileSync(KEY_FILE) };
  console.log('  ✦  Generating self-signed TLS certificate…');
  if (genCert())
    return { cert: fs.readFileSync(CERT_FILE), key: fs.readFileSync(KEY_FILE) };
  return null;
}

// ── Start ─────────────────────────────────────────────

// 1. Plain HTTP health-check server — always starts immediately on HEALTH_PORT.
//    Only used by Docker HEALTHCHECK (internal only, not exposed in compose).
http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  } else {
    res.writeHead(404); res.end();
  }
}).listen(HEALTH_PORT, '127.0.0.1', () => {
  console.log(`  ✦  Health endpoint →  http://127.0.0.1:${HEALTH_PORT}/health`);
});

// 2. Main app server — HTTPS if cert available, plain HTTP otherwise.
const creds = loadCert();
if (creds) {
  https.createServer(creds, app).listen(PORT, '0.0.0.0', () => {
    console.log(`\n  ✦  Andromeda  →  https://localhost:${PORT}`);
    console.log(`  ✦  Data file  →  ${DATA_FILE}`);
    console.log(`  ✦  Writable   →  ${canWrite()}`);
    console.log(`\n  ⚠  First visit: click "Advanced → Proceed" to accept the self-signed cert.\n`);
  });
} else {
  // Fallback: plain HTTP (crypto.subtle only works from localhost)
  http.createServer(app).listen(PORT, '0.0.0.0', () => {
    console.log(`\n  ✦  Andromeda  →  http://localhost:${PORT}  (HTTP — HTTPS cert failed)`);
    console.log(`  ⚠  Access via http://localhost:${PORT} only — LAN access requires HTTPS.\n`);
  });
}
