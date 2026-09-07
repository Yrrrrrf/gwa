import { Counter as SvelteCounter, Icon as SvelteIcon } from "@sdk/ui";
import faviconUrl from "./assets/img/react.svg";
import { toReact } from "./host.svelte.ts";

export { Svelte, toReact } from "./host.svelte.ts";
export const Counter = toReact(SvelteCounter);
export const Icon = toReact(SvelteIcon);
export { faviconUrl };
export default faviconUrl;
