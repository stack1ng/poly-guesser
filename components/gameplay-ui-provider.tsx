import { createContext, useState } from "react";

const GameplayUIContext = createContext<{
	TopBar: Element | null;
	BottomBar: Element | null;
}>({
	TopBar: null,
	BottomBar: null,
});

export function GameplayUIProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [topBar, setTopBar] = useState<Element | null>(null);
	const [bottomBar, setBottomBar] = useState<Element | null>(null);

	return (
		<GameplayUIContext.Provider
			value={{ TopBar: topBar, BottomBar: bottomBar }}
		>
			<div className="size-screen flex flex-col">
				<div ref={setTopBar} />
				<div className="flex-1">{children}</div>
				<div ref={setBottomBar} />
			</div>
		</GameplayUIContext.Provider>
	);
}
