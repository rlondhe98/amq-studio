# VIVA Engage Post — AMQ Studio

---

## 📝 POST TEXT (Copy below)

---

**AMQ Studio — A Self-Service Queue Management Dashboard for Anypoint MQ (Proof of Concept)**

 

🚀 I'am excited to share a Proof of Concept for **AMQ Studio** — a web-based, self-contained Mule application that gives you a dashboard to inspect, edit, resubmit, transfer, and delete messages on any Anypoint MQ queue. No more blind scripting, no more lost messages from DLQs.

Here's what you can do today:
🔍 View full message payloads without losing them
✏️ Edit corrupted JSON, CSV (table view), or XML inline with double-confirmation safety
🔄 Return messages to the source queue with one click
↗️ Transfer messages across queues (same region/org/env)
🗑️ Bulk delete with double-confirmation safety
🔒 Concurrency locking to prevent multi-user conflicts

 

**What's the impact?**
This removes the pain of manually handling stuck messages in Dead Letter Queues — no throwaway scripts, no accidental message loss. It gives teams full visibility and control over their queues directly from the browser.

Currently the app supports both a platform-led login (where Organization, Environment, Region, and Queue auto-populate via Platform APIs) and a manual form for direct access, though the manual option will be removed in the actual release.

🛡️ **Security is baked in:**
• AES-256-GCM encrypted sessions — credentials are never stored in plaintext
• Auto-return on idle prevents data loss
• Double confirmation for destructive actions (type DELETE/SAVE to proceed)
• Session cleared on tab close — nothing persists
 

**This is a Proof of Concept and I need YOUR feedback to make it even better.** Please take a look, try it out, and drop your thoughts in the comments — what works, what doesn't, what features would you want to see next? Every piece of feedback helps.

#MuleSoft #AnypointMQ #Integration #DevTools #InnerSource #ErrorHandling #DLQ #ProofOfConcept

---

## 📸 SCREENSHOTS TO ATTACH (capture these from the running app)

Use the guide below to take the screenshots. Recommended resolution: **1920×1080** or browser at full width.

### Screenshot 1: Login / Connection Page
- **What to show:** The authentication form with "AMQ Studio" branding, Connected App fields, and the clean card-based UI
- **Filename:** `01_login_page.png`
- **Caption:** "Clean, secure login — authenticate with your Connected App credentials"

### Screenshot 2: Cascading Dropdowns (Platform Mode)
- **What to show:** After authentication, the cascading dropdowns expanded showing Organization → Environment → Region → Queue selection
- **Filename:** `02_platform_selection.png`
- **Caption:** "Dynamic Platform API integration — no hardcoded values, just select and connect"

### Screenshot 3: Messages Table View
- **What to show:** The messages page with several messages listed in the table, showing ID, payload type, payload preview, and date
- **Filename:** `03_messages_table.png`
- **Caption:** "Full visibility into your queue — inspect every message without losing it"

### Screenshot 4: Message Detail / Edit Modal
- **What to show:** The message detail modal open with a JSON payload being edited (or CSV table editor if available)
- **Filename:** `04_message_edit.png`
- **Caption:** "Edit payloads inline — fix corrupted JSON, modify CSV in a table view, update XML"

### Screenshot 5: Bulk Actions
- **What to show:** Multiple messages selected with the bulk action bar visible (Return Selected, Transfer Selected, Delete Selected)
- **Filename:** `05_bulk_actions.png`
- **Caption:** "Bulk operations — return, transfer, or delete multiple messages at once"

### Screenshot 6: Transfer Modal
- **What to show:** The transfer modal open showing the target queue input
- **Filename:** `06_transfer_modal.png`
- **Caption:** "Cross-queue transfer — move messages between queues with a single action"

---

## 🎬 GIF STORYBOARD (record as a screen capture, convert to GIF)

**Recommended tool:** ScreenToGif (Windows) — aim for 30-40 seconds, 800px wide, under 10MB.

> **Important:** Use ScreenToGif's built-in editor to add helper text annotations and transition frames between sections. This makes the GIF self-explanatory without sound.

### Recording Script:

