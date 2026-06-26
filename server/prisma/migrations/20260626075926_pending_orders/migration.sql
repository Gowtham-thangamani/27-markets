-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'PENDING';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderType" ADD VALUE 'LIMIT';
ALTER TYPE "OrderType" ADD VALUE 'STOP';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "triggerPrice" DECIMAL(18,8);

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");
