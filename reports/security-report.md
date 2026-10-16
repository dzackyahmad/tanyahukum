## Security Validation Report

Generated: 2026-10-16T04:50:49.481Z

### S2 — Midtrans webhook signature verification bypass in non-production

- **Severity**: CRITICAL
- **Evidence**: `app/api/payment/webhook/route.js has non-production bypass branch`
- **Recommendation**: Always verify signature (sandbox included). If gross_amount formatting is the issue, normalize gross_amount format instead of bypassing verification.

### S3 — Mixed JWT libraries may cause verification inconsistencies

- **Severity**: HIGH
- **Evidence**: `lib/auth.js uses jose; src/lib/auth-server.js uses jsonwebtoken`
- **Recommendation**: Standardize on one JWT implementation (prefer jose for edge compatibility) and ensure issuer/audience/alg are consistent across middleware + API routes.

