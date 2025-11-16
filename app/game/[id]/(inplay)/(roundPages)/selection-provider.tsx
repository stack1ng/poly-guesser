import { createContext, useCallback, useContext, useState } from "react";

const RankedSelectionContext = createContext<{
	selectedIdsRanked: string[];
	setSelectedIdsRanked: (ids: string[]) => void;
	selectId: (id: string) => void;
}>({
	selectedIdsRanked: [],
	setSelectedIdsRanked: () => {},
	selectId: () => {},
});

export function RankedSelectionProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [selectedIdsRanked, setSelectedIdsRanked] = useState<string[]>([]);

	const selectId = useCallback((id: string) => {
		setSelectedIdsRanked((prev) => {
			if (prev.includes(id)) {
				return prev.filter((existingId) => existingId !== id);
			}
			return [...prev, id];
		});
	}, []);

	return (
		<RankedSelectionContext.Provider
			value={{ selectedIdsRanked, setSelectedIdsRanked, selectId }}
		>
			{children}
		</RankedSelectionContext.Provider>
	);
}

export function useRankedSelection() {
	return useContext(RankedSelectionContext);
}
