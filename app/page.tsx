import type { CipherIntent } from "@/lib/pipeline/orchestrator";

const intents: CipherIntent[] = [
  "gap_analysis",
  "competitor_benchmark",
  "content_strategy",
  "keyword_opportunity"
];

export default function HomePage() {
  return (
    <main className="min-h-screen p-6">
      <section className="mx-auto flex max-w-6xl flex-col gap-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Cipher
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            Keep client data private before Claude sees it.
          </h1>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">What you typed</h2>
            <p className="mt-2 text-sm text-slate-600">
              Paste client exports here. Cipher will clean them before anything
              crosses the boundary.
            </p>
            <textarea
              className="mt-4 min-h-80 w-full rounded-xl border border-slate-200 p-3 font-mono text-sm"
              placeholder="Paste GSC, GA, or AEO visibility data..."
            />
            <select className="mt-4 w-full rounded-xl border border-slate-200 p-3">
              {intents.map((intent) => (
                <option key={intent} value={intent}>
                  {intent.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <button className="mt-4 rounded-xl bg-slate-950 px-5 py-3 font-medium text-white">
              Protect and analyze
            </button>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">What Claude saw</h2>
            <p className="mt-2 text-sm text-slate-600">
              This pane will show the cleaned summary, searches Claude tried to
              do, and the recommendation after Cipher restores names locally.
            </p>
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              Pipeline events will appear here.
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Local audit trail</h2>
          <p className="mt-2 text-sm text-slate-600">
            Append-only local records will appear here.
          </p>
        </section>
      </section>
    </main>
  );
}
