# PolyOllama

Run multiple same or different open source large language models such as [Llama2](https://ollama.com/library/llama2), [Mistral](https://ollama.com/library/mistral) and [Gemma](https://ollama.com/library/gemma) in parallel simultaneously powered by [Ollama](https://ollama.com/). 

## Demo

https://github.com/ahmetkca/PolyOllama/assets/74574469/f0084d3c-6223-4f7e-9442-2aa5f79af10d

## Instructions to run it locally

> You need [Ollama](ollama.ai) installed on your computer.

cmd + k (to open the chat prompt)
alt + k (on Windows)

```bash
cd backend
bun install
bun run index.ts
```

```bash
cd frontend
bun install
bun run dev
```

> Running in docker containers frontend + (backend + ollama)

On Windows

```bash
docker compose -f docker-compose.windows.yml up
```

On Linux/MacOS

```bash
docker compose -f docker-compose.unix.yml up
```

frontend available at http://localhost:5173

> :warning: **Still work in progress**
