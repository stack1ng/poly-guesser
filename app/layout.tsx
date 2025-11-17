import type { Metadata } from "next";
import { Geist_Mono, Limelight } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { TRPCReactProvider } from "@/trpc/client";

const limelight = Limelight({
	variable: "--font-limelight",
	weight: "400",
	subsets: ["latin"],
	display: "swap",
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: {
		default: "PolyGuessr",
		template: "%s | PolyGuessr",
	},
	description:
		"Go head to head against your friends to see who is the best at predicting the future.",
	icons: {
		icon: "/favicon.ico",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${limelight.variable} ${geistMono.variable} antialiased font-mono`}
			>
				<Toaster />
				<NuqsAdapter>
					<TRPCReactProvider>{children}</TRPCReactProvider>
				</NuqsAdapter>
			</body>
		</html>
	);
}
