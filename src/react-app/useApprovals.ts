import { useCallback, useEffect, useState } from "react";

export type Approval = { at: number; note: string | null };
export type LoginResult = "ok" | "bad-token" | "not-configured" | "offline";

const TOKEN_KEY = "bb:admin-token";

function storedToken() {
	try {
		return localStorage.getItem(TOKEN_KEY);
	} catch {
		return null;
	}
}

/** "Scherger tested & approved" flags (public) plus admin login for changing them. */
export function useApprovals() {
	const [approvals, setApprovals] = useState<Record<string, Approval>>({});
	const [token, setToken] = useState<string | null>(storedToken);

	useEffect(() => {
		let cancelled = false;
		fetch("/api/approvals")
			.then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
			.then((data: { approvals: Record<string, Approval> }) => !cancelled && setApprovals(data.approvals))
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, []);

	const logout = useCallback(() => {
		setToken(null);
		try {
			localStorage.removeItem(TOKEN_KEY);
		} catch {
			/* ignore */
		}
	}, []);

	const login = useCallback(async (candidate: string): Promise<LoginResult> => {
		try {
			const res = await fetch("/api/admin", { headers: { authorization: `Bearer ${candidate}` } });
			if (res.status === 503) return "not-configured";
			if (!res.ok) return "bad-token";
		} catch {
			return "offline";
		}
		setToken(candidate);
		try {
			localStorage.setItem(TOKEN_KEY, candidate);
		} catch {
			/* still logged in for this visit */
		}
		return "ok";
	}, []);

	const setApproval = useCallback(
		async (recipeId: string, approved: boolean, note: string) => {
			if (!token) return false;
			try {
				const res = await fetch(`/api/approvals/${recipeId}`, {
					method: "PUT",
					headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
					body: JSON.stringify({ approved, note }),
				});
				if (res.status === 401) {
					logout();
					return false;
				}
				if (!res.ok) return false;
				const data: { approval: Approval | null } = await res.json();
				setApprovals((all) => {
					const next = { ...all };
					if (data.approval) next[recipeId] = data.approval;
					else delete next[recipeId];
					return next;
				});
				return true;
			} catch {
				return false;
			}
		},
		[token, logout],
	);

	return { approvals, isAdmin: token !== null, login, logout, setApproval };
}
