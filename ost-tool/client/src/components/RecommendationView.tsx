import { useState } from "react";
import Markdown from "react-markdown";
import type { DebateResult, Session, SolutionImpact } from "../types";

function scoreColor(score: number): string {
  if (score >= 7) return "text-emerald-400";
  if (score >= 4) return "text-zinc-400";
  return "text-red-400";
}

function barOpacity(score: number): string {
  if (score >= 8) return "opacity-100";
  if (score >= 5) return "opacity-70";
  return "opacity-40";
}

function cleanLabel(label: string): string {
  return label.replace(/\s*\([a-z]+-\d+(?:-\d+)*\)\s*/gi, " ").trim();
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className={`shrink-0 text-zinc-600 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
    >
      <path
        d="M5 3L9 7L5 11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DebaterRow({
  perspective,
  score,
  reason,
  expanded,
  onToggle,
}: {
  perspective: string;
  score: number;
  reason: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 py-2 rounded cursor-pointer transition-colors hover:bg-zinc-800/50 focus-visible:outline-2 focus-visible:outline-indigo-500 focus-visible:outline-offset-2 focus-visible:rounded"
      >
        <ChevronIcon expanded={expanded} />
        <span className="inline-flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-400">{perspective}</span>
          <span className={`text-xs font-bold ${scoreColor(score)}`}>{score}</span>
        </span>
      </button>
      <div
        role="region"
        className="grid transition-[grid-template-rows] duration-200 ease-in-out"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <p className="pl-7 pb-2 text-xs text-zinc-400 leading-relaxed">{reason}</p>
        </div>
      </div>
    </div>
  );
}

function SolutionRow({
  impact,
  debate,
  rank,
  expandedKeys,
  onToggleKey,
}: {
  impact: SolutionImpact;
  debate: DebateResult[];
  rank: number;
  expandedKeys: Set<string>;
  onToggleKey: (key: string) => void;
}) {
  const barWidth = (impact.impactScore / 10) * 100;

  const scores = debate
    .filter((d) => d.solutionScores && d.solutionScores.length > 0)
    .map((d) => {
      const match = d.solutionScores!.find((s) => s.solutionId === impact.solutionId);
      return match ? { perspective: d.perspective, score: match.score, reason: match.reason } : null;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  return (
    <div className="py-5 border-b border-zinc-800 last:border-b-0">
      {/* Top line: rank, name, score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-400 text-xs font-bold flex items-center justify-center shrink-0">
            {rank}
          </div>
          <span className="text-base text-zinc-100 font-semibold">{cleanLabel(impact.solutionLabel)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${scoreColor(impact.impactScore)}`}>
            {impact.impactScore}
          </span>
          <span className="text-xs text-zinc-400 font-medium">/10</span>
        </div>
      </div>

      {/* Impact bar */}
      <div className="mt-3 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full bg-indigo-500 transition-all duration-300 ${barOpacity(impact.impactScore)}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {/* Rationale */}
      <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{impact.impactRationale}</p>

      {/* Debater breakdown */}
      {scores.length > 0 && (
        <div className="mt-3">
          {scores.map((s) => {
            const key = `${impact.solutionId}-${s.perspective}`;
            return (
              <DebaterRow
                key={key}
                perspective={s.perspective}
                score={s.score}
                reason={s.reason}
                expanded={expandedKeys.has(key)}
                onToggle={() => onToggleKey(key)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

type Props = {
  session: Session;
  onReset: () => void;
};

export default function RecommendationView({ session, onReset }: Props) {
  const rec = session.recommendation;
  if (!rec) return null;

  const debate = session.debate ?? [];
  const sortedImpacts = [...(rec.solutionImpacts ?? [])].sort(
    (a, b) => b.impactScore - a.impactScore,
  );

  // Collect all possible debater keys for the expand-all toggle
  const allDebaterKeys: string[] = [];
  for (const impact of sortedImpacts) {
    for (const d of debate) {
      if (d.solutionScores && d.solutionScores.length > 0) {
        const match = d.solutionScores.find((s) => s.solutionId === impact.solutionId);
        if (match) {
          allDebaterKeys.push(`${impact.solutionId}-${d.perspective}`);
        }
      }
    }
  }

  const [allExpanded, setAllExpanded] = useState(false);
  const [individuallyToggled, setIndividuallyToggled] = useState<Set<string>>(new Set());

  // Effective expanded state: allExpanded XOR individuallyToggled
  const expandedKeys = new Set<string>(
    allDebaterKeys.filter((key) => allExpanded !== individuallyToggled.has(key)),
  );

  const handleToggleKey = (key: string) => {
    setIndividuallyToggled((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    setAllExpanded((prev) => !prev);
    setIndividuallyToggled(new Set());
  };

  const anyCollapsed = allDebaterKeys.some((key) => !expandedKeys.has(key));

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      {/* Hero */}
      <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/8 to-zinc-900 p-8 mb-10">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-bold text-zinc-100">Recommendation</h2>
          <span className="rounded-full bg-indigo-500/15 border border-indigo-500/30 px-3 py-0.5 text-xs font-semibold text-indigo-400">
            {rec.confidence}/10 confidence
          </span>
        </div>
        <p className="text-lg text-zinc-200 leading-relaxed font-medium">
          {rec.recommendation}
        </p>
      </div>

      {/* Impact Ranking */}
      {sortedImpacts.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 mb-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
              Estimated Impact by Solution
            </h3>
            <button
              type="button"
              onClick={handleToggleAll}
              aria-label={anyCollapsed ? "Expand all debater reasoning" : "Collapse all debater reasoning"}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer bg-transparent border-none"
            >
              {anyCollapsed ? "Expand all" : "Collapse all"}
            </button>
          </div>
          <div>
            {sortedImpacts.map((impact, i) => (
              <SolutionRow
                key={impact.solutionId}
                impact={impact}
                debate={debate}
                rank={i + 1}
                expandedKeys={expandedKeys}
                onToggleKey={handleToggleKey}
              />
            ))}
          </div>
        </div>
      )}

      {/* Rationale */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 mb-10">
        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-4">
          Rationale
        </h3>
        <div className="prose prose-invert prose-sm max-w-none text-zinc-400 leading-relaxed [&>p]:mb-3 [&>p:last-child]:mb-0 [&>ul]:space-y-1 [&>ol]:space-y-1">
          <Markdown>{rec.rationale}</Markdown>
        </div>
      </div>

      {/* First Steps */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 mb-4">
        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-4">
          First Steps
        </h3>
        <ol className="space-y-3">
          {rec.firstSteps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-zinc-400 leading-relaxed">
              <span className="text-indigo-400 font-semibold shrink-0">{i + 1}.</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Risks */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 mb-4">
        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-4">
          Risks
        </h3>
        <ul className="space-y-3">
          {rec.risks.map((risk, i) => (
            <li key={i} className="flex gap-3 text-sm text-zinc-400 leading-relaxed">
              <span className="text-red-400/60 shrink-0 mt-0.5">&#x2022;</span>
              {risk}
            </li>
          ))}
        </ul>
      </div>

      {/* Deprioritize */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 mb-10">
        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">
          Deprioritize
        </h3>
        <ul className="space-y-3">
          {rec.deprioritize.map((item, i) => (
            <li key={i} className="flex gap-3 text-sm text-zinc-500 leading-relaxed">
              <span className="text-zinc-600 shrink-0 mt-0.5">&#x2022;</span>
              {item}
            </li>
          ))}
        </ul>
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
