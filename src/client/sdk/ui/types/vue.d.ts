import type { DefineComponent } from "vue";
import type {
	CounterProps,
	IconProps,
	SdkBadgeProps,
	ShowcaseProps,
} from "../src/props.ts";

type Bridge<P> = DefineComponent<P & { as?: "span" | "div" | "section" }>;

// Type projection of the @sdk/ui barrel transformed by arkano({ target: "vue" }).
export declare const Counter: Bridge<
	CounterProps & {
		"onUpdate:count"?: (count: number) => void;
	}
>;
export declare const Icon: Bridge<IconProps>;
export declare const SdkBadge: Bridge<SdkBadgeProps>;
export declare const Showcase: Bridge<ShowcaseProps>;
