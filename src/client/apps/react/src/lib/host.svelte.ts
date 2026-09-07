import React, { useEffect, useRef } from "react";
import { type Component, type ComponentProps, mount, unmount } from "svelte";

export type SvelteHostProps<
	C extends Component<Record<string, unknown>, Record<string, unknown>>,
> = {
	/** The Svelte 5 component to mount */
	this: C;
	/** HTML container tag. Defaults to 'span' with display: contents */
	as?: "span" | "div" | "section";
	/** Optional class name applied to the host container */
	className?: string;
} & (ComponentProps<C> extends Record<string, unknown>
	? ComponentProps<C>
	: Record<string, unknown>);

export function Svelte<
	C extends Component<Record<string, unknown>, Record<string, unknown>>,
>({
	this: SvelteComponent,
	as: Tag = "span",
	className,
	...props
}: SvelteHostProps<C>) {
	const containerRef = useRef<HTMLElement>(null);
	const reactivePropsRef = useRef<Record<string, unknown> | null>(null);

	// 1. Lifecycle: Mount on target and unmount on teardown
	useEffect(() => {
		if (!containerRef.current) return;

		// Create deep reactive state proxy recognized by Svelte 5
		const reactiveProps = $state({ ...props });
		reactivePropsRef.current = reactiveProps;

		const instance = mount(SvelteComponent, {
			target: containerRef.current,
			props: reactiveProps,
		});

		return () => {
			unmount(instance);
			reactivePropsRef.current = null;
		};
	}, [SvelteComponent]);

	// 2. Reactivity: Forward React prop changes into Svelte's $state proxy
	useEffect(() => {
		if (reactivePropsRef.current) {
			Object.assign(reactivePropsRef.current, props);
		}
	});

	return React.createElement(Tag, {
		ref: containerRef,
		className,
		style: { display: "contents" },
	});
}

export type ToReactOptions = {
	/** HTML container tag. Defaults to 'span' with display: contents */
	as?: "span" | "div" | "section";
	/** Optional class name applied to the host container */
	className?: string;
};

/**
 * Higher-order adapter that wraps a Svelte 5 component into a native React component.
 * Allows direct JSX invocation (<Component ... />) without manually writing <Svelte this={Component} />.
 */
export function toReact<
	C extends Component<Record<string, unknown>, Record<string, unknown>>,
>(SvelteComponent: C, options?: ToReactOptions) {
	type ComponentP =
		ComponentProps<C> extends Record<string, unknown>
			? ComponentProps<C>
			: Record<string, unknown>;

	type Props = ComponentP & {
		as?: "span" | "div" | "section";
		className?: string;
	};

	const ReactSvelteBridge = ({ as, className, ...props }: Props) => {
		return React.createElement(Svelte, {
			this: SvelteComponent,
			as: as ?? options?.as ?? "span",
			className: className ?? options?.className,
			...(props as Record<string, unknown>),
		});
	};

	const name = (SvelteComponent as { name?: string }).name || "Component";
	ReactSvelteBridge.displayName = `toReact(${name})`;

	return ReactSvelteBridge;
}
