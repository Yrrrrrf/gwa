import { Counter, Icon, Svelte, faviconUrl } from "#lib";
import pkg from "../deno.json" with { type: "json" };

export default function App() {
	return (
		<>
			<title>{pkg.name}</title>
			<link rel="icon" href={faviconUrl} />

			<div className="min-h-screen bg-base-100 flex flex-col items-center justify-center p-8 text-center gap-6">
				<div className="flex items-center gap-3">
					<img src={faviconUrl} alt="React logo" className="w-16 h-16" />
					<h1 className="text-3xl font-bold">{pkg.name}</h1>
				</div>
				<p className="text-sm opacity-70 max-w-md">{pkg.description}</p>
				<div className="flex items-center gap-2">
					<Svelte
						this={Icon}
						route="/dashboard"
						size={24}
						color="currentColor"
					/>
					<span className="text-sm opacity-60">Universal Svelte Component</span>
				</div>
				<Svelte this={Counter} />
			</div>
		</>
	);
}
