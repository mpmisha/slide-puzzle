import './telemetry.js';
// Entry point: wires the DOM HUD/overlays to the canvas GameScene, and aligns
// with the Playground hub (shared Sound/Vibration settings + back handshake).
import { GameScene } from './scene.js';
import { SettingsStore } from './storage.js';
import { BUILTINS, renderBuiltin } from './pictures.js';
import {
  resolveLang, applyLang, isValidLang, onLang, t,
} from './i18n.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');

const dom = {
  header: $('hud'),
  setLevel,
  setMoves,
  onPresentSettings: openSettings,
  onPresentSolved: openSolved,
  onPresentVictory: openVictory,
};

// Cached HUD/overlay state so we can re-render captions on a live language switch.
let lastLevel = 1;
let lastLevelTotal = 1;
let lastSolved = null; // { level, moves }
let lastVictory = null; // { levels }

const scene = new GameScene(canvas, dom);

// Debug hook for automated tests only (opt-in via ?debug).
if (new URLSearchParams(location.search).has('debug')) window.scene = scene;

// ---- HUD ----

function setLevel(level, total) {
  lastLevel = level;
  lastLevelTotal = total;
  $('hud-level').textContent = t('level', level);
  $('settings-level').textContent = t('levelOf', level, total);
}

function setMoves(n) {
  $('hud-moves').textContent = t('moves', n);
}

// ---- Gear / settings ----

$('gear').addEventListener('click', () => {
  scene.sound.unlock();
  scene.sound.play('button');
  scene.presentSettings();
});

const settingsOverlay = $('settings-overlay');
const toggleNumbers = $('toggle-numbers');
const togglePicture = $('toggle-picture');
const picturePicker = $('picture-picker');
const pictureFile = $('picture-file');
const toggleSound = $('toggle-sound');
const toggleHaptics = $('toggle-haptics');

// ---- Picture picker (built-in thumbnails + upload tile) ----

let uploadTile;

function buildPicker() {
  const frag = document.createDocumentFragment();
  BUILTINS.forEach((b) => {
    const btn = document.createElement('button');
    btn.className = 'pic-thumb';
    btn.dataset.id = b.id;
    btn.setAttribute('aria-label', t(`pic_${b.id}`));
    const thumb = renderBuiltin(b.id, 96);
    thumb.className = 'pic-thumb-img';
    btn.appendChild(thumb);
    btn.addEventListener('click', () => selectPicture(b.id));
    frag.appendChild(btn);
  });
  // Upload tile.
  uploadTile = document.createElement('button');
  uploadTile.className = 'pic-thumb pic-upload';
  uploadTile.dataset.id = 'custom';
  uploadTile.setAttribute('aria-label', t('uploadPhoto'));
  uploadTile.innerHTML = '<span class="pic-upload-plus">＋</span>';
  uploadTile.addEventListener('click', () => {
    if (SettingsStore.customImage && SettingsStore.pictureId !== 'custom') {
      selectPicture('custom'); // already have one — just switch to it
    } else {
      pictureFile.click();
    }
  });
  frag.appendChild(uploadTile);
  picturePicker.insertBefore(frag, pictureFile);
  refreshUploadTile();
}

function refreshUploadTile() {
  if (!uploadTile) return;
  const data = SettingsStore.customImage;
  if (data) {
    uploadTile.classList.add('has-image');
    uploadTile.style.backgroundImage = `url(${data})`;
    uploadTile.querySelector('.pic-upload-plus').textContent = '';
  } else {
    uploadTile.classList.remove('has-image');
    uploadTile.style.backgroundImage = '';
    uploadTile.querySelector('.pic-upload-plus').textContent = '＋';
  }
}

function syncPickerSelection() {
  const current = SettingsStore.pictureId;
  picturePicker.querySelectorAll('.pic-thumb').forEach((el) => {
    el.classList.toggle('selected', el.dataset.id === current);
  });
}

function selectPicture(id) {
  SettingsStore.pictureId = id;
  if (!SettingsStore.pictureMode) {
    SettingsStore.pictureMode = true;
    togglePicture.classList.add('on');
    picturePicker.hidden = false;
  }
  syncPickerSelection();
  scene.refreshPicture();
  scene.sound.play('button');
}

pictureFile.addEventListener('change', () => {
  const file = pictureFile.files && pictureFile.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    downscaleDataUrl(reader.result, 720).then((dataUrl) => {
      SettingsStore.customImage = dataUrl;
      refreshUploadTile();
      selectPicture('custom');
    });
  };
  reader.readAsDataURL(file);
  pictureFile.value = '';
});

