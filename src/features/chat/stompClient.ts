/**
 * Minimal STOMP 1.2 client over a native WebSocket, enough for the RFQ chat contract:
 * CONNECT (Bearer token in a header, never in the URL), SUBSCRIBE, SEND, MESSAGE, ERROR.
 * Heart-beats are disabled because the backend uses Spring's simple broker without them.
 */
export interface StompFrame {
  command: string;
  headers: Record<string, string>;
  body: string;
}

export interface StompHandlers {
  onConnected: () => void;
  onMessage: (frame: StompFrame) => void;
  /** Fired once when the socket closes for any reason; `reason` comes from an ERROR frame when present. */
  onDisconnected: (reason: string | null) => void;
}

function escapeHeader(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/:/g, '\\c');
}

function unescapeHeader(value: string): string {
  return value.replace(/\\(.)/g, (_, c: string) => ({ r: '\r', n: '\n', c: ':', '\\': '\\' })[c] ?? c);
}

function encode(command: string, headers: Record<string, string>, body = ''): string {
  // CONNECT headers are sent verbatim per STOMP 1.2; all other frames escape header values.
  const raw = command === 'CONNECT';
  const lines = Object.entries(headers).map(([key, value]) => `${key}:${raw ? value : escapeHeader(value)}`);
  return `${command}\n${lines.join('\n')}\n\n${body}\0`;
}

function decode(data: string): StompFrame[] {
  return data
    .split('\0')
    .map((chunk) => chunk.replace(/^[\r\n]+/, ''))
    .filter(Boolean)
    .map((chunk) => {
      const split = chunk.indexOf('\n\n');
      const head = split === -1 ? chunk : chunk.slice(0, split);
      const [command, ...headerLines] = head.split('\n').map((line) => line.replace(/\r$/, ''));
      const headers: Record<string, string> = {};
      headerLines.forEach((line) => {
        const colon = line.indexOf(':');
        if (colon > 0 && !(line.slice(0, colon) in headers)) {
          headers[line.slice(0, colon)] = command === 'CONNECTED' ? line.slice(colon + 1) : unescapeHeader(line.slice(colon + 1));
        }
      });
      return { command, headers, body: split === -1 ? '' : chunk.slice(split + 2) };
    });
}

export class StompConnection {
  private socket: WebSocket;
  private errorReason: string | null = null;
  private closed = false;
  private subscriptionSeq = 0;

  constructor(url: string, token: string, private readonly handlers: StompHandlers) {
    this.socket = new WebSocket(url);
    this.socket.onopen = () => {
      this.socket.send(
        encode('CONNECT', {
          'accept-version': '1.2',
          host: new URL(url).host,
          'heart-beat': '0,0',
          Authorization: `Bearer ${token}`
        })
      );
    };
    this.socket.onmessage = (event) => {
      if (typeof event.data !== 'string') return;
      decode(event.data).forEach((frame) => {
        if (frame.command === 'CONNECTED') this.handlers.onConnected();
        else if (frame.command === 'MESSAGE') this.handlers.onMessage(frame);
        else if (frame.command === 'ERROR') this.errorReason = frame.headers.message || frame.body || 'STOMP error';
      });
    };
    this.socket.onclose = () => {
      if (this.closed) return;
      this.closed = true;
      this.handlers.onDisconnected(this.errorReason);
    };
  }

  subscribe(destination: string) {
    this.subscriptionSeq += 1;
    this.socket.send(encode('SUBSCRIBE', { id: `sub-${this.subscriptionSeq}`, destination, ack: 'auto' }));
  }

  send(destination: string, payload: unknown) {
    this.socket.send(encode('SEND', { destination, 'content-type': 'application/json' }, JSON.stringify(payload)));
  }

  get isOpen() {
    return this.socket.readyState === WebSocket.OPEN;
  }

  /** Closes without notifying `onDisconnected` (used on unmount / conversation switch). */
  dispose() {
    this.closed = true;
    if (this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(encode('DISCONNECT', {}));
      } catch {
        // socket already closing
      }
    }
    this.socket.close();
  }
}
