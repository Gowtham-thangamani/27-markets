-- The venue (MT5) position id, captured on a LIVE open so TP/SL, stop-out and
-- manual closes act on the real broker position by id rather than the local
-- book only. Null for simulated/DEMO positions and existing rows.
ALTER TABLE "Position" ADD COLUMN "brokerPositionId" TEXT;
