const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));

// Frontend lives one level up in /app/frontend
app.use(express.static(path.join(__dirname, '../frontend')));

const DATA_FILE = process.env.DATA_FILE || '/data/vault.enc';
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const PORT = process.env.PORT || 3000;

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

app.get('/api/vault/exists', (_, res) => {
  res.json({ exists: fs.existsSync(DATA_FILE) });
});

app.post('/api/vault/save', (req, res) => {
  const { blob } = req.body;
  if (!blob || typeof blob !== 'string') return res.status(400).json({ error: 'No blob' });
  try {
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, blob, 'utf8');
    fs.renameSync(tmp, DATA_FILE);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/vault/load', (_, res) => {
  if (!fs.existsSync(DATA_FILE)) return res.json({ blob: null });
  res.json({ blob: fs.readFileSync(DATA_FILE, 'utf8') });
});

app.get('*', (_, res) =>
  res.sendFile(path.join(__dirname, '../frontend/index.html'))
);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  ✦  Andromeda running at http://localhost:${PORT}\n`);
});
