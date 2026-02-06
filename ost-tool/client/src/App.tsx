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
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <h1 className="text-sm font-bold tracking-wide text-zinc-300">
            OST Tool
            <span className="ml-2 text-xs font-normal text-zinc-600">
              Sherlock Labs
            </span>
          </h1>
        </div>
      </header>

      <div className="mx-auto max-w-6xl">
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
    </div>
  );
}
