# Cipher

Keep sensitive data on your machine while still using a cloud LLM to analyze it.

Cipher is a Next.js app that puts a privacy boundary between your raw documents and a cloud model. A small local model strips identifying details before anything leaves your machine. Claude reasons over the sanitized version. Real names are restored locally before you see the response.

## Big picture

Two roles, one boundary.

- **LocalRole** (Ollama, runs on your machine). Sees the raw document. Generates redaction code and reviews any tool calls Claude wants to make.
- **CloudRole** (Claude via the Anthropic SDK). Sees only the sanitized summary. Returns the recommendation.

The local role is the privacy gate. The cloud role does the heavy reasoning.

## Flow

1. **Score sensitivity.** LocalRole scans the document and flags likely identifying fields.
2. **Generate a transformer.** LocalRole writes Python that removes names, exact URLs, brands, and exact metrics while preserving the analytical signal.
3. **Run the transformer in a sandbox.** Output is a sanitized summary plus an `entityMap` that stays on disk.
4. **Cloud analysis.** Claude receives only the sanitized summary plus your stated intent and returns a recommendation.
5. **Tool-risk review.** If Claude proposes a web search, LocalRole inspects the query first and rewrites or blocks anything that would leak protected strings.
6. **Decipher.** The entityMap restores real names before the response is shown.

## How to use

```bash
cp .env.local.example .env.local
# Set ANTHROPIC_API_KEY and OLLAMA_URL
npm install
npm run dev
```

Open the app, paste a document, pick an intent, and click **Protect and analyze**. The right pane shows the sanitized summary, any searches Claude tried to run, and the final response with names restored locally.

## Layout

- `app/`: Next.js 14 App Router UI.
- `lib/pipeline/`: orchestrator, cipher (transformer generation and run), decipher (response restoration), intercept (tool-risk review), score (sensitivity scoring).
- `lib/models/`: `anthropic.ts`, `ollama.ts`, shared types.
- `prompts/`: `cipher_codegen.md`, `tool_risk.md`, `strategy.md`.
- `python/sandbox.py`: runs the generated transformer.
- `eval/examples.jsonl`: evaluation fixtures.

## Status

Early scaffold. Prompts and types are in place; pipeline modules currently throw "not implemented yet" and are wired for incremental fill-in.
