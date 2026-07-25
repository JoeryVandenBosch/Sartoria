# Explainable Recommendations Operations Runbook

## Operating modes

### Deterministic fallback

```text
SARTORIA_RECOMMENDATION_MODE=fallback
```

This is the default and safest mode. No recommendation context leaves Sartoria. Advice is generated from owned wardrobe items, saved outfits, and user-controlled preferences.

### Approved provider

```text
SARTORIA_RECOMMENDATION_MODE=provider
RECOMMENDATION_PROVIDER_URL=https://approved-gateway.example.com/v1/generate
RECOMMENDATION_PROVIDER_SECRET=<high-entropy secret>
RECOMMENDATION_PROVIDER_NAME=<approved provider label>
RECOMMENDATION_PROVIDER_MODEL=<approved model identifier>
RECOMMENDATION_PROVIDER_TIMEOUT_MS=15000
```

Provider mode must not be enabled until the release gates below are complete.

## Provider contract

The endpoint accepts the version-1 context object and returns JSON matching the version-1 provider-response schema.

Provider context contains:

- occasion and optional bounded request notes;
- owned and available wardrobe item identifiers and public item facts needed for styling;
- user-controlled profile preferences;
- measurements only when recommendation consent is enabled;
- saved-outfit identifiers, membership, optional occasion, wear count, and last-worn date.

Provider context does not contain:

- account or owner identifiers;
- session tokens or credentials;
- wardrobe fit notes;
- outfit styling notes;
- wear-event notes;
- media identifiers, object keys, signed URLs, or image bytes;
- precise location, calendar records, contacts, or unrelated history.

The response must include:

```json
{
  "schemaVersion": "1",
  "itemReasons": [
    { "itemId": "owned-item-id", "reason": "Concise user-facing reason" },
    { "itemId": "owned-item-id", "reason": "Concise user-facing reason" }
  ],
  "summary": "Concise recommendation summary",
  "exclusions": ["Applied constraint"],
  "confidence": "medium"
}
```

Unknown fields, invalid identifiers, duplicates, low confidence, malformed JSON, oversized payloads, non-success responses, and timeouts activate deterministic fallback.

## Production release gates

1. Approve the provider and all subprocessors through Security and Privacy review.
2. Record the permitted data fields, purpose, region, retention, training policy, and deletion terms.
3. Restrict outbound traffic to the approved endpoint through egress policy.
4. Verify DNS and private-network controls mitigate endpoint substitution and rebinding.
5. Store the provider secret in the approved secret manager.
6. Document secret ownership, access review, rotation cadence, and revocation procedure.
7. Apply `0006_wardrobe_recommendations.sql` through the approved migration runner.
8. Verify the application database role is not a superuser and lacks `BYPASSRLS`.
9. Verify `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY` on `wardrobe_recommendations`.
10. Run two-user isolation tests for context generation, list, detail, correction, rejection, and deletion.
11. Prove application and gateway logs exclude request text, profile content, response bodies, credentials, and authorization headers.
12. Run provider timeout, invalid JSON, invalid schema, unknown item, duplicate item, low-confidence, and outage drills.
13. Approve recommendation retention, expiry cleanup, backup retention, restore, and deletion propagation.
14. Record explicit Product, Architecture, Security, and Privacy release approval.

## Deployment sequence

1. Deploy database migration while recommendation mode remains `fallback`.
2. Verify schema, RLS, indexes, runtime role, backups, and restoration path.
3. Deploy application code in `fallback` mode.
4. Run authenticated deterministic recommendation smoke tests.
5. Configure the approved provider endpoint and secret.
6. Execute the complete failure-mode test matrix against staging.
7. Enable `provider` mode in staging.
8. Validate output grounding, fallback, latency, logging, and deletion.
9. Obtain release approval.
10. Enable `provider` mode in production gradually and monitor outcome codes.

## Safe rollback

Set:

```text
SARTORIA_RECOMMENDATION_MODE=fallback
```

This immediately removes provider dependency while preserving deterministic advice and stored owner-scoped records.

For a broader application rollback:

- hide the `Advice` navigation;
- disable recommendation route surfaces;
- preserve the database table and user records;
- do not drop the table after user data exists;
- use an approved forward migration, export, or restore procedure.

## Incident response

### Suspected context disclosure

1. Set recommendation mode to `fallback` immediately.
2. Revoke and rotate the provider secret.
3. Block provider egress.
4. Preserve identifiers, timestamps, outcome codes, and infrastructure evidence without copying private request or response content unnecessarily.
5. Determine affected owners, fields, provider region, retention, and downstream processors.
6. Follow the approved privacy and security incident process.
7. Do not re-enable provider mode until remediation and release approval are recorded.

### Provider returning unsafe or fabricated references

1. Confirm deterministic fallback is activating.
2. Disable provider mode when the rate exceeds the approved threshold or any ownership boundary appears compromised.
3. Preserve schema and outcome codes, not hidden reasoning.
4. Re-run contract, ownership, and evaluation suites before reactivation.

### Elevated latency or outage

1. Verify timeouts activate fallback.
2. Keep provider mode disabled if repeated timeouts degrade request capacity.
3. Check endpoint health and egress without exposing credentials in tickets or logs.
4. Re-enable only after a staging smoke test.

### Database isolation concern

1. Disable recommendation routes or return to fallback-only mode while preserving records.
2. Verify transaction-local owner context and RLS policies.
3. Confirm the runtime role lacks superuser and `BYPASSRLS` privileges.
4. Run two-user isolation tests before restoring access.

## Monitoring

Permitted operational signals:

- generated recommendation identifier;
- owner identifier only within protected internal telemetry where approved;
- provider or fallback outcome code;
- schema-validation outcome;
- grounding-validation outcome;
- latency bucket;
- timeout or HTTP status category;
- correction, rejection, deletion, and expiry counts.

Do not log:

- request notes or occasion text;
- profile values or measurements;
- wardrobe names, brands, colours, or item explanations;
- provider response bodies;
- corrections or rejection reasons;
- secrets or authorization headers;
- signed URLs, object keys, or session data.

## Retention and deletion

- each recommendation carries a 30-day relevance expiry marker;
- expired records remain owner-visible until an approved cleanup policy is implemented;
- owner deletion removes the recommendation, correction, and rejection reason together;
- provider retention must follow the approved contract independently of Sartoria storage;
- backup and restore behaviour must preserve approved deletion obligations.
