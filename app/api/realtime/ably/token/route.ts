import { ablyRealtime } from "@/lib/realtime/client";
import { NextResponse } from "next/server";

export async function GET() {
	const tokenRequest = await ablyRealtime.auth.createTokenRequest({
		timestamp: Date.now(),
		nonce: crypto.randomUUID(),
		ttl: 60 * 60 * 1000, // 1 hour
		capability: JSON.stringify({
			"*": ["subscribe", "history"],
		}),
	});

	return NextResponse.json(tokenRequest);
}
