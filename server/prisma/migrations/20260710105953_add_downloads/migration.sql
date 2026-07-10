-- CreateTable
CREATE TABLE "DownloadItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "size" TEXT NOT NULL DEFAULT '—',
    "version" TEXT NOT NULL DEFAULT '',
    "icon" TEXT NOT NULL DEFAULT 'desktop',
    "url" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DownloadItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DownloadItem_enabled_sortOrder_idx" ON "DownloadItem"("enabled", "sortOrder");

-- Seed the initial platform / document downloads (idempotent on id).
INSERT INTO "DownloadItem" ("id","name","platform","description","size","version","icon","url","sortOrder","enabled","updatedAt") VALUES
  ('dl_mt5_win','MetaTrader 5 — Windows','Windows 10/11','The MetaTrader 5 desktop terminal with advanced charting and algo trading.','23 MB','5.00','desktop','https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe',0,true,now()),
  ('dl_mt5_mac','MetaTrader 5 — macOS','macOS 12+','The MetaTrader 5 desktop terminal for Mac.','35 MB','5.00','desktop','https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/MetaTrader5.dmg',1,true,now()),
  ('dl_webtrader','WebTrader','Any browser','Launch the full trading experience directly in your browser.','—','Live','web',NULL,2,true,now()),
  ('dl_terms','Account Terms (PDF)','Document','Client agreement, risk disclosure, and fee schedule.','1.2 MB','2026.1','doc',NULL,3,true,now())
ON CONFLICT ("id") DO NOTHING;
