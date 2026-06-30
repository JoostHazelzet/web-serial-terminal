# Requirements

## System Requirements
- Modern browser with Web Serial API support (Chrome, Edge, Opera 43+)
- No build tools or Node.js required for production use

## Development Requirements (Optional)
- HTTP server for local development (e.g., `python -m http.server 8000`)
- Text editor or VS Code

## Browser Support
- ✅ Chrome/Chromium 89+
- ✅ Edge 89+
- ✅ Opera 76+
- ❌ Firefox (no Web Serial API support)
- ❌ Safari (no Web Serial API support)

## Functionality
- Connect/disconnect serial ports
- Configurable: baud rate, data bits, parity, stop bits, flow control
- Send text with optional CRLF
- Receive text view and hex viewer
- Visual alerts for status updates

## No Dependencies
This is a vanilla JavaScript application with zero runtime dependencies. It runs directly in the browser using Web APIs.
