# Phase 0 Schema Notes

**Date:** 2026-07-16  
**Related:** `IMPLEMENTATION_ROADMAP.md` Phase 0 (P0-6)

## Production migration behavior

In `NODE_ENV=production`, the backend **refuses to start** if migrations fail.

In development, migration failures are logged as warnings and startup continues (legacy behavior for local convenience).

## Schema sources of truth

| Source | Role |
|--------|------|
| `database/migrations/*.sql` | **Authoritative** incremental schema for running systems |
| `database/schema_empty.sql` / `fresh_schema_empty.sql` | Bootstrap for new installs (may lag feature migrations) |
| `pams_db.sql` | Snapshot dump — **may lag** live migrations (e.g. `ww_*`, `pm_*`) |

## Known drift (as of Phase 0)

Tables introduced primarily via migrations (and/or runtime DDL) that may be missing from older dumps:

- Waterworks: `ww_water_supplies`, `ww_consumer_accounts`, `ww_meter_readings`, `ww_bills`, `ww_payments`, `ww_supply_readers`, `ww_rate_*`
- Price monitoring: `pm_commodity_categories`, `pm_commodities`, `pm_markets`, `pm_price_records`, `pm_price_alerts`, `pm_alert_triggers`
- Rights & rentals extensions: `lease_contract_units`, balance-related columns

**Do not** rely on `pams_db.sql` alone for production schema. Prefer applying `database/migrations` on top of a known baseline.

## Phase 0 operational note (2026-07-16)

Production refuses to start if a **new** migration fails hard.

The legacy one-shot script `convert_ids_to_hash.sql` is **skipped and marked complete** when `users.user_id` is already `VARCHAR` (hash IDs already applied). Re-running it against a converted schema previously crashed the container under Phase 0 fail-loud behavior.

## Operational checklist

1. Ensure `.env` has `JWT_SECRET`, `DB_*`, and (if using ETRACS) `ETRACS_BASE_URL` + `ETRACS_API_KEY`
2. Run backend once against staging and confirm migrations table shows new entries
3. Refresh schema dump periodically after major feature merges
