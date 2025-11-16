import { initTRPC } from "@trpc/server";
import SuperJSON from "superjson";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
	transformer: SuperJSON,
});

export const router = t.router;

/**
 * Unprotected procedure
 */
export const publicProcedure = t.procedure;

// TODO: implement this with betterauth once its time for auth
// /**
//  * Protected procedure
//  */
export const protectedProcedure = t.procedure.use(function isAuthed(opts) {
	// if (!opts.ctx.session?.user?.email) {
	// 	throw new TRPCError({
	// 		code: "UNAUTHORIZED",
	// 	});
	// }
	return opts.next({
		ctx: {
			// Infers the `session` as non-nullable
			// session: opts.ctx.session,
		},
	});
});
