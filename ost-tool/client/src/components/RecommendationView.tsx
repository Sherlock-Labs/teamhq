import Markdown from "react-markdown";
import type { Session, SolutionImpact } from "../types";

type Props = {
  session: Session;
  onReset: () => void;
};

function ImpactBar({ impact }: { impact: SolutionImpact }) {
  const barWidth = (impact.impactScore / 10) * 100;
  const barColor =
    impact.impactScore >= 8
      ? "bg-emerald-500"
      : impact.impactScore >= 5
        ? "bg-indigo-500"
        : "bg-zinc-500";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-200 font-medium">{impact.solutionLabel}</span>
        <span className="text-xs font-semibold text-zinc-400">{impact.impactScore}/10</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <p className="text-xs text-zinc-500 leading-relaxed">{impact.impactRationale}</p>
    </div>
  );
}

export default function RecommendationView({ session, onReset }: Props) {
  const rec = session.recommendation;
  if (!rec) return null;

  const sortedImpacts = [...(rec.solutionImpacts ?? [])].sort(
    (a, b) => b.impactScore - a.impactScore,
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* Hero */}
      <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 to-zinc-900 p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-bold">Recommendation</h2>
          <span className="rounded-full bg-indigo-500/20 px-3 py-0.5 text-xs font-semibold text-indigo-400">
            {rec.confidence}/10 confidence
          </span>
        </div>
        <p className="text-lg text-zinc-200 leading-relaxed font-medium">
          {rec.recommendation}
        </p>
      </div>

      {/* Impact Ranking */}
      {sortedImpacts.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 mb-8">
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-4">
            Estimated Impact by Solution
          </h3>
          <div className="space-y-4">
            {sortedImpacts.map((impact) => (
              <ImpactBar key={impact.solutionId} impact={impact} />
            ))}
          </div>
        </div>
      )}

      {/* Rationale */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 mb-8">
        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-3">
          Rationale
        </h3>
        <div className="prose prose-invert prose-sm max-w-none text-zinc-300 leading-relaxed">
          <Markdown>{rec.rationale}</Markdown>
        </div>
      </div>

      {/* Three columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-red-500/20 bg-zinc-900 p-5">
          <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-3">
            Risks
          </h3>
          <ul className="space-y-2">
            {rec.risks.map((risk, i) => (
              <li key={i} className="flex gap-2 text-sm text-zinc-400">
                <span className="text-red-500/60 shrink-0">--</span>
                {risk}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-zinc-900 p-5">
          <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3">
            First Steps
          </h3>
          <ol className="space-y-2">
            {rec.firstSteps.map((step, i) => (
              <li key={i} className="flex gap-2 text-sm text-zinc-400">
                <span className="text-emerald-500/60 shrink-0">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5">
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">
            Deprioritize
          </h3>
          <ul className="space-y-2">
            {rec.deprioritize.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-zinc-500">
                <span className="text-zinc-700 shrink-0">--</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <button
        onClick={onReset}
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-800"
      >
        Start Over
      </button>
    </div>
  );
}
