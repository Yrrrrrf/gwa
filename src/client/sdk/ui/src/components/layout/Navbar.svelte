<script lang="ts">
  import { ICONS, m } from "../../mod.js";
  import { authStore } from "@sdk/state";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";

  const auth = authStore;
</script>

<header
  class="sticky top-0 z-[100] w-full transition-all duration-300 {$page.url
    .pathname === '/'
    ? 'bg-transparent border-transparent'
    : 'bg-base-100/30 backdrop-blur-xl border-b border-base-content/5'}"
>
  <div
    class="container mx-auto relative px-2 sm:px-4 py-2 sm:py-3 flex flex-wrap md:flex-nowrap items-center justify-between gap-y-3"
  >
    <a
      href="/"
      class="flex items-center gap-1.5 sm:gap-2 hover:scale-105 transition-transform duration-300 w-auto"
    >
      <div
        class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20 text-primary-content"
      >
        <ICONS.brand size={18} />
      </div>
      <span
        class="text-lg sm:text-2xl font-black tracking-tighter text-base-content"
      >
        {m.app_name()}
      </span>
    </a>

    <!-- Right Side Actions -->
    <div
      class="order-2 md:order-none flex items-center gap-2 sm:gap-4 ml-auto z-10 relative"
    >
      <!-- DESKTOP VIEW (hidden on mobile) -->
      <div class="hidden md:flex items-center gap-4">
        {#if !auth.role}
          <a
            href="/login"
            class="text-[11px] sm:text-sm font-bold opacity-80 hover:opacity-100 transition-opacity"
            >Ingresar</a
          >

          <div class="dropdown dropdown-end">
            <div
              tabindex="-1"
              role="button"
              class="btn btn-primary btn-sm shadow-lg shadow-primary/20"
            >
              Regístrate
            </div>
            <ul
              tabindex="-1"
              class="dropdown-content menu bg-base-100/90 backdrop-blur-3xl border border-white/5 rounded-box z-[1] w-64 p-2 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)] mt-4"
            >
              <li>
                <a
                  href="/register?type=tourist"
                  class="font-bold flex items-center gap-3 p-3 hover:text-primary"
                >
                  <span class="text-xl">🌍</span>
                  <div class="flex flex-col">
                    <span>Como Usuario</span>
                    <span class="text-[10px] font-normal opacity-70"
                      >Encuentra comida y spots</span
                    >
                  </div>
                </a>
              </li>
              <li>
                <a
                  href="/register?type=merchant"
                  class="font-bold flex items-center gap-3 p-3 hover:text-secondary"
                >
                  <span class="text-xl">🏪</span>
                  <div class="flex flex-col">
                    <span>Como Comerciante</span>
                    <span class="text-[10px] font-normal opacity-70"
                      >Promociona tu negocio</span
                    >
                  </div>
                </a>
              </li>
            </ul>
          </div>
        {:else}
          <!-- Desktop Nav Links -->
          <div
            class="flex items-center gap-5 mr-2 lg:mr-4 opacity-80 font-bold text-[11px] uppercase tracking-widest"
          >
            {#if auth.role === "tourist"}
              <a href="/discover" class="hover:text-primary transition-colors"
                >Explorar</a
              >
              <a href="/saved" class="hover:text-primary transition-colors"
                >Guardados</a
              >
            {:else if auth.role === "business"}
              <a href="/dashboard" class="hover:text-primary transition-colors"
                >Tablero</a
              >
              <a href="/menu" class="hover:text-primary transition-colors"
                >Menú</a
              >
            {:else if auth.role === "admin"}
              <a href="/admin" class="hover:text-primary transition-colors"
                >Centro de Control</a
              >
            {/if}
            <a href="/profile" class="hover:text-primary transition-colors"
              >Perfil</a
            >
          </div>

          <span
            class="text-[10px] font-bold opacity-50 inline-block border-l border-white/10 pl-2 lg:pl-4 ml-2"
            >Modo: {auth.role}</span
          >
          <button
            onclick={() => {
              auth.logout();
              goto("/");
            }}
            class="text-[10px] sm:text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl bg-base-content/5 border border-base-content/10 hover:bg-error/10 hover:text-error transition-all duration-300 ml-2"
          >
            {m.nav_logout()}
          </button>
        {/if}
      </div>

      <!-- MOBILE NAV (Hamburger Menu) -->
      <div class="dropdown dropdown-end md:hidden">
        <div
          tabindex="-1"
          role="button"
          class="btn btn-ghost btn-circle btn-sm"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </div>
        <ul
          tabindex="-1"
          class="menu dropdown-content bg-base-100/95 backdrop-blur-3xl rounded-box z-[1] mt-4 w-64 p-4 shadow-2xl border border-white/10 flex flex-col gap-2"
        >
          {#if !auth.role}
            <li>
              <a
                href="/login"
                class="font-bold flex justify-center py-3 bg-base-content/5 rounded-xl hover:bg-primary hover:text-primary-content transition-colors"
                >Ingresar</a
              >
            </li>
            <li
              class="mt-2 text-[10px] font-bold opacity-50 uppercase tracking-widest text-center px-4"
            >
              Crear Cuenta
            </li>
            <li>
              <a href="/register?type=tourist" class="font-medium p-3"
                >Usuario (Explorador)</a
              >
            </li>
            <li>
              <a href="/register?type=merchant" class="font-medium p-3"
                >Negocio (Comerciante)</a
              >
            </li>
          {:else}
            <li>
              <button
                onclick={() => {
                  auth.logout();
                  goto("/");
                }}
                class="font-bold flex justify-center py-3 bg-error/10 text-error rounded-xl hover:bg-error hover:text-error-content transition-colors"
                >Cerrar Sesión</button
              >
            </li>
          {/if}

          <div class="divider my-2 opacity-50"></div>

          <li class="flex flex-col gap-3 p-1">
            <span
              class="text-[10px] font-bold opacity-50 uppercase tracking-widest w-full text-center"
              >Configuración</span
            >
          </li>
        </ul>
      </div>
    </div>
</header>
