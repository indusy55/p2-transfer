import { LitElement, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { appStyles } from './p2-transfer-app.styles.js';
import { SignalingClient } from '../services/signaling.js';
import { clearSession, loadSession, saveSession } from '../services/session-store.js';
import { WebRtcTransfer } from '../services/webrtc-transfer.js';
import { navigate, onRouteChange, type Route } from '../services/router.js';
import { materialIcon } from '../icons.js';
import { generateNickname, loadNickname, saveNickname } from '../utils/nickname.js';
import { ChunkStore, type TransferMeta } from '../services/chunk-store.js';
import type {
  ChannelMessage,
  ConnectionState,
  IncomingFile,
  PersistedSession,
  Role,
  SignalMessage
} from '../types.js';
import { formatBytes } from '../utils/format.js';

const CHUNK_SIZE = 16 * 1024 * 1024;

type TransferDirection = 'send' | 'receive';
type TransferStatus = 'pending' | 'active' | 'paused' | 'complete' | 'rejected';

interface TransferItem {
  id: string;
  direction: TransferDirection;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: TransferStatus;
  bytesTransferred: number;
  file?: File;
  blobUrl?: string;
  chunkStore?: ChunkStore;
  chunkCount?: number;
}

@customElement('p2-transfer-app')
export class P2TransferApp extends LitElement {
  static styles = appStyles;

  @state() private route: Route = { page: 'home' };
  @state() private peerRole: Role | null = null;
  @state() private connectionState: ConnectionState = 'idle';
  @state() private pairCode = '';
  @state() private joinCode = '';
  @state() private statusText = '';
  @state() private channelReady = false;
  @state() private nickname = '';
  @state() private peerNickname = '';
  @state() private editingNickname = false;
  @state() private transfers: TransferItem[] = [];

  private signaling: SignalingClient | null = null;
  private transfer: WebRtcTransfer | null = null;
  private sessionId = '';
  private reconnectTimer: number | null = null;
  private isResetting = false;
  private activeSendId: string | null = null;
  private activeReceiveId: string | null = null;
  private _lastMetaSave = 0;

  connectedCallback() {
    super.connectedCallback();
    this.nickname = loadNickname();
    this.restoreSession();
    onRouteChange((route) => this.handleRouteChange(route));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.stopReconnect();
    this.closeConnections();
  }

  private handleRouteChange(route: Route) {
    this.route = route;

    if (route.page === 'home' && this.peerRole) {
      this.resetAll();
    } else if (route.page === 'create' && this.peerRole !== 'creator') {
      this.startCreatorMode();
    } else if (route.page === 'join' && this.peerRole !== 'joiner') {
      if (route.code) {
        this.joinCode = route.code;
        this.startJoinerMode(route.code);
      } else {
        this.peerRole = 'joiner';
        this.sessionId = crypto.randomUUID();
      }
    }
  }

  private startCreatorMode() {
    this.peerRole = 'creator';
    this.sessionId = crypto.randomUUID();
    this.persistSession();
    this.createPairCode();
  }

  private startJoinerMode(code: string) {
    this.peerRole = 'joiner';
    this.sessionId = crypto.randomUUID();
    this.joinCode = code;
    this.pairCode = code;
    this.persistSession();
    this.openSignaling();
    this.signaling?.connect().addEventListener('open', () => this.signaling?.joinRoom(code, this.sessionId), { once: true });
    this.connectionState = 'signaling';
  }

  render() {
    if (this.route.page === 'home') return this.homeTemplate();
    if (this.channelReady) return this.connectedTemplate();
    if (this.route.page === 'create') return this.createTemplate();
    return this.joinTemplate();
  }

  private homeTemplate() {
    return html`
      <main class="home">
        <div class="home-hero">
          <div class="home-logo">
            ${materialIcon('swap')}
          </div>
          <h1 class="home-title">P2 Transfer</h1>
          <p class="home-subtitle">基于 WebRTC 的点对点文件传输，无需上传服务器</p>
        </div>
        <nav class="home-actions" aria-label="选择方式">
          <div class="action-card send" role="button" tabindex="0"
               @click=${() => navigate({ page: 'create' })}
               @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && navigate({ page: 'create' })}>
            <div class="action-card-icon">
              ${materialIcon('upload')}
            </div>
            <span class="action-card-label">创建房间</span>
          </div>
          <div class="action-card receive" role="button" tabindex="0"
               @click=${() => navigate({ page: 'join' })}
               @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && navigate({ page: 'join' })}>
            <div class="action-card-icon">
              ${materialIcon('link')}
            </div>
            <span class="action-card-label">加入房间</span>
          </div>
        </nav>
      </main>
    `;
  }

  private createTemplate() {
    return html`
      <main class="workspace">
        <header class="topbar">
          <md-icon-button aria-label="返回" @click=${() => navigate({ page: 'home' })}>
            ${materialIcon('arrowBack')}
          </md-icon-button>
          <h1>创建房间</h1>
          <span class="connection-badge" data-state=${this.connectionBadgeState} role="status">
            ${this.connectionLabel}
          </span>
        </header>

        <section class="content">
          <div class="card">
            <div class="card-header">
              ${materialIcon('link')}
              <span>配对码</span>
            </div>
            ${this.pairCode
              ? html`
                  <div class="code-display">
                    <div class="code-digits">
                      ${this.pairCode.split('').map(d => html`<span class="code-digit">${d}</span>`)}
                    </div>
                  </div>
                  <div class="code-actions">
                    <md-text-button @click=${this.copyPairCode}>
                      ${materialIcon('contentCopy', true)}
                      复制
                    </md-text-button>
                    <md-text-button @click=${this.shareLink}>
                      ${materialIcon('share', true)}
                      分享链接
                    </md-text-button>
                  </div>
                `
              : html`
                  <div class="code-loading">
                    <md-circular-progress indeterminate></md-circular-progress>
                  </div>
                `}
          </div>

          <div class="waiting-state">
            <md-circular-progress indeterminate></md-circular-progress>
            <span>等待对方加入…</span>
          </div>

          ${this.statusText ? html`<div class="status-message" role="status">${this.statusText}</div>` : nothing}
        </section>
      </main>
    `;
  }

  private joinTemplate() {
    return html`
      <main class="workspace">
        <header class="topbar">
          <md-icon-button aria-label="返回" @click=${() => navigate({ page: 'home' })}>
            ${materialIcon('arrowBack')}
          </md-icon-button>
          <h1>加入房间</h1>
          <span class="connection-badge" data-state=${this.connectionBadgeState} role="status">
            ${this.connectionLabel}
          </span>
        </header>

        <section class="content">
          <div class="card">
            <div class="card-header">
              ${materialIcon('link')}
              <span>输入配对码</span>
            </div>
            <div class="code-input-row">
              ${[0, 1, 2, 3, 4, 5].map(i => html`
                <input
                  class="code-input-digit"
                  type="text"
                  inputmode="numeric"
                  maxlength="1"
                  .value=${this.joinCode[i] ?? ''}
                  ?disabled=${this.connectionState !== 'idle'}
                  @input=${(e: InputEvent) => this.handleDigitInput(e, i)}
                  @keydown=${(e: KeyboardEvent) => this.handleDigitKeydown(e, i)}
                  @paste=${this.handlePaste}
                />
              `)}
            </div>
            <div class="actions">
              <md-filled-button
                ?disabled=${this.connectionState !== 'idle' || this.joinCode.length !== 6}
                @click=${this.joinPairCode}
              >
                ${materialIcon('link', true)}
                连接
              </md-filled-button>
            </div>
          </div>

          ${this.connectionState === 'signaling' ? html`
            <div class="waiting-state">
              <md-circular-progress indeterminate></md-circular-progress>
              <span>正在连接…</span>
            </div>
          ` : nothing}

          ${this.statusText ? html`<div class="status-message" role="status">${this.statusText}</div>` : nothing}
        </section>
      </main>
    `;
  }

  private connectedTemplate() {
    return html`
      <main class="workspace">
        <header class="topbar">
          <md-icon-button aria-label="断开" @click=${() => navigate({ page: 'home' })}>
            ${materialIcon('close')}
          </md-icon-button>
          <h1>已连接</h1>
          <span class="connection-badge" data-state="connected" role="status">
            ${this.peerNickname || '对方'}
          </span>
        </header>

        <section class="content">
          ${this.nicknameSection()}
          ${this.filePickerTemplate()}
          ${this.transfers.length > 0 ? this.transferListTemplate() : nothing}
          ${this.statusText ? html`<div class="status-message" role="status">${this.statusText}</div>` : nothing}
        </section>
      </main>
    `;
  }

  private nicknameSection() {
    return html`
      <div class="nickname-row">
        <div class="nickname-info">
          <span class="nickname-label">我的昵称</span>
          ${this.editingNickname
            ? html`
                <input
                  class="nickname-input"
                  type="text"
                  maxlength="20"
                  .value=${this.nickname}
                  @input=${(e: InputEvent) => this.nickname = (e.target as HTMLInputElement).value}
                  @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter') this.confirmNickname(); }}
                  @blur=${this.confirmNickname}
                />
              `
            : html`<span class="nickname-value">${this.nickname}</span>`}
        </div>
        ${!this.editingNickname ? html`
          <md-icon-button aria-label="编辑昵称" @click=${() => { this.editingNickname = true; }}>
            ${materialIcon('edit')}
          </md-icon-button>
        ` : nothing}
      </div>
    `;
  }

  private filePickerTemplate() {
    return html`
      <div class="card">
        <div class="card-header">
          ${materialIcon('upload')}
          <span>发送文件</span>
        </div>
        <input
          id="file-input"
          class="file-input"
          type="file"
          @change=${this.pickAndSend}
        />
        <div class="drop-zone"
             @click=${this.openFilePicker}
             @dragover=${this.handleDragOver}
             @dragleave=${this.handleDragLeave}
             @drop=${this.handleDrop}>
          <div class="drop-zone-icon">${materialIcon('uploadFile')}</div>
          <span class="drop-zone-text">点击选择文件或拖拽到此处</span>
        </div>
      </div>
    `;
  }

  private transferListTemplate() {
    return html`
      <div class="transfer-list">
        ${[...this.transfers].reverse().map(t => this.transferItemTemplate(t))}
      </div>
    `;
  }

  private transferItemTemplate(item: TransferItem) {
    const progress = item.fileSize > 0 ? item.bytesTransferred / item.fileSize : 0;
    const dirIcon = item.direction === 'send' ? 'upload' : 'download';

    return html`
      <div class="transfer-item" data-status=${item.status}>
        <div class="transfer-item-icon ${item.direction}">
          ${item.status === 'complete'
            ? materialIcon('checkCircle')
            : materialIcon(dirIcon)}
        </div>
        <div class="transfer-item-details">
          <div class="transfer-item-name">${item.fileName}</div>
          <div class="transfer-item-meta">
            ${item.status === 'active' || item.status === 'paused'
              ? html`${formatBytes(item.bytesTransferred)} / ${formatBytes(item.fileSize)}`
              : html`${formatBytes(item.fileSize)}`}
            ${item.status === 'paused' ? html` · <span class="transfer-paused">重连中</span>` : nothing}
            ${item.status === 'pending' ? html` · <span class="transfer-pending">等待确认</span>` : nothing}
            ${item.status === 'rejected' ? html` · <span class="transfer-rejected">已拒绝</span>` : nothing}
          </div>
          ${item.status === 'active' || item.status === 'paused' ? html`
            <md-linear-progress .progress=${progress}></md-linear-progress>
          ` : nothing}
        </div>
        <div class="transfer-item-actions">
          ${item.status === 'pending' && item.direction === 'receive' ? html`
            <md-text-button @click=${() => this.rejectTransfer(item.id)}>拒绝</md-text-button>
            <md-filled-tonal-button @click=${() => this.acceptTransfer(item.id)}>
              接收
            </md-filled-tonal-button>
          ` : nothing}
          ${item.status === 'complete' && item.direction === 'receive' ? html`
            ${item.blobUrl ? html`
              <md-filled-tonal-button href=${item.blobUrl} download=${item.fileName}>
                ${materialIcon('download', true)}
                下载
              </md-filled-tonal-button>
            ` : nothing}
            ${!item.blobUrl && this.canStreamToDisk ? html`
              <md-filled-tonal-button @click=${() => this.saveTransferToDisk(item.id)}>
                ${materialIcon('save', true)}
                保存
              </md-filled-tonal-button>
            ` : nothing}
          ` : nothing}
        </div>
      </div>
    `;
  }

  private get connectionLabel() {
    const labels: Record<ConnectionState, string> = {
      idle: '未连接',
      signaling: '配对中',
      paired: '已配对',
      connected: '已连接',
      closed: '已断开',
      error: '异常'
    };
    return labels[this.connectionState];
  }

  private get connectionBadgeState() {
    if (this.connectionState === 'connected' || this.connectionState === 'paired') return 'connected';
    if (this.connectionState === 'error') return 'error';
    return 'default';
  }

  private get canStreamToDisk() {
    return typeof window.showSaveFilePicker === 'function';
  }

  // ─── Nickname ───

  private confirmNickname = () => {
    this.editingNickname = false;
    if (!this.nickname.trim()) this.nickname = generateNickname();
    saveNickname(this.nickname);
    this.transfer?.sendControl({ kind: 'nickname', nickname: this.nickname });
  };

  // ─── Share link ───

  private shareLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}#/join/${this.pairCode}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'P2 Transfer', text: '点击链接加入文件传输', url });
      } else {
        await navigator.clipboard.writeText(url);
        this.statusText = '链接已复制';
        setTimeout(() => { if (this.statusText === '链接已复制') this.statusText = ''; }, 2000);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        this.statusText = '链接已复制';
        setTimeout(() => { if (this.statusText === '链接已复制') this.statusText = ''; }, 2000);
      } catch {
        this.statusText = '无法分享';
      }
    }
  };

  // ─── Digit input handlers ───

  private handleDigitInput(e: InputEvent, index: number) {
    const input = e.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '');
    input.value = value.slice(-1);

    const digits = this.joinCode.padEnd(6, ' ').split('');
    digits[index] = input.value;
    this.joinCode = digits.join('').trimEnd();

    if (input.value && index < 5) {
      const next = this.renderRoot.querySelectorAll<HTMLInputElement>('.code-input-digit')[index + 1];
      next?.focus();
    }

    if (this.joinCode.length === 6 && !this.joinCode.includes(' ')) {
      this.joinPairCode();
    }
  }

  private handleDigitKeydown(e: KeyboardEvent, index: number) {
    if (e.key === 'Backspace' && !(e.target as HTMLInputElement).value && index > 0) {
      const prev = this.renderRoot.querySelectorAll<HTMLInputElement>('.code-input-digit')[index - 1];
      prev?.focus();
    }
    if (e.key === 'Enter' && this.joinCode.length === 6) {
      this.joinPairCode();
    }
  }

  private handlePaste(e: ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData?.getData('text')?.replace(/\D/g, '').slice(0, 6) ?? '';
    if (!text) return;

    this.joinCode = text;
    const inputs = this.renderRoot.querySelectorAll<HTMLInputElement>('.code-input-digit');
    text.split('').forEach((d, i) => {
      if (inputs[i]) inputs[i].value = d;
    });

    if (text.length === 6) {
      this.joinPairCode();
    } else {
      inputs[text.length]?.focus();
    }
  }

  // ─── Drag and drop ───

  private handleDragOver(e: DragEvent) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).style.borderColor = 'var(--md-sys-color-primary)';
    (e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--md-sys-color-primary) 8%, transparent)';
  }

  private handleDragLeave(e: DragEvent) {
    (e.currentTarget as HTMLElement).style.borderColor = '';
    (e.currentTarget as HTMLElement).style.background = '';
  }

  private handleDrop(e: DragEvent) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).style.borderColor = '';
    (e.currentTarget as HTMLElement).style.background = '';

    const file = e.dataTransfer?.files[0];
    if (file) this.sendFile(file);
  }

  // ─── File handling ───

  private pickAndSend(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.sendFile(file);
    input.value = '';
  }

  private openFilePicker = () => {
    this.renderRoot.querySelector<HTMLInputElement>('#file-input')?.click();
  };

  private sendFile(file: File) {
    if (!this.transfer || !this.channelReady) {
      this.statusText = '未连接，无法发送';
      return;
    }

    const id = crypto.randomUUID();
    const item: TransferItem = {
      id,
      direction: 'send',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      status: 'active',
      bytesTransferred: 0,
      file
    };

    this.transfers = [...this.transfers, item];
    this.activeSendId = id;

    this.transfer.sendControl({
      kind: 'file',
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });
  }

  private acceptTransfer(id: string) {
    const item = this.transfers.find(t => t.id === id);
    if (!item || !this.transfer) return;

    item.status = 'active';
    this.transfers = [...this.transfers];
    this.activeReceiveId = id;
    this._lastMetaSave = 0;

    void this.initChunkStore(item);
    this.transfer.sendControl({ kind: 'ready' });
  }

  private rejectTransfer(id: string) {
    const item = this.transfers.find(t => t.id === id);
    if (!item || !this.transfer) return;

    item.status = 'rejected';
    this.transfers = [...this.transfers];
    this.activeReceiveId = null;
    this.transfer.sendControl({ kind: 'cancel', reason: '对方拒绝了文件' });
  }

  private async initChunkStore(item: TransferItem) {
    const store = new ChunkStore();
    await store.init(item.id);
    item.chunkStore = store;
    item.chunkCount = 0;
    await store.saveMeta({
      name: item.fileName,
      size: item.fileSize,
      type: item.fileType,
      lastModified: 0,
      bytesReceived: 0,
      chunkCount: 0,
      complete: false
    });
  }

  private async saveTransferToDisk(id: string) {
    const item = this.transfers.find(t => t.id === id);
    if (!item?.chunkStore) return;

    try {
      const meta = await item.chunkStore.loadMeta();
      if (!meta) return;
      const blob = await item.chunkStore.assembleBlob(meta);

      if (this.canStreamToDisk && window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({ suggestedName: item.fileName });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      this.statusText = error instanceof Error ? error.message : '保存失败';
    }
  }

  private copyPairCode = async () => {
    if (!this.pairCode) return;
    try {
      await navigator.clipboard.writeText(this.pairCode);
      this.statusText = '配对码已复制';
      setTimeout(() => { if (this.statusText === '配对码已复制') this.statusText = ''; }, 2000);
    } catch {
      this.statusText = '无法复制配对码';
    }
  };

  // ─── Signaling ───

  private createPairCode = () => {
    if (!this.sessionId) this.sessionId = crypto.randomUUID();
    this.openSignaling();
    this.signaling?.connect().addEventListener('open', () => this.signaling?.createRoom(this.sessionId), { once: true });
    this.connectionState = 'signaling';
  };

  private joinPairCode = () => {
    if (this.connectionState !== 'idle' || this.joinCode.length !== 6) return;
    if (!this.sessionId) this.sessionId = crypto.randomUUID();
    this.pairCode = this.joinCode;
    this.persistSession();
    this.openSignaling();
    this.signaling?.connect().addEventListener('open', () => this.signaling?.joinRoom(this.joinCode, this.sessionId), { once: true });
    this.connectionState = 'signaling';
  };

  private resumePairCode = () => {
    if (!this.peerRole || !this.pairCode || !this.sessionId) return;
    this.openSignaling();
    this.signaling
      ?.connect()
      .addEventListener('open', () => this.signaling?.resumeRoom(this.pairCode, this.peerRole!, this.sessionId), {
        once: true
      });
    this.connectionState = 'signaling';
  };

  private openSignaling() {
    this.closeConnections();
    this.createTransfer();

    this.signaling = new SignalingClient(this.signalUrl(), {
      onMessage: (message) => void this.handleSignalMessage(message),
      onClose: () => {
        if (this.connectionState !== 'idle') this.connectionState = 'closed';
        this.scheduleReconnect();
      },
      onError: () => {
        this.connectionState = 'error';
        this.statusText = '信令连接失败';
      }
    });
  }

  private createTransfer() {
    this.transfer = new WebRtcTransfer({
      onSignal: (payload) => this.signaling?.relay(payload),
      onConnected: () => {
        this.connectionState = 'connected';
      },
      onClosed: () => {
        this.channelReady = false;
        if (this.connectionState !== 'idle') {
          this.connectionState = 'closed';
          this.pauseActiveTransfers();
        }
      },
      onFailed: () => {
        this.connectionState = 'error';
        this.channelReady = false;
        this.pauseActiveTransfers();
      },
      onChannelOpen: () => {
        this.channelReady = true;
        this.connectionState = 'connected';
        this.transfer?.sendControl({ kind: 'nickname', nickname: this.nickname });
        this.resumeActiveTransfers();
      },
      onControl: (message) => this.handleChannelControl(message),
      onBinary: (buffer) => this.receiveChunk(buffer)
    });
  }

  private pauseActiveTransfers() {
    let changed = false;
    for (const t of this.transfers) {
      if (t.status === 'active') {
        t.status = 'paused';
        changed = true;
      }
    }
    if (changed) {
      this.transfers = [...this.transfers];
      this.statusText = '连接断开，正在重连…';
    }
  }

  private resumeActiveTransfers() {
    const recvItem = this.activeReceiveId ? this.transfers.find(t => t.id === this.activeReceiveId) : null;
    if (recvItem && recvItem.bytesTransferred > 0) {
      recvItem.status = 'active';
      this.transfers = [...this.transfers];
      this.statusText = '';
      this.transfer?.sendControl({ kind: 'resume', offset: recvItem.bytesTransferred });
      return;
    }

    const sendItem = this.activeSendId ? this.transfers.find(t => t.id === this.activeSendId) : null;
    if (sendItem && sendItem.status === 'paused') {
      this.statusText = '已重连，等待对方恢复…';
    } else {
      this.statusText = '';
    }
  }

  private async handleSignalMessage(message: SignalMessage) {
    if (message.type === 'created') {
      this.pairCode = message.code;
      this.persistSession();
      return;
    }

    if (message.type === 'joined') {
      this.pairCode = message.code;
      this.connectionState = 'paired';
      this.persistSession();
      return;
    }

    if (message.type === 'resumed') {
      this.connectionState = message.peerPresent ? 'paired' : 'signaling';
      if (!message.peerPresent) this.statusText = '等待对方重新连接';
      return;
    }

    if (message.type === 'peer-ready') {
      this.transfer?.close();
      this.createTransfer();
      this.connectionState = 'paired';
      if (this.peerRole === 'creator') await this.transfer?.startSender();
      return;
    }

    if (message.type === 'signal') {
      await this.transfer?.handleSignal(message.payload);
      return;
    }

    if (message.type === 'peer-left') {
      this.connectionState = 'closed';
      this.channelReady = false;
      this.statusText = '等待对方重新连接';
      return;
    }

    if (message.type === 'error') {
      if (message.reason === 'SESSION_NOT_FOUND' || message.reason === 'INVALID_SESSION' || message.reason === 'ROOM_NOT_FOUND') {
        this.handleExpiredSession();
        return;
      }
      this.connectionState = 'error';
      this.statusText = this.humanError(message.reason);
    }
  }

  // ─── Transfer ───

  private async handleChannelControl(message: ChannelMessage) {
    if (message.kind === 'nickname') {
      this.peerNickname = message.nickname;
      return;
    }

    if (message.kind === 'file') {
      const id = crypto.randomUUID();
      const item: TransferItem = {
        id,
        direction: 'receive',
        fileName: message.name,
        fileSize: message.size,
        fileType: message.type,
        status: 'pending',
        bytesTransferred: 0
      };
      this.transfers = [...this.transfers, item];
      this.activeReceiveId = id;
      return;
    }

    if (message.kind === 'ready') {
      await this.startSending();
      return;
    }

    if (message.kind === 'resume') {
      await this.startSending(message.offset);
      return;
    }

    if (message.kind === 'complete') {
      await this.finishReceive();
      return;
    }

    if (message.kind === 'cancel') {
      const sendItem = this.activeSendId ? this.transfers.find(t => t.id === this.activeSendId) : null;
      if (sendItem && sendItem.status === 'active') {
        sendItem.status = 'rejected';
        this.transfers = [...this.transfers];
        this.activeSendId = null;
      }
    }
  }

  private async startSending(fromOffset = 0) {
    const item = this.activeSendId ? this.transfers.find(t => t.id === this.activeSendId) : null;
    if (!item?.file || !this.transfer) return;

    item.status = 'active';
    item.bytesTransferred = fromOffset;
    this.transfers = [...this.transfers];

    const file = item.file;
    let offset = fromOffset;
    let lastRender = 0;

    while (offset < file.size) {
      if (!this.channelReady) {
        item.status = 'paused';
        item.bytesTransferred = offset;
        this.transfers = [...this.transfers];
        return;
      }

      await this.transfer.waitForBuffer();
      const chunk = await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer();
      this.transfer.sendBinary(chunk);
      offset += chunk.byteLength;
      item.bytesTransferred = offset;

      const now = performance.now();
      if (now - lastRender > 100) {
        this.transfers = [...this.transfers];
        lastRender = now;
      }
    }

    this.transfer.sendControl({ kind: 'complete' });
    item.status = 'complete';
    this.transfers = [...this.transfers];
    this.activeSendId = null;
    this.statusText = '';
  }

  private async receiveChunk(buffer: ArrayBuffer) {
    const item = this.activeReceiveId ? this.transfers.find(t => t.id === this.activeReceiveId) : null;
    if (!item || item.status !== 'active') return;

    if (!item.chunkStore) {
      this.statusText = '接收存储未就绪，数据已丢失';
      return;
    }

    const idx = item.chunkCount ?? 0;
    await item.chunkStore.saveChunk(idx, buffer);
    item.chunkCount = idx + 1;

    item.bytesTransferred += buffer.byteLength;

    const now = performance.now();
    if (!this._lastMetaSave || now - this._lastMetaSave > 200) {
      this.transfers = [...this.transfers];
      await item.chunkStore.saveMeta({
        name: item.fileName,
        size: item.fileSize,
        type: item.fileType,
        lastModified: 0,
        bytesReceived: item.bytesTransferred,
        chunkCount: item.chunkCount,
        complete: false
      });
      this._lastMetaSave = now;
    }
  }

  private async finishReceive() {
    const item = this.activeReceiveId ? this.transfers.find(t => t.id === this.activeReceiveId) : null;
    if (!item) return;

    if (item.chunkStore) {
      const meta = await item.chunkStore.loadMeta();
      if (meta) {
        meta.complete = true;
        await item.chunkStore.saveMeta(meta);
        const blob = await item.chunkStore.assembleBlob(meta);
        item.blobUrl = URL.createObjectURL(blob);
      }
    }

    item.status = 'complete';
    this.transfers = [...this.transfers];
    this.activeReceiveId = null;
  }

  // ─── Utilities ───

  private signalUrl() {
    const configured = import.meta.env.VITE_SIGNAL_URL as string | undefined;
    if (configured) return configured;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const isViteLocal =
      ['localhost', '127.0.0.1'].includes(window.location.hostname) && window.location.port !== '8787';

    return isViteLocal ? 'ws://localhost:8787/signal' : `${protocol}//${window.location.host}/signal`;
  }

  private humanError(reason: string) {
    const errors: Record<string, string> = {
      ROOM_NOT_FOUND: '配对码不存在',
      ROOM_FULL: '配对码已被使用',
      PEER_NOT_READY: '对端未就绪',
      NO_ROOM: '房间不存在',
      INVALID_SESSION: '会话标识无效',
      SESSION_NOT_FOUND: '会话已过期',
      INVALID_JSON: '信令格式错误',
      UNKNOWN_MESSAGE: '未知信令消息'
    };
    return errors[reason] ?? reason;
  }

  private resetAll = () => {
    this.isResetting = true;
    this.stopReconnect();
    this.closeConnections();
    clearSession();

    for (const t of this.transfers) {
      if (t.blobUrl) URL.revokeObjectURL(t.blobUrl);
      t.chunkStore?.close();
    }

    this.peerRole = null;
    this.connectionState = 'idle';
    this.pairCode = '';
    this.joinCode = '';
    this.statusText = '';
    this.channelReady = false;
    this.transfers = [];
    this.activeSendId = null;
    this.activeReceiveId = null;
    this.peerNickname = '';
    this.sessionId = '';
    this.isResetting = false;
  };

  private closeConnections() {
    this.transfer?.close();
    this.signaling?.close();
    this.transfer = null;
    this.signaling = null;
    this.channelReady = false;
  }

  private restoreSession() {
    const session = loadSession();
    if (!session) return;

    this.peerRole = session.role;
    this.sessionId = session.sessionId;
    this.pairCode = session.code;
    this.joinCode = session.role === 'joiner' ? session.code : '';

    if (session.role === 'creator') {
      navigate({ page: 'create' });
    } else {
      navigate({ page: 'join', code: session.code });
    }

    if (session.code) {
      this.resumePairCode();
    } else if (session.role === 'creator') {
      this.createPairCode();
    }
  }

  private persistSession() {
    if (!this.peerRole || !this.sessionId) return;

    const session: PersistedSession = {
      version: 2,
      role: this.peerRole,
      sessionId: this.sessionId,
      code: this.pairCode,
      nickname: this.nickname
    };
    saveSession(session);
  }

  private scheduleReconnect() {
    if (this.isResetting || !this.peerRole || !this.pairCode || !this.sessionId || this.reconnectTimer !== null) return;

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.resumePairCode();
    }, 1000);
  }

  private stopReconnect() {
    if (this.reconnectTimer === null) return;
    window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private handleExpiredSession() {
    this.stopReconnect();
    this.closeConnections();
    clearSession();
    this.peerRole = null;
    this.connectionState = 'idle';
    this.pairCode = '';
    this.joinCode = '';
    this.sessionId = crypto.randomUUID();
    this.statusText = '';
    this.channelReady = false;
    this.transfers = [];
    this.activeSendId = null;
    this.activeReceiveId = null;

    navigate({ page: 'home' });
  }
}
