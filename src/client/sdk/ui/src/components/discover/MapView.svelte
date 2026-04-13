<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { MapPin, Store, TriangleAlert, Maximize2, Minimize2 } from 'lucide-svelte';
  import { makeMarkerIcon } from "../../icons/mod.ts";
  import type { Business } from "@sdk/core";
  import * as m from "../../../src/i18n/paraglide/messages.js";

  interface Props {
    height?: string;
    businesses?: (Business & { color?: string })[];
    showUserLocation?: boolean;
    onbusinessselect?: (b: Business) => void;
    onlocationfound?: (lat: number, lng: number) => void;
  }

  let {
    height = "420px",
    businesses = [],
    showUserLocation = true,
    onbusinessselect,
    onlocationfound
  }: Props = $props();

  const DEFAULT_LAT = 19.4326;
  const DEFAULT_LNG = -99.1332;

  let mapEl: HTMLDivElement;
  let map: import("leaflet").Map | null = null;
  let userMarker: import("leaflet").Marker | null = null;
  let L: typeof import("leaflet") | null = null;
  let locating = $state(false);
  let locationError = $state("");
  let userLat = $state(DEFAULT_LAT);
  let userLng = $state(DEFAULT_LNG);
  let isMaximized = $state(false);
  let businessMarkers: import("leaflet").Marker[] = [];

  function getCategoryIconName(cat: string): string {
    const iconMap: Record<string, string> = {
      mexican: "ChefHat", Food: "ChefHat",
      seafood: "Fish",
      street_food: "Flame",
      drinks: "CupSoda",
      desserts: "CakeSlice",
      vegetarian: "Salad",
      fast_food: "Hamburger",
      international: "Soup",
      Mystic: "Star",
      Craft: "Hand",
      Service: "ClipboardList"
    };
    return iconMap[cat] ?? "Utensils";
  }

  function buildPopup(c: Business) {
    const statusText = c.open ? m.badge_open() : m.badge_closed();
    return `
      <div style="min-width:180px;font-family:system-ui;color:oklch(var(--bc))">
        <p style="font-weight:700;font-size:14px;margin:0 0 2px;">${c.name}</p>
        <p style="font-size:11px;color:oklch(var(--bc)/0.6);margin:0 0 6px">${c.category}</p>
        <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
          <span style="font-size:12px">⭐ <strong>${c.rating.toFixed(1)}</strong></span>
          <span style="font-size:11px;padding:2px 8px;border-radius:999px;background:oklch(var(--p)/0.1);color:oklch(var(--p))">
            ● ${statusText}
          </span>
        </div>
      </div>`;
  }

  function updateMarkers() {
    if (!map || !L) return;
    businessMarkers.forEach(m => m.remove());
    businessMarkers = [];

    for (const c of businesses) {
      const markerColor = c.color || "oklch(var(--p))";
      const icon = L.divIcon({
        className: 'custom-marker-container',
        html: `
          <div class="marker-wrapper ${c.open ? 'is-open' : ''}" style="--marker-color: ${markerColor}">
            <div class="marker-pulse"></div>
            <img src="${makeMarkerIcon(getCategoryIconName(c.category), markerColor)}" 
                 style="width:36px; height:44px; position:relative; z-index:2;" />
          </div>
        `,
        iconSize: [36, 44],
        iconAnchor: [18, 44],
        popupAnchor: [0, -44],
      });

      const marker = L.marker([c.lat, c.lng], { icon })
        .addTo(map)
        .on('click', () => onbusinessselect?.(c))
        .bindPopup(buildPopup(c), { maxWidth: 220, className: 'custom-popup' });
      
      businessMarkers.push(marker);
    }
  }

  $effect(() => {
    businesses; // track dependency
    updateMarkers();
  });

  async function initMap() {
    if (typeof window === "undefined") return;
    L = (await import("leaflet")).default;
    if (!mapEl) return;
    
    map = L.map(mapEl, { zoomControl: false }).setView([DEFAULT_LAT, DEFAULT_LNG], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    updateMarkers();

    if (showUserLocation) {
      const userIcon = L.icon({
        iconUrl: makeMarkerIcon("MapPin", "oklch(var(--p))"),
        iconSize: [40, 48],
        iconAnchor: [20, 48],
      });
      userMarker = L.marker([userLat, userLng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
    }
  }

  async function locateMe() {
    if (!navigator.geolocation) return;
    locating = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLat = pos.coords.latitude;
        userLng = pos.coords.longitude;
        userMarker?.setLatLng([userLat, userLng]);
        map?.flyTo([userLat, userLng], 16, { duration: 1.5 });
        locating = false;
        onlocationfound?.(userLat, userLng);
      },
      () => {
        locating = false;
        map?.flyTo([DEFAULT_LAT, DEFAULT_LNG], 14, { duration: 1 });
        onlocationfound?.(DEFAULT_LAT, DEFAULT_LNG);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }

  onMount(() => { initMap(); });
  onDestroy(() => { if (map) map.remove(); });
</script>

<style>
  :global(.marker-wrapper) { position: relative; display: flex; justify-content: center; align-items: center; }
  :global(.marker-pulse) {
    position: absolute; width: 20px; height: 20px; background: var(--marker-color);
    border-radius: 50%; z-index: 1; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0;
    animation: radioactive-pulse 2s infinite;
  }
  @keyframes radioactive-pulse {
    0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.6; }
    100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
  }
  .map-transition { transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
</style>

<svelte:head>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</svelte:head>

<div 
  class="relative w-full overflow-hidden border border-white/10 shadow-2xl map-transition
         {isMaximized ? 'fixed inset-0 z-[1500] rounded-0' : 'rounded-[2.5rem]'}" 
  style="height: {isMaximized ? '100vh' : height}"
>
  <div bind:this={mapEl} class="w-full h-full z-0"></div>
  
  <div class="absolute top-6 left-6 z-[1600] flex flex-col gap-3">
    <button onclick={locateMe} disabled={locating} class="btn btn-primary shadow-[0_10px_30px_rgba(0,0,0,0.3)] gap-2 rounded-2xl">
      {#if locating} <span class="loading loading-spinner loading-xs"></span> {:else} <MapPin size={18} /> {/if}
      {m.map_use_location()}
    </button>
    
    <button 
      onclick={() => { isMaximized = !isMaximized; setTimeout(() => map?.invalidateSize(), 800); }} 
      class="btn bg-base-100/80 backdrop-blur-xl border-white/20 shadow-xl rounded-2xl w-12 h-12 p-0"
    >
      {#if isMaximized} <Minimize2 size={20} /> {:else} <Maximize2 size={20} /> {/if}
    </button>
  </div>

  <div class="absolute top-6 right-6 z-[1600]">
    <div class="badge badge-neutral badge-lg h-12 px-6 shadow-2xl font-black gap-2 border-white/10 bg-base-900/80 backdrop-blur-2xl text-white rounded-2xl">
      <Store size={16} /> {businesses.length} {m.map_businesses_count()}
    </div>
  </div>
</div>
