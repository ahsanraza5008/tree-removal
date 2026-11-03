// Renders favicon.ico (32px PNG-in-ICO) and apple-touch-icon.png (180px) from the SVG mark.
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const img = path.join(__dirname, "../src/assets/img");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  async function render(file, size) {
    const svg = fs.readFileSync(path.join(img, file), "utf8");
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<html><body style="margin:0;background:transparent">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
    return p.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  }
  fs.writeFileSync(path.join(img, "apple-touch-icon.png"), await render("icon-tile.svg", 180));
  const png = await render("favicon.svg", 32);
  const head = Buffer.alloc(22);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(1, 4);
  head.writeUInt8(32, 6); head.writeUInt8(32, 7); head.writeUInt8(0, 8); head.writeUInt8(0, 9);
  head.writeUInt16LE(1, 10); head.writeUInt16LE(32, 12); head.writeUInt32LE(png.length, 14); head.writeUInt32LE(22, 18);
  fs.writeFileSync(path.join(img, "favicon.ico"), Buffer.concat([head, png]));
  await b.close();
  console.log("icons written");
})();
