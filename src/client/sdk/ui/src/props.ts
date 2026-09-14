export interface CounterProps {
	initial?: number;
	count?: number;
	onchange?: (count: number) => void;
}

export interface IconProps {
	route?: string;
	name?: string;
	size?: number;
	color?: string;
	class?: string;
	onselect?: (route: string) => void;
}

export interface SdkBadgeProps {
	label?: string;
	status?: string;
}

export interface ShowcaseProps {
	title?: string;
	backHref?: string;
}
