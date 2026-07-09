-- Ensure the dual-control withdrawal-threshold setting exists so it's editable in
-- the admin Settings UI (0 = disabled). Idempotent; safe in every environment.
INSERT INTO "AppSetting" ("id", "key", "label", "value", "group", "sortOrder", "updatedAt")
VALUES (
  'set_withdrawal_dual_control',
  'withdrawal_dual_control_usd',
  'Dual-approval withdrawal threshold (USD, 0 = off)',
  '0',
  'Funding',
  2,
  now()
)
ON CONFLICT ("key") DO NOTHING;