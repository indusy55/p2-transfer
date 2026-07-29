import type { SignalMessage, SignalPayload } from '../types.js';

type SignalingHandlers = {
  onMessage: (message: SignalMessage) => void;
  onClose: () => void;
  onError: () => void;
};

export class SignalingClient {
  private socket: WebSocket | null = null;
  private readonly intentionallyClosed = new WeakSet<WebSocket>();

  constructor(
    private readonly url: string,
    private readonly handlers: SignalingHandlers
  ) {}

  connect() {
    this.close();

    const socket = new WebSocket(this.url);
    socket.addEventListener('message', (event) => {
      this.handlers.onMessage(JSON.parse(event.data) as SignalMessage);
    });
    socket.addEventListener('close', () => {
      if (!this.intentionallyClosed.has(socket)) this.handlers.onClose();
      if (this.socket === socket) this.socket = null;
    });
    socket.addEventListener('error', this.handlers.onError);

    this.socket = socket;
    return socket;
  }

  createRoom(sessionId: string) {
    this.send({ type: 'create', sessionId });
  }

  joinRoom(code: string, sessionId: string) {
    this.send({ type: 'join', code, sessionId });
  }

  resumeRoom(code: string, role: 'creator' | 'joiner', sessionId: string) {
    this.send({ type: 'resume', code, role, sessionId });
  }

  relay(payload: SignalPayload) {
    this.send({ type: 'signal', payload });
  }

  close() {
    if (this.socket) {
      this.intentionallyClosed.add(this.socket);
      this.socket.close();
    }
    this.socket = null;
  }

  private send(message: unknown) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }
}
