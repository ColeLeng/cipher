# Cipher Runtime Architecture

```mermaid
flowchart LR
  Consultant["Consultant<br/>4 client files"]
  LocalPreflight["Local Preflight<br/>Gemma via Ollama suggests profile"]
  HumanReview["Human Review<br/>approve/edit privacy profile"]
  Scrubber["Deterministic Cipher<br/>entities, metrics, URLs, proof signals"]
  Preview["Pre-Send Review<br/>before/after + changed lines"]
  Gate["Privacy Gate<br/>zero leak vectors required"]
  Claude["Claude Sonnet<br/>strategy generation on scrubbed payload"]
  ToolGuard["Search Guard<br/>rewrite/block risky queries"]
  Restore["Local Restore<br/>query map + cipher map"]
  Deliverable["Final Consultant Deliverable<br/>real names restored"]
  Audit["Local Audit Artifacts<br/>never sent to model"]

  Consultant --> LocalPreflight
  LocalPreflight --> HumanReview
  HumanReview --> Scrubber
  Scrubber --> Preview
  Preview --> Gate
  Gate -->|approved --send| Claude
  Claude --> ToolGuard
  ToolGuard --> Claude
  Claude --> Restore
  Restore --> Deliverable

  Scrubber --> Audit
  Preview --> Audit
  ToolGuard --> Audit
  Deliverable --> Audit
```



## Demo Talk Track

Cipher is not trying to make the data meaningless. It preserves the structure Claude needs for strategy: trend timing, query shape, page patterns, content constraints, and directional metrics.

The privacy boundary is simple: raw files, profile generation, preview, leak checks, and restoration all run locally. Claude only receives the approved scrubbed payload.