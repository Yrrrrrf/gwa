import { mount, unmount } from "svelte";
import { defineComponent, h, onMounted, onUnmounted, ref, watch } from "vue";

export const Svelte = defineComponent({
	name: "SvelteHost",
	props: {
		this: {
			type: [Object, Function],
			required: true,
		},
		as: {
			type: String,
			default: "span",
		},
	},
	inheritAttrs: false,
	setup(props, { attrs }) {
		const containerRef = ref<HTMLElement | null>(null);
		const reactivePropsRef = ref<Record<string, unknown> | null>(null);
		let instance: Record<string, unknown> | null = null;

		onMounted(() => {
			if (!containerRef.value) return;

			const reactiveProps = $state({ ...attrs });
			reactivePropsRef.value = reactiveProps;
			instance = mount(props.this as unknown as Parameters<typeof mount>[0], {
				target: containerRef.value,
				props: reactiveProps,
			});
		});

		watch(
			() => ({ ...attrs }),
			(newAttrs) => {
				if (reactivePropsRef.value) {
					Object.assign(reactivePropsRef.value, newAttrs);
				}
			},
			{ deep: true },
		);

		onUnmounted(() => {
			if (instance) {
				unmount(instance);
				instance = null;
				reactivePropsRef.value = null;
			}
		});

		return () =>
			h(props.as, {
				ref: containerRef,
				style: { display: "contents" },
			});
	},
});
