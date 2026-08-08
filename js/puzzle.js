// The sliding-puzzle board model.
//
// Tiles live in a flat array of length size*size. tiles[position] = tileValue,
// where tileValue in 0..N-1 and the highest value (N-1) is the BLANK.
// Solved state: tiles[i] === i for every position, blank in the last cell.
//
// Difficulty is controlled purely by how many random *legal* single-step slides
// we apply from the solved board (see scramble). Because we only ever make legal
// moves, every puzzle we produce is guaranteed solvable — unlike a random
// permutation, half of which are unsolvable (board parity).

class Puzzle {
  constructor(size) {
    this.size = size;
    this.count = size * size;
    this.blankValue = this.count - 1;
    this.reset();
  }

  reset() {
    this.tiles = Array.from({ length: this.count }, (_, i) => i);
    this.blankPos = this.count - 1;
  }

  rowOf(pos) { return Math.floor(pos / this.size); }
  colOf(pos) { return pos % this.size; }

  // Orthogonal neighbours of a position.
  neighbors(pos) {
    const r = this.rowOf(pos);
    const c = this.colOf(pos);
    const out = [];
    if (r > 0) out.push(pos - this.size);
    if (r < this.size - 1) out.push(pos + this.size);
    if (c > 0) out.push(pos - 1);
    if (c < this.size - 1) out.push(pos + 1);
    return out;
  }

  // Can the tile at `pos` move? Only if it shares the blank's row or column
  // (classic mobile UX: tap any tile in line with the gap to slide the whole
  // line toward it). Returns the ordered list of positions that would shift.
  slidePath(pos) {
    if (pos === this.blankPos) return null;
    const br = this.rowOf(this.blankPos);
    const bc = this.colOf(this.blankPos);
    const r = this.rowOf(pos);
    const c = this.colOf(pos);
    const path = [];
    if (r === br) {
      const step = c < bc ? 1 : -1;
      for (let cc = c; cc !== bc; cc += step) path.push(r * this.size + cc);
      return path; // tiles from tapped -> toward blank
    }
    if (c === bc) {
      const step = r < br ? 1 : -1;
      for (let rr = r; rr !== br; rr += step) path.push(rr * this.size + c);
      return path;
    }
    return null;
  }

  // Slide the line at `pos` toward the blank. Returns true if anything moved.
  slide(pos) {
    const path = this.slidePath(pos);
    if (!path || path.length === 0) return false;
    // Shift each tile into the next gap, moving from the tile nearest the blank
    // outward so the blank ends up where the tapped tile was.
    let gap = this.blankPos;
    for (let i = path.length - 1; i >= 0; i--) {
      const from = path[i];
      this.tiles[gap] = this.tiles[from];
      gap = from;
    }
    this.tiles[gap] = this.blankValue;
    this.blankPos = gap;
    return true;
  }

  // Scramble by applying `moves` random single-step slides from solved, never
  // immediately undoing the previous one (keeps the scramble effective).
  scramble(moves) {
    this.reset();
    let last = -1;
    for (let i = 0; i < moves; i++) {
      const options = this.neighbors(this.blankPos).filter((p) => p !== last);
      const pick = options[Math.floor(Math.random() * options.length)];
      last = this.blankPos;
      // Single-step slide: move the neighbouring tile into the blank.
      this.tiles[this.blankPos] = this.tiles[pick];
      this.tiles[pick] = this.blankValue;
      this.blankPos = pick;
    }
    // A scramble that happens to land on solved is no fun — nudge once more.
    if (this.isSolved() && moves > 0) {
      const n = this.neighbors(this.blankPos)[0];
      this.tiles[this.blankPos] = this.tiles[n];
      this.tiles[n] = this.blankValue;
      this.blankPos = n;
    }
  }

  isSolved() {
    for (let i = 0; i < this.count; i++) if (this.tiles[i] !== i) return false;
    return true;
  }
}

export { Puzzle };
