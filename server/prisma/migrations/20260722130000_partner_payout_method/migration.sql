-- Partner payout destination, set from portal settings. A payout request is
-- blocked until a method + details are saved. payoutDetails is free-form per
-- method (bank: accountName/iban/swift; crypto: network/address).

CREATE TYPE "PayoutMethod" AS ENUM ('BANK', 'CRYPTO');

ALTER TABLE "PartnerProfile" ADD COLUMN "payoutMethod" "PayoutMethod";
ALTER TABLE "PartnerProfile" ADD COLUMN "payoutDetails" JSONB;
