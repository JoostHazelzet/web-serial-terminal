/**
 * SerialPort Manager
 * Handles all serial port communication
 */
class SerialPortManager {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.isConnected = false;
    this.onDisconnect = null;
    this.onDataReceived = null;
  }

  async connect(options) {
    try {
      this.port = await navigator.serial.requestPort();
      await this.port.open(options);

      this.port.ondisconnect = () => {
        this.isConnected = false;
        if (this.onDisconnect) {
          this.onDisconnect();
        }
      };

      this.reader = this.port.readable.getReader();
      this.writer = this.port.writable.getWriter();
      this.isConnected = true;

      const info = await this.port.getInfo();
      console.log(`Connected: Vendor 0x${info.usbVendorId.toString(16).padStart(4, '0')}, Product 0x${info.usbProductId.toString(16).padStart(4, '0')}`);

      this.startReading();
      return info;
    } catch (err) {
      throw new Error(err.message);
    }
  }

  async disconnect() {
    try {
      if (this.reader) {
        await this.reader.cancel();
        this.reader = null;
      }
      if (this.writer) {
        await this.writer.close();
        this.writer = null;
      }
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
      this.isConnected = false;
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  }

  async startReading() {
    while (this.isConnected) {
      try {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value && this.onDataReceived) {
          this.onDataReceived(value);
        }
      } catch (err) {
        if (err.name !== 'NetworkError') {
          console.error('Read error:', err);
        }
        break;
      }
    }
  }

  async write(text) {
    if (!this.writer) throw new Error('Not connected');

    // Process escape sequences
    let processed = text
      .replaceAll('\\n', '\n')
      .replaceAll('\\r', '\r')
      .replaceAll('\\t', '\t')
      .replaceAll('\\f', '\f')
      .replaceAll('\\b', '\b')
      .replaceAll(/\\x[a-fA-F0-9]{2}/g, (v) => String.fromCharCode(parseInt(v.substr(2), 16)));

    const data = new TextEncoder().encode(processed);
    await this.writer.write(data);
  }
}

/**
 * HEX Viewer
 * Formats received bytes as hex dump
 */
class HexViewer {
  constructor(bytesPerLine = 16) {
    this.bytesPerLine = bytesPerLine;
    this.reset();
  }

  reset() {
    this.lineIndex = 0;
    this.lineCount = 0;
    this.completeLines = '';
    this.currentLineString = '';
    this.currentLineHex = '';
  }

  addBytes(bytes) {
    bytes.forEach((byte) => {
      const hex = byte === 0 ? '--' : byte.toString(16).padStart(2, '0');
      const char = byte < 32 || byte > 126 ? '.' : String.fromCharCode(byte);

      if (this.lineIndex === this.bytesPerLine - 1) {
        this.completeLines += 
          this.formatLine(this.lineIndex, this.currentLineHex + ' ' + hex, this.currentLineString + char) + '\n';
        this.lineIndex = 0;
        this.lineCount += this.bytesPerLine;
        this.currentLineHex = '';
        this.currentLineString = '';
      } else {
        this.currentLineHex += ' ' + hex;
        this.currentLineString += char;
        this.lineIndex++;
      }
    });
  }

  formatLine(index, hex, str) {
    const address = (this.lineCount + index - (this.bytesPerLine - 1)).toString(10).padStart(6, '0');
    const paddedHex = hex + '  '.repeat(this.bytesPerLine - index - 1);
    return `${address}    ${paddedHex}     ${str}`;
  }

  getOutput() {
    let output = this.completeLines;
    if (this.lineIndex > 0) {
      output += this.formatLine(this.lineIndex - 1, this.currentLineHex, this.currentLineString);
    }
    return output;
  }
}

/**
 * UI Manager
 * Handles all UI interactions
 */
class UIManager {
  constructor() {
    this.serialManager = new SerialPortManager();
    this.messages = []; // Array to store messages
    this.receiveBuffer = ''; // Buffer for incoming data
    this.receiveTimeout = null; // Timeout for flushing buffer
    this.bufferDelay = 200; // ms to wait for more data before displaying
    this.setupElements();
    this.setupEventListeners();
    this.checkBrowserSupport();
  }

