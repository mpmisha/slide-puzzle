// Tile / board textures for the sliding puzzle, in the shared glossy-candy
// language. The solved picture is a smooth 2D colour gradient (bilinear blend of
// four candy corners) keyed by each tile's HOME position — so a solved board
// reads as a clean rainbow plate and a scrambled one is visibly jumbled, giving
// small kids an obvious "make the colours flow" goal.
import { css, adjustBrightness } from './color.js';
import { SkinCatalog } from './skins.js';

const DPR = Math.min(window.devicePixelRatio || 1, 3);

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

const lerp = (a, b, t) => a + (b - a) * t;
function mix(c1, c2, t) {
  return { r: lerp(c1.r, c2.r, t), g: lerp(c1.g, c2.g, t), b: lerp(c1.b, c2.b, t) };
}

// Colour for a tile given its solved-home value and the grid size.
function tileColor(value, size) {
  const colors = SkinCatalog.blockPalette.colors;
  const TL = colors[0], TR = colors[6], BL = colors[4], BR = colors[5];
  const homeRow = Math.floor(value / size);
  const homeCol = value % size;
  const u = size > 1 ? homeCol / (size - 1) : 0;
  const v = size > 1 ? homeRow / (size - 1) : 0;
  return mix(mix(TL, TR, u), mix(BL, BR, u), v);
}

// A recessed empty slot where the blank sits.
function drawEmptyCell(ctx, x, y, w, h) {
  const surface = SkinCatalog.surfacePalette;
  const radius = Math.min(w, h) * 0.22;
  ctx.fillStyle = css(surface.emptyCell);
  roundRect(ctx, x, y, w, h, radius);
  ctx.fill();
}

// A glossy raised tile with an optional faint home-number.
function drawTile(ctx, x, y, w, h, color, number, showNumber, alpha = 1) {
  const radius = Math.min(w, h) * 0.20;
  ctx.save();
  if (alpha !== 1) ctx.globalAlpha = alpha;

  // Body / bevel shadow.
  const inset = Math.max(0.5, h * 0.03);
  ctx.fillStyle = css(adjustBrightness(color, 0.60));
  roundRect(ctx, x + inset, y + inset, w - inset * 2, h - inset * 2, radius);
  ctx.fill();

  // Raised face, nudged up so the bottom edge reads as a shadow.
  const fx = x + w * 0.05;
  const fy = y + h * 0.05;
  const fw = w - w * 0.10;
  const fh = h - h * 0.16;
  ctx.fillStyle = css(color);
  roundRect(ctx, fx, fy, fw, fh, radius * 0.8);
  ctx.fill();

  ctx.save();
  roundRect(ctx, fx, fy, fw, fh, radius * 0.8);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(fx, fy, fw, fh * 0.42);
  const hs = Math.min(fw, fh) * 0.5;
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  roundRect(ctx, fx + fw * 0.07, fy + fh * 0.12, hs, hs * 0.4, hs * 0.3);
  ctx.fill();
  ctx.restore();

  if (showNumber) {
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.font = `700 ${Math.round(h * 0.34)}px "Baloo 2", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(number), x + w / 2, y + h * 0.52);
  }

  ctx.restore();
}

// A glossy raised tile that shows a slice of a picture (picture mode). The
// slice is taken from the tile's HOME position in the source square so a solved
// board rebuilds the whole picture. Keeps a light bevel + gloss so it still
// feels like the candy set, without hiding the image.
function drawPictureTile(ctx, x, y, w, h, src, homeRow, homeCol, size, number, showNumber, alpha = 1) {
  const radius = Math.min(w, h) * 0.20;
  ctx.save();
  if (alpha !== 1) ctx.globalAlpha = alpha;

  // Bevel shadow body.
  const inset = Math.max(0.5, h * 0.03);
  ctx.fillStyle = 'rgba(16,18,41,0.45)';
  roundRect(ctx, x + inset, y + inset, w - inset * 2, h - inset * 2, radius);
  ctx.fill();

  const fx = x + w * 0.05;
  const fy = y + h * 0.05;
  const fw = w - w * 0.10;
  const fh = h - h * 0.16;

  ctx.save();
  roundRect(ctx, fx, fy, fw, fh, radius * 0.8);
  ctx.clip();

  // Draw the picture slice for this tile's home cell.
  const sw = src.width / size;
  const sh = src.height / size;
  ctx.drawImage(src, homeCol * sw, homeRow * sh, sw, sh, fx, fy, fw, fh);

  // Top gloss.
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(fx, fy, fw, fh * 0.4);
  ctx.restore();

  // Thin light border to separate neighbouring tiles.
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = Math.max(1, w * 0.01);
  roundRect(ctx, fx, fy, fw, fh, radius * 0.8);
  ctx.stroke();

  if (showNumber) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = Math.max(1, h * 0.02);
    ctx.font = `700 ${Math.round(h * 0.3)}px "Baloo 2", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(String(number), x + w / 2, y + h * 0.52);
    ctx.fillText(String(number), x + w / 2, y + h * 0.52);
  }

  ctx.restore();
}

function makeBackgroundCanvas(width, height) {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(width * DPR));
  c.height = Math.max(2, Math.round(height * DPR));
  const ctx = c.getContext('2d');
  ctx.scale(DPR, DPR);
  const surface = SkinCatalog.surfacePalette;
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, css(surface.backgroundTop));
  grad.addColorStop(1, css(surface.backgroundBottom));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  return c;
}

export { roundRect, tileColor, drawTile, drawPictureTile, drawEmptyCell, makeBackgroundCanvas };
