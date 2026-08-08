// The difficulty ladder. Each level = a grid size + how many random legal
// slides to scramble from solved. Difficulty ramps *scramble depth first, then
// grid size*, so the step-up is gentle for smaller kids:
//
//   2x2  : confidence builders, only a few moves from solved
//   3x3  : the comfortable core, gradually more shuffled
//   4x4  : big-kid challenge, up to a full scramble
//
// Clear the last level -> victory -> the ladder loops (staying at full 4x4).
const LEVELS = [
  { size: 2, scramble: 3 },
  { size: 2, scramble: 6 },
  { size: 3, scramble: 10 },
  { size: 3, scramble: 18 },
  { size: 3, scramble: 28 },
  { size: 3, scramble: 40 },
  { size: 4, scramble: 40 },
  { size: 4, scramble: 60 },
  { size: 4, scramble: 90 },
  { size: 4, scramble: 120 },
  { size: 4, scramble: 160 },
  { size: 4, scramble: 200 },
];

export { LEVELS };
