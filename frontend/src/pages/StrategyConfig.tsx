import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";

const DECLINE_OPTIONS = [
  { value: "soft", label: "Soft declines (Insufficient Funds, Issuer Unavailable, etc.)" },
  { value: "hard", label: "Hard declines (Card Expired, Invalid Card, etc.)" },
  { value: "Insufficient Funds", label: "Insufficient Funds only" },
  { value: "Issuer Unavailable", label: "Issuer Unavailable only" },
  { value: "Do Not Honor", label: "Do Not Honor only" },
];

const TESTING_INTERVAL_PRESETS = [
  { label: "1 min, 5 min, 30 min", value: "0.017, 0.083, 0.5" },
  { label: "5 min, 30 min, 1 hr", value: "0.083, 0.5, 1" },
  { label: "30 min, 1 hr, 2 hr", value: "0.5, 1, 2" },
  { label: "1 hr, 3 hr, 6 hr", value: "1, 3, 6" },
];

export default function StrategyConfig() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [declineCategories, setDeclineCategories] = useState<string[]>(["soft"]);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [intervalsStr, setIntervalsStr] = useState("24, 72, 168");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { data: strategy, isLoading } = useQuery({
    queryKey: ["retryStrategy"],
    queryFn: api.getRetryStrategy,
  });

  useEffect(() => {
    if (strategy) {
      setName(strategy.name);
      setDeclineCategories(strategy.decline_categories);
      setMaxAttempts(strategy.max_attempts);
      setIntervalsStr(strategy.intervals_hours.join(", "));
    }
  }, [strategy]);

  const updateMutation = useMutation({
    mutationFn: (payload: {
      name?: string;
      decline_categories?: string[];
      max_attempts?: number;
      intervals_hours?: number[];
    }) => api.updateRetryStrategy(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retryStrategy"] });
      setSaveSuccess(true);
      setValidationError(null);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: () => {
      setValidationError(null);
    },
  });

  const simulateMutation = useMutation({
    mutationFn: api.simulateRetries,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      navigate("/");
    },
  });

  const handleSave = () => {
    setValidationError(null);
    const intervals = intervalsStr
      .split(",")
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n) && n > 0);
    if (intervals.length === 0) {
      setValidationError("Please enter valid intervals (e.g. 24, 72, 168 or 0.017, 0.083, 0.5 for testing)");
      return;
    }

    updateMutation.mutate({
      name: name || undefined,
      decline_categories: declineCategories,
      max_attempts: maxAttempts,
      intervals_hours: intervals,
    });
  };

  const toggleCategory = (val: string) => {
    setDeclineCategories((prev) =>
      prev.includes(val) ? prev.filter((c) => c !== val) : [...prev, val]
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-kijani-700 to-kijani-800 text-white shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <div className="flex justify-between items-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-white/90 hover:text-white font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
            <h1 className="text-xl font-bold tracking-tight">Retry Strategy</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-5">Configure Retry Strategy</h2>

          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-slate-100 rounded-lg" />
              <div className="h-24 bg-slate-100 rounded-lg" />
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Strategy Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Default Soft Retry"
                  className="w-full rounded-lg border-slate-300 shadow-sm focus:border-kijani-500 focus:ring-kijani-500 focus:ring-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Decline Categories to Retry
                </label>
                <p className="text-sm text-slate-500 mb-3">
                  Only soft declines are recommended; hard declines rarely succeed.
                </p>
                <div className="space-y-3">
                  {DECLINE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={declineCategories.includes(opt.value)}
                        onChange={() => toggleCategory(opt.value)}
                        className="rounded border-slate-300 text-kijani-600 focus:ring-kijani-500 w-4 h-4"
                      />
                      <span className="text-sm text-slate-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Max Retry Attempts
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(parseInt(e.target.value, 10) || 1)}
                  className="w-24 rounded-lg border-slate-300 shadow-sm focus:border-kijani-500 focus:ring-kijani-500 focus:ring-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Intervals Between Retries (hours)
                </label>
                <p className="text-sm text-slate-500 mb-2">
                  Comma-separated. Use hours (e.g. 24, 72, 168) or decimals for minutes (0.017 ≈ 1 min).
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="text-xs font-medium text-slate-500">Testing presets:</span>
                  {TESTING_INTERVAL_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setIntervalsStr(preset.value)}
                      className="text-xs px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={intervalsStr}
                  onChange={(e) => setIntervalsStr(e.target.value)}
                  placeholder="24, 72, 168 or 0.017, 0.083, 0.5 for testing"
                  className="w-full rounded-lg border-slate-300 shadow-sm focus:border-kijani-500 focus:ring-kijani-500 focus:ring-2"
                />
              </div>

              {validationError && (
                <p className="text-red-600 text-sm font-medium">{validationError}</p>
              )}
              {updateMutation.isError && (
                <p className="text-red-600 text-sm font-medium">
                  Failed to save: {String(updateMutation.error)}
                </p>
              )}
              <div className="flex gap-4 pt-2">
                <button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="px-5 py-2.5 bg-kijani-600 text-white rounded-lg font-medium hover:bg-kijani-700 disabled:opacity-50 transition-colors"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Strategy"}
                </button>
                {saveSuccess && (
                  <span className="flex items-center gap-2 text-green-600 font-medium">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Saved!
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-2">Run Retry Simulation</h2>
          <p className="text-slate-600 text-sm mb-5">
            Simulate retry attempts for eligible failed payments. Outcomes are randomly generated
            (soft declines have ~60% success rate).
          </p>
          <button
            onClick={() => simulateMutation.mutate()}
            disabled={simulateMutation.isPending}
            className="px-5 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {simulateMutation.isPending ? "Running..." : "Run Simulation"}
          </button>
          {simulateMutation.isSuccess && (
            <p className="mt-4 flex items-center gap-2 text-green-600 font-medium">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {simulateMutation.data.message} Redirecting to dashboard...
            </p>
          )}
          {simulateMutation.isError && (
            <p className="mt-4 text-red-600 font-medium">{String(simulateMutation.error)}</p>
          )}
        </div>
      </main>
    </div>
  );
}
