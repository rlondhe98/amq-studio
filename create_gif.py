"""
Generate an animated GIF showcasing AMQ Studio UI flow.
Uses Playwright to render HTML frames and Pillow to stitch the GIF.
Smooth cross-fade transitions between screens with helper text overlays.
"""
import asyncio
import os
import tempfile
from pathlib import Path

from PIL import Image
from playwright.async_api import async_playwright

OUTPUT_DIR = Path(r'c:\Users\qlg9915\AnypointStudio\ws-5\amq-handler-poc')
GIF_OUTPUT = OUTPUT_DIR / 'amq_studio_demo.gif'

# Read the actual CSS and logo
CSS_PATH = OUTPUT_DIR / 'src' / 'main' / 'resources' / 'website' / 'styles.css'
LOGO_PATH = OUTPUT_DIR / 'src' / 'main' / 'resources' / 'website' / 'logo.svg'

with open(CSS_PATH, 'r', encoding='utf-8') as f:
    APP_CSS = f.read()

with open(LOGO_PATH, 'r', encoding='utf-8') as f:
    LOGO_SVG = f.read()

# Base64-encode logo for inline use
import base64
LOGO_B64 = base64.b64encode(LOGO_SVG.encode()).decode()
LOGO_DATA_URI = f"data:image/svg+xml;base64,{LOGO_B64}"

# Number of transition frames between each main frame
TRANSITION_FRAMES = 6
TRANSITION_FRAME_DURATION = 50  # ms per transition frame

# Helper text overlay CSS
HELPER_TEXT_CSS = """
.helper-banner {
    position: fixed;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.78);
    color: #fff;
    padding: 10px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-family: 'Segoe UI', Calibri, sans-serif;
    font-weight: 500;
    z-index: 99999;
    white-space: nowrap;
    box-shadow: 0 4px 16px rgba(0,0,0,0.25);
    letter-spacing: 0.2px;
}
"""


def base_html(body_content, helper_text="", extra_css=""):
    helper_el = f'<div class="helper-banner">{helper_text}</div>' if helper_text else ""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
{APP_CSS}
{HELPER_TEXT_CSS}
{extra_css}
.page {{ display: block; }}
.hidden {{ display: none !important; }}
body {{ min-height: auto; }}
</style>
</head>
<body>
<div class="container">
{body_content}
</div>
{helper_el}
</body>
</html>"""


def crossfade(img1, img2, alpha):
    """Blend two PIL images. alpha=0 returns img1, alpha=1 returns img2."""
    return Image.blend(img1, img2, alpha)


def slide_left(img1, img2, progress):
    """Slide img1 out left, img2 in from right. progress 0..1."""
    w, h = img1.size
    offset = int(w * progress)
    canvas = Image.new("RGB", (w, h))
    canvas.paste(img1, (-offset, 0))
    canvas.paste(img2, (w - offset, 0))
    return canvas


def slide_right(img1, img2, progress):
    """Slide img1 out right, img2 in from left. progress 0..1."""
    w, h = img1.size
    offset = int(w * progress)
    canvas = Image.new("RGB", (w, h))
    canvas.paste(img1, (offset, 0))
    canvas.paste(img2, (-w + offset, 0))
    return canvas


# ─── Frame 1: Login Page ───
FRAME_LOGIN = base_html("""
<div id="connection-page" style="display:block;">
    <div class="logo-header">
        <img src="{logo}" alt="AMQ Studio" class="logo">
        <h1>AMQ Studio</h1>
    </div>
    <p class="subtitle">Connect to Anypoint MQ</p>
    <div class="mode-toggle">
        <button type="button" class="mode-btn active">Platform</button>
        <button type="button" class="mode-btn">Manual</button>
    </div>
    <form class="connection-form">
        <div class="form-group">
            <label for="caClientId">Client ID</label>
            <input type="text" id="caClientId" placeholder="Enter Connected App Client ID">
        </div>
        <div class="form-group">
            <label for="caClientSecret">Client Secret</label>
            <input type="password" id="caClientSecret" placeholder="Enter Connected App Client Secret">
            <small class="form-hint">Credentials are encrypted with AES-256-GCM. Never stored in plaintext.</small>
        </div>
        <button type="button" class="btn btn-primary" style="width:100%;margin-top:12px;">Authenticate</button>
    </form>
