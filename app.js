const notes = {
  C4: 261.63,
  "C#4": 277.18,
  D4: 293.66,
  "D#4": 311.13,
  E4: 329.63,
  F4: 349.23,
  "F#4": 369.99,
  G4: 392.0,
  "G#4": 415.3,
  A4: 440.0,
  "A#4": 466.16,
  B4: 493.88,
  C5: 523.25,
};

const activeNotes = new Map();
const keysByNote = new Map();
const keysByKeyboard = new Map();
const volumeControl = document.querySelector("#volume");
const waveformControl = document.querySelector("#waveform");
const sustainButton = document.querySelector("#sustain");
let audioContext;
let masterGain;
let sustain = false;

document.querySelectorAll(".key").forEach((key) => {
  keysByNote.set(key.dataset.note, key);
  keysByKeyboard.set(key.dataset.key.toLowerCase(), key);

  key.addEventListener("pointerdown", () => startNote(key.dataset.note));
  key.addEventListener("pointerup", () => stopNote(key.dataset.note));
  key.addEventListener("pointerleave", () => stopNote(key.dataset.note));
});

sustainButton.addEventListener("click", () => {
  sustain = !sustain;
  sustainButton.setAttribute("aria-pressed", String(sustain));

  if (!sustain) {
    activeNotes.forEach((_, note) => stopNote(note, true));
  }
});

volumeControl.addEventListener("input", () => {
  if (masterGain) {
    masterGain.gain.setTargetAtTime(Number(volumeControl.value), audioContext.currentTime, 0.01);
  }
});

window.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  const key = keysByKeyboard.get(event.key.toLowerCase());
  if (key) startNote(key.dataset.note);
});

window.addEventListener("keyup", (event) => {
  const key = keysByKeyboard.get(event.key.toLowerCase());
  if (key) stopNote(key.dataset.note);
});

function getAudio() {
  if (!audioContext) {
    audioContext = new AudioContext();
    masterGain = audioContext.createGain();
    masterGain.gain.value = Number(volumeControl.value);
    masterGain.connect(audioContext.destination);
  }

  return audioContext;
}

function startNote(note) {
  if (activeNotes.has(note)) return;

  const context = getAudio();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = waveformControl.value;
  oscillator.frequency.value = notes[note];
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.8, context.currentTime + 0.015);

  oscillator.connect(gain);
  gain.connect(masterGain);
  oscillator.start();

  activeNotes.set(note, { oscillator, gain });
  keysByNote.get(note)?.classList.add("active");
}

function stopNote(note, force = false) {
  const active = activeNotes.get(note);
  if (!active || (sustain && !force)) return;

  const context = getAudio();
  active.gain.gain.cancelScheduledValues(context.currentTime);
  active.gain.gain.setTargetAtTime(0.0001, context.currentTime, 0.08);
  active.oscillator.stop(context.currentTime + 0.28);
  activeNotes.delete(note);
  keysByNote.get(note)?.classList.remove("active");
}
