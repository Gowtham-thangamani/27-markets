// Keys out the dark background of the 27 Markets master logo, drops the
// candlestick chart on the right, crops to content, and writes a transparent PNG.
const Jimp = require('jimp');
const path = require('path');

const SRC = process.argv[2] || 'C:/Users/gowth/Downloads/WhatsApp Image 2026-06-22 at 2.42.51 PM.jpeg';
const OUT_PUBLIC = path.resolve(__dirname, '../public/logo.png');
const OUT_ASSETS = path.resolve(__dirname, '../assets/logo.png');

const DARK_MAX = 55;      // pixel is "background" if max(r,g,b) < this  -> transparent
const RIGHT_CUT = 0.86;   // drop everything past this fraction of width (candlestick chart)

(async () => {
  const img = await Jimp.read(SRC);
  const { width, height } = img.bitmap;
  const cutX = Math.floor(width * RIGHT_CUT);
  let minX = width, minY = height, maxX = 0, maxY = 0;

  img.scan(0, 0, width, height, (x, y, idx) => {
    const d = img.bitmap.data;
    if (x > cutX) { d[idx + 3] = 0; return; }            // remove candlestick chart
    const mx = Math.max(d[idx], d[idx + 1], d[idx + 2]);
    if (mx < DARK_MAX) { d[idx + 3] = 0; }               // dark bg -> transparent
    else {
      d[idx + 3] = 255;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  });

  const pad = 8;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad); maxY = Math.min(height - 1, maxY + pad);
  img.crop(minX, minY, maxX - minX, maxY - minY);

  await img.writeAsync(OUT_PUBLIC);
  await img.writeAsync(OUT_ASSETS);
  console.log(`Saved transparent logo ${img.bitmap.width}x${img.bitmap.height} (cropped from ${width}x${height})`);
})();
