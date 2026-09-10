import { Counter as _Counter, Icon as _Icon } from "@sdk/ui";
import type { FC } from "react";
import faviconUrl from "./assets/img/react.svg";

export const Counter = _Counter as unknown as FC<{
	initial?: number;
	count?: number;
	onchange?: (count: number) => void;
}>;

export const Icon = _Icon as unknown as FC<{
	route: string;
	size?: number;
	color?: string;
	class?: string;
}>;

export { faviconUrl };
export default faviconUrl;
