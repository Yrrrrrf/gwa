<script setup lang="ts">
import { Counter, Icon, faviconUrl } from "#lib";
import pkg from "../deno.json" with { type: "json" };
</script>

<template>
  <Teleport to="head">
    <title>{{ pkg.name }}</title>
    <link rel="icon" :href="faviconUrl" />
  </Teleport>

  <div class="min-h-screen bg-base-100 flex flex-col items-center justify-center p-8 text-center gap-6">
    <div class="flex items-center gap-3">
      <img :src="faviconUrl" alt="Vue logo" class="w-16 h-16" />
      <h1 class="text-3xl font-bold">{{ pkg.name }}</h1>
    </div>
    <p class="text-sm opacity-70 max-w-md">{{ pkg.description }}</p>
    <div class="flex items-center gap-2">
      <Icon route="/dashboard" :size="24" color="currentColor" />
      <span class="text-sm opacity-60">Universal Svelte Component</span>
    </div>
    <Counter />
  </div>
</template>
