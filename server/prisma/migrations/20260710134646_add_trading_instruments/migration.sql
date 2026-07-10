-- CreateTable
CREATE TABLE "TradingInstrument" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "feed" TEXT,
    "spread" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradingInstrument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TradingInstrument_symbol_key" ON "TradingInstrument"("symbol");

-- CreateIndex
CREATE INDEX "TradingInstrument_enabled_sortOrder_idx" ON "TradingInstrument"("enabled", "sortOrder");

-- CreateIndex
CREATE INDEX "TradingInstrument_category_idx" ON "TradingInstrument"("category");
INSERT INTO "TradingInstrument" ("id","symbol","name","category","feed","spread","sortOrder","enabled","updatedAt") VALUES
  ('ti_eur_usd','EUR/USD','Euro vs US Dollar','Forex','OANDA:EUR_USD',0.1,0,true,now()),
  ('ti_gbp_usd','GBP/USD','British Pound vs US Dollar','Forex','OANDA:GBP_USD',0.3,1,true,now()),
  ('ti_usd_jpy','USD/JPY','US Dollar vs Japanese Yen','Forex','OANDA:USD_JPY',0.2,2,true,now()),
  ('ti_aud_usd','AUD/USD','Australian Dollar vs US Dollar','Forex','OANDA:AUD_USD',0.4,3,true,now()),
  ('ti_usd_cad','USD/CAD','US Dollar vs Canadian Dollar','Forex','OANDA:USD_CAD',0.3,4,true,now()),
  ('ti_usd_chf','USD/CHF','US Dollar vs Swiss Franc','Forex','OANDA:USD_CHF',0.3,5,true,now()),
  ('ti_nzd_usd','NZD/USD','NZ Dollar vs US Dollar','Forex','OANDA:NZD_USD',0.5,6,true,now()),
  ('ti_eur_jpy','EUR/JPY','Euro vs Japanese Yen','Forex','OANDA:EUR_JPY',0.4,7,true,now()),
  ('ti_eur_gbp','EUR/GBP','Euro vs British Pound','Forex','OANDA:EUR_GBP',0.4,8,true,now()),
  ('ti_gbp_jpy','GBP/JPY','British Pound vs Japanese Yen','Forex','OANDA:GBP_JPY',0.6,9,true,now()),
  ('ti_xau_usd','XAU/USD','Gold Spot','Metals','OANDA:XAU_USD',0.8,10,true,now()),
  ('ti_xag_usd','XAG/USD','Silver Spot','Metals','OANDA:XAG_USD',1.2,11,true,now()),
  ('ti_xpt_usd','XPT/USD','Platinum Spot','Metals','OANDA:XPT_USD',2,12,true,now()),
  ('ti_xpd_usd','XPD/USD','Palladium Spot','Metals','OANDA:XPD_USD',2.5,13,true,now()),
  ('ti_us500','US500','S&P 500 Index','Indices',NULL,0.4,14,true,now()),
  ('ti_us100','US100','Nasdaq 100 Index','Indices',NULL,1,15,true,now()),
  ('ti_us30','US30','Dow Jones 30','Indices',NULL,2,16,true,now()),
  ('ti_ger40','GER40','DAX 40 Index','Indices',NULL,0.9,17,true,now()),
  ('ti_uk100','UK100','FTSE 100 Index','Indices',NULL,1,18,true,now()),
  ('ti_jp225','JP225','Nikkei 225 Index','Indices',NULL,5,19,true,now()),
  ('ti_fra40','FRA40','CAC 40 Index','Indices',NULL,1,20,true,now()),
  ('ti_aus200','AUS200','ASX 200 Index','Indices',NULL,1.5,21,true,now()),
  ('ti_ukoil','UKOIL','Brent Crude Oil','Commodities',NULL,0.3,22,true,now()),
  ('ti_usoil','USOIL','WTI Crude Oil','Commodities',NULL,0.3,23,true,now()),
  ('ti_natgas','NATGAS','Natural Gas','Commodities',NULL,0.5,24,true,now()),
  ('ti_copper','COPPER','Copper','Commodities',NULL,0.4,25,true,now()),
  ('ti_wheat','WHEAT','Wheat','Commodities',NULL,1,26,true,now()),
  ('ti_coffee','COFFEE','Coffee','Commodities',NULL,1.2,27,true,now()),
  ('ti_aapl','AAPL','Apple Inc.','Stocks','AAPL',0.05,28,true,now()),
  ('ti_tsla','TSLA','Tesla Inc.','Stocks','TSLA',0.08,29,true,now()),
  ('ti_nvda','NVDA','NVIDIA Corp.','Stocks','NVDA',0.06,30,true,now()),
  ('ti_amzn','AMZN','Amazon.com Inc.','Stocks','AMZN',0.07,31,true,now()),
  ('ti_msft','MSFT','Microsoft Corp.','Stocks','MSFT',0.05,32,true,now()),
  ('ti_googl','GOOGL','Alphabet Inc.','Stocks','GOOGL',0.06,33,true,now()),
  ('ti_meta','META','Meta Platforms','Stocks','META',0.07,34,true,now()),
  ('ti_amd','AMD','Advanced Micro Devices','Stocks','AMD',0.07,35,true,now()),
  ('ti_btc_usd','BTC/USD','Bitcoin','Crypto','BINANCE:BTCUSDT',18,36,true,now()),
  ('ti_eth_usd','ETH/USD','Ethereum','Crypto','BINANCE:ETHUSDT',2.4,37,true,now()),
  ('ti_sol_usd','SOL/USD','Solana','Crypto','BINANCE:SOLUSDT',0.6,38,true,now()),
  ('ti_xrp_usd','XRP/USD','Ripple','Crypto','BINANCE:XRPUSDT',0.01,39,true,now()),
  ('ti_ada_usd','ADA/USD','Cardano','Crypto','BINANCE:ADAUSDT',0.01,40,true,now()),
  ('ti_doge_usd','DOGE/USD','Dogecoin','Crypto','BINANCE:DOGEUSDT',0.005,41,true,now()),
  ('ti_ltc_usd','LTC/USD','Litecoin','Crypto','BINANCE:LTCUSDT',0.2,42,true,now()),
  ('ti_link_usd','LINK/USD','Chainlink','Crypto','BINANCE:LINKUSDT',0.05,43,true,now())
ON CONFLICT ("symbol") DO NOTHING;
