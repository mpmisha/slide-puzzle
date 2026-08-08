// Game rules & state for the sliding puzzle. There is no way to lose — you can
// only make progress — so the phases are just playing / solved / victory.
import { LEVELS } from './levels.js';
import { Puzzle } from './puzzle.js';
import { ProgressStore } from './storage.js';

const Phase = Object.freeze({
  playing: 'playing',
  solved: 'solved',
  victory: 'victory',
});

class SlideGame {
  constructor() {
    this.levelCount = LEVELS.length;
    this.levelIndex = 0;
    this.moves = 0;
    this.phase = Phase.playing;
    this.puzzle = null;
  }

  get levelNumber() { return (this.levelIndex % this.levelCount) + 1; }
  get level() { return LEVELS[this.levelIndex % this.levelCount]; }
  get size() { return this.level.size; }

  reset(fromStart) {
    this.levelIndex = fromStart ? 0 : ProgressStore.level;
    if (this.levelIndex >= this.levelCount) this.levelIndex = 0;
    this.loadLevel();
  }

  loadLevel() {
    const { size, scramble } = this.level;
    this.puzzle = new Puzzle(size);
    this.puzzle.scramble(scramble);
    this.moves = 0;
    this.phase = Phase.playing;
    ProgressStore.level = this.levelIndex % this.levelCount;
  }

  // Attempt a slide from a tapped tile position. Returns 'moved' | 'solved' |
  // 'victory' | null (nothing happened).
  slide(pos) {
    if (this.phase !== Phase.playing) return null;
    if (!this.puzzle.slide(pos)) return null;
    this.moves += 1;
    if (this.puzzle.isSolved()) {
      const last = this.levelIndex + 1 >= this.levelCount;
      this.phase = last ? Phase.victory : Phase.solved;
      return last ? 'victory' : 'solved';
    }
    return 'moved';
  }

  advanceLevel() {
    this.levelIndex = (this.levelIndex + 1) % this.levelCount;
    this.loadLevel();
  }

  restartFromStart() {
    this.reset(true);
  }
}

export { SlideGame, Phase };
