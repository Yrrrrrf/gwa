import { faviconUrl } from "#lib";
import { useState } from "react";
import pkg from "../deno.json" with { type: "json" };

export default function App() {
	const [count, setCount] = useState(0);

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
				<div className="card bg-base-200 shadow-md p-6 flex flex-col items-center gap-4">
					<span className="text-4xl font-mono font-bold">{count}</span>
					<div className="flex gap-2">
						<button
							type="button"
							className="btn btn-primary btn-sm"
							onClick={() => setCount((c) => c + 1)}
						>
							Increment
						</button>
						<button
							type="button"
							className="btn btn-ghost btn-sm"
							onClick={() => setCount(0)}
						>
							Reset
						</button>
					</div>
				</div>
			</div>
		</>
	);
}
