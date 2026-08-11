// Picture-puzzle sources. In "Picture mode" the tiles show slices of a single
// square image instead of the colour gradient, so solving the puzzle rebuilds a
// friendly picture. Two kinds of source:
//   - built-in, procedurally drawn cute pictures (offline, on-brand, kid-simple)
//   - a photo the child uploads themselves (cover-cropped to a square)
import { SkinCatalog } from './skins.js';
import { css } from './color.js';

const DPR = Math.min(window.devicePixelRatio || 1, 3);

// Convenience: a candy-palette colour as a CSS string.
function candy(i, alpha) {
  const c = SkinCatalog.blockPalette.colors[i % SkinCatalog.blockPalette.colors.length];
  return alpha == null ? css(c) : css({ ...c, a: alpha });
}

function fillBg(ctx, s, top, bottom) {
  const g = ctx.createLinearGradient(0, 0, 0, s);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.closePath();
}

// ---- Built-in pictures ----------------------------------------------------
// Each draws onto a square canvas context of side `s`. Colours come from the
// shared candy palette so every picture feels like part of the same set.

const BUILTINS = [
  {
    id: 'sun',
    name: 'Sun',
    draw(ctx, s) {
      fillBg(ctx, s, candy(3, 0.55), candy(6, 0.55)); // sky blue -> teal
      const cx = s * 0.5, cy = s * 0.46, r = s * 0.22;
      ctx.strokeStyle = candy(5);
      ctx.lineWidth = s * 0.035;
      ctx.lineCap = 'round';
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r * 1.35, cy + Math.sin(a) * r * 1.35);
        ctx.lineTo(cx + Math.cos(a) * r * 1.75, cy + Math.sin(a) * r * 1.75);
        ctx.stroke();
      }
      ctx.fillStyle = candy(5); // yellow
      circle(ctx, cx, cy, r); ctx.fill();
      // little cheeks + smile
      ctx.fillStyle = candy(4, 0.7);
      circle(ctx, cx - r * 0.45, cy + r * 0.2, r * 0.16); ctx.fill();
      circle(ctx, cx + r * 0.45, cy + r * 0.2, r * 0.16); ctx.fill();
      ctx.fillStyle = 'rgba(60,40,10,0.85)';
      circle(ctx, cx - r * 0.35, cy - r * 0.15, r * 0.1); ctx.fill();
      circle(ctx, cx + r * 0.35, cy - r * 0.15, r * 0.1); ctx.fill();
      ctx.strokeStyle = 'rgba(60,40,10,0.85)';
      ctx.lineWidth = s * 0.02;
      ctx.beginPath();
      ctx.arc(cx, cy + r * 0.05, r * 0.45, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      // ground
      ctx.fillStyle = candy(1, 0.9);
      ctx.fillRect(0, s * 0.8, s, s * 0.2);
    },
  },
  {
    id: 'cat',
    name: 'Cat',
    draw(ctx, s) {
      fillBg(ctx, s, candy(4, 0.5), candy(0, 0.5)); // pink -> purple
      const cx = s * 0.5, cy = s * 0.54, r = s * 0.26;
      ctx.fillStyle = candy(2); // orange
      // ears
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.8, cy - r * 0.55);
      ctx.lineTo(cx - r * 1.15, cy - r * 1.5);
      ctx.lineTo(cx - r * 0.15, cy - r * 0.95);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + r * 0.8, cy - r * 0.55);
      ctx.lineTo(cx + r * 1.15, cy - r * 1.5);
      ctx.lineTo(cx + r * 0.15, cy - r * 0.95);
      ctx.closePath(); ctx.fill();
      circle(ctx, cx, cy, r); ctx.fill();
      // eyes
      ctx.fillStyle = 'rgba(40,30,20,0.9)';
      circle(ctx, cx - r * 0.38, cy - r * 0.1, r * 0.11); ctx.fill();
      circle(ctx, cx + r * 0.38, cy - r * 0.1, r * 0.11); ctx.fill();
      // nose
      ctx.fillStyle = candy(4);
      circle(ctx, cx, cy + r * 0.12, r * 0.1); ctx.fill();
      // whiskers
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = s * 0.012;
      for (const d of [-1, 1]) {
        for (const dy of [-0.05, 0.12]) {
          ctx.beginPath();
          ctx.moveTo(cx + d * r * 0.25, cy + r * (0.12 + dy));
          ctx.lineTo(cx + d * r * 1.0, cy + r * (0.02 + dy));
          ctx.stroke();
        }
      }
    },
  },
  {
    id: 'fish',
    name: 'Fish',
    draw(ctx, s) {
      fillBg(ctx, s, candy(6, 0.7), candy(3, 0.8)); // teal -> blue water
      const cx = s * 0.46, cy = s * 0.52, r = s * 0.2;
      // tail
      ctx.fillStyle = candy(2);
      ctx.beginPath();
      ctx.moveTo(cx + r * 0.7, cy);
      ctx.lineTo(cx + r * 1.7, cy - r * 0.7);
      ctx.lineTo(cx + r * 1.7, cy + r * 0.7);
      ctx.closePath(); ctx.fill();
      // body
      ctx.fillStyle = candy(2);
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 1.1, r * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      // eye
      ctx.fillStyle = '#fff';
      circle(ctx, cx - r * 0.5, cy - r * 0.1, r * 0.2); ctx.fill();
      ctx.fillStyle = 'rgba(40,30,20,0.9)';
      circle(ctx, cx - r * 0.55, cy - r * 0.1, r * 0.09); ctx.fill();
      // fin
      ctx.fillStyle = candy(5, 0.95);
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 0.75);
      ctx.lineTo(cx + r * 0.4, cy - r * 1.25);
      ctx.lineTo(cx + r * 0.5, cy - r * 0.6);
      ctx.closePath(); ctx.fill();
      // bubbles
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      circle(ctx, cx - r * 1.4, cy - r * 1.0, r * 0.12); ctx.fill();
      circle(ctx, cx - r * 1.7, cy - r * 1.6, r * 0.09); ctx.fill();
    },
  },
  {
    id: 'flower',
    name: 'Flower',
    draw(ctx, s) {
      fillBg(ctx, s, candy(6, 0.45), candy(1, 0.65)); // sky -> grass
      const cx = s * 0.5, cy = s * 0.44, pr = s * 0.13;
      // stem + leaves
      ctx.strokeStyle = candy(1);
      ctx.lineWidth = s * 0.04;
      ctx.beginPath();
      ctx.moveTo(cx, cy); ctx.lineTo(cx, s * 0.92);
      ctx.stroke();
      ctx.fillStyle = candy(1);
      ctx.beginPath();
      ctx.ellipse(cx - s * 0.1, s * 0.66, s * 0.09, s * 0.045, -0.5, 0, Math.PI * 2);
      ctx.fill();
      // petals
      ctx.fillStyle = candy(4); // pink
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        circle(ctx, cx + Math.cos(a) * pr * 1.5, cy + Math.sin(a) * pr * 1.5, pr);
        ctx.fill();
      }
      // center
      ctx.fillStyle = candy(5);
      circle(ctx, cx, cy, pr * 1.1); ctx.fill();
    },
  },
  {
    id: 'heart',
    name: 'Heart',
    draw(ctx, s) {
      fillBg(ctx, s, candy(0, 0.5), candy(4, 0.55)); // purple -> pink
      const cx = s * 0.5, cy = s * 0.44, w = s * 0.3;
      ctx.fillStyle = candy(7); // red
      ctx.beginPath();
      ctx.moveTo(cx, cy + w * 0.9);
      ctx.bezierCurveTo(cx - w * 1.4, cy - w * 0.2, cx - w * 0.4, cy - w * 1.1, cx, cy - w * 0.35);
      ctx.bezierCurveTo(cx + w * 0.4, cy - w * 1.1, cx + w * 1.4, cy - w * 0.2, cx, cy + w * 0.9);
      ctx.closePath(); ctx.fill();
      // gloss
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(cx - w * 0.45, cy - w * 0.35, w * 0.22, w * 0.32, -0.5, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    draw(ctx, s) {
      fillBg(ctx, s, candy(3, 0.4), candy(6, 0.45));
      const cx = s * 0.5, cy = s * 0.78;
      const bands = [7, 2, 5, 1, 6, 3, 0];
      ctx.lineWidth = s * 0.055;
      bands.forEach((ci, i) => {
        ctx.strokeStyle = candy(ci);
        ctx.beginPath();
        ctx.arc(cx, cy, s * (0.16 + i * 0.062), Math.PI, Math.PI * 2);
        ctx.stroke();
      });
      // clouds
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (const px of [0.14, 0.86]) {
        circle(ctx, s * px, cy, s * 0.09); ctx.fill();
        circle(ctx, s * px + s * 0.06, cy - s * 0.02, s * 0.07); ctx.fill();
        circle(ctx, s * px - s * 0.06, cy - s * 0.01, s * 0.06); ctx.fill();
      }
    },
  },
];

function isBuiltinId(id) {
  return BUILTINS.some((b) => b.id === id);
}

// Render a built-in picture to a square offscreen canvas of `px` device pixels.
function renderBuiltin(id, px) {
  const def = BUILTINS.find((b) => b.id === id) || BUILTINS[0];
  const c = document.createElement('canvas');
  const side = Math.max(2, Math.round(px));
  c.width = side;
  c.height = side;
  const ctx = c.getContext('2d');
  def.draw(ctx, side);
  return c;
}

// Cover-crop an already-loaded HTMLImageElement to a square canvas of `px`.
function imageToSquare(img, px) {
  const side = Math.max(2, Math.round(px));
  const c = document.createElement('canvas');
  c.width = side;
  c.height = side;
  const ctx = c.getContext('2d');
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(side / iw, side / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, (side - dw) / 2, (side - dh) / 2, dw, dh);
  return c;
}

// Load a data URL into an HTMLImageElement (resolves with the element).
function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export {
  BUILTINS, DPR, isBuiltinId, renderBuiltin, imageToSquare, loadImage, candy,
};
