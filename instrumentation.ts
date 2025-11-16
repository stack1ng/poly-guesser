export async function register() {
	console.log("registering instrumentation");
	if (
		process.env.NODE_ENV === "development" &&
		process.env.NEXT_RUNTIME === "nodejs"
	) {
		// Improve stack traces in dev
		Error.stackTraceLimit = 100;
		process.on("unhandledRejection", (reason) => {
			console.error(
				"unhandledRejection:",
				reason instanceof Error ? reason.stack ?? reason : reason
			);
		});
		process.on("uncaughtException", (err) => {
			console.error("uncaughtException:", err.stack ?? err);
		});
		const proxyUrl = "http://localhost:8888";
		try {
			await fetch(proxyUrl);
		} catch {
			console.error("MITM proxy not running");
			throw new Error("MITM proxy not running");
		}

		const undici = await import("undici");
		const proxyAgent = new undici.ProxyAgent({
			uri: proxyUrl,
			requestTls: { rejectUnauthorized: false },
			proxyTls: { rejectUnauthorized: false },
		});
		undici.setGlobalDispatcher(proxyAgent);

		console.log(`Global proxy enabled via ${proxyUrl}`);
	}
}
