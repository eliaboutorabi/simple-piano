const pianoKeys = [
  { note: "C4", color: "white", shortcut: "a" },
  { note: "C#4", color: "black", shortcut: "w", position: 1 },
  { note: "D4", color: "white", shortcut: "s" },
  { note: "D#4", color: "black", shortcut: "e", position: 2 },
  { note: "E4", color: "white", shortcut: "d" },
  { note: "F4", color: "white", shortcut: "f" },
  { note: "F#4", color: "black", shortcut: "t", position: 4 },
  { note: "G4", color: "white", shortcut: "g" },
  { note: "G#4", color: "black", shortcut: "y", position: 5 },
  { note: "A4", color: "white", shortcut: "h" },
  { note: "A#4", color: "black", shortcut: "u", position: 6 },
  { note: "B4", color: "white", shortcut: "j" },
  { note: "C5", color: "white", shortcut: "k" },
  { note: "C#5", color: "black", shortcut: "o", position: 8 },
  { note: "D5", color: "white", shortcut: "l" },
  { note: "D#5", color: "black", shortcut: "p", position: 9 },
  { note: "E5", color: "white", shortcut: ";" },
  { note: "F5", color: "white", shortcut: "'" },
  { note: "F#5", color: "black", shortcut: "[", position: 11 },
  { note: "G5", color: "white" },
  { note: "G#5", color: "black", shortcut: "]", position: 12 },
  { note: "A5", color: "white" },
  { note: "A#5", color: "black", shortcut: "\\", position: 13 },
  { note: "B5", color: "white" },
  { note: "C6", color: "white" },
];

const semitoneOffsets = {
  C: -9,
  "C#": -8,
  D: -7,
  "D#": -6,
  E: -5,
  F: -4,
  "F#": -3,
  G: -2,
  "G#": -1,
  A: 0,
  "A#": 1,
  B: 2,
};

const activeNotes = new Map();
const keysByNote = new Map();
const keysByKeyboard = new Map();
const volumeControl = document.querySelector("#volume");
const waveformControl = document.querySelector("#waveform");
const sustainButton = document.querySelector("#sustain");
const whiteKeys = document.querySelector(".white-keys");
const blackKeys = document.querySelector(".black-keys");
let audioContext;
let masterGain;
let sustain = false;

renderKeyboard();

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
  oscillator.frequency.value = getFrequency(note);
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

function renderKeyboard() {
  pianoKeys.forEach((pianoKey) => {
    const key = document.createElement("button");
    key.className = `key ${pianoKey.color}`;
    key.type = "button";
    key.dataset.note = pianoKey.note;
    key.setAttribute("aria-label", pianoKey.note);

    if (pianoKey.shortcut) {
      key.dataset.key = pianoKey.shortcut;
      keysByKeyboard.set(pianoKey.shortcut.toLowerCase(), key);
    }

    if (pianoKey.position) {
      key.style.left = `${(pianoKey.position / 15) * 100}%`;
    }

    key.innerHTML = `
      <span class="note-name">${pianoKey.note}</span>
      ${pianoKey.shortcut ? `<span class="shortcut">${pianoKey.shortcut.toUpperCase()}</span>` : ""}
    `;

    key.addEventListener("pointerdown", () => startNote(pianoKey.note));
    key.addEventListener("pointerup", () => stopNote(pianoKey.note));
    key.addEventListener("pointerleave", () => stopNote(pianoKey.note));

    keysByNote.set(pianoKey.note, key);

    if (pianoKey.color === "white") {
      whiteKeys.append(key);
    } else {
      blackKeys.append(key);
    }
  });
}

function getFrequency(note) {
  const [, pitch, octave] = note.match(/^([A-G]#?)(\d)$/);
  const semitonesFromA4 = semitoneOffsets[pitch] + (Number(octave) - 4) * 12;
  return 440 * 2 ** (semitonesFromA4 / 12);
}
