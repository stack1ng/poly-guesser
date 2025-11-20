import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Create Game",
	description: "Start a new PolyGuessr game.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
