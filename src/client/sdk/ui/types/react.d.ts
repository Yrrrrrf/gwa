import type { ComponentType, Ref } from "react";
import type {
	CounterProps,
	IconProps,
	SdkBadgeProps,
	ShowcaseProps,
} from "../src/props.ts";

type Bridge<P> = ComponentType<
	P & {
		as?: "span" | "div" | "section";
		className?: string;
		ref?: Ref<HTMLElement>;
	}
>;

// Type projection of the @sdk/ui barrel transformed by arkano({ target: "react" }).
export declare const Counter: Bridge<
	CounterProps & {
		onCountChange?: (count: number) => void;
		onChange?: (count: number) => void;
	}
>;
export declare const Icon: Bridge<IconProps>;
export declare const SdkBadge: Bridge<SdkBadgeProps>;
export declare const Showcase: Bridge<ShowcaseProps>;
