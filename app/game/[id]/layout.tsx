import type { Metadata } from "next";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ id: string }>;
}): Promise<Metadata> {
	return {
		title: `PLAY NOW`,
		description:
			"Go head to head against your friends to see who is the best at predicting the future.",
	};
}
export default function Layout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className="w-screen h-screen grid place-items-center">{children}</div>
	);
}