  setupElements() {
    this.connectBtn = document.getElementById('connect-btn');
    this.sendBtn = document.getElementById('send-btn');
    this.clearBtn = document.getElementById('clear-btn');
    this.exportBtn = document.getElementById('export-btn');
    this.sendInput = document.getElementById('send-input');
    this.chatMessages = document.getElementById('chat-messages');
    this.alertContainer = document.getElementById('alert-container');
    this.portInfo = document.getElementById('port-info');
    this.portVendor = document.getElementById('port-vendor');
    this.portProduct = document.getElementById('port-product');
    this.addCrlfCheckbox = document.getElementById('add-crlf');
    this.hexModeCheckbox = document.getElementById('hex-mode');
    this.sendCard = document.getElementById('send-card');
    this.receiveCard = document.getElementById('receive-card');
    this.connectionCard = document.getElementById('connection-card');
    this.unsupportedError = document.getElementById('unsupported-error');

    this.baudRateSelect = document.getElementById('baud-rate');
    this.dataBitsSelect = document.getElementById('data-bits');
    this.paritySelect = document.getElementById('parity');
    this.stopBitsSelect = document.getElementById('stop-bits');
    this.flowControlSelect = document.getElementById('flow-control');
  }

  setupEventListeners() {
    this.connectBtn.addEventListener('click', () => this.toggleConnection());
    this.sendBtn.addEventListener('click', () => this.sendData());
    this.clearBtn.addEventListener('click', () => this.clearReceived());
    this.exportBtn.addEventListener('click', () => this.exportChat());
    this.hexModeCheckbox.addEventListener('change', () => this.refreshDisplay());
    this.sendInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendData();
      }
    });

    this.serialManager.onDataReceived = (data) => this.onDataReceived(data);
    this.serialManager.onDisconnect = () => this.onDisconnect();
  }

  checkBrowserSupport() {
    if (!('serial' in navigator)) {
      this.unsupportedError.style.display = 'block';
      this.connectionCard.style.display = 'none';
      this.connectBtn.disabled = true;
    }
  }

  async toggleConnection() {
    if (this.serialManager.isConnected) {
      await this.disconnect();
    } else {
      await this.connect();
    }
  }

  async connect() {
    try {
      const options = {
        baudRate: parseInt(this.baudRateSelect.value),
        dataBits: parseInt(this.dataBitsSelect.value),
        parity: this.paritySelect.value,
        stopBits: parseInt(this.stopBitsSelect.value),
        flowControl: this.flowControlSelect.value,
      };

      const info = await this.serialManager.connect(options);
      
      this.connectBtn.textContent = 'Disconnect';
      this.connectBtn.classList.add('connected');
      this.sendCard.style.display = 'block';
      this.setSettingsDisabled(true);

      this.portVendor.textContent = `Vendor: 0x${info.usbVendorId.toString(16).padStart(4, '0')}`;
      this.portProduct.textContent = `Product: 0x${info.usbProductId.toString(16).padStart(4, '0')}`;
      this.portInfo.style.display = 'block';

      this.showAlert('success', '✓ Serial port connected');
    } catch (err) {
      if (err.message.includes('No port selected')) {
        return; // User cancelled
      }
      this.showAlert('error', `✗ Connection failed: ${err.message}`);
    }
  }

  async disconnect() {
    // Flush any remaining buffered data
    if (this.receiveBuffer) {
      clearTimeout(this.receiveTimeout);
      this.addMessage(this.receiveBuffer, 'received');
      this.receiveBuffer = '';
    }
    
    await this.serialManager.disconnect();
    this.connectBtn.textContent = 'Connect';
    this.connectBtn.classList.remove('connected');
    this.sendCard.style.display = 'none';
    this.portInfo.style.display = 'none';
    this.setSettingsDisabled(false);
    this.showAlert('info', '✓ Serial port disconnected');
  }

  async sendData() {
    try {
      let data = this.sendInput.value;
      if (this.addCrlfCheckbox.checked) {
        data += '\r\n';
      }
      await this.serialManager.write(data);
      // Add sent message to chat
      this.addMessage(data, 'sent');
      this.sendInput.value = '';
      this.showAlert('success', '✓ Data sent');
    } catch (err) {
      this.showAlert('error', `✗ Send failed: ${err.message}`);
    }
  }

  onDataReceived(data) {
    // Decode received data and add to buffer
    let text = new TextDecoder().decode(data);
    this.receiveBuffer += text;
    
    // Clear existing timeout
    if (this.receiveTimeout) {
      clearTimeout(this.receiveTimeout);
    }
    
    // Set new timeout to flush buffer if no more data arrives
    this.receiveTimeout = setTimeout(() => {
      if (this.receiveBuffer) {
        this.addMessage(this.receiveBuffer, 'received');
        this.receiveBuffer = '';
      }
      this.receiveTimeout = null;
    }, this.bufferDelay);
  }

  refreshDisplay() {
    // Refresh all messages in the chat
    this.chatMessages.innerHTML = '';
    this.messages.forEach(msg => {
      this.renderMessage(msg);
    });
  }

  addMessage(text, type) {
    const message = {
      text: text,
      type: type, // 'sent' or 'received'
      timestamp: new Date()
    };
    this.messages.push(message);
    this.renderMessage(message);
  }

  renderMessage(message) {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${message.type}`;
    
    // Format the text (show hex if hex mode is enabled)
    let displayText = message.text;
    if (this.hexModeCheckbox.checked) {
      displayText = this.toHexString(new TextEncoder().encode(message.text));
    }
    
    // Create the bubble
    const bubbleEl = document.createElement('div');
    bubbleEl.className = 'message-bubble';
    bubbleEl.textContent = displayText;
    
    messageEl.appendChild(bubbleEl);
    
    // Add resend button for sent messages
    if (message.type === 'sent') {
      const resendBtn = document.createElement('button');
      resendBtn.className = 'message-resend-btn';
      resendBtn.textContent = '↻';
      resendBtn.title = 'Resend message';
      resendBtn.addEventListener('click', () => this.resendMessage(message));
      messageEl.appendChild(resendBtn);
    }
    
    // Add timestamp
    const timeEl = document.createElement('div');
    timeEl.className = 'message-time';
    timeEl.textContent = message.timestamp.toLocaleTimeString();
    messageEl.appendChild(timeEl);
    
    this.chatMessages.appendChild(messageEl);
    
    // Auto-scroll to bottom
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  resendMessage(message) {
    // Resend the message without CRLF (since it was already added when sent originally)
    this.serialManager.write(message.text).catch(err => {
      this.showAlert('error', `✗ Resend failed: ${err.message}`);
    });
    this.showAlert('success', '✓ Message resent');
  }

  toHexString(data) {
    return Array.from(data)
      .map(byte => byte.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
  }

  clearReceived() {
    this.messages = [];
    this.chatMessages.innerHTML = '';
    this.showAlert('info', 'Cleared all messages');
  }

  exportChat() {
    if (this.messages.length === 0) {
      this.showAlert('info', 'No messages to export');
      return;
    }

    // Format messages as text
    let exportText = 'Serial Communication Log\n';
    exportText += '========================\n\n';
    
    this.messages.forEach(msg => {
      const time = msg.timestamp.toLocaleTimeString();
      const type = msg.type === 'sent' ? '>> SENT' : '<< RECEIVED';
      exportText += `[${time}] ${type}\n`;
      exportText += msg.text + '\n\n';
    });

    // Create a blob and download
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `serial-log-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showAlert('success', `✓ Exported ${this.messages.length} message(s)`);
  }

  onDisconnect() {
    this.disconnect();
    this.showAlert('warning', '⚠ Serial port was disconnected');
  }

  setSettingsDisabled(disabled) {
    this.baudRateSelect.disabled = disabled;
    this.dataBitsSelect.disabled = disabled;
    this.paritySelect.disabled = disabled;
    this.stopBitsSelect.disabled = disabled;
    this.flowControlSelect.disabled = disabled;
    this.sendInput.disabled = !disabled;
    this.sendBtn.disabled = !disabled;
    this.clearBtn.disabled = false; // Always enabled for viewing/clearing messages
    this.exportBtn.disabled = false; // Always enabled for exporting messages
    this.hexModeCheckbox.disabled = false; // Always enabled for viewing messages
    this.addCrlfCheckbox.disabled = !disabled;
  }

  showAlert(severity, message) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${severity}`;
    alert.innerHTML = `
      <span>${message}</span>
      <button class="alert-close">×</button>
    `;
    alert.querySelector('.alert-close').addEventListener('click', () => alert.remove());
    this.alertContainer.appendChild(alert);

    setTimeout(() => {
      if (alert.parentElement) {
        alert.remove();
      }
    }, 5000);
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new UIManager();
});
