class RealtimeSocket {
  constructor() {
    this.ws = new WebSocket(`ws://${location.host}/ws`);
    this.callbacks = {};

    this.ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (this.callbacks[msg.event]) {
          this.callbacks[msg.event](msg.data);
        }
      } catch (err) {
        console.error("WS parse error:", err);
      }
    };

    this.ws.onerror = () => console.error("WebSocket error");
    this.ws.onclose = () => {
      console.log("Reconnecting...");
      setTimeout(() => new RealtimeSocket(), 2000);
    };
  }

  on(event, callback) {
    this.callbacks[event] = callback;
  }
}