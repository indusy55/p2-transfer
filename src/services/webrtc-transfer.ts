import type { ChannelMessage, SignalPayload } from '../types.js';

const BUFFER_HIGH_WATER = 4 * 1024 * 1024;
const BUFFER_LOW_WATER = 512 * 1024;

type WebRtcHandlers = {
  onSignal: (payload: SignalPayload) => void;
  onConnected: () => void;
  onClosed: () => void;
  onFailed: () => void;
  onChannelOpen: () => void;
  onControl: (message: ChannelMessage) => void | Promise<void>;
  onBinary: (buffer: ArrayBuffer) => void | Promise<void>;
};

export class WebRtcTransfer {
  private peer: RTCPeerConnection | null = null;
  private channel: RTCDataChannel | null = null;

  constructor(private readonly handlers: WebRtcHandlers) {}

  async startSender() {
    const peer = this.ensurePeer();
    this.bindChannel(peer.createDataChannel('file', { ordered: true }));

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    this.handlers.onSignal({ kind: 'description', description: offer });
  }

  async handleSignal(payload: SignalPayload) {
    const peer = this.ensurePeer();

    if (payload.kind === 'description') {
      await peer.setRemoteDescription(payload.description);

      if (payload.description.type === 'offer') {
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        this.handlers.onSignal({ kind: 'description', description: answer });
      }
      return;
    }

    await peer.addIceCandidate(payload.candidate);
  }

  sendControl(message: ChannelMessage) {
    if (this.channel?.readyState === 'open') {
      this.channel.send(JSON.stringify(message));
    }
  }

  sendBinary(buffer: ArrayBuffer) {
    this.channel?.send(buffer);
  }

  async waitForBuffer() {
    if (!this.channel || this.channel.bufferedAmount <= BUFFER_HIGH_WATER) {
      return;
    }

    await new Promise<void>((resolve) => {
      const onLow = () => {
        this.channel?.removeEventListener('bufferedamountlow', onLow);
        resolve();
      };
      this.channel?.addEventListener('bufferedamountlow', onLow);
    });
  }

  close() {
    this.channel?.close();
    this.peer?.close();
    this.channel = null;
    this.peer = null;
  }

  private ensurePeer() {
    if (this.peer) return this.peer;

    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    peer.addEventListener('icecandidate', (event) => {
      if (event.candidate) {
        this.handlers.onSignal({ kind: 'candidate', candidate: event.candidate.toJSON() });
      }
    });

    peer.addEventListener('connectionstatechange', () => {
      if (peer.connectionState === 'connected') this.handlers.onConnected();
      if (peer.connectionState === 'failed') this.handlers.onFailed();
      if (peer.connectionState === 'closed' || peer.connectionState === 'disconnected') this.handlers.onClosed();
    });

    peer.addEventListener('datachannel', (event) => {
      this.bindChannel(event.channel);
    });

    this.peer = peer;
    return peer;
  }

  private bindChannel(channel: RTCDataChannel) {
    channel.binaryType = 'arraybuffer';
    channel.bufferedAmountLowThreshold = BUFFER_LOW_WATER;

    channel.addEventListener('open', this.handlers.onChannelOpen);
    channel.addEventListener('close', this.handlers.onClosed);
    channel.addEventListener('message', (event) => {
      void this.handleChannelData(event.data);
    });

    this.channel = channel;
  }

  private async handleChannelData(data: string | ArrayBuffer | Blob) {
    if (typeof data === 'string') {
      await this.handlers.onControl(JSON.parse(data) as ChannelMessage);
      return;
    }

    const buffer = data instanceof Blob ? await data.arrayBuffer() : data;
    await this.handlers.onBinary(buffer);
  }
}
