<script lang="ts">
  interface Props {
    src: string;
    alt: string;
    class?: string;
    seed?: string;
  }

  let { src, alt, class: className = "", seed = "fallback" }: Props = $props();

  function handleError(e: Event) {
    const t = e.currentTarget as HTMLImageElement;
    t.src = `https://api.dicebear.com/8.x/icons/svg?seed=${seed}&backgroundType=gradientLinear`;
  }
</script>

<img {src} {alt} class={className} onerror={handleError} />
