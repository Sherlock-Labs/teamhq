const STEPS = ["Goal", "Explore & Select", "Debate", "Recommend"] as const;

export default function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 py-6">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center">
            {i > 0 && (
              <div
                className={`h-px w-10 sm:w-16 ${
                  done ? "bg-indigo-500" : "bg-zinc-700"
                }`}
              />
            )}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  active
                    ? "bg-indigo-500 text-white"
                    : done
                      ? "bg-indigo-500/20 text-indigo-400"
                      : "bg-zinc-800 text-zinc-500"
                }`}
              >
                {done ? (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-xs ${
                  active
                    ? "text-indigo-400 font-medium"
                    : done
                      ? "text-zinc-400"
                      : "text-zinc-600"
                }`}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
