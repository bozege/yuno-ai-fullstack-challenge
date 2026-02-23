/**
 * API client for Kijani Retry Hub backend.
 */
import type { PaymentList, PaymentDetail, RetryStrategy, RetryStrategyUpdate, Analytics } from "../types";

const base = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const API_BASE = base.endsWith("/api") ? base : `${base.replace(/\/$/, "")}/api`;

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  getPayments: (params?: {
    decline_reason?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.decline_reason) searchParams.set("decline_reason", params.decline_reason);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));
    const q = searchParams.toString();
    return fetchApi<PaymentList[]>(`/payments${q ? `?${q}` : ""}`);
  },

  getPayment: (id: number) => fetchApi<PaymentDetail>(`/payments/${id}`),

  getDeclineReasons: () =>
    fetchApi<{ reason: string; category: string }[]>(`/payments/decline-reasons`),

  getAnalytics: () => fetchApi<Analytics>("/analytics"),

  getRetryStrategy: () => fetchApi<RetryStrategy>("/retry-strategy"),

  updateRetryStrategy: (payload: RetryStrategyUpdate) =>
    fetchApi<RetryStrategy>("/retry-strategy", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  simulateRetries: () =>
    fetchApi<{ attempts_made: number; message: string }>("/retry/simulate", {
      method: "POST",
    }),

  manualRetryPayment: (id: number) =>
    fetchApi<{ success: boolean; outcome: string; message: string }>(
      `/payments/${id}/retry`,
      { method: "POST" }
    ),
};
