import { useState } from "react";
import type { DebateResult, Session } from "../types";
import { getRecommendation } from "../api";

const PERSPECTIVE_STYLES: Record<string, { border: string; badge: string; heading: string }> = {
  "Customer Advocate": {
    border: "border-emerald-500/30",
    badge: "bg-emerald-500/10 text-emerald-400",
    heading: "text-emerald-400",
  },
  "Technical Realist": {
    border: "border-amber-500/30",
    badge: "bg-amber-500/10 text-amber-400",
    heading: "text-amber-400",
  },
  "Business Strategist": {
    border: "border-violet-500/30",
    badge: "bg-violet-500/10 text-violet-400",
    heading: "text-violet-400",
  },
  "Experiment Designer": {
    border: "border-cyan-500/30",
    badge: "bg-cyan-500/10 text-cyan-400",
    heading: "text-cyan-400",
  },
  "CFO / Finance": {
    border: "border-orange-500/30",
    badge: "bg-orange-500/10 text-orange-400",
    heading: "text-orange-400",
  },
  "Growth Lead": {
    border: "border-pink-500/30",
    badge: "bg-pink-500/10 text-pink-400",
    heading: "text-pink-400",
  },
  "Operations Lead": {
    border: "border-yellow-500/30",
    badge: "bg-yellow-500/10 text-yellow-400",
    heading: "text-yellow-400",
  },
  "Data Analyst": {
    border: "border-blue-500/30",
    badge: "bg-blue-500/10 text-blue-400",
    heading: "text-blue-400",
  },
  "Legal / Compliance": {
    border: "border-red-500/30",
    badge: "bg-red-500/10 text-red-400",
    heading: "text-red-400",
  },
  "Marketer": {
    border: "border-fuchsia-500/30",
    badge: "bg-fuchsia-500/10 text-fuchsia-400",
    heading: "text-fuchsia-400",
  },
  "Devil's Advocate": {
    border: "border-rose-500/30",
    badge: "bg-rose-500/10 text-rose-400",
    heading: "text-rose-400",
  },
};

function fallbackStyle() {
  return {
    border: "border-zinc-700",
    badge: "bg-zinc-800 text-zinc-300",
    heading: "text-zinc-300",
  };
}

function DebateCard({ result }: { result: DebateResult }) {
  const style = PERSPECTIVE_STYLES[result.perspective] ?? fallbackStyle();

  return (
    <div
      className={`rounded-xl border bg-zinc-900 p-5 flex flex-col gap-3 ${style.border}`}
    >
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-bold ${style.heading}`}>
          {result.perspective}
        </h3>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.badge}`}
        >
          {result.score}/10 conviction
        </span>
      </div>

      <p className="text-sm font-medium text-zinc-200">{result.keyInsight}</p>

      {result.topArguments && result.topArguments.length > 0 && (
        <ul className="space-y-1.5 border-l-2 border-zinc-700 pl-3">
          {result.topArguments.map((arg, i) => (
            <li key={i} className="text-sm text-zinc-300 leading-snug">
              {arg}
            </li>
          ))}
        </ul>
      )}

      <details className="group">
        <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400 transition-colors">
          Full analysis
        </summary>
        <p className="text-sm text-zinc-400 leading-relaxed mt-2">
          {result.assessment}
        </p>
      </details>

      {result.risks.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
            Risks
          </h4>
          <ul className="space-y-1">
            {result.risks.map((risk, i) => (
              <li key={i} className="flex gap-2 text-sm text-zinc-400">
                <span className="text-zinc-600 shrink-0">--</span>
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

type Props = {
  session: Session;
  onComplete: (session: Session) => void;
};

export default function DebateView({ session, onComplete }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debate = session.debate ?? [];

  async function handleRecommend() {
    setLoading(true);
    setError(null);
    try {
      const updated = await getRecommendation(session.id);
      onComplete(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get recommendation");
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
        <p className="text-zinc-400 text-sm">Synthesizing a final recommendation...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h2 className="text-lg font-bold mb-1">{debate.length}-Perspective Debate</h2>
      <p className="text-zinc-400 text-sm mb-6">
        Each perspective evaluated the selected solutions independently.
      </p>

      {error && (
        <div className="mb-6 rounded-xl border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {debate.map((result, i) => (
          <DebateCard key={i} result={result} />
        ))}
      </div>

      <button
        onClick={handleRecommend}
        className="w-full rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-400"
      >
        Get Recommendation
      </button>
    </div>
  );
}