// Downscale + JPEG-encode an uploaded image so it fits in localStorage and
// renders fast (photos from a phone are far too large otherwise).
function downscaleDataUrl(dataUrl, maxSide) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      try {
        resolve(c.toDataURL('image/jpeg', 0.82));
      } catch (_) {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

buildPicker();

togglePicture.addEventListener('click', () => {
  SettingsStore.pictureMode = !SettingsStore.pictureMode;
  togglePicture.classList.toggle('on', SettingsStore.pictureMode);
  picturePicker.hidden = !SettingsStore.pictureMode;
  syncPickerSelection();
  scene.refreshPicture();
  scene.sound.play('button');
});

function syncSettingsUi() {
  toggleNumbers.classList.toggle('on', SettingsStore.showNumbers);
  togglePicture.classList.toggle('on', SettingsStore.pictureMode);
  picturePicker.hidden = !SettingsStore.pictureMode;
  syncPickerSelection();
  toggleSound.classList.toggle('on', SettingsStore.isSoundEnabled);
  toggleHaptics.classList.toggle('on', SettingsStore.areHapticsEnabled);
}

function openSettings() {
  syncSettingsUi();
  settingsOverlay.hidden = false;
}

function closeSettings() {
  settingsOverlay.hidden = true;
  scene.dismissOverlay();
}

toggleNumbers.addEventListener('click', () => {
  SettingsStore.showNumbers = !SettingsStore.showNumbers;
  toggleNumbers.classList.toggle('on', SettingsStore.showNumbers);
  scene.sound.play('button');
});

toggleSound.addEventListener('click', () => {
  SettingsStore.isSoundEnabled = !SettingsStore.isSoundEnabled;
  toggleSound.classList.toggle('on', SettingsStore.isSoundEnabled);
  scene.sound.play('button');
});

toggleHaptics.addEventListener('click', () => {
  SettingsStore.areHapticsEnabled = !SettingsStore.areHapticsEnabled;
  toggleHaptics.classList.toggle('on', SettingsStore.areHapticsEnabled);
  scene.haptics.pickUp();
});

$('btn-new-game').addEventListener('click', () => {
  scene.sound.play('button');
  closeSettings();
  scene.startNewGame();
});

$('btn-close').addEventListener('click', () => {
  scene.sound.play('button');
  closeSettings();
});

settingsOverlay.querySelector('[data-dismiss="settings"]').addEventListener('click', closeSettings);

// ---- Back to hub ----
const HUB_URL = (() => {
  const param = new URLSearchParams(location.search).get('hub');
  if (param) { try { return new URL(param, location.href).href; } catch { /* ignore */ } }
  return 'https://mpmisha.github.io/playground/';
})();
const hasHubParam = new URLSearchParams(location.search).has('hub');
const backHubBtn = $('btn-back-hub');
const embeddedInHub = window.self !== window.top;
backHubBtn.href = HUB_URL;
// Sound/Vibration are global now — controlled from the hub. When embedded, hide
// those rows and the redundant in-panel Back button (the hub's player bar does
// the going-back). Show-numbers is game-specific and stays.
if (embeddedInHub) {
  toggleSound.closest('.row').hidden = true;
  toggleHaptics.closest('.row').hidden = true;
  backHubBtn.hidden = true;
} else {
  backHubBtn.hidden = !hasHubParam;
}
backHubBtn.addEventListener('click', (e) => {
  scene.sound.play('button');
  if (embeddedInHub) {
    e.preventDefault();
    try {
      window.parent.postMessage({ type: 'playground:back' }, new URL(HUB_URL).origin);
    } catch {
      window.parent.postMessage({ type: 'playground:back' }, '*');
    }
  }
});

// ---- Solved overlay ----

function openSolved({ level, moves }) {
  lastSolved = { level, moves };
  $('solved-caption').textContent = t('solvedCaption', level, moves);
  $('solved-overlay').hidden = false;
}

$('btn-next').addEventListener('click', () => {
  scene.sound.play('button');
  $('solved-overlay').hidden = true;
  scene.dismissOverlay();
  scene.nextLevel();
});

// ---- Victory overlay ----

function openVictory({ levels }) {
  lastVictory = { levels };
  $('victory-caption').textContent = t('victoryCaption', levels);
  $('victory-overlay').hidden = false;
}

$('btn-play-again').addEventListener('click', () => {
  scene.sound.play('button');
  $('victory-overlay').hidden = true;
  scene.dismissOverlay();
  scene.startNewGame();
});

// ---- Localization ----

// (Re)apply the current locale to every visible string. Called once on load and
// again whenever the hub broadcasts a language change (live, no reload).
function applyTranslations() {
  document.title = t('appTitle');

  // HUD + settings counters re-render through the scene's HUD contract.
  scene.updateHud();

  $('settings-title').textContent = t('settings');
  $('label-numbers').textContent = t('showNumbers');
  $('label-picture').textContent = t('picturePuzzle');
  $('label-sound').textContent = t('sound');
  $('label-haptics').textContent = t('vibration');
  $('btn-new-game').textContent = t('restart');
  $('btn-back-hub').textContent = t('backToGames');
  $('btn-close').textContent = t('close');

  $('solved-title').textContent = t('solvedTitle');
  $('btn-next').textContent = t('nextPuzzle');
  $('victory-title').textContent = t('victoryTitle');
  $('btn-play-again').textContent = t('playAgain');

  $('gear').setAttribute('aria-label', t('settings'));
  $('hud-moves').setAttribute('aria-label', t('movesAria'));

  // Picker thumbnails (aria-labels) + the upload tile.
  picturePicker.querySelectorAll('.pic-thumb').forEach((el) => {
    const id = el.dataset.id;
    if (id === 'custom') el.setAttribute('aria-label', t('uploadPhoto'));
    else el.setAttribute('aria-label', t(`pic_${id}`));
  });

  // Re-render captions for any overlay currently open.
  if (!$('solved-overlay').hidden && lastSolved) {
    $('solved-caption').textContent = t('solvedCaption', lastSolved.level, lastSolved.moves);
  }
  if (!$('victory-overlay').hidden && lastVictory) {
    $('victory-caption').textContent = t('victoryCaption', lastVictory.levels);
  }
}

// Resolve + apply the platform language on load (URL ?lang= → stored → detect).
applyLang(resolveLang());
onLang(applyTranslations);
applyTranslations();

// Live language switching: the hub postMessages when the player changes language
// while this game is embedded. Same-origin only.
window.addEventListener('message', (e) => {
  if (e.origin !== location.origin) return;
  const data = e.data;
  if (data && data.type === 'playground:lang' && isValidLang(data.lang)) {
    applyLang(data.lang, true);
  }
});

// ---- Service worker (offline support + robust self-update) ----
// Reload once a new worker takes control so players always get the latest build.
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            worker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
      if (reg.waiting && navigator.serviceWorker.controller) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }).catch(() => {});
  });
}
