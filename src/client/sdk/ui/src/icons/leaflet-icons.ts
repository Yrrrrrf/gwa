import * as LucideStatic from "lucide-static";

/**
 * Generates a Leaflet-compatible marker icon as a data-URI.
 * The icon is a colored pin with a white circle containing a Lucide icon.
 */
export function makeMarkerIcon(
	iconName: string,
	color: string,
	opts: { size?: number } = {},
) {
	const svg = makeMarkerSvg(iconName, color, opts);
	return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Generates the raw SVG string for a Leaflet marker.
 */
export function makeMarkerSvg(
	iconName: string,
	color: string,
	opts: { size?: number } = {},
) {
	const size = opts.size || 40;
	const height = (size * 50) / 40; // Maintain 40:50 aspect ratio

	// Extract inner content of the Lucide SVG
	const staticIcon = (LucideStatic as any)[iconName] || LucideStatic.HelpCircle;
	const contentMatch = staticIcon.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
	const iconContent = contentMatch ? contentMatch[1] : "";

	return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${height}" viewBox="0 0 40 50">
      <filter id="s"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.35"/></filter>
      <path filter="url(#s)" d="M20 3C11.2 3 4 10.2 4 19c0 12 16 28 16 28S36 31 36 19C36 10.2 28.8 3 20 3z" fill="${color}"/>
      <circle cx="20" cy="19" r="10" fill="white" opacity="0.95"/>
      <g transform="translate(13, 12) scale(0.58)" stroke="${color}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
        ${iconContent}
      </g>
    </svg>`.trim();
}
