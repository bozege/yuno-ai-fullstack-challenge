import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
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

export default function Dashboard() {
  const navigate = useNavigate();
  const [declineFilter, setDeclineFilter] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const {
    data: payments = [],
    isLoading: paymentsLoading,
    isError: paymentsError,
    error: paymentsErrorDetails,
    refetch: refetchPayments,
  } = useQuery({
    queryKey: ["payments", declineFilter || undefined, debouncedSearch || undefined],
    queryFn: () =>
      api.getPayments({
        decline_reason: declineFilter || undefined,
        search: debouncedSearch || undefined,
        limit: 200,
      }),
  });

  const {
    data: analytics,
    isError: analyticsError,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: ["analytics"],
    queryFn: api.getAnalytics,
  });

  const { data: declineReasons = [] } = useQuery({
    queryKey: ["declineReasons"],
    queryFn: api.getDeclineReasons,
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-kijani-700 to-kijani-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold tracking-tight">Kijani Retry Hub</h1>
            <nav className="flex gap-6">
              <Link
                to="/"
                className="font-medium text-white/90 hover:text-white transition-colors"
              >
                Dashboard
              </Link>
              <Link
                to="/strategy"
                className="font-medium text-white/90 hover:text-white transition-colors"
              >
                Retry Strategy
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error banner */}
        {(paymentsError || analyticsError) && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <p className="font-medium">Failed to load. Please try again.</p>
            {paymentsErrorDetails && (
              <p className="text-sm mt-1">{String(paymentsErrorDetails)}</p>
            )}
            <button
              onClick={() => {
                refetchPayments();
                refetchAnalytics();
              }}
              className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {/* Analytics bar */}
        {analytics && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <StatCard label="Total Failed (30d)" value={analytics.total_failed} />
            <StatCard label="Retried" value={analytics.total_retried} />
            <StatCard label="Recovered" value={analytics.total_recovered} />
            <StatCard
              label="Recovery Rate"
              value={`${analytics.recovery_rate_pct}%`}
              highlight
            />
            <StatCard
              label="Revenue Recovered"
              value={`$${analytics.revenue_recovered_usd.toLocaleString()}`}
              highlight
            />
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Filters
          </h2>
          <div className="flex flex-wrap gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Decline Reason
              </label>
              <select
                value={declineFilter}
                onChange={(e) => setDeclineFilter(e.target.value)}
                className="rounded-lg border-slate-300 shadow-sm focus:border-kijani-500 focus:ring-kijani-500 focus:ring-2 w-56"
              >
                <option value="">All</option>
                <option value="soft">Soft declines</option>
                <option value="hard">Hard declines</option>
                {declineReasons.map((r) => (
                  <option key={r.reason} value={r.reason}>
                    {r.reason}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Search
              </label>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Customer name or payment ID..."
                className="rounded-lg border-slate-300 shadow-sm focus:border-kijani-500 focus:ring-kijani-500 focus:ring-2 w-72"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {paymentsLoading ? (
            <div className="p-12">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="h-12 bg-slate-100 rounded-lg" />
                ))}
              </div>
            </div>
          ) : payments.length === 0 ? (
            <div className="p-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-slate-600 font-medium">No payments match your filters</p>
              <p className="text-sm text-slate-500 mt-1">Try adjusting the decline reason filter or search term</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Failed At
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Decline Reason
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Retry Status
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-5 py-4 w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p, idx) => (
                    <tr
                      key={p.id}
                      className={`cursor-pointer transition-colors ${
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                      } hover:bg-kijani-50/50`}
                      onClick={() => navigate(`/payments/${p.id}`)}
                    >
                      <td className="px-5 py-4">
                        <Link
                          to={`/payments/${p.id}`}
                          className="text-kijani-600 hover:text-kijani-700 font-semibold"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {p.customer_name}
                        </Link>
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-900">
                        {formatAmount(p.amount, p.currency)}
                      </td>
                      <td className="px-5 py-4 text-slate-600">{p.payment_method_type}</td>
                      <td className="px-5 py-4 text-sm text-slate-500">
                        {formatDate(p.failed_at)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold ${
                            p.decline_category === "soft"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {p.decline_reason}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-slate-600 font-medium">
                          {p.retry_count}/{p.max_retries ?? "?"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold ${
                            p.status === "recovered"
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 text-sm text-slate-500 font-medium">
            {payments.length} payment{payments.length !== 1 ? "s" : ""}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 transition-shadow hover:shadow-md ${
        highlight
          ? "bg-kijani-50 border-kijani-200"
          : "bg-white border-slate-200 shadow-sm"
      }`}
    >
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {label}
      </div>
      <div
        className={`mt-2 text-2xl font-bold ${
          highlight ? "text-kijani-700" : "text-slate-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
