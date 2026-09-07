/// <reference types="vite/client" />
/// <reference types="svelte" />

declare module "*.svg" {
	const content: string;
	export default content;
}

declare module "*.svelte" {
	import type { Component } from "svelte";
	const component: Component<Record<string, unknown>, Record<string, unknown>>;
	export default component;
}

declare module "*.vue" {
	import type { DefineComponent } from "vue";
	const component: DefineComponent<
		Record<string, unknown>,
		Record<string, unknown>,
		unknown
	>;
	export default component;
}
