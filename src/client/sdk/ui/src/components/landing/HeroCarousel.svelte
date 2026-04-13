<script lang="ts">
  import { fade } from 'svelte/transition';
  import { onMount } from 'svelte';

  let currentImage = $state(0);
  const images = [
    '/images/carousel-1.png',
    '/images/carousel-2.png',
    '/images/carousel-3.png'
  ];

  let ballElement: HTMLDivElement | undefined = $state();
  const wordsLength = 14; // XIBALBÁ (7) + MUNDIAL (7)

  onMount(() => {
    if (typeof window !== 'undefined') {
      const interval = setInterval(() => {
        currentImage = (currentImage + 1) % images.length;
      }, 5000);

      let bx = 100;
      let by = -80;
      let bvx = 0;
      let bvy = 0;
      let isDragging = false;
      let mouseX = 0;
      let mouseY = 0;
      const br = 30; // Radius of 30 for the 60px ball
      const lettersPhysics = Array.from({length: 14}).map(() => ({
        x: 0, y: 0, vx: 0, vy: 0
      }));

      let rAFFrame: number;
      
      function updatePhysics() {
        if (isDragging) {
          bvx = (mouseX - bx) * 0.2;
          bvy = (mouseY - by) * 0.2;
          bx = mouseX;
          by = mouseY;
        } else {
          bvy += 0.5; // gravity
          bvx *= 0.99; // friction
          bvy *= 0.99;
          
          bx += bvx;
          by += bvy;

          if (by + br > window.innerHeight) {
            by = window.innerHeight - br;
            bvy *= -0.7;
            bvx *= 0.95;
          }
          if (bx + br > window.innerWidth) {
            bx = window.innerWidth - br;
            bvx *= -0.7;
          }
          if (bx - br < 0) {
            bx = br;
            bvx *= -0.7;
          }
          if (by - br < 0) {
            by = br;
            bvy *= -0.7;
          }
        }

        if (ballElement) {
          ballElement.style.transform = `translate(${bx}px, ${by}px) rotate(${bx}deg)`;
        }

        const chars = document.querySelectorAll('.layer-1-char');

        chars.forEach((el) => {
          const idxStr = el.getAttribute('data-index');
          if (idxStr !== null) {
            const index = parseInt(idxStr, 10);
            const p = lettersPhysics[index];
            if (p) {
              const rect = el.getBoundingClientRect();
              const cx = rect.left - p.x + rect.width / 2;
              const cy = rect.top - p.y + rect.height / 2;

              const dx = bx - cx;
              const dy = by - cy;
              const dist2 = dx*dx + dy*dy;
              const minDist = br + Math.max(rect.width, rect.height) / 2 + 10;

              if (dist2 < minDist * minDist) {
                const dist = Math.sqrt(dist2);
                const force = (minDist - dist) / minDist;
                
                if (dist < minDist) {
                  bvx += (dx / dist) * force * 3;
                  bvy += (dy / dist) * force * 3;
                }

                p.vx -= (dx / dist) * force * 8;
                p.vy -= (dy / dist) * force * 8;
              }

              p.vx += (0 - p.x) * 0.08;
              p.vy += (0 - p.y) * 0.08;
              p.vx *= 0.82;
              p.vy *= 0.82;
              p.x += p.vx;
              p.y += p.vy;

              (el as HTMLElement).style.transform = `translate(${p.x}px, ${p.y}px)`;
            }
          }
        });

        rAFFrame = requestAnimationFrame(updatePhysics);
      }

      const onPointerMove = (e: PointerEvent) => {
        if (isDragging) {
           mouseX = e.clientX;
           mouseY = e.clientY;
        } else {
           let dx = e.clientX - bx;
           let dy = e.clientY - by;
           if(dx*dx + dy*dy < br*br*5) {
             bvx -= dx * 0.05;
             bvy -= dy * 0.05;
           }
        }
      };

      const onPointerDown = (e: PointerEvent) => {
         let dx = e.clientX - bx;
         let dy = e.clientY - by;
         if(dx*dx + dy*dy < br*br * 1.5) {
            isDragging = true;
            mouseX = e.clientX;
            mouseY = e.clientY;
            if(ballElement) ballElement.setPointerCapture(e.pointerId);
         }
      };

      const onPointerUp = (e: PointerEvent) => {
         isDragging = false;
         if(ballElement) ballElement.releasePointerCapture(e.pointerId);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointerup', onPointerUp);

      updatePhysics();

      return () => {
        clearInterval(interval);
        cancelAnimationFrame(rAFFrame);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointerup', onPointerUp);
      };
    }
  });
</script>

<section class="min-h-screen relative overflow-hidden -mt-[72px] bg-black selection:bg-primary/30 flex items-center justify-center">
  
  <!-- BACKGROUND CAROUSEL -->
  <div class="absolute inset-0 z-0">
    {#each images as image, i}
      {#if currentImage === i}
         <div 
            in:fade={{ duration: 1500 }} 
            out:fade={{ duration: 1500 }}
            class="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style="background-image: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('{image}');"
         ></div>
      {/if}
    {/each}
  </div>

  <!-- CENTERED TEXT -->
  <div class="relative z-10 text-center select-none pointer-events-none px-6">
    <h1 class="text-[14vw] whitespace-nowrap font-black leading-[0.8] text-white tracking-tighter drop-shadow-2xl">
      {#each "XIBALBÁ".split('') as char, j}<span class="inline-block relative layer-1-char leading-none" data-index={j}>{char}</span>{/each}
    </h1>
    <h1 class="text-[14vw] whitespace-nowrap font-black leading-[0.8] text-white tracking-widest mt-4 drop-shadow-2xl">
      {#each "MUNDIAL".split('') as char, j}<span class="inline-block relative layer-1-char leading-none" data-index={7 + j}>{char}</span>{/each}
    </h1>
  </div>

  <!-- LAYER FOOTBALL (Z-50) -->
  <div 
    bind:this={ballElement}
    class="absolute z-50 rounded-full cursor-grab active:cursor-grabbing touch-none pointer-events-auto bg-[#e8ecef] flex justify-center items-center overflow-hidden shadow-[inset_-8px_-8px_16px_rgba(0,0,0,0.45),inset_4px_4px_10px_rgba(255,255,255,0.9),0_15px_35px_rgba(0,0,0,0.6)]"
    style="
      width: 60px; height: 60px; 
      top: -30px; left: -30px; 
      will-change: transform;
    "
  >
    <!-- Geométria Telstar -->
    <svg viewBox="0 0 100 100" class="w-[110%] h-[110%] absolute pointer-events-none" xmlns="http://www.w3.org/2000/svg">
      <path d="M 50 30 L 69 44 L 61.7 66 L 38.3 66 L 31 44 Z" fill="#1b1d1c" />
      <path d="M 50 15 L 65 5 Q 50 -2 35 5 Z" fill="#1b1d1c" />
      <path d="M 83 40 L 95 25 Q 102 40 92 55 Z" fill="#1b1d1c" />
      <path d="M 70.5 78 L 90 80 Q 80 100 65 95 Z" fill="#1b1d1c" />
      <path d="M 29.5 78 L 35 95 Q 20 100 10 80 Z" fill="#1b1d1c" />
      <path d="M 17 40 L 8 55 Q -2 40 5 25 Z" fill="#1b1d1c" />
      <line x1="50" y1="30" x2="50" y2="15" stroke="#1b1d1c" stroke-width="2.5" />
      <line x1="69" y1="44" x2="83" y2="40" stroke="#1b1d1c" stroke-width="2.5" />
      <line x1="61.7" y1="66" x2="70.5" y2="78" stroke="#1b1d1c" stroke-width="2.5" />
      <line x1="38.3" y1="66" x2="29.5" y2="78" stroke="#1b1d1c" stroke-width="2.5" />
      <line x1="31" y1="44" x2="17" y2="40" stroke="#1b1d1c" stroke-width="2.5" />
      <line x1="65" y1="5" x2="95" y2="25" stroke="#1b1d1c" stroke-width="2.5" />
      <line x1="92" y1="55" x2="90" y2="80" stroke="#1b1d1c" stroke-width="2.5" />
      <line x1="65" y1="95" x2="35" y2="95" stroke="#1b1d1c" stroke-width="2.5" />
      <line x1="10" y1="80" x2="8" y2="55" stroke="#1b1d1c" stroke-width="2.5" />
      <line x1="5" y1="25" x2="35" y2="5" stroke="#1b1d1c" stroke-width="2.5" />
    </svg>
    <div class="absolute inset-0 w-full h-full rounded-full mix-blend-multiply opacity-60 pointer-events-none" style="background: radial-gradient(circle at 35% 25%, transparent 30%, #000000 100%);"></div>
    <div class="absolute inset-0 w-full h-full rounded-full mix-blend-screen opacity-80 pointer-events-none" style="background: radial-gradient(circle at 30% 30%, #ffffff 0%, transparent 60%);"></div>
  </div>

  <!-- FOREGROUND FOOTER (Z-30) -->
  <div class="absolute bottom-12 left-0 w-full z-30 flex flex-col justify-end px-6 md:px-12 lg:px-24 pointer-events-none">
    <div class="pointer-events-auto max-w-[280px] md:max-w-[340px] border-l-2 md:border-l-4 border-primary pl-6">
      <p class="text-white/95 font-medium text-[12px] md:text-[15px] lg:text-[17px] leading-snug mb-6 drop-shadow-md">
         Fusionando el frenesí del <span class="text-primary font-bold">fútbol</span> con la mística de la <span class="text-secondary font-bold">cultura local</span>.
      </p>
      <a href="#explore" class="text-white font-black tracking-[0.2em] text-[10px] md:text-xs uppercase flex items-center gap-4 hover:text-primary transition-all duration-300 group">
        Explorar Experiencia
        <div class="w-8 h-[2px] bg-white group-hover:w-16 group-hover:bg-primary transition-all"></div>
      </a>
    </div>
  </div>

  <!-- CAROUSEL CONTROLS (Z-30) -->
  <div class="absolute right-0 bottom-0 md:right-8 md:bottom-12 z-30 flex pointer-events-auto">
    <button aria-label="Previous image" onclick={() => { currentImage = (currentImage - 1 + images.length) % images.length; }} class="w-12 h-12 md:w-16 md:h-16 bg-[#1a1c1a]/80 hover:bg-[#2b332c] flex items-center justify-center text-white transition-colors duration-300 backdrop-blur-sm">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
    </button>
    <button aria-label="Next image" onclick={() => { currentImage = (currentImage + 1) % images.length; }} class="w-12 h-12 md:w-16 md:h-16 bg-[#2b332c]/90 hover:bg-[#3d493e] flex items-center justify-center text-white transition-colors duration-300 backdrop-blur-sm">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
    </button>
  </div>

  <!-- VERTICAL DOTS (Z-30) -->
  <div class="absolute right-6 md:right-12 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-4 md:gap-6 pointer-events-auto">
    {#each images as _, i}
      <button 
         aria-label="Ir a imagen {i+1}"
         onclick={() => currentImage = i}
         class="w-[2px] md:w-[3px] transition-all duration-500 {currentImage === i ? 'bg-primary h-8 md:h-12 shadow-[0_0_10px_rgba(var(--primary),0.5)]' : 'bg-white/30 h-3 md:h-4 hover:bg-white/60'} rounded-full"
      ></button>
    {/each}
  </div>

</section>
