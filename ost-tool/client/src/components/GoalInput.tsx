import { useState } from "react";
import { createSession, generateOST } from "../api";
import type { Session } from "../types";

type Props = {
  onComplete: (session: Session) => void;
};

export default function GoalInput({ onComplete }: Props) {
  const [goal, setGoal] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!goal.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const session = await createSession(goal.trim(), context.trim());
      const updated = await generateOST(session.id);
      onComplete(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24">
        <div className="flex flex-col items-center gap-6">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-indigo-500" />
            <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-indigo-500 [animation-delay:150ms]" />
            <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-indigo-500 [animation-delay:300ms]" />
          </div>
          <p className="text-zinc-400 text-sm">
            Generating your Opportunity Solution Tree...
          </p>
          <p className="text-zinc-600 text-xs">
            This may take a minute while the AI analyzes your goal.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold mb-2">Define Your Goal</h1>
      <p className="text-zinc-400 text-sm mb-8">
        Describe the business outcome you want to achieve. The AI will generate
        an Opportunity Solution Tree to help you explore solutions.
      </p>

      <label className="block mb-2 text-sm font-medium text-zinc-300">
        Business Goal
      </label>
      <textarea
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        placeholder="What outcome are you trying to achieve?"
        rows={4}
        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none mb-6"
      />

      <label className="block mb-2 text-sm font-medium text-zinc-300">
        Context
      </label>
      <textarea
        value={context}
        onChange={(e) => setContext(e.target.value)}
        placeholder="Describe your product, users, and current situation..."
        rows={3}
        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none mb-8"
      />

      {error && (
        <div className="mb-6 rounded-xl border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!goal.trim()}
        className="w-full rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Generate OST
      </button>
    </form>
  );
}
