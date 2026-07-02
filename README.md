# AMQ Studio

**A Self-Service Queue Management Dashboard for Anypoint MQ**

> **Status:** Proof of Concept — feedback welcome!

AMQ Studio is a web-based, self-contained Mule application that provides a browser dashboard to inspect, edit, resubmit, transfer, and delete messages on any Anypoint MQ queue. No more blind scripting, no more lost messages from Dead Letter Queues.

Inspired by MuleSoft's [Anypoint MQ REM](https://blogs.mulesoft.com/dev-guides/anypoint-mq-rem/) concept — extended with payload editing, cross-queue transfers, concurrency safety, and more.

---

## Features

| Capability | Description |
|-----------|-------------|
| **Inspect** | View full message payloads without losing them |
| **Edit** | Fix corrupted JSON, edit CSV in a table view, modify XML inline |
| **Resubmit** | Return messages to the source queue with one click |
| **Transfer** | Move messages to a different queue (same region/org/env) |
| **Bulk Delete** | Remove obsolete messages with double-confirmation safety |
| **Concurrency Lock** | Prevents multiple users from conflicting on the same queue |
| **Auto-Return** | On disconnect or idle timeout, all untouched messages are returned |
| **Progressive Streaming** | Messages load in real-time as they are consumed |
| **Platform Integration** | Dynamic cascading dropdowns via Anypoint Platform APIs |

### Access Modes

- **Platform-led login** — Authenticate with Connected App credentials; Organization, Environment, Region, and Queue auto-populate via Platform APIs
- **Manual form** — Enter details directly for quick access *(PoC only — will be removed at GA)*

---

## Security

| Layer | Mechanism |
|-------|-----------|
| **Browser → Server** | RSA-OAEP encryption for credential transport |
| **Session Storage** | AES-256-GCM encrypted sessions; credentials never stored in plaintext |
| **Concurrency** | Queue locking prevents multi-user conflicts |
| **Data Safety** | Auto-return on idle; session cleared on tab close |
| **Destructive Actions** | Double confirmation — type `DELETE` or `SAVE` to proceed |
| **Build** | JS/CSS minified via Terser + CleanCSS at build time |

---

### API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/amq-studio` | Serve web UI |
| GET | `/auth/public-key` | RSA public key for frontend encryption |
| POST | `/auth/login` | Authenticate with Connected App |
| POST | `/auth/store-credentials` | Store AMQ client credentials |
| GET | `/fetch-all-messages` | Consume & store all messages from queue |
| PUT | `/send-to-queue` | Return/transfer messages |
| POST | `/acquire-lock` | Acquire concurrency lock |
| GET | `/platform/me` | Proxy: user organizations |
| GET | `/platform/.../environments` | Proxy: environments |
| GET | `/platform/.../regions` | Proxy: MQ regions |
| GET | `/platform/.../destinations` | Proxy: queue destinations |
| GET | `/platform/connected-apps` | Proxy: connected apps |

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Mule 4.9.18 (Java 17) |
| Frontend | Vanilla HTML / JS / CSS (served via `parse-template`) |
| Security | RSA-OAEP + AES-256-GCM, PKCS12 keystore |
| Storage | Mule Object Store v2 |
| MQ Connector | Anypoint MQ Connector 4.0.8 |
| Build | Maven + frontend-maven-plugin (Node 20, Terser, CleanCSS) |
| Deployment | CloudHub 2.0 / Runtime Fabric / On-prem |

---

## Prerequisites

- **Anypoint Studio** 7.x+ or Maven 3.8+
- **Mule Runtime** 4.9.18+
- **Java** 17
- **Connected App** with the following scopes:
  - View Organization
  - View Environment
  - Anypoint MQ Admin / Subscriber / Publisher

---

## Getting Started

### 1. Clone

```bash
git clone <repository-url>
cd amq-studio
```

### 2. Configure

Edit `src/main/resources/configurations/dev.yaml`:

```yaml
http:
  host: "0.0.0.0"
  port: "8081"

anypointMQ:
  consume:
    acknowledgementTimeout: "5"   # minutes
    pollingTime: "10"             # seconds
  maxMessages: "10000"

lock:
  staleThreshold: "10"            # minutes
  schedulerFrequency: "2"         # minutes

app:
  testModeEnabled: "true"         # enables manual form
```

Set the keystore password as an environment variable:

```bash
export KEYSTORE_PASSWORD=<your-keystore-password>
```

### 3. Build

```bash
mvn clean package -DskipTests
```

### 4. Run Locally

Open in Anypoint Studio and run, or:

```bash
mvn mule:run
```

Access the dashboard at: **http://localhost:8081/amq-studio**

### 5. Deploy to CloudHub 2.0

```bash
mvn deploy -DmuleDeploy
```

---

## Configuration Reference

| Property | Default | Description |
|----------|---------|-------------|
| `http.host` | `0.0.0.0` | HTTP listener host |
| `http.port` | `8081` | HTTP listener port |
| `anypointMQ.consume.acknowledgementTimeout` | `5` | ACK timeout in minutes |
| `anypointMQ.consume.pollingTime` | `10` | Poll interval in seconds |
| `anypointMQ.maxMessages` | `10000` | Max messages to consume per session |
| `objectStore.entryTtl` | `1` | Message TTL in days |
| `lock.staleThreshold` | `10` | Minutes before a lock is considered stale |
| `lock.schedulerFrequency` | `2` | Stale lock check interval in minutes |
| `auth.sessionTtl` | `1` | Session TTL in hours |
| `app.testModeEnabled` | `true` | Show manual form toggle (PoC only) |

---

## REM vs AMQ Studio

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
| Platform API cascading dropdowns | ❌ | ✅ |

---

## Project Structure

```
amq-studio/
├── src/
│   ├── main/
│   │   ├── java/com/amqstudio/security/
│   │   │   └── CryptoUtil.java          # RSA encryption utility
│   │   ├── mule/
│   │   │   ├── global.xml               # Connectors, configs
│   │   │   ├── auth.xml                  # Authentication flows
│   │   │   ├── common.xml               # ObjectStore helpers
│   │   │   ├── queue-operations.xml     # Consume messages
│   │   │   ├── message-operations.xml   # Return, transfer, delete
│   │   │   ├── lock-management.xml      # Concurrency control
│   │   │   ├── platform-proxy.xml       # Platform API proxy
│   │   │   └── static-assets.xml        # Web server
│   │   └── resources/
│   │       ├── configurations/dev.yaml   # App configuration
│   │       ├── security/keystore.p12     # RSA keystore
│   │       └── website/                  # Frontend SPA
│   │           ├── index.html
│   │           ├── app.js
│   │           ├── styles.css
│   │           ├── config.js
│   │           └── logo.svg
│   └── test/munit/                       # MUnit tests (planned)
├── pom.xml
├── mule-artifact.json
└── README.md
```

---

## Roadmap

- [ ] SSO Login — Connected App OAuth 2.0 flow
- [ ] Analytics Dashboard — Message volume trends, queue health monitoring
- [ ] Exchange & DLQ — Topic/exchange support, DLQ-specific workflows
- [ ] Error Intelligence — Track retry patterns, identify recurring failures
- [ ] MUnit Coverage — Automated test suite
- [ ] UX Enhancements — Dark mode, mobile responsive, keyboard shortcuts
- [ ] Remove manual form at GA

---

## Feedback

This is a Proof of Concept. Your feedback will shape the final product.

- What works well?
- What could be improved?
- What features would you like to see next?

Please open an issue or reach out directly.

---

## License

Internal use only. See your organization's policies for distribution guidelines.
