// Entry point: wires the DOM HUD/overlays to the canvas GameScene, and aligns
// with the Playground hub (shared Sound/Vibration settings + back handshake).
import { GameScene } from './scene.js';
import { SettingsStore } from './storage.js';

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

const scene = new GameScene(canvas, dom);

// Debug hook for automated tests only (opt-in via ?debug).
if (new URLSearchParams(location.search).has('debug')) window.scene = scene;

// ---- HUD ----

function setLevel(level, total) {
  $('hud-level').textContent = `Level ${level}`;
  $('settings-level').textContent = `Level ${level} of ${total}`;
}

function setMoves(n) {
  $('hud-moves').textContent = n === 1 ? '1 move' : `${n} moves`;
}

// ---- Gear / settings ----

$('gear').addEventListener('click', () => {
  scene.sound.unlock();
  scene.sound.play('button');
  scene.presentSettings();
});

const settingsOverlay = $('settings-overlay');
const toggleNumbers = $('toggle-numbers');
const toggleSound = $('toggle-sound');
const toggleHaptics = $('toggle-haptics');

function syncSettingsUi() {
  toggleNumbers.classList.toggle('on', SettingsStore.showNumbers);
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
  $('solved-caption').textContent = `Level ${level} · ${moves} ${moves === 1 ? 'move' : 'moves'}`;
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
  $('victory-caption').textContent = `You cleared all ${levels} puzzles!`;
  $('victory-overlay').hidden = false;
}

$('btn-play-again').addEventListener('click', () => {
  scene.sound.play('button');
  $('victory-overlay').hidden = true;
  scene.dismissOverlay();
  scene.startNewGame();
});

// ---- Service worker (offline support) ----

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}
