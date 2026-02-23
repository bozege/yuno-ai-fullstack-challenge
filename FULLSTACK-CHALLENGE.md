FULLSTACK
The Recovery Rate Disaster: Build Kijani Logistics' Failed Payment Retry Hub
The Scenario
Kijani Logistics is a fast-growing B2B freight and delivery platform operating across East Africa (Kenya, Tanzania, Uganda, Rwanda). They process recurring monthly invoices for 3,200 business clients, charging them for shipments via saved payment methods (cards and mobile money wallets).

Their problem: 42% of their automatic payment attempts are failing on the first try, leading to massive revenue delays and angry clients. Even worse, their current system has no intelligent retry logic—when a payment fails, a customer service agent manually attempts to recharge the customer 3-5 days later, by which point many payment methods have expired or been replaced.

You just joined a call with Kijani's CFO, who is frustrated: "We're leaving $180,000 on the table every month. Our customers WANT to pay us—the failures are mostly temporary issues like insufficient funds at the moment of charge, or the customer's bank having a brief outage. We need a system that automatically retries failed payments intelligently, so we can recover that revenue without drowning our support team in manual work."

Your mission: Build a full-stack Failed Payment Retry Hub that allows Kijani's finance team to view all failed payment attempts, see why they failed, and configure intelligent automatic retry strategies to maximize recovery without annoying customers.

Domain Background: Key Concepts You Need to Know
If you're new to payment processing, here's what you need to understand:

Payment Authorization
When a business charges a customer's card or mobile wallet, they send an authorization request to the payment processor. The processor contacts the customer's bank/wallet provider (called the issuer) to check if the payment can go through. The issuer responds with either:

Approved: Payment succeeds, money is reserved/captured
Declined: Payment fails with a specific reason code
Decline Codes and Reasons
When a payment fails, the issuer provides a decline code that explains why. Common categories include:

Insufficient Funds (soft decline): Customer doesn't have enough balance RIGHT NOW, but might later
Invalid Card (hard decline): Card number is wrong, card is expired, card is canceled—retrying won't help
Do Not Honor (soft decline): Issuer's generic rejection, often temporary (fraud controls, daily limits, etc.)
Issuer Unavailable (soft decline): The bank/wallet provider's system is down or unreachable—definitely worth retrying
Suspected Fraud (hard decline): Payment blocked by fraud prevention systems
Lost/Stolen Card (hard decline): Card has been reported as compromised
Soft vs. Hard Declines
Soft declines are temporary failures that might succeed if retried later (insufficient funds, issuer timeout, rate limits)
Hard declines are permanent failures where retrying the same payment method won't work (expired card, blocked account, invalid details)
Retry Strategy
A retry strategy is a set of rules for when and how to automatically reattempt a failed payment. Good retry logic:

Retries soft declines (not hard declines)
Spaces out retry attempts (e.g., 24 hours, 72 hours, 7 days) to give customers time to add funds or for temporary issues to resolve
Stops after a reasonable number of attempts to avoid annoying customers
Considers time-of-day (retrying at 3 AM when funds are likely available is smarter than 9 AM when rent was just debited)
Your Task: Functional Requirements
Build a full-stack application with both a backend API and a web-based UI that solves Kijani's problem.

Core Requirement 1: Failed Payment Dashboard (Frontend + Backend)
Create a visual dashboard where Kijani's finance team can:

See all failed payment attempts from the past 30 days in a table/list view
For each failed payment, display: customer name, amount, currency, payment method type, date/time of failure, decline reason, and current retry status
Filter by decline reason category (soft vs. hard, or specific reasons like "Insufficient Funds", "Card Expired", etc.)
Search by customer name or payment ID
Click on any failed payment to see its full detail page, including:
Complete timeline of all retry attempts (if any)
Whether the payment eventually succeeded
The specific decline code/message from the issuer
What "done" looks like: A reviewer can open your application, browse a list of 100+ failed payments with realistic details, filter to show only "Insufficient Funds" failures, and click one to see a detailed timeline showing 3 retry attempts with their outcomes.

Core Requirement 2: Intelligent Retry Configuration & Execution (Backend + Frontend)
Build a system that:

Allows the finance team to configure retry strategies via the UI, specifying:

Which decline reason categories should trigger automatic retries (e.g., retry soft declines, skip hard declines)
How many retry attempts to make (e.g., 3 attempts)
The time intervals between retries (e.g., 24 hours after first failure, 72 hours after second failure, 7 days after third failure)
Automatically schedules and simulates retry attempts for failed payments based on the configured strategy

You don't need to integrate with real payment processors—simulate the retry by generating a new random outcome (success or failure with a reason)
Track each retry attempt with a timestamp and outcome
Stop retrying once payment succeeds OR max attempts are reached
Shows retry analytics on the dashboard:

