// Two original chiptune loops, synthesized live with WebAudio (no audio files).
// "chill" plays normally; "turbo" kicks in with the Konami code.
import { audioCtx } from "./sfx";

export type Track = "chill" | "turbo";

type Note = [step: number, note: string, len: number];

interface Song {
	bpm: number;
	volume: number;
	/** One chord per bar, as note names; the first is the bass root. */
	chords: string[][];
	lead: Note[];
	/** Play the lead only on every Nth pass through the loop. */
	leadEvery: number;
	leadWave: OscillatorType;
	/** Which 16th steps (0-15) get each drum. */
	kick: number[];
	snare: number[];
	hat: number[];
	bass: (bar: string[], step: number) => [string, number] | null;
	arp: (bar: string[], step: number) => string | null;
	arpWave: OscillatorType;
	cutoff: number;
}

const SONGS: Record<Track, Song> = {
	chill: {
		bpm: 84,
		volume: 0.16,
		// Fmaj7 · Em7 · Dm7 · Cmaj7
		chords: [
			["F2", "A3", "C4", "E4", "A4"],
			["E2", "G3", "B3", "D4", "G4"],
			["D2", "F3", "A3", "C4", "F4"],
			["C2", "E3", "G3", "B3", "E4"],
		],
		lead: [
			[0, "A4", 6], [6, "G4", 2], [8, "E4", 4], [12, "C5", 4],
			[16, "B4", 6], [22, "A4", 2], [24, "G4", 8],
			[32, "F4", 4], [36, "A4", 4], [40, "C5", 6], [46, "D5", 2],
			[48, "E5", 8], [56, "D5", 4], [60, "B4", 4],
		],
		leadEvery: 2,
		leadWave: "triangle",
		kick: [0, 10],
		snare: [8],
		hat: [2, 6, 10, 14],
		bass: (bar, step) => (step === 0 ? [bar[0], 6] : step === 7 ? [bar[0], 3] : step === 10 ? [bar[0], 4] : null),
		arp: (bar, step) => (step % 2 === 0 ? bar[1 + ([0, 1, 2, 3, 2, 1, 3, 2][step / 2] % 4)] : null),
		arpWave: "triangle",
		cutoff: 1400,
	},
	turbo: {
		bpm: 168,
		volume: 0.13,
		// Am · F · C · G
		chords: [
			["A2", "A4", "C5", "E5"],
			["F2", "F4", "A4", "C5"],
			["C3", "C5", "E5", "G5"],
			["G2", "G4", "B4", "D5"],
		],
		lead: [
			[0, "A5", 2], [2, "C6", 2], [4, "E6", 2], [6, "A6", 4], [10, "G6", 2], [12, "E6", 4],
			[16, "F6", 2], [18, "E6", 2], [20, "C6", 2], [22, "A5", 4], [26, "C6", 2], [28, "F6", 4],
			[32, "G6", 2], [34, "E6", 2], [36, "C6", 2], [38, "E6", 2], [40, "G6", 4], [44, "C7", 4],
			[48, "B6", 2], [50, "A6", 2], [52, "G6", 2], [54, "D6", 2], [56, "B5", 2], [58, "D6", 2], [60, "G6", 2], [62, "B6", 2],
		],
		leadEvery: 1,
		leadWave: "square",
		kick: [0, 4, 8, 12],
		snare: [4, 12],
		hat: [2, 6, 10, 14, 15],
		// Octave-pumping 8th-note bass.
		bass: (bar, step) => (step % 2 === 0 ? [step % 4 === 0 ? bar[0] : up(bar[0], 12), 1] : null),
		arp: (bar, step) => bar[1 + (step % 3)],
		arpWave: "square",
		cutoff: 5200,
	},
};

