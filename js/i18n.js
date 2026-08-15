// Slide Puzzle i18n (Playground contract v1). Self-contained per game.
//
// Canonical store: localStorage 'lang' ∈ {'en','he'}. Same origin as the hub, so
// this key is shared — the hub sets it and every game reads it. English is the
// LTR fallback; Hebrew is RTL. Numbers always stay numeric; only text + chrome
// localize. The puzzle board itself is orientation-neutral and is NOT mirrored.

export const LANGS = ['en', 'he'];

// A value may be a plain string or a function(...args) => string for dynamic
// phrases (level counters, move counts, captions).
const STRINGS = {
  en: {
    appTitle: 'Slide Puzzle',
    settings: 'Settings',
    showNumbers: 'Show numbers',
    picturePuzzle: 'Picture puzzle',
    uploadPhoto: 'Upload your own photo',
    sound: 'Sound',
    vibration: 'Vibration',
    restart: 'Restart from Level 1',
    backToGames: '\u2190 Back to Games',
    close: 'Close',
    solvedTitle: 'You solved it!',
    nextPuzzle: 'Next Puzzle',
    victoryTitle: 'All puzzles solved!',
    playAgain: 'Play Again',
    gearAria: 'Settings',
    movesAria: 'Moves',
    solvedAria: 'Solved',
    victoryAria: 'You win',
    level: (n) => `Level ${n}`,
    levelOf: (n, total) => `Level ${n} of ${total}`,
    moves: (n) => (n === 1 ? '1 move' : `${n} moves`),
    solvedCaption: (lvl, m) => `Level ${lvl} \u00b7 ${m} ${m === 1 ? 'move' : 'moves'}`,
    victoryCaption: (levels) => `You cleared all ${levels} puzzles!`,
    pic_sun: 'Sun',
    pic_cat: 'Cat',
    pic_fish: 'Fish',
    pic_flower: 'Flower',
    pic_heart: 'Heart',
    pic_rainbow: 'Rainbow',
  },
  he: {
    appTitle: 'פאזל הזזה',
    settings: 'הגדרות',
    showNumbers: 'הצגת מספרים',
    picturePuzzle: 'פאזל תמונה',
    uploadPhoto: 'העלו תמונה משלכם',
    sound: 'צליל',
    vibration: 'רטט',
    restart: 'התחלה מחדש מהשלב הראשון',
    backToGames: 'חזרה למשחקים \u2192',
    close: 'סגירה',
    solvedTitle: 'פתרתם!',
    nextPuzzle: 'פאזל הבא',
    victoryTitle: 'כל הפאזלים נפתרו!',
    playAgain: 'שחקו שוב',
    gearAria: 'הגדרות',
    movesAria: 'מהלכים',
    solvedAria: 'נפתר',
    victoryAria: 'ניצחתם',
    level: (n) => `שלב ${n}`,
    levelOf: (n, total) => `שלב ${n} מתוך ${total}`,
    moves: (n) => `${n} מהלכים`,
    solvedCaption: (lvl, m) => `שלב ${lvl} \u00b7 ${m} מהלכים`,
    victoryCaption: (levels) => `פתרתם את כל ${levels} הפאזלים!`,
    pic_sun: 'שמש',
    pic_cat: 'חתול',
    pic_fish: 'דג',
    pic_flower: 'פרח',
    pic_heart: 'לב',
    pic_rainbow: 'קשת',
  },
};

export function isValidLang(code) {
  return LANGS.includes(code);
}

function detectFromNavigator() {
  const list = Array.isArray(navigator.languages) && navigator.languages.length
    ? navigator.languages
    : [navigator.language || ''];
  for (const raw of list) {
    const code = String(raw).toLowerCase();
    if (code.startsWith('he') || code.startsWith('iw')) return 'he';
    if (code.startsWith('en')) return 'en';
  }
  return 'en';
}

// Resolution order: (1) URL ?lang= if valid → also persist; (2) stored 'lang';
// (3) auto-detect. Auto-detect must never overwrite an explicit stored choice.
export function resolveLang() {
  try {
    const param = new URLSearchParams(location.search).get('lang');
    if (param && isValidLang(param)) {
      try { localStorage.setItem('lang', param); } catch { /* ignore */ }
      return param;
    }
  } catch { /* ignore */ }

  try {
    const stored = localStorage.getItem('lang');
    if (stored && isValidLang(stored)) return stored;
  } catch { /* ignore */ }

  return detectFromNavigator();
}

let currentLang = 'en';
const listeners = new Set();

export function getLang() { return currentLang; }

// t('key') or t('key', arg1, arg2) — supports string and function entries, with
// an English fallback and a final fallback to the key itself.
export function t(key, ...args) {
  const dict = STRINGS[currentLang] || STRINGS.en;
  let val = dict[key];
  if (val == null) val = STRINGS.en[key];
  if (val == null) return key;
  return typeof val === 'function' ? val(...args) : val;
}

// Register a callback fired whenever the language changes (live hub update).
export function onLang(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// Apply the locale to the document: set lang/dir and notify listeners. `persist`
// writes an explicit user/hub choice to localStorage.
export function applyLang(code, persist = false) {
  const lang = isValidLang(code) ? code : 'en';
  const changed = lang !== currentLang;
  currentLang = lang;
  if (persist) {
    try { localStorage.setItem('lang', lang); } catch { /* ignore */ }
  }
  const el = document.documentElement;
  el.lang = lang;
  el.dir = lang === 'he' ? 'rtl' : 'ltr';
  listeners.forEach((cb) => { try { cb(lang, changed); } catch { /* ignore */ } });
  return lang;
}
