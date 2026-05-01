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
services:
  andromeda:
    image: ghcr.io/matejselko/andromeda:latest
    container_name: andromeda
    restart: unless-stopped
    ports:
      - "3456:3000"
    volumes:
      - andromeda-data:/data
    environment:
      - DATA_FILE=/data/vault.enc
      - CERT_DIR=/data/certs

volumes:
  andromeda-data:
```


## Features

- 🔒 AES-256-GCM encryption — happens in your browser, server never sees plaintext
- 🌐 Fully offline after first pull
- 🎨 Service icons — GitHub, Proton, Ente, Google, AWS and more
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

*Note: This project uses gererative AI on a large scale.*

</div>