| Timestamp | Action | Helper Text Overlay | Transition |
|-----------|--------|---------------------|------------|
| 0s–2s | Show the login page with AMQ Studio branding — pause so viewers see the clean UI | `🔐 Secure login with Connected App credentials` | — |
| 2s–4s | Show the **Platform / Manual toggle** — click "Manual" briefly to reveal the manual form fields, then switch back to "Platform" | `📋 Platform mode auto-populates via APIs • Manual mode for direct access (PoC only)` | — |
| 4s–6s | Enter Client ID & Client Secret, click **"Authenticate"** | `🔑 Authenticating via Connected App...` | — |
| 6s–8s | Show the ✓ Authenticated success bar animating in, then cascading dropdowns appearing one by one (Org → Env → Region → Queue → Client App) | `✅ Authenticated! Credentials encrypted with AES-256-GCM` | Fade/slide transition as dropdowns cascade |
| 8s–11s | Select values in each dropdown — show the cascading behavior (selecting Org populates Env, etc.) | `⬇️ Dynamic cascading — each selection fetches the next level via Platform APIs` | — |
| 11s–13s | Click **"Connect"** — show loading spinner with progressive streaming text | `⏳ Consuming messages safely from queue...` | Slide-left page transition to messages page |
| 13s–16s | Messages table loads with pagination — scroll briefly to show multiple messages with ID, type, payload preview, date | `📨 Messages consumed — view without losing them` | — |
| 16s–18s | Select 2-3 messages via checkboxes — show bulk action bar sliding in (Return Selected, Transfer Selected, Delete Selected) | `☑️ Bulk actions — operate on multiple messages at once` | — |
| 18s–20s | Click **"Transfer Selected"** — show transfer modal opening with info banner about same-region constraint | `↗️ Transfer messages across queues (same region/org/env)` | Modal fade-in animation |
| 20s–22s | Close transfer modal. Click on a message row to open detail modal — show full JSON payload | `🔍 Inspect full payload — JSON, CSV, XML supported` | Modal slide-in animation |
| 22s–25s | Click **"Edit"** on the message — show the inline editor with JSON syntax, make a small edit, show the SAVE confirmation prompt (type SAVE to confirm) | `✏️ Edit inline — double-confirmation prevents accidental changes` | — |
| 25s–27s | Close modal. Select a message and click **"Delete Selected"** — show the DELETE confirmation prompt (type DELETE) | `🗑️ Destructive actions require explicit confirmation — type DELETE to proceed` | Confirmation modal fade-in |
| 27s–30s | Cancel the delete. Click **"Refresh"** button to show messages being re-fetched from queue | `🔄 Refresh — re-fetch messages from queue at any time` | — |
| 30s–33s | Click **Back/Disconnect** button — show toast notification confirming messages returned to queue | `🛡️ Auto-return — all untouched messages go back to the queue safely` | Slide-right transition back to login page |
| 33s–35s | Back on login page — session cleared, fields empty | `🔒 Session cleared — nothing persists after disconnect` | Fade out |

### Transition & Animation Notes:
- **Page transitions:** Use ScreenToGif editor to add 3-4 frame slide/fade transitions between Connection Page → Messages Page and back
- **Modal animations:** Capture the native CSS modal fade/slide if present; otherwise add a 2-frame fade in post-editing
- **Helper text:** Add as semi-transparent overlay banners (bottom or top of frame) using ScreenToGif's "Caption" or "Free Text" tool — white text on dark semi-transparent background (#000000 at 70% opacity)
- **Highlight callouts:** For security features (encryption, confirmation prompts), use a subtle colored border or glow around the relevant UI element

### GIF Settings:
- **Resolution:** 800×500 px (or crop to content area)
- **Frame rate:** 12-15 FPS (smooth but keeps file size down)
- **Max file size:** 10 MB (VIVA Engage limit)
- **Helper text font:** Segoe UI or Calibri, 14-16px, white with dark background pill
- **Filename:** `amq_studio_demo.gif`

---

## 🖼️ SUGGESTED POST LAYOUT IN VIVA ENGAGE

```
[Post Text - as above]

[Image 1: Login Page]        [Image 2: Platform Selection]
[Image 3: Messages Table]    [Image 4: Edit Modal]

[GIF: Full Flow Demo]
```

**Tip:** VIVA Engage supports up to 5 images OR 1 GIF per post. For maximum impact, either:
- **Option A:** Post the GIF only (most engaging, shows the full flow)
- **Option B:** Post 4-5 key screenshots as a carousel (good for detail)
- **Option C:** Make two posts — first with the GIF teaser, second as a follow-up with detailed screenshots

---

## 🔄 ALTERNATIVE: SHORTER VERSION (if you want punchy)

---

**AMQ Studio — Self-Service Queue Management for Anypoint MQ (Proof of Concept)**

 

🚀 Built a PoC for a web dashboard that lets you inspect, edit, resubmit, transfer, and bulk-delete messages on any Anypoint MQ queue — directly from the browser. No scripts, no message loss.

Supports platform-led login (auto-populates via APIs) and a temporary manual form for direct access (manual option will be removed at GA).

🛡️ Secured with AES-256-GCM encryption, auto-return on idle, and double-confirmation for destructive actions.

 

🔗 [Insert link here]

 

This is a PoC — **your feedback will shape the final product.** Please try it and tell us what you think! 👇

#MuleSoft #AnypointMQ #DevTools #InnerSource #ProofOfConcept

---