</div>
""".format(logo=LOGO_DATA_URI), helper_text="&#128274; Secure login with Connected App credentials")


# ─── Frame 2: Manual Mode Toggle ───
FRAME_MANUAL_TOGGLE = base_html("""
<div id="connection-page" style="display:block;">
    <div class="logo-header">
        <img src="{logo}" alt="AMQ Studio" class="logo">
        <h1>AMQ Studio</h1>
    </div>
    <p class="subtitle">Connect to Anypoint MQ</p>
    <div class="mode-toggle">
        <button type="button" class="mode-btn">Platform</button>
        <button type="button" class="mode-btn active">Manual</button>
    </div>
    <form class="connection-form">
        <div class="form-group">
            <label>Region</label>
            <input type="text" placeholder="e.g. us-east-1">
        </div>
        <div class="form-group">
            <label>Organization ID</label>
            <input type="text" placeholder="Enter Org ID">
        </div>
        <div class="form-group">
            <label>Environment ID</label>
            <input type="text" placeholder="Enter Env ID">
        </div>
        <div class="form-group">
            <label>Client ID</label>
            <input type="text" placeholder="Enter Client ID">
        </div>
        <div class="form-group">
            <label>Client Secret</label>
            <input type="password" placeholder="Enter Client Secret">
        </div>
        <div class="form-group">
            <label>Queue Name</label>
            <input type="text" placeholder="Enter Queue Name">
        </div>
        <button type="button" class="btn btn-primary" style="width:100%;margin-top:12px;">Connect</button>
    </form>
</div>
""".format(logo=LOGO_DATA_URI), helper_text="&#128203; Platform auto-populates via APIs &bull; Manual mode for direct access (PoC only)")


# ─── Frame 3: Authenticated + Dropdowns ───
FRAME_AUTHENTICATED = base_html("""
<div id="connection-page" style="display:block;">
    <div class="logo-header">
        <img src="{logo}" alt="AMQ Studio" class="logo">
        <h1>AMQ Studio</h1>
    </div>
    <p class="subtitle">Connect to Anypoint MQ</p>
    <form class="connection-form">
        <div class="auth-success-bar">
            <span class="auth-success-text">&#10003; Authenticated</span>
            <button type="button" class="btn btn-sm btn-secondary">Disconnect</button>
        </div>
        <div class="form-group">
            <label>Organization</label>
            <select><option>Takeda Pharmaceutical</option></select>
        </div>
        <div class="form-group">
            <label>Environment</label>
            <select><option>Development</option></select>
        </div>
        <div class="form-group">
            <label>Region</label>
            <select><option>us-east-1</option></select>
        </div>
        <div class="form-group">
            <label>Queue</label>
            <select><option>order-processing-dlq</option></select>
        </div>
        <div class="form-group">
            <label>Client Application</label>
            <select><option>amq-handler-dev</option></select>
        </div>
        <div class="form-group">
            <label>Client ID</label>
            <input type="text" value="a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6" readonly style="background:#f5f5f5;">
        </div>
        <div class="form-group">
            <label>Client Secret</label>
            <input type="password" value="secretvalue" placeholder="Enter Client Secret">
        </div>
        <button type="button" class="btn btn-primary" style="width:100%;margin-top:12px;">Connect</button>
    </form>
