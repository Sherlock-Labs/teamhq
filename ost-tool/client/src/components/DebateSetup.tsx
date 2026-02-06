import { useEffect, useState } from "react";
import type { PerspectiveInfo, Session } from "../types";
import { getPerspectives, runDebate } from "../api";

const PERSPECTIVE_COLORS: Record<string, string> = {
  "customer-advocate": "border-emerald-500/40 hover:border-emerald-500/70",
  "technical-realist": "border-amber-500/40 hover:border-amber-500/70",
  "business-strategist": "border-violet-500/40 hover:border-violet-500/70",
  "experiment-designer": "border-cyan-500/40 hover:border-cyan-500/70",
  "cfo": "border-orange-500/40 hover:border-orange-500/70",
  "growth-hacker": "border-pink-500/40 hover:border-pink-500/70",
  "operations-lead": "border-yellow-500/40 hover:border-yellow-500/70",
  "data-scientist": "border-blue-500/40 hover:border-blue-500/70",
  "legal-compliance": "border-red-500/40 hover:border-red-500/70",
  "marketer": "border-fuchsia-500/40 hover:border-fuchsia-500/70",
  "devil-advocate": "border-rose-500/40 hover:border-rose-500/70",
};

const SELECTED_COLORS: Record<string, string> = {
  "customer-advocate": "border-emerald-500 bg-emerald-500/10",
  "technical-realist": "border-amber-500 bg-amber-500/10",
  "business-strategist": "border-violet-500 bg-violet-500/10",
  "experiment-designer": "border-cyan-500 bg-cyan-500/10",
  "cfo": "border-orange-500 bg-orange-500/10",
  "growth-hacker": "border-pink-500 bg-pink-500/10",
  "operations-lead": "border-yellow-500 bg-yellow-500/10",
  "data-scientist": "border-blue-500 bg-blue-500/10",
  "legal-compliance": "border-red-500 bg-red-500/10",
  "marketer": "border-fuchsia-500 bg-fuchsia-500/10",
  "devil-advocate": "border-rose-500 bg-rose-500/10",
};

type Props = {
  session: Session;
  solutionIds: string[];
  onComplete: (session: Session) => void;
};

export default function DebateSetup({ session, solutionIds, onComplete }: Props) {
  const [perspectives, setPerspectives] = useState<PerspectiveInfo[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(["customer-advocate", "technical-realist", "business-strategist", "experiment-designer"]),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPerspectives().then(setPerspectives).catch(console.error);
  }, []);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleRun() {
    if (selectedIds.size === 0) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await runDebate(session.id, solutionIds, [...selectedIds]);
      onComplete(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run debate");
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-24">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-indigo-500" />
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-indigo-500 [animation-delay:150ms]" />
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-indigo-500 [animation-delay:300ms]" />
        </div>
        <p className="text-zinc-400 text-sm">
          Running {selectedIds.size}-perspective debate on {solutionIds.length} solution{solutionIds.length !== 1 ? "s" : ""}...
        </p>
        <p className="text-zinc-600 text-xs">
          Each perspective runs in parallel. This may take a minute.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h2 className="text-lg font-bold mb-1">Choose Your Debate Panel</h2>
      <p className="text-zinc-400 text-sm mb-6">
        Select which perspectives should evaluate your {solutionIds.length} selected solution{solutionIds.length !== 1 ? "s" : ""}. Each runs as an independent AI agent.
      </p>

      {error && (
        <div className="mb-6 rounded-xl border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {perspectives.map((p) => {
          const selected = selectedIds.has(p.id);
          const baseColor = PERSPECTIVE_COLORS[p.id] ?? "border-zinc-700 hover:border-zinc-600";
          const selColor = SELECTED_COLORS[p.id] ?? "border-indigo-500 bg-indigo-500/10";

          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className={`rounded-xl border p-4 text-left transition-all ${
                selected ? selColor : `bg-zinc-900 ${baseColor}`
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                    selected
                      ? "border-indigo-500 bg-indigo-500"
                      : "border-zinc-600 bg-zinc-950"
                  }`}
                >
                  {selected && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-200">{p.name}</div>
                  <div className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{p.description}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={handleRun}
        disabled={selectedIds.size === 0}
        className="w-full rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Run Debate ({selectedIds.size} perspective{selectedIds.size !== 1 ? "s" : ""})
      </button>
    </div>
  );
}
