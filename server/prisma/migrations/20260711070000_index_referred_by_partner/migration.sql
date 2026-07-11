-- `email` is already UNIQUE (which creates its own index) — drop the redundant one.
DROP INDEX "User_email_idx";

-- Partner dashboard + client list filter on referredByPartnerId — index it.
CREATE INDEX "User_referredByPartnerId_idx" ON "User"("referredByPartnerId");
