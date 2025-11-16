import seedrandom from "seedrandom";

export function shuffleWithSeed<T>(array: T[], seed: string): T[] {
	const rng = seedrandom(seed);
	const result = [...array]; // copy to avoid mutating original
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}
