-- Short-lived email login OTP (one active code per user; hash + attempt counter).
CREATE TABLE "LoginOtp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginOtp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LoginOtp_userId_key" ON "LoginOtp"("userId");

ALTER TABLE "LoginOtp" ADD CONSTRAINT "LoginOtp_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
