export function tilt(node: HTMLElement) {
	let raf = 0;

	function onMove(e: MouseEvent) {
		cancelAnimationFrame(raf);
		raf = requestAnimationFrame(() => {
			const rect = node.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;
			const cx = rect.width / 2;
			const cy = rect.height / 2;
			const rx = ((y - cy) / cy) * -9;
			const ry = ((x - cx) / cx) * 9;
			node.style.transform =
				`perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px) scale(1.02)`;
			node.style.transition = "transform 0.08s ease-out";
		});
	}

	function onLeave() {
		cancelAnimationFrame(raf);
		node.style.transition = "transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)";
		node.style.transform =
			"perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px) scale(1)";
	}

	node.addEventListener("mousemove", onMove);
	node.addEventListener("mouseleave", onLeave);
	return {
		destroy() {
			node.removeEventListener("mousemove", onMove);
			node.removeEventListener("mouseleave", onLeave);
		},
	};
}
