# EdgeMuse — Local-first Universal LLM Chat

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/shubham0919/edgemuse-local-first-universal-llm-chat)

## Overview

EdgeMuse is a hybrid, local-first chat application designed to provide a seamless AI conversation experience. It runs small-to-medium quantized Large Language Models (LLMs) directly in the browser using WebAssembly (WASM) or WebGPU, with graceful fallback to Cloudflare's edge AI models via the Agents SDK. This ensures high-quality, unlimited local inference while maintaining performance and privacy. The interface emphasizes visual excellence, smooth interactions, and device compatibility, making it ideal for developers and users seeking a Claude Opus-like experience without API dependencies or costs.

Built on a production-ready template, EdgeMuse prioritizes local execution for privacy and speed, falling back to edge services only when necessary (e.g., device limitations or user preference). Note: While local runs are unlimited and free, edge fallback uses Cloudflare AI Gateway, which has usage quotas across all apps—check your account limits.

## Key Features

- **Local-First Inference**: Run quantized LLMs (e.g., via webllm or gpt4all-js) in-browser with WebGPU/WASM support. Models persist in IndexedDB for offline use.
- **Hybrid Fallback**: Seamlessly switch to Cloudflare edge models if local inference fails (e.g., low memory or no WebGPU).
- **Polished Chat UI**: Streaming tokens, tool-call badges, model selector, and session management with auto-save titles based on first messages.
- **Model Management**: Upload/download quantized models, recommended small models, storage monitoring, and quick testing.
- **Session Handling**: Create, list, rename, and delete sessions using Durable Objects for persistence.
- **Device Diagnostics**: Check WebGPU/WASM support, memory estimates, and inference mode (local/edge/hybrid).
- **Visual Excellence**: Responsive, mobile-first design with micro-interactions, gradients, and shadcn/ui components for a delightful UX.
- **Tool Integration**: Supports existing tools like web_search and get_weather, with visual badges for tool calls.
- **Privacy-Focused**: Local models stay on-device; clear warnings for sizes and constraints.

## Tech Stack

- **Frontend**: React 18, Vite (build tool), TypeScript, Tailwind CSS v3, shadcn/ui (Radix primitives), Framer Motion (animations), Lucide React (icons).
- **State Management**: Zustand (with strict primitive selectors to prevent re-render loops).
- **Backend/Edge**: Cloudflare Workers, Agents SDK (Durable Objects for chat agents and app controller), Hono (routing), OpenAI SDK (via Cloudflare AI Gateway).
- **Data & Persistence**: IndexedDB (via idb-keyval/localforage), React Query (caching/fetching).
- **AI Integration**: WebLLM or gpt4all-js (WASM inference), Comlink (Web Worker RPC), MCP (Model Context Protocol) for tools.
- **Utilities**: React Hook Form, React Dropzone (file uploads), Sonner (toasts), react-use (hooks).
- **Dev Tools**: ESLint, Prettier, Bun (package manager).

## Quick Start

### Prerequisites

- Node.js 18+ or Bun (recommended for faster installs).
- Cloudflare account with Workers enabled.
- Environment variables: `CF_AI_BASE_URL` and `CF_AI_API_KEY` for edge fallback (get from [Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/)).
- Optional: WebGPU-enabled browser (Chrome/Edge) for optimal local inference.

### Installation

1. Clone the repository (or use the deploy button above).
2. Install dependencies using Bun:

   ```bash
   bun install
   ```

3. Set up environment variables in `wrangler.jsonc` or via Wrangler secrets:

   ```bash
   wrangler secret put CF_AI_BASE_URL
   wrangler secret put CF_AI_API_KEY
   ```

4. Generate TypeScript types for Workers bindings:

   ```bash
   bun run cf-typegen
   ```

### Running Locally

1. Start the development server:

   ```bash
   bun run dev
   ```

   The app will be available at `http://localhost:3000` (or the port specified in `PORT` env var).

2. For Worker simulation (edge features):

   ```bash
   bun run dev:worker
   ```

