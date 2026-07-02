# AMQ Studio

**A Self-Service Queue Management Dashboard for Anypoint MQ**

> **Status:** Proof of Concept — feedback welcome!

AMQ Studio is a web-based dashboard that gives teams full visibility and control over their Anypoint MQ queues — directly from the browser. Inspect stuck messages, fix corrupted payloads, resubmit to source queues, transfer across queues, and clean up obsolete messages — all without writing a single line of code.

Built on MuleSoft, inspired by the [Anypoint MQ REM](https://blogs.mulesoft.com/dev-guides/anypoint-mq-rem/) concept — extended with payload editing, cross-queue transfers, concurrency safety, and enterprise-grade security.

---

## What It Does

| Capability | Description |
|-----------|-------------|
| **Inspect** | View full message payloads without losing them |
| **Edit** | Fix corrupted JSON, edit CSV in a table view, modify XML — all inline |
| **Resubmit** | Return messages to the source queue with one click |
| **Transfer** | Move messages to a different queue (same region/org/env) |
| **Bulk Delete** | Remove obsolete messages with double-confirmation safety |
| **Concurrency Lock** | Prevents multiple users from conflicting on the same queue |
| **Auto-Return** | On disconnect or idle timeout, all untouched messages are safely returned |
| **Real-Time Streaming** | Messages appear progressively as they are consumed |
| **Platform Integration** | Dynamic dropdowns auto-populate your orgs, environments, regions, and queues |

### How You Connect

- **Platform-led login** — Authenticate with your Connected App credentials; everything auto-populates from your Anypoint Platform
- **Manual form** — Enter details directly for quick access *(PoC only — will be removed at GA)*

---

## Security

Security is built into every layer:

- **Encrypted credentials** — AES-256-GCM encryption; credentials are never stored in plaintext
- **Secure transport** — RSA encryption protects credentials between your browser and the server
- **Concurrency protection** — Queue locking prevents multiple users from conflicting
- **Data safety** — Messages are automatically returned on idle or disconnect; nothing is ever lost
- **Destructive action guards** — Must type `DELETE` or `SAVE` to confirm irreversible operations
- **Session isolation** — Session cleared on tab close; nothing persists after you leave

---

## How It Works

```
┌──────────────────────────────────────────────────────────┐
│                     AMQ Studio                            │
├──────────────────────┬───────────────────────────────────┤
│   Web Dashboard      │   MuleSoft Backend                │
│   (Browser-based)    │   (Anypoint Mule Runtime)         │
│                      │                                   │
│   • Clean modern UI  │   • Authentication & encryption   │
│   • Real-time table  │   • Queue consumption & storage   │
│   • Inline editing   │   • Message operations            │
│   • Bulk operations  │   • Concurrency management        │
│                      │   • Platform API integration       │
└──────────────────────┴───────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────┐         ┌──────────────────────────┐
│   You (Browser) │         │  Anypoint MQ + Platform  │
└─────────────────┘         └──────────────────────────┘
```

### User Flow

1. **Authenticate** — Log in with your Connected App credentials
2. **Select** — Choose your Organization → Environment → Region → Queue (auto-populated)
3. **Browse** — Messages are consumed and displayed in a real-time table
4. **Act** — Inspect, edit, transfer, delete, or return messages
5. **Disconnect** — All untouched messages are safely returned; session is cleared

---

## Technology

| Layer | Built With |
|-------|-----------|
| Runtime | MuleSoft Mule 4 (Java 17) |
| Frontend | Modern web application (HTML/JS/CSS) |
| Security | RSA + AES-256-GCM, enterprise keystore |
| Storage | Mule Object Store v2 |
| Messaging | Anypoint MQ Connector |
| Deployment | CloudHub 2.0 / Runtime Fabric / On-premise |

---

## Requirements

- **Anypoint Studio** 7.x+ or Maven 3.8+
- **Mule Runtime** 4.9+
- **Java** 17
- **Connected App** with scopes for:
  - Viewing Organizations & Environments
  - Anypoint MQ Admin / Subscriber / Publisher

---

## Getting Started

### 1. Clone & Configure

```bash
git clone <repository-url>
cd amq-studio
```

Configure the application properties for your environment (HTTP port, queue timeouts, lock thresholds, etc.) in the environment YAML file.

### 2. Build

```bash
mvn clean package -DskipTests
```

### 3. Run

Open in Anypoint Studio and run, or deploy to CloudHub.

Access the dashboard at: **http://localhost:8081/amq-studio**

---

## Configuration

Key settings you can adjust:

| Setting | Default | What It Controls |
|---------|---------|-----------------|
| HTTP Port | `8081` | Port the dashboard runs on |
| ACK Timeout | `5 min` | How long before unacknowledged messages return to queue |
| Max Messages | `10,000` | Maximum messages consumed per session |
| Lock Timeout | `10 min` | How long before an idle session is considered stale |
| Session TTL | `1 hour` | How long an authenticated session lasts |
| Manual Form | `enabled` | Show/hide the manual access form (PoC only) |

---

## Compared to Anypoint MQ REM

| Feature | REM | AMQ Studio |
|---------|-----|-----------|
| View DLQ messages | ✅ | ✅ |
| Resubmit to source queue | ✅ | ✅ |
| Refresh for new messages | ✅ | ✅ |
| Message statistics | ✅ | ✅ |
| Transfer to different queue | ❌ | ✅ |
| Edit message payload | ❌ | ✅ |
| Inline CSV table editing | ❌ | ✅ |
| Delete messages | ❌ | ✅ |
| Multi-format preservation | ❌ | ✅ |
| Concurrency locking | ❌ | ✅ |
| Auto-return on idle | ❌ | ✅ |
| Real-time progressive streaming | ❌ | ✅ |
| AES-256 encrypted sessions | ❌ | ✅ |
| Dynamic platform integration | ❌ | ✅ |

---

## Roadmap

- [ ] SSO Login — "Login with MuleSoft" button via OAuth 2.0
- [ ] Analytics Dashboard — Message volume trends, queue health monitoring
- [ ] DLQ Workflows — Bulk replay, dead-letter-specific views
- [ ] Error Intelligence — Track retry patterns, identify recurring failures
- [ ] Dark Mode & Mobile — Responsive design, keyboard shortcuts
- [ ] Remove manual form at GA

---

## Feedback

**This is a Proof of Concept — your feedback will shape the final product.**

- What works well?
- What could be improved?
- What features would you like to see next?

Please open an issue or reach out directly. Every piece of feedback helps.

---

## License

Internal use only. See your organization's policies for distribution guidelines.
