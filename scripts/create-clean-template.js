const fs = require('fs');
const { PNG } = require('pngjs');

fs.createReadStream('public/templates/flyer-sample.png')
  .pipe(new PNG())
  .on('parsed', function () {
    const width = this.width;
    const height = this.height;

    const getPixel = (x, y) => {
      const idx = (width * y + x) << 2;
      return [this.data[idx], this.data[idx + 1], this.data[idx + 2], this.data[idx + 3]];
    };

    const setPixel = (x, y, rgba) => {
      const idx = (width * y + x) << 2;
      this.data[idx] = rgba[0];
      this.data[idx + 1] = rgba[1];
      this.data[idx + 2] = rgba[2];
      this.data[idx + 3] = rgba[3];
    };

    // 1. Clean the text area on the left
    for (let y = 370; y <= 758; y++) {
      for (let x = 20; x <= 412; x++) {
        const [r, g, b] = getPixel(x, y);
        const isLeaf = (g > 100 && g > r * 1.15 && g > b * 1.15) || (y > 750 && g > 90);
        if (isLeaf) continue;

        const sampleY = 325 + ((x * 13 + y * 7) % 25);
        const sampleX = 40 + ((x * 3 + y * 5) % 300);
        const bg = getPixel(sampleX, sampleY);
        setPixel(x, y, bg);
      }
    }

    // 2. Clean the photo interior, leaving the green border and the mosque dome at the bottom intact
    for (let y = 338; y <= 850; y++) {
      for (let x = 423; x <= 781; x++) {
        const r = 24;
        let inCorner = false;
        if (x < 423 + r && y < 338 + r) {
          const dx = (423 + r) - x;
          const dy = (338 + r) - y;
          if (dx * dx + dy * dy > r * r) inCorner = true;
        } else if (x > 781 - r && y < 338 + r) {
          const dx = x - (781 - r);
          const dy = (338 + r) - y;
          if (dx * dx + dy * dy > r * r) inCorner = true;
        }
        if (inCorner) continue;

        if (y >= 560 && x >= 430 && x <= 800) {
          const [pr, pg, pb] = getPixel(x, y);
          const max = Math.max(pr, pg, pb);
          const min = Math.min(pr, pg, pb);
          const sat = max === 0 ? 0 : (max - min) / max;
          const isDome = (y >= 680 && (sat < 0.25 || (pr < 60 && pg < 60 && pb < 60))) ||
                         (y >= 565 && y < 680 && sat < 0.22 && (max < 210 || min > 180));
          if (isDome) continue;
        }

        setPixel(x, y, [238, 235, 226, 255]);
      }
    }

    this.pack().pipe(fs.createWriteStream('public/templates/flyer-khatam-blank.png'))
      .on('finish', () => {
        console.log('Successfully regenerated clean public/templates/flyer-khatam-blank.png');
      });
  });
