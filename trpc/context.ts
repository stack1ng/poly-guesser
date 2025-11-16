export const createContext = async () => ({});

export type Context = Awaited<ReturnType<typeof createContext>>;
