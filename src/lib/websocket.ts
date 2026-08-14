type MessageCallback = (data: any) => void;

class RealtimeClient {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<MessageCallback>> = new Map();
  private reconnectInterval: number = 3000;
  private isConnecting: boolean = false;

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.isConnecting = true;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.emit('connection_status', { connected: true });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(data.type || 'message', data);
          this.emit('*', data);
        } catch (e) {
          console.error('Error parsing WS message', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.emit('connection_status', { connected: false });
        setTimeout(() => this.connect(), this.reconnectInterval);
      };

      this.ws.onerror = (err) => {
        this.ws?.close();
      };
    } catch (e) {
      this.isConnecting = false;
      setTimeout(() => this.connect(), this.reconnectInterval);
    }
  }

  send(type: string, payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...payload }));
    }
  }

  on(event: string, callback: MessageCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: any) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((cb) => cb(data));
    }
  }
}

export const realtime = new RealtimeClient();
