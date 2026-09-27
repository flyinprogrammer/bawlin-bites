import { useEffect, useRef, useState } from "react";
import type { LoginResult } from "../useApprovals";

const MESSAGES: Record<Exclude<LoginResult, "ok">, string> = {
	"bad-token": "That's not the token. Nice try, kaiju.",
	"not-configured": "No admin token is set up on the server yet (ADMIN_TOKEN).",
	offline: "Couldn't reach the server. Try again?",
};

/** Tiny login for the family: paste the admin token to mark recipes tested & approved. */
export function AdminLogin({ onLogin, onClose }: { onLogin: (token: string) => Promise<LoginResult>; onClose: () => void }) {
	const ref = useRef<HTMLDialogElement>(null);
	const [token, setToken] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		const dialog = ref.current!;
		if (!dialog.open) dialog.showModal();
		return () => dialog.close();
	}, []);

	return (
		<dialog
			ref={ref}
			className="admin-login"
			aria-labelledby="admin-title"
			onCancel={(e) => {
				e.preventDefault();
				onClose();
			}}
		>
			<form
				onSubmit={async (e) => {
					e.preventDefault();
					setBusy(true);
					const result = await onLogin(token.trim());
					setBusy(false);
					if (result === "ok") onClose();
					else setError(MESSAGES[result]);
				}}
			>
				<h2 id="admin-title">🔑 SCHERGER HQ</h2>
				<p>Paste the admin token to mark recipes as Scherger tested &amp; approved.</p>
				<input
					type="password"
					autoComplete="current-password"
					value={token}
					onChange={(e) => setToken(e.target.value)}
					aria-label="Admin token"
					required
				/>
				{error && <p className="admin-error">{error}</p>}
				<div className="admin-login-actions">
					<button type="button" onClick={onClose}>
						CANCEL
					</button>
					<button type="submit" className="approve-btn" disabled={busy || !token.trim()}>
						{busy ? "CHECKING…" : "LOG IN"}
					</button>
				</div>
			</form>
		</dialog>
	);
}
