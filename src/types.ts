export type Role = 'creator' | 'joiner';

export type ConnectionState = 'idle' | 'signaling' | 'paired' | 'connected' | 'closed' | 'error';

export type SignalPayload =
  | { kind: 'description'; description: RTCSessionDescriptionInit }
  | { kind: 'candidate'; candidate: RTCIceCandidateInit };

export type SignalMessage =
  | { type: 'created'; code: string }
  | { type: 'joined'; code: string }
  | { type: 'resumed'; code: string; role: Role; peerPresent: boolean }
  | { type: 'peer-ready' }
  | { type: 'peer-left' }
  | { type: 'signal'; payload: SignalPayload }
  | { type: 'error'; reason: string };

export type ChannelMessage =
  | {
      kind: 'file';
      name: string;
      size: number;
      type: string;
      lastModified: number;
    }
  | { kind: 'ready' }
  | { kind: 'complete' }
  | { kind: 'cancel'; reason: string }
  | { kind: 'nickname'; nickname: string }
  | { kind: 'resume'; offset: number };

export type IncomingFile = Extract<ChannelMessage, { kind: 'file' }>;

export type FileMetadata = {
  name: string;
  size: number;
  type: string;
  lastModified: number;
};

export type PersistedSession = {
  version: 2;
  role: Role;
  sessionId: string;
  code: string;
  nickname: string;
};
