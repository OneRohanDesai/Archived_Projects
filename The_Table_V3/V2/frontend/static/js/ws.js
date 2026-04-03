class RealtimeWS {
  constructor() {
    // Fix: Use ws:// or wss:// explicitly
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${location.host}/ws`;
    this.ws = new WebSocket(wsUrl);

    this.callbacks = {};

    this.ws.onopen = () => {
      console.log("WebSocket connected");
    };

    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (this.callbacks[data.type]) {
          this.callbacks[data.type].forEach(cb => cb(data));
        }
        if (this.callbacks['*']) {
          this.callbacks['*'].forEach(cb => cb(data));
        }
      } catch (err) {
        console.error("WS parse error:", err);
      }
    };

    this.ws.onerror = (e) => console.error("WS Error:", e);
    this.ws.onclose = () => console.log("WebSocket closed");
  }

  on(type, callback) {
    if (!this.callbacks[type]) this.callbacks[type] = [];
    this.callbacks[type].push(callback);
  }
}