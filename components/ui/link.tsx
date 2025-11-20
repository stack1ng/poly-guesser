"use client";

import { cn } from "@/lib/utils";
import NextLink, { useLinkStatus } from "next/link";
import { ComponentProps, memo, ReactNode } from "react";

export function Link({
	href,
	ref,
	children,
	...props
}: {
	href?: string;
	ref?: React.RefObject<HTMLAnchorElement | null>;
} & Omit<ComponentProps<typeof NextLink>, "href">) {
	const content = href ? <LoaderWrapper>{children}</LoaderWrapper> : children;
	const className = cn(props.className);
	return href ? (
		<NextLink {...props} href={href} className={className} ref={ref}>
			{content}
		</NextLink>
	) : (
		<span {...props} className={className}>
			{content}
		</span>
	);
}

const LoaderWrapper = memo(function LoaderWrapper({
	children,
}: {
	children: ReactNode;
}) {
	const { pending } = useLinkStatus();
	return (
		<span
			className={cn("[animation-delay:-0.5s]", {
				"inline-block animate-bounce": pending,
			})}
		>
			{/* <LoaderCircle className="animate-spin max-w-8 aspect-square" /> */}
			{children}
		</span>
	);
});
