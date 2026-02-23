/**
 * Shared types for Kijani Retry Hub frontend.
 */
export interface RetryAttempt {
  id: number;
  attempted_at: string;
  outcome: "success" | "failed";
  decline_reason: string | null;
}

export interface PaymentList {
  id: number;
  payment_id: string;
  customer_name: string;
  amount: number;
  currency: string;
  payment_method_type: string;
  failed_at: string;
  decline_reason: string;
  decline_category: string;
  status: string;
  retry_count: number;
  max_retries: number | null;
}

export interface PaymentDetail {
  id: number;
  payment_id: string;
  customer_name: string;
  amount: number;
  currency: string;
  payment_method_type: string;
  failed_at: string;
  decline_reason: string;
  decline_code: string | null;
  decline_category: string;
  status: string;
  retry_attempts: RetryAttempt[];
  max_retries: number | null;
}

export interface RetryStrategy {
  id: number;
  name: string;
  decline_categories: string[];
  max_attempts: number;
  intervals_hours: number[];
  is_active: boolean;
}

export interface RetryStrategyUpdate {
  name?: string;
  decline_categories?: string[];
  max_attempts?: number;
  intervals_hours?: number[];
}

export interface Analytics {
  total_failed: number;
  total_retried: number;
  total_recovered: number;
  recovery_rate_pct: number;
  revenue_recovered_usd: number;
}

export interface DeclineReasonOption {
  reason: string;
  category: string;
}
