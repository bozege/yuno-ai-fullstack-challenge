# Kijani Logistics - Failed Payment Retry Hub

A full-stack application for Kijani Logistics' finance team to view failed payment attempts, configure intelligent retry strategies, and run retry simulations to recover revenue.

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+

### Backend Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m app.seed_data     # Seed 180 failed payments + default strategy
uvicorn app.main:app --reload
```

The API runs at **http://localhost:8000**. Docs at http://localhost:8000/docs.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app runs at **http://localhost:5173**.

---

## Features

- **Failed Payment Dashboard**: View 180+ failed payments from the past 30 days
- **Filter & Search**: Filter by decline reason (soft/hard or specific), search by customer name or payment ID
- **Payment Detail**: Click any payment to see full details and retry timeline
- **Retry Strategy Config**: Configure which decline categories to retry, max attempts, and intervals
- **Retry Simulation**: Simulate retries for eligible payments (random outcomes, ~60% success for soft declines)
- **Recovery Analytics**: Total failed, retried, recovered, recovery rate %, and revenue recovered

---

## Project Structure

```
ai-challenge/
├── backend/           # FastAPI + SQLAlchemy (SQLite)
│   ├── app/
│   │   ├── main.py
│   │   ├── models.py, schemas.py, database.py
│   │   ├── routers/   # payments, retry, analytics
│   │   ├── services/  # retry_engine, strategy
│   │   └── seed_data.py
│   └── requirements.txt
├── frontend/          # React + Vite + TypeScript + Tailwind
│   └── src/
│       ├── pages/     # Dashboard, PaymentDetail, StrategyConfig
│       ├── api/       # API client
│       └── types.ts
└── README.md
```

---

## Approach & Technical Decisions

### Retry Logic
- **Soft declines** (Insufficient Funds, Issuer Unavailable, Do Not Honor) are retried; **hard declines** (Card Expired, Invalid Card, Suspected Fraud) are not.
- Eligibility: payment must have `status=failed`, decline category in strategy's retry list, retry count < max attempts, and elapsed time since last attempt (or `failed_at`) must exceed the next interval.
- Intervals are in hours (e.g. `[24, 72, 168]` = 1 day, 3 days, 7 days). For testing, use decimal hours: `0.017` ≈ 1 min, `0.083` ≈ 5 min, `0.5` = 30 min. The Retry Strategy page has quick presets for this.

### Simulation
- No real payment processor integration. Each retry attempt gets a **random outcome**:
  - Soft declines: ~60% success rate
  - Hard declines: 0% (we do not retry these per strategy, but if forced, they would fail)
- Revenue recovered is computed by summing recovered amounts converted to USD via fixed rates (KES 130, TZS 2600, UGX 3700 per USD).

### Data Model
- **payments**: Failed payment records with customer, amount, currency, method, decline reason/category, status
- **retry_attempts**: Each retry with timestamp, outcome, and decline reason if failed
- **retry_strategy**: Active strategy with decline_categories (JSON), max_attempts, intervals_hours (JSON)

### Test Data
- 180 payments with realistic distribution: ~40% Insufficient Funds, ~15% Issuer Unavailable, ~12% Do Not Honor, ~10% Card Expired, etc.
- Currencies: KES, TZS, UGX, USD. Amounts: $20–$5000 equivalent.
- ~35% pre-seeded with 1–3 retry attempts (some succeeded).

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payments` | List payments (query: decline_reason, search, limit, offset) |
| GET | `/api/payments/{id}` | Payment detail with retry timeline |
| GET | `/api/payments/decline-reasons` | Distinct decline reasons for filters |
| GET | `/api/analytics` | Recovery stats (failed, retried, recovered, rate, revenue) |
| GET | `/api/retry-strategy` | Get active retry strategy |
| PUT | `/api/retry-strategy` | Update retry strategy |
| POST | `/api/retry/simulate` | Run retry simulation |

---

## License

MIT
