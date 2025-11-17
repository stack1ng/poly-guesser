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
	return (
		<div className="w-screen h-screen grid place-items-center">{children}</div>
	);
}
