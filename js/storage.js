// Player settings + progress via localStorage.
//
// Sound/Vibration use the SHARED, unprefixed keys so the Playground hub's global
// toggles (and the other games) stay in sync. Game-specific prefs are namespaced
// with sp_ so they never collide with other games on the same origin.
const KEYS = {
  sound: 'soundEnabled',
  haptics: 'hapticsEnabled',
  showNumbers: 'sp_showNumbers',
  level: 'sp_level',
};

function readBool(key, fallback) {
  const v = localStorage.getItem(key);
  if (v === null) return fallback;
  return v === 'true';
}

const SettingsStore = {
  get isSoundEnabled() { return readBool(KEYS.sound, true); },
  set isSoundEnabled(value) { localStorage.setItem(KEYS.sound, value ? 'true' : 'false'); },

  get areHapticsEnabled() { return readBool(KEYS.haptics, true); },
  set areHapticsEnabled(value) { localStorage.setItem(KEYS.haptics, value ? 'true' : 'false'); },

  // Show a faint position number on each tile — an assist for the youngest
  // players. On by default; turn off for a pure-picture challenge.
  get showNumbers() { return readBool(KEYS.showNumbers, true); },
  set showNumbers(value) { localStorage.setItem(KEYS.showNumbers, value ? 'true' : 'false'); },
};

const ProgressStore = {
  get level() {
    const stored = parseInt(localStorage.getItem(KEYS.level) || '', 10);
    return Number.isFinite(stored) && stored >= 0 ? stored : 0;
  },
  set level(value) {
    try {
      localStorage.setItem(KEYS.level, String(value));
    } catch (_) {
      // Storage may be unavailable; the game still plays fine.
    }
  },
};

export { SettingsStore, ProgressStore };
