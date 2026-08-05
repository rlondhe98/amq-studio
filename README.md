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

### Create a connected app in your mulesoft environment which has read permissions on Organizations, environments, regions and AnypointMQs

### Runtime Properties

The following runtime properties must be set when deploying the application:

| Property | Value | Description |
|----------|-------|-------------|
| `app.testModeEnabled` | `false` | Set to `false` to remove the manual form toggle (Platform-led login only) |

Access the dashboard at: **[AMQ Studio](https://amq-studio-peywsb.5sc6y6-4.usa-e2.cloudhub.io/amq-studio)**

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

## Feedback

**This is a Proof of Concept — your feedback will shape the final product.**

- What works well?
- What could be improved?
- What features would you like to see next?

Please open an issue or reach out directly. Every piece of feedback helps.

---

## License

<<<<<<< HEAD
Internal use only. See your organization's policies for distribution guidelines.
=======
Internal use only. See your organization's policies for distribution guidelines.
>>>>>>> 8a7fdad06364dc2d5e2efc1533b7fc0fd3a4517d
