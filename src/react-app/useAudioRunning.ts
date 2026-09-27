import { useSyncExternalStore } from "react";
import { audioRunning, onAudioStateChange } from "./sfx";

/** True once the browser has actually let audio start (it needs a click first). */
export function useAudioRunning() {
	return useSyncExternalStore(onAudioStateChange, audioRunning, () => false);
}