</div>
""".format(logo=LOGO_DATA_URI), helper_text="&#9989; Authenticated! Cascading dropdowns fetch each level via Platform APIs")


# ─── Frame 3: Loading ───
FRAME_LOADING = base_html("""
<div id="messages-page" style="display:block;">
    <div class="page-header">
        <div class="page-header-left">
            <button class="btn btn-icon btn-icon-back">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            </button>
            <img src="{logo}" alt="" class="logo-sm">
            <h1>order-processing-dlq</h1>
        </div>
        <div class="page-header-right">
            <button class="btn btn-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M16.5 9.5A5.5 5.5 0 0 0 8 8.5"></path><polyline points="8 5.5 8 8.5 11 8.5"></polyline><path d="M7.5 14.5A5.5 5.5 0 0 0 16 15.5"></path><polyline points="16 18.5 16 15.5 13 15.5"></polyline></svg>
            </button>
        </div>
    </div>
    <div class="loading">
        <div class="spinner"></div>
        <p>Fetching messages from queue... (3 received)</p>
    </div>
</div>
""".format(logo=LOGO_DATA_URI), helper_text="&#9203; Consuming messages safely from queue...")


# ─── Frame 4: Messages Table ───
def make_message_row(msg_id, ptype, payload, date, checked=False):
    chk = 'checked' if checked else ''
    return f"""<tr>
        <td class="col-checkbox"><input type="checkbox" {chk}></td>
        <td class="col-id clickable">{msg_id}</td>
        <td class="col-type">{ptype}</td>
        <td class="col-payload">{payload}</td>
        <td class="col-date">{date}</td>
        <td class="col-actions">
            <button class="btn-transfer" title="Transfer">&#10132;</button>
            <button class="btn-delete" title="Delete">&#128465;</button>
        </td>
    </tr>"""

MESSAGES = [
    ("f7a2c9e1-3b4d-4f8a...", "application/json", '{"orderId":"ORD-2024-8891","status":"FAILED"...}', "2026-06-30 14:23"),
    ("b8d1e4f2-9c7a-41e5...", "application/json", '{"customerId":"C-44210","event":"payment_timeout"...}', "2026-06-30 13:45"),
    ("c3f5a7b9-2d8e-4a1c...", "text/csv", 'SKU,Quantity,Warehouse\\nPH-001,500,Tokyo-DC1...', "2026-06-30 12:10"),
    ("d9e2b8c4-1f6a-4d3b...", "application/json", '{"batchId":"B-7712","retryCount":3,"error":"timeout"...}', "2026-06-30 11:30"),
    ("e1a4c6d8-5b2f-4e9a...", "application/json", '{"invoiceId":"INV-20240630","amount":12450.00...}', "2026-06-30 10:55"),
    ("a5b3d7e9-8c1f-4a2d...", "application/json", '{"shipmentId":"SH-9981","carrier":"DHL","status":"delayed"...}', "2026-06-29 22:18"),
]

rows = "\n".join(make_message_row(*m) for m in MESSAGES)

FRAME_MESSAGES = base_html("""
<div id="messages-page" style="display:block;">
    <div class="page-header">
        <div class="page-header-left">
            <button class="btn btn-icon btn-icon-back">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            </button>
            <img src="{logo}" alt="" class="logo-sm">
            <h1>order-processing-dlq</h1>
        </div>
        <div class="page-header-right">
            <button class="btn btn-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M16.5 9.5A5.5 5.5 0 0 0 8 8.5"></path><polyline points="8 5.5 8 8.5 11 8.5"></polyline><path d="M7.5 14.5A5.5 5.5 0 0 0 16 15.5"></path><polyline points="16 18.5 16 15.5 13 15.5"></polyline></svg>
            </button>
            <button class="btn btn-icon" title="Return all">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </button>
        </div>
    </div>
    <div class="messages-table-container">
        <table class="messages-table">
            <thead>
                <tr>
                    <th class="col-checkbox"><input type="checkbox"></th>
                    <th class="col-id">ID</th>
                    <th class="col-type">Payload Type</th>
                    <th class="col-payload">Payload</th>
                    <th class="col-date">Date Created</th>
                    <th class="col-actions">Actions</th>
                </tr>
            </thead>
            <tbody>{rows}</tbody>
        </table>
    </div>
    <div class="pagination" style="display:flex;">
        <button class="btn btn-sm btn-secondary" disabled>&laquo; Previous</button>
        <span>Page 1 of 1 &mdash; 6 messages</span>
        <button class="btn btn-sm btn-secondary" disabled>Next &raquo;</button>
    </div>
