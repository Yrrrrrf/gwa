<script lang="ts">
  import { onMount } from "svelte";

  interface Props {
    url: string;
    size?: number;
    logoSrc?: string;
    /** Download filename (without extension) */
    downloadName?: string;
  }

  let { url, size = 280, logoSrc, downloadName = "xibalba-qr" }: Props =
    $props();
  let container: HTMLDivElement;
  let qr: any = $state(null);

  onMount(async () => {
    // Dynamic import — qr-code-styling uses Canvas/DOM APIs
    // that are unavailable during SSR.
    const { default: QRCodeStyling } = await import("qr-code-styling");

    qr = new QRCodeStyling({
      width: size,
      height: size,
      data: url,
      image: logoSrc || undefined,
      dotsOptions: {
        color: "#0d1b2a",
        type: "rounded",
      },
      cornersSquareOptions: {
        color: "#e63946",
        type: "extra-rounded",
      },
      cornersDotOptions: {
        color: "#e63946",
        type: "dot",
      },
      backgroundOptions: {
        color: "#ffffff",
      },
      imageOptions: {
        crossOrigin: "anonymous",
        margin: 8,
      },
    });

    qr.append(container);
  });

  function download(ext: "png" | "svg") {
    qr?.download({ name: downloadName, extension: ext });
  }
</script>

<div class="flex flex-col items-center gap-3">
  <div
    bind:this={container}
    class="inline-block rounded-2xl overflow-hidden shadow-lg ring-1 ring-base-content/10"
  ></div>

  {#if qr}
    <div class="flex gap-2">
      <button
        onclick={() => download("png")}
        class="btn btn-xs btn-ghost opacity-60 hover:opacity-100"
      >
        PNG
      </button>
      <button
        onclick={() => download("svg")}
        class="btn btn-xs btn-ghost opacity-60 hover:opacity-100"
      >
        SVG
      </button>
    </div>
  {/if}
</div>
