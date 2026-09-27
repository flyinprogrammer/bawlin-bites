// Secrets aren't in wrangler.jsonc, so `wrangler types` doesn't know about them.
interface Env {
	/** Bearer token for marking recipes "Scherger tested & approved". Optional: approvals are read-only without it. */
	ADMIN_TOKEN?: string;
}
