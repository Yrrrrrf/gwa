# 👁️ Template RPC

> **The Compute Plane.** Handles the heavy-lifting that the database shouldn't
> do.

## ✨ Capabilities

- **🔔 Hermes Dispatcher:** Async notification channels (Email, SMS, Webhooks).
- **🛡️ Secure:** JWT-protected endpoints.

## 🛠️ Usage

**Run Locally:**

```bash
go run cmd/server/main.go
# ➜ Local:   http://localhost:4000
```

**Key Endpoints:**

- `POST /v1/notifications/dispatch` — Send async alerts.
- `GET /health` — Kubernetes liveness check.

## 📂 Structure

- `internal/core/` — Domain models (agnostic).
- `internal/service/` — Business logic (Notifier).
