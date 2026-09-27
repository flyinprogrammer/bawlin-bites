import { defineConfig } from "vitest/config";

// Plain unit tests for the shared recipe math; no Cloudflare/Vite app plugins needed.
export default defineConfig({
	test: {
		include: ["src/**/*.test.ts"],
	},
});
