# P2 Transfer

Lit + Material Design 3 + WebRTC 的点对点文件传输应用。信令服务运行在 Cloudflare Workers / Wrangler 上，并使用 Durable Object 保存配对房间状态。

## 功能

- 发送方生成 6 位配对码，接收方输入配对码连接
- WebRTC DataChannel 点对点传输文件内容
- 大文件按 64 KiB 分片发送，并根据 DataChannel buffer 做背压控制
- 接收端支持 File System Access API 时流式写入磁盘
- 不支持流式保存的浏览器会回退为 Blob 下载
- 响应式界面，使用 Lit 和 Material Web 组件

## 本地开发

```bash
pnpm install
pnpm dev
```

默认启动：

- 前端：`http://localhost:5173`
- 信令：`ws://localhost:8787/signal`

也可以分开启动：

```bash
pnpm dev:signal
pnpm dev:web
```

## 部署信令

```bash
pnpm deploy:signal
```

部署后，把前端环境变量指向 Worker 的 WebSocket 地址：

```bash
VITE_SIGNAL_URL=wss://<your-worker-domain>/signal
```

## 构建验证

```bash
pnpm build
pnpm exec wrangler deploy --dry-run
```
