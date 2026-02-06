import { useState } from "react";
import StepIndicator from "./components/StepIndicator";
import GoalInput from "./components/GoalInput";
import TreeView from "./components/TreeView";
import DebateSetup from "./components/DebateSetup";
import DebateView from "./components/DebateView";
import RecommendationView from "./components/RecommendationView";
import type { Session } from "./types";

export default function App() {
  const [step, setStep] = useState(0);
  const [session, setSession] = useState<Session | null>(null);
  const [selectedSolutionIds, setSelectedSolutionIds] = useState<string[]>([]);

  function handleGoalComplete(s: Session) {
    setSession(s);
    setStep(1);
  }

  function handleTreeComplete(solutionIds: string[]) {
    setSelectedSolutionIds(solutionIds);
    setStep(2);
  }

  function handleDebateComplete(s: Session) {
    setSession(s);
    setStep(2);
  }

  function handleRecommendComplete(s: Session) {
    setSession(s);
    setStep(3);
  }

  function handleReset() {
    setSession(null);
    setSelectedSolutionIds([]);
    setStep(0);
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <nav className="sticky top-0 z-[100] bg-zinc-950 border-b border-zinc-800 py-4">
        <div className="mx-auto max-w-[1120px] px-5 sm:px-8 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center shrink-0">
            <a href="/" className="flex items-center no-underline">
              <img src="/img/sherlock-labs-logo.svg" alt="Sherlock Labs" className="h-9 max-sm:h-7 w-auto block" />
            </a>
          </div>
          <div className="flex gap-4 sm:gap-6 flex-wrap">
            <a href="/" className="text-sm font-medium text-zinc-400 no-underline hover:text-zinc-300 transition-colors flex items-center gap-1.5">
              <span aria-hidden="true">&larr;</span>
              TeamHQ
            </a>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-[1120px] px-5 sm:px-8 flex-1 w-full">
        <StepIndicator current={step} />

        {step === 0 && <GoalInput onComplete={handleGoalComplete} />}

        {step === 1 && session && (
          <TreeView
            session={session}
            onComplete={handleTreeComplete}
          />
        )}

        {step === 2 && session && !session.debate && (
          <DebateSetup
            session={session}
            solutionIds={selectedSolutionIds}
            onComplete={handleDebateComplete}
          />
        )}

        {step === 2 && session?.debate && (
          <DebateView session={session} onComplete={handleRecommendComplete} />
        )}

        {step === 3 && session && (
          <RecommendationView session={session} onReset={handleReset} />
        )}
      </div>

      <footer className="bg-zinc-900 border-t border-zinc-800 py-8 text-center">
        <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
          <img src="/img/sherlock-labs-logo.svg" alt="Sherlock Labs" className="h-7 w-auto block mx-auto mb-3" />
          <p className="text-sm text-zinc-600">Built with Claude Code</p>
        </div>
      </footer>
    </div>
  );
}
