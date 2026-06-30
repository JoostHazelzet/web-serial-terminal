# Web Serial Monitor

A lightweight, zero-dependency serial port monitor using the Web Serial API. Connect to serial devices and communicate directly from your browser.

## 🎯 Features

- **Zero Dependencies** — Pure vanilla HTML/CSS/JavaScript
- **Web Serial API** — Direct serial communication from browser
- **Hex Viewer** — View received data as hexadecimal dump with ASCII
- **Configurable** — Baud rate, data bits, parity, stop bits, flow control
- **Dark UI** — Modern dark theme optimized for terminal work
- **Escape Sequences** — Support for `\n`, `\r`, `\t` and `\xHH` hex escapes
- **Auto CRLF** — Optional automatic carriage return + line feed on send
- **Responsive** — Works on desktop and tablet browsers

## ⚡ Quick Start

```bash
open public/index.html
```

## 📋 Requirements

- **Browser:** Chrome/Chromium 89+, Edge 89+, Opera 76+
- **Device:** Serial device connected via USB (CDC ACM or FTDI)
- **OS:** Windows, macOS, or Linux
- **No Build Tools Required**

⚠️ Firefox and Safari do not currently support the Web Serial API.

## 🔧 How to Use

1. **Open the application** in a supported browser
2. **Configure connection settings:**
   - Baud Rate (default: 115200)
   - Data Bits (7 or 8)
   - Parity (None, Even, Odd)
   - Stop Bits (1 or 2)
   - Flow Control (None, Hardware)
3. **Click "Connect"** and select your serial device from the system dialog
4. **Send Data:** Type in the send field and click "Send" or press `Ctrl+Enter`
5. **View Received Data:** Switch between text and hex viewer modes

### Escape Sequences

Send special characters using escape sequences:
- `\n` — Newline
- `\r` — Carriage return
- `\t` — Tab
- `\b` — Backspace
- `\f` — Form feed
- `\xHH` — Hexadecimal byte (e.g., `\x00`, `\xFF`)

Example: `AT\r` sends "AT" followed by carriage return

## 📁 Project Structure

```
public/
  index.html         # HTML UI
  styles.css         # Styling (dark theme)
  app.js            # Main application (3 classes: SerialPortManager, HexViewer, UIManager)
requirements.md      # Dependencies and browser support
README.md           # This file
```

## 🏗️ Architecture

The code is organized into three clean, modular classes:

- **SerialPortManager** — Handles Web Serial API communication
- **HexViewer** — Formats bytes as hexadecimal dump
- **UIManager** — Manages UI state and user interactions

~300 lines of lightweight, well-commented JavaScript.

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Web Serial API not supported" | Use Chrome, Edge, or Opera |
| Port not showing up in selector | Check device drivers, try USB port restart |
| Garbled characters | Verify baud rate matches device setting |
| Can't write after connect | Check flow control setting |
| Data only appears in hex view | Toggle "HEX Viewer" checkbox |

## 📝 Notes

- Uses native browser APIs only
- Works offline after page load
- No data sent to external servers
- Works on localhost and HTTPS domains (file:// may have restrictions)
- Device must support CDC ACM or similar USB serial protocol

## 📜 License

MIT

## 🤝 Contributing

Found a bug? Have a feature idea? Open an issue on GitHub!

---

**Before:** React, Material-UI, react-scripts, testing libraries (~400 MB)  
**Now:** Single HTML file + CSS + ~300 lines of JavaScript (~100 KB)
