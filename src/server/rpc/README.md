# 👁️ Argus RPC

> **The Compute Plane.** Handles the heavy-lifting that the database shouldn't
> do.

## ✨ Capabilities

- **📄 Scribe Engine:** Generates pixel-perfect PDFs using **Typst**.
  - _Templates:_ Invoices, Brochures, Receipts.
- **🔔 Hermes Dispatcher:** Async notification channels (Email, SMS, Webhooks).
- **🛡️ Secure:** JWT-protected endpoints via Supabase Auth.

## 🛠️ Usage

**Run Locally:**

```bash
go run cmd/server/main.go
# ➜ Local:   http://localhost:4000
# ➜ Swagger: http://localhost:4000/swagger/index.html
```

**Key Endpoints:**

- `POST /v1/documents/generate` — Create PDFs from SQL views.
- `POST /v1/notifications/dispatch` — Send async alerts.
- `GET /health` — Kubernetes liveness check.

## 📂 Structure

- `templates/` — Typst source files (`.typ`) for document rendering.
- `docs/` — Swagger/OpenAPI definitions.
- `internal/core/` — Domain models (agnostic).
- `internal/service/` — Business logic (Printer, Notifier).
