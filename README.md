<div align="center">

✦ · · · ✦ · · · · ✦ · · ✦ · · · · · ✦ · · · ✦

# ✦ Andromeda

**Self-hosted encrypted recovery code vault.**  
Runs on your machine. AES-256 encrypted. No cloud. No accounts.

[![GHCR](https://img.shields.io/badge/ghcr.io-matejselko%2Fandromeda-black?style=flat-square&logo=docker&logoColor=white)](https://ghcr.io/matejselko/andromeda)
[![License](https://img.shields.io/badge/license-MIT-black?style=flat-square)](LICENSE)

</div>

---

> [!WARNING]
> **🚧 Work in progress — not ready for use.**  
> This project is under active development. Things may be broken, incomplete, or change without notice. Use at your own risk.

---

## Run it

```bash
docker run -d \
  --name andromeda \
  --restart unless-stopped \
  -p 3456:3000 \
  -v andromeda-data:/data \
  ghcr.io/matejselko/andromeda:latest
```

Open **http://localhost:3456**

---

## Or with Docker Compose

```bash
curl -O https://raw.githubusercontent.com/matejselko/andromeda/main/docker-compose.yml
docker compose up -d
```

---

## Stop / Remove

```bash
docker stop andromeda
docker rm andromeda

# Remove data too (irreversible!)
docker volume rm andromeda-data
```

---

## Features

- 🔒 AES-256-GCM encryption — happens in your browser, server never sees plaintext
- 🌐 Fully offline after first pull
- 🎨 500+ service icons — GitHub, Proton, Ente, Google, AWS and more
- ✓ Mark codes as used
- 📦 Export encrypted backup anytime
- 🐳 amd64 + arm64 (works on Raspberry Pi and Apple Silicon)

---

## Your data

Stored in a Docker volume at `/data/vault.enc`. Always encrypted.  
Without your master password it is completely unreadable.

> ⚠️ There is no password recovery. Keep it in a password manager.

---

## Backup

Click **⬇ Export** inside the app to download a backup at any time.

---

<div align="center">

✦ · · · ✦ · · · · ✦ · · ✦ · · · · · ✦ · · · ✦

*Note: I hate programming.*

</div>
