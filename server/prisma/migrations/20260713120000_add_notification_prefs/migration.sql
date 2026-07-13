-- Email notification preferences, client-managed from the portal profile.
ALTER TABLE "User" ADD COLUMN "notifySecurity" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "notifyProduct" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "notifyMarketing" BOOLEAN NOT NULL DEFAULT true;
