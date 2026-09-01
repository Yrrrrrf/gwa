<script setup lang="ts">
import { faviconUrl } from "#lib";
import { ref } from "vue";
import pkg from "../deno.json" with { type: "json" };

const count = ref(0);
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
    <div class="card bg-base-200 shadow-md p-6 flex flex-col items-center gap-4">
      <span class="text-4xl font-mono font-bold">{{ count }}</span>
      <div class="flex gap-2">
        <button
          type="button"
          class="btn btn-primary btn-sm"
          @click="count++"
        >
          Increment
        </button>
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          @click="count = 0"
        >
          Reset
        </button>
      </div>
    </div>
  </div>
</template>