const NAMES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midi(note: string) {
	const m = note.match(/^([A-G])(#?)(\d)$/)!;
	return NAMES[m[1]] + (m[2] ? 1 : 0) + (Number(m[3]) + 1) * 12;
}
function up(note: string, semis: number) {
	const n = midi(note) + semis;
	const name = Object.entries(NAMES).find(([, v]) => v === n % 12)?.[0] ?? "C";
	return `${name}${Math.floor(n / 12) - 1}`;
}
const hz = (note: string) => 440 * 2 ** ((midi(note) - 69) / 12);

let master: GainNode | undefined;
let filter: BiquadFilterNode | undefined;
let noise: AudioBuffer | undefined;
let timer: ReturnType<typeof setInterval> | undefined;
let song: Song = SONGS.chill;
let step = 0;
let nextTime = 0;
let wanted: { on: boolean; track: Track } = { on: false, track: "chill" };

function graph() {
	const ctx = audioCtx();
	if (!master) {
		filter = ctx.createBiquadFilter();
		filter.type = "lowpass";
		master = ctx.createGain();
		master.gain.value = 0;
		filter.connect(master).connect(ctx.destination);
		noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
		const data = noise.getChannelData(0);
		for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
	}
	return { ctx, master: master!, filter: filter! };
}

function tone(t: number, freq: number, dur: number, wave: OscillatorType, gain: number, vibrato = false) {
	const { ctx, filter } = graph();
	const osc = ctx.createOscillator();
	const g = ctx.createGain();
	osc.type = wave;
	osc.frequency.value = freq;
	if (vibrato && dur > 0.2) {
		const lfo = ctx.createOscillator();
		const depth = ctx.createGain();
		lfo.frequency.value = 6;
		depth.gain.setValueAtTime(0, t);
		depth.gain.linearRampToValueAtTime(freq * 0.012, t + dur);
		lfo.connect(depth).connect(osc.frequency);
		lfo.start(t);
		lfo.stop(t + dur);
	}
	g.gain.setValueAtTime(0.0001, t);
	g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
	g.gain.setValueAtTime(gain, t + dur * 0.7);
	g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
	osc.connect(g).connect(filter);
	osc.start(t);
	osc.stop(t + dur + 0.02);
}

function kick(t: number, gain: number) {
	const { ctx, filter } = graph();
	const osc = ctx.createOscillator();
	const g = ctx.createGain();
	osc.frequency.setValueAtTime(150, t);
	osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
	g.gain.setValueAtTime(gain, t);
	g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
	osc.connect(g).connect(filter);
	osc.start(t);
	osc.stop(t + 0.2);
}

function hiss(t: number, dur: number, gain: number, freq: number, type: BiquadFilterType) {
	const { ctx, filter } = graph();
	const src = ctx.createBufferSource();
	src.buffer = noise!;
	const bp = ctx.createBiquadFilter();
	bp.type = type;
	bp.frequency.value = freq;
	const g = ctx.createGain();
	g.gain.setValueAtTime(gain, t);
	g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
	src.connect(bp).connect(g).connect(filter);
	src.start(t);
	src.stop(t + dur);
}

function schedule(t: number, s: number) {
	const loop = song.chords.length * 16;
	const bar = song.chords[Math.floor(s / 16) % song.chords.length];
	const inBar = s % 16;
	const sixteenth = 60 / song.bpm / 4;
	const turbo = song === SONGS.turbo;

	if (song.kick.includes(inBar)) kick(t, turbo ? 0.9 : 0.55);
	if (song.snare.includes(inBar)) hiss(t, turbo ? 0.14 : 0.2, turbo ? 0.5 : 0.18, turbo ? 1800 : 1200, "bandpass");
	if (song.hat.includes(inBar)) hiss(t, 0.04, turbo ? 0.18 : 0.08, 8000, "highpass");

	const b = song.bass(bar, inBar);
	if (b) tone(t, hz(b[0]), b[1] * sixteenth, turbo ? "sawtooth" : "triangle", turbo ? 0.22 : 0.35);

	const a = song.arp(bar, inBar);
	if (a) tone(t, hz(a), sixteenth * (turbo ? 0.9 : 1.8), song.arpWave, turbo ? 0.05 : 0.12);

	const pass = Math.floor(s / loop);
	if (pass % song.leadEvery === song.leadEvery - 1 || song.leadEvery === 1) {
		for (const [at, note, len] of song.lead) {
			if (at === s % loop) tone(t, hz(note), len * sixteenth, song.leadWave, turbo ? 0.09 : 0.14, true);
		}
	}
}

function tick() {
	const { ctx } = graph();
	while (nextTime < ctx.currentTime + 0.15) {
		schedule(nextTime, step);
		nextTime += 60 / song.bpm / 4;
		step++;
	}
}

function apply() {
	const playing = wanted.on && document.visibilityState === "visible";
	if (!playing) {
		if (!master) return;
		const { ctx, master: m } = graph();
		m.gain.cancelScheduledValues(ctx.currentTime);
		m.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
		clearInterval(timer);
		timer = undefined;
		return;
	}
	const { ctx, master: m, filter: f } = graph();
	if (ctx.state === "suspended") void ctx.resume();
	const next = SONGS[wanted.track];
	if (next !== song || !timer) {
		song = next;
		step = 0;
		nextTime = ctx.currentTime + 0.08;
	}
	f.frequency.setTargetAtTime(song.cutoff, ctx.currentTime, 0.05);
	m.gain.cancelScheduledValues(ctx.currentTime);
	m.gain.setTargetAtTime(song.volume, ctx.currentTime, 0.1);
	timer ??= setInterval(tick, 25);
}

/** Start, stop, or switch the background music. Safe to call repeatedly. */
export function setMusic(on: boolean, track: Track) {
	wanted = { on, track };
	apply();
}

if (typeof document !== "undefined") {
	document.addEventListener("visibilitychange", apply);
	// Browsers block audio until the first interaction; resume then if sound was left on.
	const unlock = () => {
		if (wanted.on) apply();
		window.removeEventListener("pointerdown", unlock);
		window.removeEventListener("keydown", unlock);
	};
	window.addEventListener("pointerdown", unlock);
	window.addEventListener("keydown", unlock);
}
