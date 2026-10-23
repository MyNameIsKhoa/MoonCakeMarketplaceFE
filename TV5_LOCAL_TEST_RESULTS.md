# TV5 local UI test — 23 October 2026

Frontend: http://localhost:3000/?finance=demo
Gateway: http://localhost:8080
Identity: 8081; Commerce: 8083. All tested UI calls went through Gateway to real local services.

Three clearly marked TV5 LOCAL TEST fixtures were added to the local Commerce database.
They represent upstream order snapshots, not a completed TV3/TV6 integration. No payment
success, refund success, acceptance by TV6, or bank transfer was fabricated.

| Scenario | Observed result |
|---|---|
| Without login | Protected finance endpoint rejected the request (403). |
| Login | Local demo account logged in via Identity/Gateway. |
| Order 2 not accepted | No payment obligations and no deposit link offered. |
| Order 3 belongs to another customer | Access rejected with FINANCE_ACCESS_DENIED. |
| Order 1 accepted snapshot | 100,000 VND total; 30,000 deposit; 70,000 remaining; 0 collected. |
| Remaining before deposit | DEPOSIT_REQUIRED; Vietnamese explanation shown. |
| Deposit link initiation | Reservation persisted; provider failure leaves RECONCILING, no SUCCESS. |
| Provider diagnosis | payOS SDK rejected create with invalid signature. A read query returned code 101 (payment code absent). No checkout/QR was confirmed. |
| Dispute on order 1 | OPEN dispute and DISPUTE_OPENED audit persisted; settlement blocked by OPEN_DISPUTE. |
| Customer tries settlement creation | FINANCE_ADMIN_REQUIRED; no settlement created. |
| Cancellation on order 2 | REQUESTED cancellation and CANCELLATION_REQUESTED audit persisted. |
| Link creation after correcting key | Added local test order 4 (accepted, 100,000 VND total, 30,000 VND deposit). Commerce on port 18083 loaded the corrected 64-character key and created the 30,000 VND deposit link. Gateway/FE on port 3000 showed `PENDING` and the payOS button. |
| Checkout page | The FE link opened the real `pay.payos.vn` checkout with a VietQR, `30,000 VND`, and description `MSS 1000000001`. Provider reconciliation returned `PENDING`; no transfer was made and paid remains zero. Link expiration: 23:36:23, 23 October 2026 (Vietnam time). |

The user supplied the full payOS checksum key; the earlier local key was truncated to 40
characters. The corrected 64-character key and return/cancel URLs for FE port 3000 are in
the ignored backend `.env`. A second Commerce process on port 18083 used these values for
the successful link test, leaving the user's IntelliJ Commerce process on port 8083 alone.
Restart IntelliJ Commerce to load the corrected environment for future FE link creation.
The UI keeps funds collected at zero. Successful live collection, public webhook delivery,
refund bank transfer and payout were not tested. The earlier order 1 reservation still
requires reconciliation before it can be retried.

Issues fixed while testing:

- Shared ApiError now preserves backend code for both Axios and the finance fetch helper.
- Opening the finance feature with `finance=demo` no longer claims a return from payOS.
- Local-only development login bridges the missing TV1 login screen using the real login API.
  It is excluded from the production UI. No credentials are hardcoded in source.
- Changing order clears prior form values and notices.

The temporary demo session is stored only in backend `CommerceService/target/`, which is
gitignored. Screenshots are saved in the current chat's visualization directory.
