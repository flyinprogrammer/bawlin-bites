// Tiny square-wave blips via WebAudio. Off by default; the kaiju bunny toggles it.
// The AudioContext is only created once sound is wanted, so browsers never
// complain about audio trying to start before the visitor has interacted.
let ctx: AudioContext | undefined;
let enabled = false;
const listeners = new Set<() => void>();

try {
	enabled = localStorage.getItem("bb:sound") === "on";
} catch {
	/* storage unavailable */
}

/** Shared AudioContext for blips and music (created lazily). */
export function audioCtx() {
	if (!ctx) {
		ctx = new AudioContext();
		ctx.addEventListener("statechange", () => listeners.forEach((l) => l()));
		listeners.forEach((l) => l());
	}
	return ctx;
}

/** Browsers keep audio suspended until the first click/keypress. */
export function audioRunning() {
	return ctx?.state === "running";
}

export function onAudioStateChange(cb: () => void) {
	listeners.add(cb);
	return () => listeners.delete(cb);
}

export function soundOn() {
	return enabled;
}

export function setSound(on: boolean) {
	enabled = on;
	try {
		localStorage.setItem("bb:sound", on ? "on" : "off");
	} catch {
		/* ignore */
	}
	if (on) blip("coin");
}

const SONGS: Record<string, [number, number][]> = {
	// [frequency Hz, duration s]
	select: [[660, 0.05]],
	coin: [
		[988, 0.06],
		[1319, 0.18],
	],
	up: [
		[523, 0.06],
		[659, 0.06],
		[784, 0.06],
		[1047, 0.14],
	],
	down: [
		[392, 0.08],
		[311, 0.08],
		[247, 0.18],
	],
	close: [
		[440, 0.04],
		[330, 0.06],
	],
	secret: [
		[523, 0.08],
		[659, 0.08],
		[784, 0.08],
		[1047, 0.08],
		[784, 0.08],
		[1047, 0.24],
	],
};

export function blip(name: keyof typeof SONGS) {
	if (!enabled) return;
	try {
		const ctx = audioCtx();
		let t = ctx.currentTime;
		for (const [freq, dur] of SONGS[name]) {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "square";
			osc.frequency.value = freq;
			gain.gain.setValueAtTime(0.06, t);
			gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
			osc.connect(gain).connect(ctx.destination);
			osc.start(t);
			osc.stop(t + dur);
			t += dur;
		}
	} catch {
		/* no audio, no problem */
	}
}
