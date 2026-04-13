<script lang="ts">
  import { GlassContainer } from "../primitives/mod.ts";
</script>

<div class="hero-container">
  <GlassContainer class="hero-content">
    <h1 class="text-4xl font-bold mb-4">Welcome to the Template</h1>
    <p class="text-lg opacity-80 mb-6">
      A clean, generic starter for your next multi-platform project. 
      Built with Svelte 5, Rust, and Go.
    </p>
    <div class="flex gap-4">
      <button class="px-6 py-2 bg-primary text-white rounded-lg">Get Started</button>
      <button class="px-6 py-2 bg-white/10 rounded-lg">Learn More</button>
    </div>
  </GlassContainer>
</div>

<style>
  .hero-container {
    min-height: 60vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }
  :global(.hero-content) {
    max-width: 600px;
    text-align: center;
  }
</style>
