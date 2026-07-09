-- Ensure the IB commission-rate setting exists so commissions actually accrue
-- (accrueReferralCommission reads ib_commission_pct; absent → 0% → nothing accrues)
-- and admins can edit it. Idempotent; safe in every environment.
INSERT INTO "AppSetting" ("id", "key", "label", "value", "group", "sortOrder", "updatedAt")
VALUES (
  'set_ib_commission_pct',
  'ib_commission_pct',
  'IB commission (% of deposits)',
  '10',
  'Partners',
  0,
  now()
)
ON CONFLICT ("key") DO NOTHING;