</div>
""".format(logo=LOGO_DATA_URI, rows=rows), helper_text="&#128232; Messages consumed &mdash; view full payloads without losing them")


# ─── Frame 5: Bulk Selection ───
rows_selected = "\n".join(
    make_message_row(*m, checked=(i < 3)) for i, m in enumerate(MESSAGES)
)

FRAME_BULK = base_html("""
<div id="messages-page" style="display:block;">
    <div class="page-header">
        <div class="page-header-left">
            <button class="btn btn-icon btn-icon-back">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            </button>
            <img src="{logo}" alt="" class="logo-sm">
            <h1>order-processing-dlq</h1>
        </div>
        <div class="page-header-right">
            <button class="btn btn-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M16.5 9.5A5.5 5.5 0 0 0 8 8.5"></path><polyline points="8 5.5 8 8.5 11 8.5"></polyline><path d="M7.5 14.5A5.5 5.5 0 0 0 16 15.5"></path><polyline points="16 18.5 16 15.5 13 15.5"></polyline></svg>
            </button>
            <button class="btn btn-icon" title="Return all">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </button>
        </div>
    </div>
    <div class="bulk-actions" style="display:flex;">
        <span>3 selected</span>
        <button class="btn btn-sm btn-return">&#8617; Return Selected to Origin</button>
        <button class="btn btn-sm btn-transfer-bulk">&#10132; Transfer Selected to Queue</button>
        <button class="btn btn-sm btn-danger">&#128465; Delete Selected</button>
    </div>
    <div class="messages-table-container">
        <table class="messages-table">
            <thead>
                <tr>
                    <th class="col-checkbox"><input type="checkbox"></th>
                    <th class="col-id">ID</th>
                    <th class="col-type">Payload Type</th>
                    <th class="col-payload">Payload</th>
                    <th class="col-date">Date Created</th>
                    <th class="col-actions">Actions</th>
                </tr>
            </thead>
            <tbody>{rows}</tbody>
        </table>
    </div>
</div>
""".format(logo=LOGO_DATA_URI, rows=rows_selected), helper_text="&#9745; Bulk actions &mdash; operate on multiple messages at once")


# ─── Frame 6: Message Detail / Edit with CSV Table Editor ───
FRAME_DETAIL = base_html("""
<div id="messages-page" style="display:block; filter: brightness(0.7);">
    <div class="page-header">
        <div class="page-header-left">
            <img src="{logo}" alt="" class="logo-sm">
            <h1>order-processing-dlq</h1>
        </div>
    </div>
    <div class="messages-table-container" style="opacity:0.4;">
        <table class="messages-table">
            <thead><tr><th>ID</th><th>Payload Type</th><th>Payload</th></tr></thead>
            <tbody><tr><td colspan="3" style="padding:40px;text-align:center;color:#999;">...</td></tr></tbody>
        </table>
    </div>
