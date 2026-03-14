'use strict';
const express  = require('express');
const fs       = require('fs');
const path     = require('path');
const https    = require('https');
const http     = require('http');
const crypto   = require('crypto');
const { rateLimit } = require('express-rate-limit');

// ── Express app ───────────────────────────────────────
const app = express();
app.use(express.json({ limit: '10mb' }));

const FRONTEND  = path.join(__dirname, '../frontend');
const DATA_FILE = process.env.DATA_FILE || '/data/vault.enc';
const DATA_DIR  = path.dirname(DATA_FILE);
const CERT_DIR  = process.env.CERT_DIR  || '/data/certs';
const PORT      = parseInt(process.env.PORT || '3000', 10);
const HTTP_PORT = parseInt(process.env.HTTP_PORT || String(PORT + 1), 10);

try { fs.mkdirSync(DATA_DIR,  { recursive: true }); } catch {}
try { fs.mkdirSync(CERT_DIR,  { recursive: true }); } catch {}

app.use(express.static(FRONTEND));

// ── Security headers ──────────────────────────────────
// These mark the page as a "secure context" so crypto.subtle works
// even when accessed via plain HTTP on a LAN IP
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy',   'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy',  'require-corp');
  next();
});

// ── Rate limiter ──────────────────────────────────────
const vaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 300,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests, try again later.' }
});

// ── API ───────────────────────────────────────────────
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', writable: canWrite(), https: true });
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

// ── Self-signed certificate (generated once, persisted in /data/certs) ───────
// Browser will show "Not secure" once — user clicks Advanced → Proceed.
// After that crypto.subtle works on every visit.
const CERT_FILE = path.join(CERT_DIR, 'cert.pem');
const KEY_FILE  = path.join(CERT_DIR, 'key.pem');

function genSelfSigned() {
  // Use openssl if available (alpine has it), otherwise fall back to pure-node
  try {
    const { execSync } = require('child_process');
    execSync(
      `openssl req -x509 -newkey rsa:2048 -keyout "${KEY_FILE}" -out "${CERT_FILE}" ` +
      `-days 3650 -nodes -subj "/CN=andromeda-vault" ` +
      `-addext "subjectAltName=IP:0.0.0.0,DNS:localhost" 2>/dev/null`,
      { timeout: 15000 }
    );
    console.log('  ✦  Generated self-signed TLS certificate');
    return true;
  } catch (e) {
    console.error('  ✗  openssl not available, falling back to HTTP only:', e.message);
    return false;
  }
}

function loadOrCreateCert() {
  if (fs.existsSync(CERT_FILE) && fs.existsSync(KEY_FILE)) {
    return { cert: fs.readFileSync(CERT_FILE), key: fs.readFileSync(KEY_FILE) };
  }
  if (genSelfSigned()) {
    return { cert: fs.readFileSync(CERT_FILE), key: fs.readFileSync(KEY_FILE) };
  }
  return null;
}

// ── Start ─────────────────────────────────────────────
const creds = loadOrCreateCert();

if (creds) {
  // HTTPS — crypto.subtle works on all browsers
  https.createServer(creds, app).listen(PORT, '0.0.0.0', () => {
    console.log(`\n  ✦  Andromeda  →  https://localhost:${PORT}  (HTTPS)`);
    console.log(`  ✦  Data file  →  ${DATA_FILE}`);
    console.log(`  ✦  Writable   →  ${canWrite()}`);
    console.log(`\n  ⚠  First visit: click "Advanced → Proceed" to accept the self-signed cert.\n`);
  });
  // HTTP redirect on PORT+1 (optional)
  http.createServer((req, res) => {
    const host = req.headers.host?.replace(/:.*/, '') || 'localhost';
    res.writeHead(301, { Location: `https://${host}:${PORT}${req.url}` });
    res.end();
  }).listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`  ✦  HTTP redirect →  :${HTTP_PORT}  →  https://:${PORT}`);
  });
} else {
  // HTTP fallback — crypto.subtle only works from localhost in this mode
  http.createServer(app).listen(PORT, '0.0.0.0', () => {
    console.log(`\n  ✦  Andromeda  →  http://localhost:${PORT}  (HTTP only)`);
    console.log(`  ⚠  WARNING: crypto.subtle unavailable on non-localhost HTTP.`);
    console.log(`  ⚠  Access via http://localhost:${PORT} or set up HTTPS.\n`);
  });
}
