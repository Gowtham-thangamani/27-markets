-- Stripe Connect: the client's connected account for receiving withdrawal payouts.
ALTER TABLE "User" ADD COLUMN "stripeConnectAccountId" TEXT;
ALTER TABLE "User" ADD COLUMN "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- One connected account per user.
CREATE UNIQUE INDEX "User_stripeConnectAccountId_key" ON "User"("stripeConnectAccountId");
