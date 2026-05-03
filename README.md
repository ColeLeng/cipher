<div align="center">

# Cipher

### Your sensitive data never leaves your machine.
### Claude still does the analysis.

[![Next.js 14](https://img.shields.io/badge/Next.js-14-000?logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Anthropic Claude](https://img.shields.io/badge/Anthropic-Claude-d97757)](https://www.anthropic.com/)
[![Ollama](https://img.shields.io/badge/Local-Ollama-000)](https://ollama.com/)
[![Status](https://img.shields.io/badge/status-early%20scaffold-yellow)]()

</div>

---

## The 60-second pitch

You have a document with confidential client data. You want a frontier model to analyze it. You can't, in good conscience, paste it into a cloud LLM.

Cipher is the privacy boundary in between.

A small local model writes redaction code, runs it on your raw document, and ships only the sanitized summary to Claude. When Claude responds, Cipher restores the real names locally before you see the answer. If Claude tries to run a web search that would leak a protected string, the local model rewrites or blocks the query before it ever leaves your machine.

> **Two roles, one boundary.** The local role is the privacy gate. The cloud role does the heavy reasoning. Nothing identifying ever crosses.

---

## The pipeline

```
                  YOUR MACHINE                       │   THE CLOUD
                                                     │
   ┌──────────────────┐                              │
   │  Raw document    │                              │
   │  (clients, PII)  │                              │
   └────────┬─────────┘                              │
            ▼                                        │
   ┌──────────────────┐                              │
   │ 1. Score         │  LocalRole flags             │
   │    sensitivity   │  identifying fields          │
   └────────┬─────────┘                              │
            ▼                                        │
   ┌──────────────────┐                              │
   │ 2. Generate      │  LocalRole writes Python     │
   │    transformer   │  redact + preserve signal    │
   └────────┬─────────┘                              │
            ▼                                        │
   ┌──────────────────┐                              │
   │ 3. Sandbox run   │  Sanitized summary +         │
   │                  │  entityMap (stays local)     │
   └────────┬─────────┘                              │
            │                                        │
            │ ═══════ boundary ════════════════════▶ │   ┌──────────────┐
            │                                        │   │ 4. Claude    │
            │                                        │   │    reasons   │
            │ ◀═══════════════════════════════════   │   └──────────────┘
            ▼                                        │
   ┌──────────────────┐                              │
   │ 5. Tool-risk     │  LocalRole inspects any      │
   │    review        │  web_search before it leaves │
   └────────┬─────────┘                              │
            ▼                                        │
   ┌──────────────────┐                              │
   │ 6. Decipher      │  entityMap restores          │
   │                  │  real names locally          │
   └────────┬─────────┘                              │
            ▼                                        │
       ╔══════════╗                                  │
       ║   You    ║                                  │
       ╚══════════╝                                  │
```

---

## Why Cipher

| Problem | What most teams do | What Cipher does |
|---|---|---|
| Document has PII | Manual redaction, copy-paste roulette | LocalRole writes a Python transformer per document, per intent |
| Cloud LLM might leak via tool calls | Hope it doesn't | LocalRole reviews every search query before it leaves |
| Sanitized output is useless | Live with it | entityMap round-trip restores real names client side |
| Different docs need different redactions | One-size-fits-all regex | Transformer is generated for the analytical intent at hand |

---

## Two roles, one boundary

|  | LocalRole | CloudRole |
|---|---|---|
| **Runtime** | Ollama, on your machine | Anthropic Claude, via API |
| **Sees** | Raw document, entityMap, tool calls | Only the sanitized summary |
| **Job** | Redact, gate, restore | Reason, recommend |
| **Why this side** | Privacy. Cheap. Always on. | Frontier reasoning. |

---

## Quickstart

```bash
cp .env.local.example .env.local
# ANTHROPIC_API_KEY=...
# OLLAMA_URL=http://localhost:11434

npm install
npm run dev
```

Open the app, paste a document, pick an intent, click **Protect and analyze**.

The right pane shows three things:

1. The sanitized summary that left your machine
2. Any web searches Claude tried to run, and what Cipher rewrote them to
3. The final response, with real names restored locally

A complete audit trail stays on disk.

---

## What's inside

```
cipher/
├── app/                  Next.js 14 App Router UI
│   ├── page.tsx            Two-pane workspace
│   └── api/run/            Streaming pipeline endpoint
├── lib/
│   ├── pipeline/
│   │   ├── orchestrator.ts   Run loop + event stream
│   │   ├── score.ts          Sensitivity scoring
│   │   ├── cipher.ts         Transformer generation + run
│   │   ├── intercept.ts      Tool-risk review
│   │   └── decipher.ts       Entity restoration
│   └── models/
│       ├── anthropic.ts      Cloud role
│       └── ollama.ts         Local role
├── prompts/
│   ├── cipher_codegen.md     Transformer authoring prompt
│   ├── tool_risk.md          Search query review prompt
│   └── strategy.md           Cloud reasoning prompt
├── python/sandbox.py     Runs the generated transformer
└── eval/examples.jsonl   Evaluation fixtures
```

---

## Status

Early scaffold. The architecture, prompts, types, and UI shell are in place. The pipeline modules currently throw `not implemented yet` and are wired for incremental fill-in.

Built with Next.js 14, TypeScript, the Anthropic SDK, Tailwind, and Ollama.