Total failed payments in the past 30 days
How many were automatically retried
How many ultimately succeeded (recovery rate %)
Estimated revenue recovered
What "done" looks like: A reviewer can create a retry strategy (e.g., "retry insufficient_funds failures 3 times at 1 day, 3 days, 7 days"), trigger the retry process (or simulate time passing), and see the dashboard update to show retry attempts happening, some payments succeeding, and a recovery rate displayed (e.g., "32% of failed payments recovered, $24,000 in revenue").

Stretch Goals (Partial Completion Expected)
These are optional enhancements if you have time. Completing even ONE of these is impressive. Do NOT attempt these until the core requirements are solid.

Stretch Goal A: Add a manual retry button on the payment detail page that allows a finance team member to immediately trigger a single retry attempt for any failed payment (bypassing the automatic schedule).

Stretch Goal B: Build a decline reason insights panel that shows which decline reasons are most common in the dataset, and which have the highest recovery rate when retried (e.g., "Insufficient Funds has a 65% recovery rate, but Card Expired has 0%").

Stretch Goal C: Allow the retry strategy to be time-of-day aware—let the user specify preferred retry hours (e.g., "only retry between 1 AM and 6 AM local time when customers are less likely to be spending") and reflect this in the simulation.

Test Data
Your solution needs realistic data to demonstrate functionality. You should generate or mock a dataset that includes:

At least 150-200 failed payment records from the past 30 days
A mix of currencies (KES - Kenyan Shilling, TZS - Tanzanian Shilling, UGX - Ugandan Shilling, USD)
Amounts ranging from $20 to $5,000 USD equivalent
A realistic distribution of decline reasons:
~40% "Insufficient Funds" (soft decline)
~15% "Issuer Unavailable" (soft decline)
~12% "Do Not Honor" (soft decline)
~10% "Card Expired" (hard decline)
~10% "Invalid Card Details" (hard decline)
~8% "Suspected Fraud" (hard decline)
~5% Other
Customer names (can be fictional, e.g., "Acme Traders Ltd", "Nairobi Wholesale Co")
Payment method types: "Credit Card", "Debit Card", "M-Pesa" (mobile money), "Airtel Money"
For payments that have already been retried (simulate some history), include 1-3 retry attempts with timestamps and outcomes
Use AI tools to generate this data as JSON, CSV, or directly seed a database.

Acceptance Criteria
Your submission is complete when:

✅ A reviewer can run your application (clear README with setup instructions)
✅ The dashboard loads and displays 150+ failed payments with all required fields
✅ Filtering and search work as described
✅ Clicking a payment shows a detail view with retry timeline
✅ A retry strategy can be configured via the UI or a config file
✅ The retry simulation can be triggered (manually or automatically) and the dashboard updates to show retry attempts and outcomes
✅ The dashboard displays recovery analytics (recovery rate, revenue recovered)
✅ The codebase is clean and includes a brief explanation of your approach

Notes
Tech stack is your choice: Use any languages, frameworks, or tools you prefer. You can use AI coding assistants.
No real payment integration needed: Mock/simulate all payment retry outcomes.
Focus on the experience: The finance team should feel confident using this tool. Clear UI, helpful labels, and logical flows matter.
Time management: Aim to have the core requirements working in 90 minutes, leaving 30 minutes for polish, documentation, and stretch goals if time allows.
Good luck! 🚀

Deliverables
-
A working full-stack application (backend + frontend) that can be run locally with clear setup instructions in a README
-
The generated test dataset (as JSON, CSV, or database seed file) with 150-200 failed payment records matching the specification
-
A brief document (README section or separate file) explaining your retry logic, how the simulation works, and any notable technical decisions
-
A screen recording or screenshots demonstrating: (1) the dashboard with filters/search, (2) a payment detail page with retry timeline, (3) configuring a retry strategy, and (4) the retry process running and analytics updating
-
Source code with clear structure and comments explaining key components
Evaluation Criteria
Functional completeness: Dashboard displays all required payment fields, filters, and search work correctly
20pts
Retry strategy configuration and execution: System correctly schedules/simulates retries based on decline type and configured intervals, tracks outcomes, stops appropriately
25pts
Data modeling and backend logic: Clean separation of concerns, appropriate data structures for payments/retries/strategies, simulation logic is sound
15pts
User experience and frontend quality: Intuitive UI, clear visual hierarchy, useful detail views, analytics are easy to understand
15pts
Recovery analytics accuracy: Correctly calculates recovery rate, revenue recovered, and displays retry effectiveness insights
10pts
Test data realism: Dataset matches specification with realistic distribution of decline reasons, currencies, amounts, and retry histories
5pts
Code quality and documentation: Clean, readable code with clear README, explanation of approach, easy setup process
5pts
Stretch goals and polish: Implementation of any stretch goals, extra features, exceptional UX details, or creative enhancements
5pts
Total
100pts