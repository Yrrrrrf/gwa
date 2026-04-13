<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Info, MapPin, Pointer, MapPinned, Check } from 'lucide-svelte';
  import { makeMarkerIcon } from "../../icons/mod.ts";
  import * as m from "../../../src/i18n/paraglide/messages.js";

  interface Props {
    height?: string;
    initialLat?: number;
    initialLng?: number;
    onlocationchange?: (lat: number, lng: number, address?: string) => void;
  }

  let {
    height = "380px",
    initialLat = 19.4326,
    initialLng = -99.1332,
    onlocationchange,
  }: Props = $props();

  let mapEl: HTMLDivElement;
  let map: import("leaflet").Map | null = null;
  let marker: import("leaflet").Marker | null = null;
  let L: typeof import("leaflet") | null = null;

  let pickedLat = $state(19.4326);
  let pickedLng = $state(-99.1332);

  $effect.pre(() => {
    pickedLat = initialLat;
    pickedLng = initialLng;
  });

  let address = $state("");
  let geocoding = $state(false);
  let confirmed = $state(false);
  let locating = $state(false);

  async function reverseGeocode(lat: number, lng: number) {
    geocoding = true;
    address = "";
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { "Accept-Language": "es" } },
      );
      const data = await res.json();
      address = data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } finally {
      geocoding = false;
    }
  }

  function updatePickedLocation(lat: number, lng: number) {
    pickedLat = lat;
    pickedLng = lng;
    confirmed = false;
    marker?.setLatLng([lat, lng]);
    marker?.openPopup();
    reverseGeocode(lat, lng);
  }

  async function locateMe() {
    if (!navigator.geolocation) return;
    locating = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map?.flyTo([latitude, longitude], 17, { duration: 1.4 });
        updatePickedLocation(latitude, longitude);
        locating = false;
      },
      () => {
        locating = false;
      },
      { timeout: 8000, enableHighAccuracy: true },
    );
  }

  function confirmLocation() {
    confirmed = true;
    onlocationchange?.(pickedLat, pickedLng, address);
  }

  async function initMap() {
    if (typeof window === "undefined") return;
    L = (await import("leaflet")).default;

    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    if (!mapEl) return;
    map = L.map(mapEl, { zoomControl: false }).setView(
      [initialLat, initialLng],
      15,
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    const icon = L.icon({
      iconUrl: makeMarkerIcon("MapPin", "#f59e0b"),
      iconSize: [40, 50],
      iconAnchor: [20, 50],
      popupAnchor: [0, -50],
    });

    marker = L.marker([initialLat, initialLng], { icon, draggable: true })
      .addTo(map!)
      .bindPopup(m.map_marker_popup(), { closeButton: false });

    marker.on("dragend", (e) => {
      const latlng = (e.target as import("leaflet").Marker).getLatLng();
      updatePickedLocation(latlng.lat, latlng.lng);
    });

    map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
      map?.flyTo(e.latlng, map.getZoom(), { duration: 0.5 });
      updatePickedLocation(e.latlng.lat, e.latlng.lng);
    });

    // Initial geocode
    reverseGeocode(initialLat, initialLng);
  }

  onMount(() => {
    initMap();
  });
  onDestroy(() => {
    if (map) map.remove();
    map = null;
  });
</script>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  />
</svelte:head>

<div class="space-y-3">
  <!-- Instrucción -->
  <div
    class="alert alert-info py-2 text-xs font-bold uppercase tracking-wider bg-info/10 border-info/20 text-info"
  >
    <Info size={16} />
    <span>{m.map_drag_hint()}</span>
  </div>

  <!-- Botones top -->
  <div class="flex gap-2 flex-wrap">
    <button
      onclick={locateMe}
      disabled={locating}
      class="btn btn-sm btn-outline btn-secondary gap-2"
    >
      {#if locating}
        <span class="loading loading-spinner loading-xs"></span>
      {:else}
        <MapPin size={16} />
      {/if}
      {m.map_use_location()}
    </button>
  </div>

  <!-- Map -->
  <div
    class="relative rounded-2xl overflow-hidden border border-base-content/10 shadow-2xl"
    style="height:{height}"
  >
    <div
      bind:this={mapEl}
      class="w-full h-full z-0 grayscale-[0.3] invert-[0.05]"
    ></div>

    <!-- Crosshair hint -->
    <div
      class="absolute bottom-10 left-1/2 -translate-x-1/2 z-[999] pointer-events-none"
    >
      <div
        class="bg-base-300/60 backdrop-blur-md rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-base-content/80 border border-base-content/10 shadow-lg flex items-center gap-2"
      >
        <Pointer size={12} /> {m.map_touch_hint()}
      </div>
    </div>
  </div>

  <!-- Coordinates display -->
  <div class="grid grid-cols-2 gap-3">
    <div class="form-control">
      <label class="label py-1" for="loc-lat">
        <span
          class="label-text text-[10px] font-bold uppercase tracking-wider text-base-content/50"
          >{m.map_latitude()}</span
        >
      </label>
      <input
        id="loc-lat"
        type="text"
        class="input input-bordered bg-base-200/50 text-base-content input-sm font-mono"
        readonly
        value={pickedLat.toFixed(6)}
      />
    </div>
    <div class="form-control">
      <label class="label py-1" for="loc-lng">
        <span
          class="label-text text-[10px] font-bold uppercase tracking-wider text-base-content/50"
          >{m.map_longitude()}</span
        >
      </label>
      <input
        id="loc-lng"
        type="text"
        class="input input-bordered bg-base-200/50 text-base-content input-sm font-mono"
        readonly
        value={pickedLng.toFixed(6)}
      />
    </div>
  </div>

  <!-- Address display -->
  <div class="form-control">
    <label class="label py-1" for="loc-addr">
      <span
        class="label-text text-[10px] font-bold uppercase tracking-wider text-base-content/50 flex items-center gap-1.5"
        >
        <MapPin size={10} class="text-base-content/40" />
        {m.map_address_detected()}
      </span>
    </label>
    <div class="flex items-center gap-2" id="loc-addr">
      {#if geocoding}
        <div
          class="flex items-center gap-2 text-xs font-bold text-base-content/50 px-3 py-2.5 bg-base-content/5 border border-base-content/5 rounded-xl w-full"
        >
          <span class="loading loading-dots loading-xs"></span>
          {m.map_loading_address()}
        </div>
      {:else}
        <p
          class="text-xs px-3 py-2.5 bg-base-content/5 border border-base-content/5 rounded-xl flex-1 leading-snug text-base-content/80 italic"
        >
          {address || "—"}
        </p>
      {/if}
    </div>
  </div>

  <!-- Confirm button -->
  <button
    onclick={confirmLocation}
    class="btn w-full gap-2 {confirmed
      ? 'btn-success'
      : 'btn-warning'}"
  >
    {#if confirmed}
      <Check size={18} />
      {m.map_confirmed()}
    {:else}
      <MapPinned size={18} /> {m.map_confirm()}
    {/if}
  </button>
</div>