</div>
<div class="modal" style="display:flex;">
    <div class="modal-content">
        <div class="modal-header">
            <h2>Message Detail</h2>
            <button class="btn-close">&times;</button>
        </div>
        <div class="message-detail">
            <div class="edit-section">
                <label class="edit-label">Data <span class="edit-content-type">(text/csv)</span></label>
                <div class="csv-preview">
                    <table class="csv-preview-table">
                        <thead>
                            <tr><th>SKU</th><th>Quantity</th><th>Warehouse</th><th>Priority</th></tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><input class="csv-cell" value="PH-001"></td>
                                <td><input class="csv-cell" value="500"></td>
                                <td><input class="csv-cell" value="Tokyo-DC1"></td>
                                <td><input class="csv-cell" value="High"></td>
                            </tr>
                            <tr>
                                <td><input class="csv-cell" value="PH-042"></td>
                                <td><input class="csv-cell" value="120" style="border-color:#4a6cf7;background:#fff;box-shadow:0 0 0 2px rgba(74,108,247,0.1);"></td>
                                <td><input class="csv-cell" value="Osaka-DC2"></td>
                                <td><input class="csv-cell" value="Normal"></td>
                            </tr>
                            <tr>
                                <td><input class="csv-cell" value="PH-118"></td>
                                <td><input class="csv-cell" value="75"></td>
                                <td><input class="csv-cell" value="Tokyo-DC1"></td>
                                <td><input class="csv-cell" value="Low"></td>
                            </tr>
                            <tr>
                                <td><input class="csv-cell" value="PH-203"></td>
                                <td><input class="csv-cell" value="300"></td>
                                <td><input class="csv-cell" value="Singapore-DC1"></td>
                                <td><input class="csv-cell" value="High"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <textarea class="edit-textarea" rows="5" style="font-size:12px;">SKU,Quantity,Warehouse,Priority
PH-001,500,Tokyo-DC1,High
PH-042,120,Osaka-DC2,Normal
PH-118,75,Tokyo-DC1,Low
PH-203,300,Singapore-DC1,High</textarea>
            </div>
            <div class="edit-section">
                <label class="edit-label">User Properties</label>
                <textarea class="edit-textarea" rows="3">{{
  "sourceQueue": "inventory-processing",
  "deliveryCount": 2
}}</textarea>
            </div>
            <div class="edit-actions">
                <button class="btn btn-sm btn-primary">Save Changes</button>
            </div>
        </div>
    </div>
