import { useCallback, useEffect, useState } from "react";

export type Vote = 1 | -1;
export type Tally = { up: number; down: number };

function voterId() {
	const key = "bb:voter";
	try {
		let id = localStorage.getItem(key);
		if (!id) {
			id = crypto.randomUUID();
			localStorage.setItem(key, id);
		}
		return id;
	} catch {
		// No storage (private mode etc.): votes still work for this page view.
		return crypto.randomUUID();
	}
}

export function useVotes() {
	const [voter] = useState(voterId);
	const [tallies, setTallies] = useState<Record<string, Tally>>({});
	const [mine, setMine] = useState<Record<string, Vote>>({});
	const [online, setOnline] = useState(true);

	useEffect(() => {
		let cancelled = false;
		fetch(`/api/votes?voter=${voter}`)
			.then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
			.then((data: { tallies: Record<string, Tally>; mine: Record<string, Vote> }) => {
				if (cancelled) return;
				setTallies(data.tallies);
				setMine(data.mine);
			})
			.catch(() => !cancelled && setOnline(false));
		return () => {
			cancelled = true;
		};
	}, [voter]);

	const cast = useCallback(
		async (recipeId: string, vote: Vote) => {
			const prev = mine[recipeId];
			const next = prev === vote ? 0 : vote; // same button again = take it back
			const prevTally = tallies[recipeId] ?? { up: 0, down: 0 };

			// Optimistic update.
			const optimistic = { ...prevTally };
			if (prev === 1) optimistic.up--;
			if (prev === -1) optimistic.down--;
			if (next === 1) optimistic.up++;
			if (next === -1) optimistic.down++;
			setTallies((t) => ({ ...t, [recipeId]: optimistic }));
			setMine((m) => {
				const copy = { ...m };
				if (next === 0) delete copy[recipeId];
				else copy[recipeId] = next;
				return copy;
			});

			try {
				const res = await fetch(`/api/votes/${recipeId}`, {
					method: "PUT",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ voter, vote: next }),
				});
				if (!res.ok) throw new Error(String(res.status));
				const data: { tally: Tally } = await res.json();
				setTallies((t) => ({ ...t, [recipeId]: data.tally }));
				setOnline(true);
			} catch {
				setTallies((t) => ({ ...t, [recipeId]: prevTally }));
				setMine((m) => {
					const copy = { ...m };
					if (prev) copy[recipeId] = prev;
					else delete copy[recipeId];
					return copy;
				});
				setOnline(false);
			}
			return next;
		},
		[mine, tallies, voter],
	);

	return { tallies, mine, cast, online };
}
