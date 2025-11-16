import { cn } from "@/lib/utils";
import { LoaderCircle } from "lucide-react";

export function LoadingSpinner({
	className,
	...props
}: { className?: string } & React.ComponentProps<typeof LoaderCircle>) {
	return <LoaderCircle className={cn("animate-spin", className)} {...props} />;
}
