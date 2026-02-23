import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ` ${currency}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default function PaymentDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const paymentId = id ? parseInt(id, 10) : NaN;

  const { data: payment, isLoading, error } = useQuery({
    queryKey: ["payment", paymentId],
    queryFn: () => api.getPayment(paymentId),
    enabled: !isNaN(paymentId),
  });

  const manualRetryMutation = useMutation({
    mutationFn: () => api.manualRetryPayment(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment", paymentId] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });

  const maxRetries = payment?.max_retries ?? 3;
  const retryCount = payment?.retry_attempts?.length ?? 0;
  const canManualRetry =
    payment?.status === "failed" && retryCount < maxRetries;

  if (isNaN(paymentId) || error) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <Link to="/" className="text-kijani-600 hover:text-kijani-700 font-medium">
          ← Back to Dashboard
        </Link>
        <div className="mt-8 p-6 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-700 font-medium">Payment not found.</p>
        </div>
      </div>
    );
  }

  if (isLoading || !payment) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <Link to="/" className="text-kijani-600 hover:text-kijani-700 font-medium">
          ← Back to Dashboard
        </Link>
        <div className="mt-8 animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3" />
          <div className="h-32 bg-slate-200 rounded" />
          <div className="h-48 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  const timelineItems = [
    {
      id: "original",
      label: "Original failure",
      attempted_at: payment.failed_at,
      outcome: "failed" as const,
      decline_reason: payment.decline_reason,
    },
    ...payment.retry_attempts.map((a) => ({
      id: String(a.id),
      label: "Retry attempt",
      attempted_at: a.attempted_at,
      outcome: a.outcome as "success" | "failed",
      decline_reason: a.decline_reason,
    })),
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-kijani-700 to-kijani-800 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h1 className="text-xl font-bold text-slate-900 mb-5">Payment Details</h1>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-5">
            <div>
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment ID</dt>
              <dd className="font-mono text-sm mt-1 text-slate-900">{payment.payment_id}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</dt>
              <dd className="mt-1 font-medium text-slate-900">{payment.customer_name}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</dt>
              <dd className="mt-1 font-semibold text-slate-900">{formatAmount(payment.amount, payment.currency)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Method</dt>
              <dd className="mt-1 text-slate-700">{payment.payment_method_type}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Failed At</dt>
              <dd className="mt-1 text-slate-700">{formatDate(payment.failed_at)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Decline Reason</dt>
              <dd className="mt-1">
                <span
                  className={`inline-flex px-2.5 py-1 rounded-md text-sm font-semibold ${
                    payment.decline_category === "soft"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {payment.decline_reason}
                  {payment.decline_code && (
                    <span className="text-slate-500 font-normal ml-1">({payment.decline_code})</span>
                  )}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</dt>
              <dd className="mt-1">
                <span
                  className={`inline-flex px-2.5 py-1 rounded-md text-sm font-semibold ${
                    payment.status === "recovered"
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-slate-100 text-slate-700 border border-slate-200"
                  }`}
                >
                  {payment.status}
                </span>
              </dd>
            </div>
          </dl>
          {canManualRetry && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={() => manualRetryMutation.mutate()}
                disabled={manualRetryMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-kijani-600 hover:bg-kijani-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {manualRetryMutation.isPending ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24" aria-hidden>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Retrying…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Manual Retry
                  </>
                )}
              </button>
              {manualRetryMutation.isError && (
                <p className="mt-2 text-sm text-red-600">
                  {manualRetryMutation.error instanceof Error ? manualRetryMutation.error.message : "Retry failed"}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Retry Timeline</h2>
          {timelineItems.length === 0 ? (
            <p className="text-slate-500">No timeline data.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-200" />
              <div className="space-y-0">
                {timelineItems.map((item, idx) => (
                  <div key={item.id} className="relative flex gap-5 pb-8 last:pb-0">
                    <div
                      className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        item.outcome === "success"
                          ? "bg-green-500 text-white"
                          : "bg-slate-300 text-slate-700"
                      }`}
                    >
                      {item.outcome === "success" ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-medium text-slate-900">
                          {formatDate(item.attempted_at)}
                        </span>
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold ${
                            item.outcome === "success"
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {item.outcome}
                        </span>
                        <span className="text-xs text-slate-500">{item.label}</span>
                      </div>
                      {item.outcome === "failed" && item.decline_reason && (
                        <p className="mt-2 text-sm text-slate-600">
                          Decline: {item.decline_reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
