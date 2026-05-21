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
  { note: "C#5", color: "black", shortcut: "o", position: 8, mobileHidden: true },
  { note: "D5", color: "white", shortcut: "l", mobileHidden: true },
  { note: "D#5", color: "black", shortcut: "p", position: 9, mobileHidden: true },
  { note: "E5", color: "white", shortcut: ";", mobileHidden: true },
  { note: "F5", color: "white", shortcut: "'", mobileHidden: true },
  { note: "F#5", color: "black", shortcut: "[", position: 11, mobileHidden: true },
  { note: "G5", color: "white", mobileHidden: true },
  { note: "G#5", color: "black", shortcut: "]", position: 12, mobileHidden: true },
  { note: "A5", color: "white", mobileHidden: true },
  { note: "A#5", color: "black", shortcut: "\\", position: 13, mobileHidden: true },
  { note: "B5", color: "white", mobileHidden: true },
  { note: "C6", color: "white", mobileHidden: true },
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

const soundPresets = {
  classic: {
    attack: 0.015,
    release: 0.28,
    filter: 1800,
    voices: [
      { type: "triangle", gain: 0.8, detune: 0 },
      { type: "sine", gain: 0.18, detune: 1200 },
    ],
  },
  "warm-pad": {
    attack: 0.18,
    release: 1.1,
    filter: 950,
    voices: [
      { type: "sine", gain: 0.45, detune: -7 },
      { type: "triangle", gain: 0.45, detune: 7 },
      { type: "sine", gain: 0.22, detune: 1200 },
    ],
  },
  "bright-bell": {
    attack: 0.006,
    release: 0.9,
    filter: 3200,
    voices: [
      { type: "sine", gain: 0.62, detune: 0 },
      { type: "sine", gain: 0.28, detune: 1900 },
      { type: "triangle", gain: 0.14, detune: 2400 },
    ],
  },
  "retro-synth": {
    attack: 0.02,
    release: 0.45,
    filter: 1400,
    voices: [
      { type: "sawtooth", gain: 0.42, detune: -8 },
      { type: "sawtooth", gain: 0.42, detune: 8 },
      { type: "square", gain: 0.16, detune: 0 },
    ],
  },
  "soft-organ": {
    attack: 0.03,
    release: 0.35,
    filter: 2200,
    voices: [
      { type: "sine", gain: 0.5, detune: 0 },
      { type: "sine", gain: 0.28, detune: 1200 },
      { type: "triangle", gain: 0.18, detune: 1900 },
    ],
  },
};

const activeNotes = new Map();
const keysByNote = new Map();
const keysByKeyboard = new Map();
const volumeControl = document.querySelector("#volume");
const soundControl = document.querySelector("#sound");
const delayControl = document.querySelector("#delay");
const reverbControl = document.querySelector("#reverb");
const sustainButton = document.querySelector("#sustain");
const themeToggle = document.querySelector("#theme-toggle");
const whiteKeys = document.querySelector(".white-keys");
const blackKeys = document.querySelector(".black-keys");
let audioContext;
let dryGain;
let delay;
let delayFeedback;
let delaySend;
let masterGain;
let reverb;
let reverbSend;
let sustain = false;

renderKeyboard();
syncThemeToggle();

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

delayControl.addEventListener("input", updateEffects);
reverbControl.addEventListener("input", updateEffects);

themeToggle.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = nextTheme;
  localStorage.setItem("simple-piano-theme", nextTheme);
  syncThemeToggle();
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
    dryGain = audioContext.createGain();
    delay = audioContext.createDelay(1.2);
    delayFeedback = audioContext.createGain();
    delaySend = audioContext.createGain();
    masterGain = audioContext.createGain();
    reverb = audioContext.createConvolver();
    reverbSend = audioContext.createGain();

    dryGain.gain.value = 0.86;
    delay.delayTime.value = 0.24;
    delayFeedback.gain.value = 0.28;
    masterGain.gain.value = Number(volumeControl.value);
    reverb.buffer = createReverbBuffer(audioContext, 1.8, 2.2);

    dryGain.connect(masterGain);
    delaySend.connect(delay);
    delay.connect(delayFeedback);
    delayFeedback.connect(delay);
    delay.connect(masterGain);
    reverbSend.connect(reverb);
    reverb.connect(masterGain);
    masterGain.connect(audioContext.destination);
    updateEffects();
  }

  return audioContext;
}

function startNote(note) {
  if (activeNotes.has(note)) return;

  const context = getAudio();
  const preset = soundPresets[soundControl.value] ?? soundPresets.classic;
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  const oscillators = preset.voices.map((voice) => {
    const oscillator = context.createOscillator();
    const voiceGain = context.createGain();

    oscillator.type = voice.type;
    oscillator.frequency.value = getFrequency(note);
    oscillator.detune.value = voice.detune ?? 0;
    voiceGain.gain.value = voice.gain;
    oscillator.connect(voiceGain);
    voiceGain.connect(filter);

    return oscillator;
  });

  filter.type = "lowpass";
  filter.frequency.value = preset.filter;
  filter.Q.value = 0.7;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.8, context.currentTime + preset.attack);

  filter.connect(gain);
  gain.connect(dryGain);
  gain.connect(delaySend);
  gain.connect(reverbSend);
  oscillators.forEach((oscillator) => oscillator.start());

  activeNotes.set(note, { oscillators, gain, release: preset.release });
  keysByNote.get(note)?.classList.add("active");
}

function stopNote(note, force = false) {
  const active = activeNotes.get(note);
  if (!active || (sustain && !force)) return;

  const context = getAudio();
  active.gain.gain.cancelScheduledValues(context.currentTime);
  active.gain.gain.setTargetAtTime(0.0001, context.currentTime, 0.08);
  active.oscillators.forEach((oscillator) => oscillator.stop(context.currentTime + active.release));
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

    if (pianoKey.mobileHidden) {
      key.classList.add("mobile-hidden");
    }

    if (pianoKey.shortcut) {
      key.dataset.key = pianoKey.shortcut;
      keysByKeyboard.set(pianoKey.shortcut.toLowerCase(), key);
    }

    if (pianoKey.position) {
      key.style.setProperty("--key-left", `${(pianoKey.position / 15) * 100}%`);
      key.style.setProperty("--mobile-key-left", `${(pianoKey.position / 8) * 100}%`);
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

function updateEffects() {
  if (!audioContext) return;

  const delayAmount = Number(delayControl.value);
  const reverbAmount = Number(reverbControl.value);
  delaySend.gain.setTargetAtTime(delayAmount, audioContext.currentTime, 0.02);
  reverbSend.gain.setTargetAtTime(reverbAmount, audioContext.currentTime, 0.02);
}

function createReverbBuffer(context, duration, decay) {
  const sampleRate = context.sampleRate;
  const length = sampleRate * duration;
  const impulse = context.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / length) ** decay;
    }
  }

  return impulse;
}

function syncThemeToggle() {
  const isDark = document.documentElement.dataset.theme === "dark";
  themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
  themeToggle.setAttribute("aria-pressed", String(isDark));
}
