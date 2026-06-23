// Builds a clean favicon: lifts the real "27" glyph from the transparent logo
// and centers it on a solid dark rounded square.
const Jimp = require('jimp');
const path = require('path');

const LOGO = path.resolve(__dirname, '../public/logo.png'); // transparent 27 MARKETS logo
const OUT = path.resolve(__dirname, '../public/favicon.png');

const SIZE = 128;
const BG = 0x0a0a0aff;     // dark square
const RADIUS = 24;

(async () => {
  const logo = await Jimp.read(LOGO);
  const { width, height } = logo.bitmap;

  // "27" is the only artwork in the far-left / upper area of the transparent logo
  let minX = width, minY = height, maxX = 0, maxY = 0;
  const xLim = Math.floor(width * 0.22), yLim = Math.floor(height * 0.72);
  logo.scan(0, 0, xLim, yLim, (x, y, idx) => {
    if (logo.bitmap.data[idx + 3] > 25) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  });

  const mark = logo.clone().crop(minX, minY, maxX - minX, maxY - minY);
  // scale the mark to ~64% of the square's height
  mark.resize(Jimp.AUTO, Math.round(SIZE * 0.64));

  const canvas = new Jimp(SIZE, SIZE, BG);
  // rounded corners
  canvas.scan(0, 0, SIZE, SIZE, (x, y, idx) => {
    const dx = x < RADIUS ? RADIUS - x : x > SIZE - 1 - RADIUS ? x - (SIZE - 1 - RADIUS) : 0;
    const dy = y < RADIUS ? RADIUS - y : y > SIZE - 1 - RADIUS ? y - (SIZE - 1 - RADIUS) : 0;
    if (dx * dx + dy * dy > RADIUS * RADIUS) canvas.bitmap.data[idx + 3] = 0;
  });

  const px = Math.round((SIZE - mark.bitmap.width) / 2);
  const py = Math.round((SIZE - mark.bitmap.height) / 2);
  canvas.composite(mark, px, py);

  await canvas.writeAsync(OUT);
  console.log(`Favicon written ${SIZE}x${SIZE}; mark ${mark.bitmap.width}x${mark.bitmap.height}`);
})();
