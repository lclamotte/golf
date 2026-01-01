# Trackman Data Sync — Chrome Extension

Chrome extension that captures Trackman authentication tokens for use with the Golf Data Viz web app.

## Installation

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select this `extension` folder
5. Copy the generated **Extension ID**

## How It Works

1. **Content Script** (`content.js`) — Injects into Trackman pages
2. **Injected Script** (`injected.js`) — Intercepts fetch requests to capture auth headers
3. **Background Script** (`background.js`) — Stores tokens and responds to web app requests
4. **Popup** (`popup.html`) — Shows current token status

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension configuration (Manifest V3) |
| `background.js` | Service worker for token storage |
| `content.js` | Injector for Trackman pages |
| `injected.js` | Intercepts API calls for auth capture |
| `popup.html/js` | Extension popup UI |

## Permissions

- `storage` — Store captured tokens locally
- `scripting` — Inject scripts into Trackman pages
- Host permissions for `*.trackmangolf.com` and `*.trackmanrange.com`

## Usage

After installation, simply log in to [portal.trackmangolf.com](https://portal.trackmangolf.com). The extension automatically captures your auth token. The web app retrieves it via `chrome.runtime.sendMessage`.
