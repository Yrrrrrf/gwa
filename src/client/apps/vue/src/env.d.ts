/// <reference types="vite/client" />
/// <reference types="arkano/vite/client" />

declare module "*.svg" {
	const content: string;
	export default content;
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
