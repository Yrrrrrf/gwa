import { Counter as SvelteCounter, Icon as SvelteIcon } from "@sdk/ui";
import faviconUrl from "./assets/img/vue.svg";
import { toVue } from "./host.svelte.ts";

export { Svelte, toVue } from "./host.svelte.ts";
export const Counter = toVue(SvelteCounter);
export const Icon = toVue(SvelteIcon);
export { faviconUrl };
export default faviconUrl;
