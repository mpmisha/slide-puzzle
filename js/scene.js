// Canvas renderer + controller for the sliding puzzle. Owns layout, the tile
// slide animation, tap input, the game loop, and delegating HUD/overlay updates
// to the DOM (see the `dom` contract used by main.js).
import { SlideGame, Phase } from './game.js';
import { SkinCatalog } from './skins.js';
import { SettingsStore } from './storage.js';
import { SoundPlayer, Haptics } from './audio.js';
import {
  tileColor, drawTile, drawPictureTile, drawEmptyCell, makeBackgroundCanvas,
} from './textures.js';
import {
  renderBuiltin, imageToSquare, loadImage, isBuiltinId,
} from './pictures.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

const HUD_HEIGHT = 64;
const GAP_TOP = 12;
const SLIDE_MS = 130;
const SOLVE_PAUSE_MS = 700;

class GameScene {
  constructor(canvas, dom) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dom = dom;
    this.settings = SettingsStore;
    this.sound = new SoundPlayer(this.settings);
    this.haptics = new Haptics(this.settings);

    SkinCatalog.reset();

    this.game = new SlideGame();
    this.game.reset(false);

    this.overlayOpen = false;
    this.presented = false;
    this.solveAt = 0;

    this.anim = null; // { from: Map(value -> {x,y}), start }
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);

    this.pictureCanvas = null; // square source for picture mode
    this.pictureCustomImg = null; // cached uploaded HTMLImageElement

    this.bindEvents();
    this.performLayout();
    this.refreshPicture();
    this.updateHud();

    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  // MARK: - Layout

  readInsets() {
    const probe = document.getElementById('safe-probe');
    const cs = probe ? getComputedStyle(probe) : null;
    const top = cs ? parseFloat(cs.paddingTop) || 0 : 0;
    const bottom = cs ? parseFloat(cs.paddingBottom) || 0 : 0;
    return { top: Math.max(top, 24), bottom: Math.max(bottom, 14) };
  }

  performLayout() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.width = w;
    this.height = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const insets = this.readInsets();
    this.hudTop = insets.top + GAP_TOP;
    const topArea = this.hudTop + HUD_HEIGHT;
    const bottomPad = insets.bottom + 16;
    const availH = h - topArea - bottomPad;
    const pad = 18;
    const size = this.game.size;

    const board = Math.min(w - pad * 2, availH);
    this.board = board;
    this.cell = board / size;
    this.boardX = (w - board) / 2;
    this.boardY = topArea + (availH - board) / 2;

    this.background = makeBackgroundCanvas(w, h);

    if (this.dom.header) {
      this.dom.header.style.top = `${insets.top + 6}px`;
      this.dom.header.style.height = `${HUD_HEIGHT}px`;
    }
  }

  cellRect(pos) {
    const size = this.game.size;
    const r = Math.floor(pos / size);
    const c = pos % size;
    const gap = this.cell * 0.05;
    return {
      x: this.boardX + c * this.cell + gap,
      y: this.boardY + r * this.cell + gap,
      w: this.cell - gap * 2,
      h: this.cell - gap * 2,
    };
  }

  cellCenter(pos) {
    const r = this.cellRect(pos);
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  }

  // MARK: - Input

  bindEvents() {
    window.addEventListener('resize', () => this.performLayout());
    window.addEventListener('orientationchange', () => setTimeout(() => this.performLayout(), 200));
    this.canvas.addEventListener('pointerdown', (e) => this.handleTap(e));
  }

  posAt(clientX, clientY) {
    const size = this.game.size;
    const x = clientX - this.boardX;
    const y = clientY - this.boardY;
    if (x < 0 || y < 0 || x > this.board || y > this.board) return -1;
    const c = clamp(Math.floor(x / this.cell), 0, size - 1);
    const r = clamp(Math.floor(y / this.cell), 0, size - 1);
    return r * size + c;
  }

  handleTap(e) {
    if (this.overlayOpen) return;
    this.sound.unlock();
    if (this.game.phase !== Phase.playing) return;
    const pos = this.posAt(e.clientX, e.clientY);
    if (pos < 0) return;

    // Snapshot current tile centres so the moved line animates from its old spot.
    const from = new Map();
    const puzzle = this.game.puzzle;
    for (let p = 0; p < puzzle.count; p++) {
      from.set(puzzle.tiles[p], this.cellCenter(p));
    }

    const result = this.game.slide(pos);
    if (!result) return;

    this.anim = { from, start: performance.now() };
    this.updateHud();

    if (result === 'moved') {
      this.sound.play('place');
      this.haptics.place();
    } else {
      this.sound.play('levelUp');
      this.haptics.clearLines();
      this.presented = false;
      this.solveAt = performance.now();
    }
  }

  // MARK: - Picture mode

  // Rebuild the square source picture from the current settings. For a built-in
  // it's synchronous; for a custom upload it loads the image (async) then keeps
  // it cached so later rebuilds are instant.
  refreshPicture() {
    const PIC_PX = 720;
    if (!this.settings.pictureMode) {
      this.pictureCanvas = null;
      return;
    }
    const id = this.settings.pictureId;
    if (id === 'custom') {
      const data = this.settings.customImage;
      if (!data) { this.pictureCanvas = null; return; }
      const build = (img) => {
        this.pictureCustomImg = img;
        this.pictureCanvas = imageToSquare(img, PIC_PX);
      };
      if (this.pictureCustomImg && this.pictureCustomImg.src === data) {
        build(this.pictureCustomImg);
      } else {
        this.pictureCanvas = null; // fall back to colours until it loads
        loadImage(data).then(build).catch(() => { this.pictureCanvas = null; });
      }
      return;
    }
    this.pictureCanvas = renderBuiltin(isBuiltinId(id) ? id : 'sun', PIC_PX);
  }

  // MARK: - External controls (from main.js)

  presentSettings() {
    this.overlayOpen = true;
    this.dom.onPresentSettings?.();
  }

  dismissOverlay() {
    this.overlayOpen = false;
  }

  startNewGame() {
    this.game.restartFromStart();
    this.overlayOpen = false;
    this.presented = false;
    this.anim = null;
    this.performLayout();
    this.updateHud();
  }

  nextLevel() {
    this.game.advanceLevel();
    this.overlayOpen = false;
    this.presented = false;
    this.anim = null;
    this.performLayout();
    this.updateHud();
  }

  updateHud() {
    this.dom.setLevel?.(this.game.levelNumber, this.game.levelCount);
    this.dom.setMoves?.(this.game.moves);
  }

  // MARK: - Render loop

  loop(now) {
    this.render(now);

    // Present the solved / victory overlay a beat after the winning slide.
    if ((this.game.phase === Phase.solved || this.game.phase === Phase.victory)
        && !this.presented && now - this.solveAt > SOLVE_PAUSE_MS) {
      this.presented = true;
      this.overlayOpen = true;
      if (this.game.phase === Phase.victory) {
        this.dom.onPresentVictory?.({ levels: this.game.levelCount });
      } else {
        this.dom.onPresentSolved?.({ level: this.game.levelNumber, moves: this.game.moves });
      }
    }

    requestAnimationFrame(this.loop);
  }

  render(now) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    if (this.background) {
      ctx.drawImage(this.background, 0, 0, this.width, this.height);
    }

    // Board backdrop.
    ctx.save();
    ctx.fillStyle = 'rgba(16,18,41,0.28)';
    const bpad = this.cell * 0.05;
    this.roundRectPath(
      ctx,
      this.boardX - bpad, this.boardY - bpad,
      this.board + bpad * 2, this.board + bpad * 2,
      this.cell * 0.18,
    );
    ctx.fill();
    ctx.restore();

    const puzzle = this.game.puzzle;
    const size = this.game.size;
    const showNumbers = this.settings.showNumbers;
    const pic = this.settings.pictureMode ? this.pictureCanvas : null;

    // Empty cells first (the recessed slot under the blank).
    for (let p = 0; p < puzzle.count; p++) {
      if (puzzle.tiles[p] === puzzle.blankValue) {
        const r = this.cellRect(p);
        drawEmptyCell(ctx, r.x, r.y, r.w, r.h);
      }
    }

    // Animation progress.
    let t = 1;
    if (this.anim) {
      t = easeOut(clamp((now - this.anim.start) / SLIDE_MS, 0, 1));
      if (t >= 1) this.anim = null;
    }

    for (let p = 0; p < puzzle.count; p++) {
      const value = puzzle.tiles[p];
      if (value === puzzle.blankValue) continue;
      const rect = this.cellRect(p);
      let x = rect.x;
      let y = rect.y;
      if (this.anim) {
        const start = this.anim.from.get(value);
        if (start) {
          const target = { x: rect.x, y: rect.y };
          x = start.x - rect.w / 2 + (target.x - (start.x - rect.w / 2)) * t;
          y = start.y - rect.h / 2 + (target.y - (start.y - rect.h / 2)) * t;
        }
      }
      const color = tileColor(value, size);
      if (pic) {
        drawPictureTile(
          ctx, x, y, rect.w, rect.h, pic,
          Math.floor(value / size), value % size, size,
          value + 1, showNumbers,
        );
      } else {
        drawTile(ctx, x, y, rect.w, rect.h, color, value + 1, showNumbers);
      }
    }
  }

  roundRectPath(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }
}

export { GameScene };
