import {
	BaseRealtime,
	FetchRequest,
	WebSocketTransport,
	Rest,
} from "ably/modular";
import Objects from "ably/objects";
import ModelsClient from "@ably-labs/models";

export const ablyRealtime =
	typeof window === "undefined"
		? new BaseRealtime({
				key: process.env.ABLY_API_KEY!,
				plugins: {
					WebSocketTransport,
					FetchRequest,
					Objects,
					Rest,
				},
		  })
		: new BaseRealtime({
				authUrl: "/api/realtime/ably/token",
				plugins: {
					WebSocketTransport,
					FetchRequest,
					Objects,
					Rest,
				},
		  });

export const ablyModels = new ModelsClient({
	ably: ablyRealtime,
	logLevel: process.env.NODE_ENV === "development" ? "debug" : undefined,
});