</div>
""".format(logo=LOGO_DATA_URI), helper_text="&#128269; Inspect &amp; edit &mdash; CSV table view, JSON, XML supported", extra_css="""
.modal { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
""")


# ─── Frame 8: JSON Edit Modal ───
FRAME_JSON_EDIT = base_html("""
<div id="messages-page" style="display:block; filter: brightness(0.7);">
    <div class="page-header">
        <div class="page-header-left">
            <img src="{logo}" alt="" class="logo-sm">
            <h1>order-processing-dlq</h1>
        </div>
    </div>
    <div class="messages-table-container" style="opacity:0.4;">
        <table class="messages-table">
            <thead><tr><th>ID</th><th>Payload Type</th><th>Payload</th></tr></thead>
            <tbody><tr><td colspan="3" style="padding:40px;text-align:center;color:#999;">...</td></tr></tbody>
        </table>
    </div>
</div>
<div class="modal" style="display:flex;">
    <div class="modal-content">
        <div class="modal-header">
            <h2>Message Detail</h2>
            <button class="btn-close">&times;</button>
        </div>
        <div class="message-detail">
            <div class="edit-section">
                <label class="edit-label">Data <span class="edit-content-type">(application/json)</span></label>
                <textarea class="edit-textarea" rows="10" style="min-height:180px;border-color:#4a6cf7;background:#fff;box-shadow:0 0 0 3px rgba(74,108,247,0.1);">{{
  "orderId": "ORD-2024-8891",
  "customerId": "C-44210",
  "status": "FAILED",
  "error": "Payment gateway timeout after 30s",
  "retryCount": 3,
  "originalQueue": "order-processing",
  "items": [
    {{ "sku": "PH-001", "qty": 500 }},
    {{ "sku": "PH-042", "qty": 120 }}
  ]
}}</textarea>
            </div>
            <div class="edit-section">
                <label class="edit-label">User Properties</label>
                <textarea class="edit-textarea" rows="3">{{
  "sourceQueue": "order-processing",
  "deliveryCount": 4,
  "errorTimestamp": "2026-06-30T14:23:00Z"
}}</textarea>
            </div>
            <div class="edit-actions">
                <button class="btn btn-sm btn-primary">Save Changes</button>
            </div>
        </div>
    </div>
</div>
""".format(logo=LOGO_DATA_URI), helper_text="&#9999;&#65039; Edit JSON inline &mdash; double-confirmation prevents accidental changes", extra_css="""
.modal { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
""")
FRAME_TRANSFER = base_html("""
<div id="messages-page" style="display:block; filter: brightness(0.7);">
    <div class="page-header">
        <div class="page-header-left">
            <img src="{logo}" alt="" class="logo-sm">
            <h1>order-processing-dlq</h1>
        </div>
    </div>
    <div class="messages-table-container" style="opacity:0.4;">
        <table class="messages-table">
            <thead><tr><th>ID</th><th>Payload</th></tr></thead>
            <tbody><tr><td colspan="2" style="padding:40px;text-align:center;color:#999;">...</td></tr></tbody>
        </table>
    </div>
</div>
<div class="modal" style="display:flex;">
    <div class="modal-content modal-sm">
        <div class="modal-header">
            <h2>Transfer to Queue</h2>
            <button class="btn-close">&times;</button>
        </div>
        <div class="modal-body">
            <div class="info-banner">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                <span>Messages can only be moved between queues in the same region, organization, environment, and business unit.</span>
            </div>
            <div class="form-group">
                <label for="targetQueueName">Target Queue Name</label>
                <input type="text" value="order-processing-retry" style="border-color:#4a6cf7;">
            </div>
            <p class="transfer-info">Transferring 3 message(s)</p>
            <div class="modal-actions">
                <button class="btn btn-secondary">Cancel</button>
                <button class="btn btn-primary">Transfer</button>
            </div>
        </div>
    </div>
</div>
""".format(logo=LOGO_DATA_URI), helper_text="&#10132; Transfer messages across queues (same region/org/env)", extra_css="""
.modal { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
""")


# ─── Frame 9: Delete Confirmation ───
FRAME_DELETE_CONFIRM = base_html("""
<div id="messages-page" style="display:block; filter: brightness(0.7);">
    <div class="page-header">
        <div class="page-header-left">
            <img src="{logo}" alt="" class="logo-sm">
            <h1>order-processing-dlq</h1>
        </div>
    </div>
    <div class="messages-table-container" style="opacity:0.4;">
        <table class="messages-table">
            <thead><tr><th>ID</th><th>Payload</th></tr></thead>
            <tbody><tr><td colspan="2" style="padding:40px;text-align:center;color:#999;">...</td></tr></tbody>
        </table>
    </div>
</div>
<div class="modal" style="display:flex;">
    <div class="modal-content modal-sm">
        <div class="modal-header">
            <h2>&#9888;&#65039; Confirm Delete</h2>
            <button class="btn-close">&times;</button>
        </div>
        <div class="modal-body">
            <p style="margin-bottom:12px;color:#666;">This action is <strong>irreversible</strong>. The selected message(s) will be permanently removed from the queue.</p>
            <p style="margin-bottom:12px;font-size:13px;color:#888;">Type <strong>DELETE</strong> below to confirm:</p>
            <div class="form-group">
                <input type="text" value="DELETE" style="border-color:#e53e3e;text-align:center;font-weight:bold;font-size:16px;letter-spacing:2px;">
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary">Cancel</button>
                <button class="btn btn-danger" style="background:#e53e3e;color:#fff;">Delete 1 Message</button>
            </div>
        </div>
    </div>
</div>
""".format(logo=LOGO_DATA_URI), helper_text="&#128465; Destructive actions require typing DELETE to confirm", extra_css="""
.modal { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.btn-danger { background: #e53e3e; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
""")


# ─── Frame 10: Success Toast (Transfer) ───
FRAME_SUCCESS = base_html("""
<div id="messages-page" style="display:block;">
    <div class="page-header">
        <div class="page-header-left">
            <button class="btn btn-icon btn-icon-back">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            </button>
            <img src="{logo}" alt="" class="logo-sm">
            <h1>order-processing-dlq</h1>
        </div>
        <div class="page-header-right">
            <button class="btn btn-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M16.5 9.5A5.5 5.5 0 0 0 8 8.5"></path><polyline points="8 5.5 8 8.5 11 8.5"></polyline><path d="M7.5 14.5A5.5 5.5 0 0 0 16 15.5"></path><polyline points="16 18.5 16 15.5 13 15.5"></polyline></svg>
            </button>
            <button class="btn btn-icon" title="Return all">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </button>
        </div>
    </div>
    <div class="messages-table-container">
        <table class="messages-table">
            <thead>
                <tr>
                    <th class="col-checkbox"><input type="checkbox"></th>
                    <th class="col-id">ID</th>
                    <th class="col-type">Payload Type</th>
                    <th class="col-payload">Payload</th>
                    <th class="col-date">Date Created</th>
                    <th class="col-actions">Actions</th>
                </tr>
            </thead>
            <tbody>{rows}</tbody>
        </table>
    </div>
    <div class="toast toast-success" style="display:block; position:absolute; top:24px; left:50%; transform:translateX(-50%);">
        &#10003; 3 messages transferred to order-processing-retry
    </div>
</div>
""".format(logo=LOGO_DATA_URI, rows="\n".join(make_message_row(*m) for m in MESSAGES[3:])),
    helper_text="&#10004; Transfer complete &mdash; messages moved successfully")


# ─── Frame 11: Disconnect / Auto-Return ───
FRAME_DISCONNECT = base_html("""
<div id="messages-page" style="display:block;">
    <div class="page-header">
        <div class="page-header-left">
            <button class="btn btn-icon btn-icon-back">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            </button>
            <img src="{logo}" alt="" class="logo-sm">
            <h1>order-processing-dlq</h1>
        </div>
    </div>
    <div class="loading">
        <div class="spinner"></div>
        <p>Returning 3 remaining messages to queue...</p>
    </div>
    <div class="toast toast-success" style="display:block; position:absolute; top:24px; left:50%; transform:translateX(-50%);">
        &#10003; All messages returned to origin queue
    </div>
</div>
""".format(logo=LOGO_DATA_URI), helper_text="&#128737; Auto-return &mdash; untouched messages go back safely on disconnect")


# ─── Frame 12: Session Cleared (back to login) ───
FRAME_SESSION_CLEARED = base_html("""
<div id="connection-page" style="display:block;">
    <div class="logo-header">
        <img src="{logo}" alt="AMQ Studio" class="logo">
        <h1>AMQ Studio</h1>
    </div>
    <p class="subtitle">Connect to Anypoint MQ</p>
    <div class="mode-toggle">
        <button type="button" class="mode-btn active">Platform</button>
        <button type="button" class="mode-btn">Manual</button>
    </div>
    <form class="connection-form">
        <div class="form-group">
            <label for="caClientId">Client ID</label>
            <input type="text" id="caClientId" placeholder="Enter Connected App Client ID">
        </div>
        <div class="form-group">
            <label for="caClientSecret">Client Secret</label>
            <input type="password" id="caClientSecret" placeholder="Enter Connected App Client Secret">
            <small class="form-hint">Credentials are encrypted with AES-256-GCM. Never stored in plaintext.</small>
        </div>
        <button type="button" class="btn btn-primary" style="width:100%;margin-top:12px;">Authenticate</button>
    </form>
</div>
""".format(logo=LOGO_DATA_URI), helper_text="&#128274; Session cleared &mdash; nothing persists after disconnect")


# ─── All frames with durations (ms) and transition type ───
# transition: "crossfade" (default), "slide_left" (page forward), "slide_right" (page back)
FRAMES = [
    ("01_login", FRAME_LOGIN, 2500, "crossfade"),
    ("02_manual_toggle", FRAME_MANUAL_TOGGLE, 2500, "crossfade"),
    ("03_authenticated", FRAME_AUTHENTICATED, 3000, "crossfade"),
    ("04_loading", FRAME_LOADING, 2000, "slide_left"),
    ("05_messages", FRAME_MESSAGES, 3000, "crossfade"),
    ("06_bulk_select", FRAME_BULK, 2500, "crossfade"),
    ("07_csv_edit", FRAME_DETAIL, 3500, "crossfade"),
    ("08_json_edit", FRAME_JSON_EDIT, 3000, "crossfade"),
    ("09_transfer", FRAME_TRANSFER, 3000, "crossfade"),
    ("10_delete_confirm", FRAME_DELETE_CONFIRM, 3000, "crossfade"),
    ("11_success", FRAME_SUCCESS, 2500, "crossfade"),
    ("12_disconnect", FRAME_DISCONNECT, 2500, "slide_right"),
    ("13_session_cleared", FRAME_SESSION_CLEARED, 2500, "crossfade"),
]

# Transition function map
TRANSITION_FN = {
    "crossfade": crossfade,
    "slide_left": slide_left,
    "slide_right": slide_right,
}


async def generate_gif():
    tmp_dir = tempfile.mkdtemp(prefix="amq_gif_")
    print(f"Temp frames dir: {tmp_dir}")

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1000, "height": 650})

        raw_images = []
        frame_names = []
        for name, html, _, _ in FRAMES:
            await page.set_content(html, wait_until="networkidle")
            await page.wait_for_timeout(200)
            path = os.path.join(tmp_dir, f"{name}.png")
            await page.screenshot(path=path, full_page=False)
            raw_images.append(Image.open(path).convert("RGB"))
            frame_names.append(name)
            print(f"  Captured: {name}")

        await browser.close()

    # Build final frame list with animated transitions
    final_frames = []
    final_durations = []

    for i, (name, html, hold_duration, _) in enumerate(FRAMES):
        # Add the main frame (held for its duration)
        final_frames.append(raw_images[i])
        final_durations.append(hold_duration)

        # Add transition to next frame (except after last)
        if i < len(FRAMES) - 1:
            # Use the NEXT frame's transition type (how it enters)
            next_transition = FRAMES[i + 1][3]
            transition_fn = TRANSITION_FN.get(next_transition, crossfade)
            for t in range(1, TRANSITION_FRAMES + 1):
                progress = t / (TRANSITION_FRAMES + 1)
                blended = transition_fn(raw_images[i], raw_images[i + 1], progress)
                final_frames.append(blended)
                final_durations.append(TRANSITION_FRAME_DURATION)

    # Save GIF
    final_frames[0].save(
        str(GIF_OUTPUT),
        save_all=True,
        append_images=final_frames[1:],
        duration=final_durations,
        loop=0,
        optimize=True,
    )

    print(f"\n✅ GIF saved to: {GIF_OUTPUT}")
    print(f"   Size: {GIF_OUTPUT.stat().st_size / 1024:.0f} KB")
    print(f"   Key frames: {len(FRAMES)}")
    print(f"   Total frames (incl. transitions): {len(final_frames)}")
    total_ms = sum(final_durations)
    print(f"   Total duration: {total_ms/1000:.1f}s")

    # Save individual PNGs for the post
    screenshots_dir = OUTPUT_DIR / "screenshots"
    screenshots_dir.mkdir(exist_ok=True)
    for i, img in enumerate(raw_images):
        dest = screenshots_dir / f"{frame_names[i]}.png"
        img.save(str(dest))
    print(f"   Screenshots saved to: {screenshots_dir}")


if __name__ == "__main__":
    asyncio.run(generate_gif())