3. Open the app and upload a small quantized model (e.g., a 3B/4-bit GGUF) via the Model Manager to test local inference. Use the chat interface to send prompts—local mode prioritizes browser execution.

## Usage

### Core Workflow

1. **Launch Chat**: The home view shows a hero section and chat card. Select a model (local or edge) and start typing in the composer.
2. **Local Inference**: Upload/download models in the Model Manager sheet. Recommended models (small quantized LLMs) are fetched and stored locally.
3. **Sessions**: Use the sidebar or header to manage conversations. Sessions auto-save via `/api/sessions` endpoints.
4. **Fallback**: If local fails (e.g., no WebGPU), it streams via `/api/chat/:sessionId/chat`. Tool calls (e.g., web search) display badges.
5. **Settings**: Access diagnostics for device checks and mode toggles (local/hybrid/edge).

### Example: Sending a Prompt

- Type: "Explain quantum computing simply."
- Hit Send (or Enter). Tokens stream in real-time with a cursor.
- If tools are needed (e.g., "What's the weather in Tokyo?"), badges show execution (e.g., 🌤️ get_weather: 22°C, Sunny).

### API Endpoints (for Integration)

- `POST /api/sessions`: Create new session.
- `GET /api/sessions`: List sessions.
- `POST /api/chat/:sessionId/chat`: Send message (streaming supported).
- `GET /api/chat/:sessionId/messages`: Fetch conversation.
- `DELETE /api/chat/:sessionId/clear`: Clear chat.

All endpoints use JSON; see `worker/types.ts` for schemas.

## Development

### Project Structure

- `src/`: React frontend (pages, components, hooks, lib).
- `worker/`: Cloudflare backend (agents, routes, tools, MCP integration).
- `src/lib/chat.ts`: Client-side API wrapper for chat and sessions.

### Adding Features

1. **New Tools**: Extend `worker/tools.ts` and MCP config in `worker/mcp-client.ts`.
2. **Local Engine**: Implement `LocalEngineAdapter` in a Web Worker (Phase 2). Use Comlink for RPC.
3. **Models**: Add manifests in Model Manager for downloads (ensure CORS).
4. **UI Customization**: Edit `src/pages/HomePage.tsx` for chat view. Use shadcn/ui and Tailwind for styling.
5. **Linting & Formatting**:

   ```bash
   bun run lint
   ```

6. **Testing**: Add unit tests in `src/` using Vitest (configure in `vite.config.ts`). Integration tests via Playwright.

Avoid modifying core files like `worker/index.ts` or bindings in `wrangler.jsonc`. Follow React best practices (no render loops; use primitive Zustand selectors).

### Common Pitfalls

- **Browser Limits**: Test with <7B models on mobile/low-RAM devices.
- **WebGPU**: Fallback to WASM if unavailable (detect via `navigator.gpu`).
- **Quotas**: Edge AI has rate limits—monitor via Cloudflare dashboard.

## Deployment

Deploy to Cloudflare Workers for global edge execution with Durable Objects for state.

1. Build the project:

   ```bash
   bun run build
   ```

2. Deploy using Wrangler:

   ```bash
   wrangler deploy
   ```

   Or use the one-click deploy:

   [![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/shubham0919/edgemuse-local-first-universal-llm-chat)

3. Configure bindings and vars in the dashboard or `wrangler.toml` (e.g., AI Gateway keys as secrets).

4. Custom Domain: Bind via Cloudflare dashboard after deployment.

The app serves static assets from Workers Sites and routes API calls to the agent. Monitor via Cloudflare Observability.

## Contributing

1. Fork the repo and create a feature branch (`git checkout -b feature/new-model-support`).
2. Commit changes (`git commit -m "Add model download progress"`).
3. Push to branch (`git push origin feature/new-model-support`).
4. Open a Pull Request.

Follow the code style (ESLint, Prettier). Focus on visual polish and error-free deploys.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details. Upstream model licenses must be respected for any distributed files.