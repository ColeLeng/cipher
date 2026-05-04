# Cipher Demo Guide — Lumenfield

Use this as the click-through flow for the demo.

## 1. Original Client Inputs

Open these one by one to show what a consultant would normally paste directly into Claude:

1. [Google Search Console export](../eval/lumenfield/01_lumenfield_gsc.csv)
2. [GA4 landing page export](../eval/lumenfield/02_lumenfield_ga4.csv)
3. [AI visibility / citation tracking](../eval/lumenfield/03_lumenfield_visibility.json)
4. [Client brief](../eval/lumenfield/04_lumenfield_brief.md)

## 2. Pre-Send Review

Open this before the Claude step:

[Pre-send cipher review](../audit/runtime/lumenfield/pre_send_review.md)

This is the product moment. It shows the local-only original sample, the exact scrubbed version that would be sent to Claude, and a changed-line preview with deleted/proposed text.

## 3. Output Comparison

Open these side by side:

1. [Cipher final result](../audit/runtime/lumenfield/final_deliverable.md)
2. [Raw Claude / unprotected baseline](../eval/lumenfield/05_lumenfield_content_calendar.md)

Demo framing: the baseline is what quality looks like when Claude has full raw client context. The Cipher final result is produced from scrubbed context, then locally restored.

## 4. System Diagram

Open the architecture canvas:

[Cipher architecture canvas](../../../../.cursor/projects/Users-coleleng-Desktop-Sundai-Hackathon-Local-Chief-of-Staff/canvases/cipher-demo-architecture.canvas.tsx)

There is also a Mermaid version:

[Cipher architecture Mermaid](./cipher-architecture.md)