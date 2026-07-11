-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DfmSymbol" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DfmSymbol_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Testimonial_enabled_sortOrder_idx" ON "Testimonial"("enabled", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "DfmSymbol_symbol_key" ON "DfmSymbol"("symbol");

-- CreateIndex
CREATE INDEX "DfmSymbol_enabled_sortOrder_idx" ON "DfmSymbol"("enabled", "sortOrder");

-- Seed current testimonials (from IbVoices).
INSERT INTO "Testimonial" ("id","name","initials","quote","sortOrder","enabled","updatedAt") VALUES
  ('tst_ar','Ahmed R.','AR','Highest rebate & commission.',0,true,now()),
  ('tst_sk','Sara K.','SK','Instant deposit & withdrawal.',1,true,now()),
  ('tst_lw','Liang W.','LW','Multi-tier IB rebate system.',2,true,now()),
  ('tst_dm','Diego M.','DM','Fast & secure execution.',3,true,now()),
  ('tst_jp','James P.','JP','Various funding options.',4,true,now()),
  ('tst_rt','Ravi T.','RT','Low-latency pricing.',5,true,now())
ON CONFLICT ("id") DO NOTHING;

-- Seed current DFM board symbols (from DfmBoard).
INSERT INTO "DfmSymbol" ("id","symbol","name","sortOrder","enabled","updatedAt") VALUES
  ('dfm_emaar','EMAAR','Emaar Properties',0,true,now()),
  ('dfm_dewa','DEWA','Dubai Electricity & Water',1,true,now()),
  ('dfm_enbd','EMIRATESNBD','Emirates NBD',2,true,now()),
  ('dfm_dib','DIB','Dubai Islamic Bank',3,true,now()),
  ('dfm_salik','SALIK','Salik Company',4,true,now())
ON CONFLICT ("symbol") DO NOTHING;
