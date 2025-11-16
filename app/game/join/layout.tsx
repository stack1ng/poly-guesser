import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Join Game",
	description: "Enter a game ID to join a PolyGuessr game.",
};

export default function Layout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return <>{children}</>;
}
