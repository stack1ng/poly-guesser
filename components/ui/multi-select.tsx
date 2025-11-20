import {
	Dispatch,
	ReactNode,
	SetStateAction,
	UIEvent,
	useMemo,
	useState,
} from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { TypeWrittenText } from "../TypeWrittenText";
import { LoadingSpinner } from "./LoadingSpinner";
import {
	DefaultError,
	InfiniteData,
	useInfiniteQuery,
	UseInfiniteQueryOptions,
} from "@tanstack/react-query";

export function MultiSelect<TItem, TError = DefaultError, TPageParam = number>({
	getLabel,
	value: selection,
	compare,
	onChange: setSelection,
	placeholder,
	search,
	setSearch,
	...queryOptions
}: {
	getLabel: (value: TItem) => string;
	compare: (a: TItem, b: TItem) => boolean;

	value: TItem[];
	onChange: Dispatch<SetStateAction<TItem[]>>;
	placeholder: string;

	search: string;
	setSearch: Dispatch<SetStateAction<string>>;
} & Omit<
	UseInfiniteQueryOptions<
		TItem[],
		TError,
		InfiniteData<TItem[]>,
		string[],
		TPageParam
	>,
	"queryKey"
>) {
	const [open, setOpen] = useState(false);

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useInfiniteQuery<
			TItem[],
			TError,
			InfiniteData<TItem[]>,
			string[],
			TPageParam
		>({
			...queryOptions,
			queryKey: ["multi-select", search],
		});
	const accumulatedOptions = useMemo<TItem[]>(
		() => (data?.pages ?? []).flat(),
		[data]
	);

	return (
		<Drawer open={open} onOpenChange={setOpen}>
			<DrawerTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="justify-between text-foreground w-full whitespace-normal min-h-9 h-auto!"
				>
					<span className="flex-1 min-w-0 text-left whitespace-normal wrap-break-word">
						<TypeWrittenText>
							{selection.length > 0
								? selection.map(getLabel).join(", ")
								: placeholder}
						</TypeWrittenText>
					</span>
					<ChevronsUpDown className="opacity-50" />
				</Button>
			</DrawerTrigger>
			<DrawerContent className="max-w-md mx-auto">
				<DrawerHeader>
					<DrawerTitle>Select Topics</DrawerTitle>
					<DrawerDescription>
						<TypeWrittenText>
							{selection.length > 0
								? selection.map(getLabel).join(", ")
								: placeholder}
						</TypeWrittenText>
					</DrawerDescription>
				</DrawerHeader>
				<Command className="border-y rounded-none">
					<div className="relative">
						<CommandInput
							placeholder={placeholder}
							className="h-9 pr-8 grow w-full border-b-0"
							value={search}
							onValueChange={setSearch}
						/>
						<button
							className={cn(
								"absolute right-0 top-0 bottom-0 grid place-items-center px-2 border-b hover:cursor-pointer hover:text-destructive transition-all",
								{
									"opacity-0 pointer-events-none": search.length === 0,
								}
							)}
							onClick={() => setSearch("")}
							disabled={search.length === 0}
						>
							<X className="size-4" />
						</button>
					</div>
					<Button
						variant="ghost"
						className="rounded-none"
						onClick={() => setSelection([])}
						disabled={selection.length === 0}
					>
						Clear
					</Button>
					<div className="bg-border h-px -mx-1" />

					{data ? (
						<MultiSelectOptionList
							className="h-96"
							options={accumulatedOptions}
							getLabel={getLabel}
							compare={compare}
							selection={selection}
							setSelection={setSelection}
							onEndReached={() => {
								if (hasNextPage && !isFetchingNextPage) {
									void fetchNextPage();
								}
							}}
						>
							<div
								className={cn("h-9 w-full flex justify-center items-center", {
									hidden: !isFetchingNextPage,
								})}
							>
								<LoadingSpinner />
							</div>
						</MultiSelectOptionList>
					) : (
						<div className="h-96 w-full flex justify-center items-center">
							<LoadingSpinner />
						</div>
					)}
				</Command>
				<DrawerFooter>
					<DrawerClose asChild>
						<Button>OK</Button>
					</DrawerClose>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}

function MultiSelectOptionList<T>({
	options,
	getLabel,
	compare,
	selection,
	setSelection,
	children,
	onEndReached,
	className,
}: {
	options: T[];
	getLabel: (value: T) => string;
	compare: (a: T, b: T) => boolean;
	selection: T[];
	setSelection: Dispatch<SetStateAction<T[]>>;
	children?: ReactNode;
	onEndReached?: () => void;
	className?: string;
}) {
	return (
		<CommandList
			className={className}
			onScroll={(e: UIEvent<HTMLDivElement>) => {
				const target = e.currentTarget;
				const distanceFromBottom =
					target.scrollHeight - target.scrollTop - target.clientHeight;
				if (distanceFromBottom <= 16) {
					onEndReached?.();
				}
			}}
		>
			<CommandEmpty>No options found.</CommandEmpty>
			<CommandGroup>
				{options.map((option) => {
					const label = getLabel(option);
					const isSelected = selection.some((selected) =>
						compare(selected, option)
					);
					return (
						<CommandItem
							key={label}
							value={label}
							onSelect={() =>
								isSelected
									? setSelection((prev) =>
											prev.filter((selected) => !compare(selected, option))
									  )
									: setSelection((prev) => [...prev, option])
							}
						>
							<span className="truncate">{label}</span>
							<Check
								className={cn(
									"ml-auto transition-opacity",
									isSelected ? "opacity-100" : "opacity-0"
								)}
							/>
						</CommandItem>
					);
				})}
				{children}
			</CommandGroup>
		</CommandList>
	);
}
