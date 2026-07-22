-- Withdrawal risk limits (money-out caps), admin-editable in Settings → Partners
-- group is not right here; these live under a Risk/Funds group.
--
-- 0 = no limit (off). Seeded with generous protective ceilings: they stop a
-- runaway/compromised-account payout without blocking normal retail activity,
-- and are well above the demo's small test withdrawals. Tune per risk policy.
--   withdrawal_max_single_usd — per-transaction ceiling
--   withdrawal_daily_limit_usd — rolling-24h total per client
INSERT INTO "AppSetting" ("id", "key", "label", "value", "group", "sortOrder", "updatedAt")
VALUES
  ('set_withdrawal_max_single', 'withdrawal_max_single_usd', 'Max single withdrawal (USD, 0 = no limit)', '50000', 'Risk', 0, now()),
  ('set_withdrawal_daily_limit', 'withdrawal_daily_limit_usd', 'Max withdrawals per 24h (USD, 0 = no limit)', '100000', 'Risk', 1, now())
ON CONFLICT ("key") DO NOTHING;
