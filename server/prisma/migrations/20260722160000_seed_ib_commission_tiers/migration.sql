-- Volume-tier (rank program) config for IB direct commission, seeded OFF.
--
-- An empty array means "no tiers" → accrual uses the flat ib_commission_pct, so
-- behaviour is unchanged until an admin sets tiers. Format when configured:
--   [{"minVolume":0,"pct":10},{"minVolume":10000,"pct":12},{"minVolume":50000,"pct":15}]
-- The partner's rate is the highest tier whose threshold their lifetime referred
-- deposit volume has crossed. Editable from Admin → Settings (Partners group).
INSERT INTO "AppSetting" ("id", "key", "label", "value", "group", "sortOrder", "updatedAt")
VALUES (
  'set_ib_commission_tiers',
  'ib_commission_tiers',
  'IB volume tiers (JSON, empty = flat rate)',
  '[]',
  'Partners',
  2,
  now()
)
ON CONFLICT ("key") DO NOTHING;
