<script lang="ts">
  import { ICONS, m } from "../../mod.js";
</script>

<footer class="mt-auto py-12 px-6 border-t border-base-content/5 backdrop-blur-3xl bg-base-100/20 z-10 relative">
  <div class="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 opacity-70">
    <div class="flex flex-col gap-4">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20 text-primary-content">
          <ICONS.brand size={18} />
        </div>
        <span class="text-xl font-black tracking-tighter text-base-content">
          {m.app_name()}
        </span>
      </div>
      <p class="text-xs font-medium leading-relaxed max-w-xs italic">
        A generic starter template for multi-platform applications.
      </p>
    </div>

    <div class="flex flex-col gap-4">
      <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
        Menu
      </h4>
      <ul class="flex flex-col gap-2 text-xs font-bold uppercase tracking-widest">
        <li class="hover:text-primary transition-colors cursor-pointer">
          <a href="/items">Items</a>
        </li>
        <li class="hover:text-primary transition-colors cursor-pointer">
          <a href="/dashboard">Dashboard</a>
        </li>
      </ul>
    </div>

    <div class="flex flex-col gap-4">
      <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">
        Connect
      </h4>
      <div class="flex items-center gap-4">
        <ICONS.phone size={16} class="text-secondary hover:scale-110 cursor-pointer transition-transform" />
        <ICONS.email size={16} class="text-secondary hover:scale-110 cursor-pointer transition-transform" />
      </div>
      <p class="text-[9px] font-black uppercase tracking-widest mt-2">
        © 2026 {m.app_name()} - All rights reserved
      </p>
    </div>
  </div>
</footer>
