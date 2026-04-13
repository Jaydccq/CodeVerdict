import { ref } from 'vue';
import confetti from 'canvas-confetti';

export type CelebrationMode =
  | 'snow'
  | 'fireworks'
  | 'realistic'
  | 'stars'
  | 'cannon'
  | 'continuous'
  | 'emoji';

const ALL_MODES: CelebrationMode[] = [
  'snow',
  'fireworks',
  'realistic',
  'stars',
  'cannon',
  'continuous',
  'emoji',
];

export function useCelebration() {
  const mode = ref<CelebrationMode>('snow');
  let rafId: number | null = null;
  let running = false;

  function clearLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    running = false;
  }

  function stop() {
    clearLoop();
    confetti.reset();
  }

  function toggleMode() {
    const others = ALL_MODES.filter((m) => m !== mode.value);
    mode.value = others[Math.floor(Math.random() * others.length)];
    stop();
    start();
  }

  function start() {
    stop();
    running = true;
    runMode();
  }

  function runMode() {
    if (!running) return;

    switch (mode.value) {
      case 'snow':
        snowLoop();
        break;
      case 'fireworks':
        fireworksLoop();
        break;
      case 'realistic':
        realisticLoop();
        break;
      case 'stars':
        starsLoop();
        break;
      case 'cannon':
        cannonLoop();
        break;
      case 'continuous':
        continuousLoop();
        break;
      case 'emoji':
        emojiLoop();
        break;
    }
  }

  function snowLoop() {
    if (!running) return;
    void confetti({
      particleCount: 3,
      angle: 90,
      spread: 120,
      origin: { x: Math.random(), y: -0.1 },
      colors: ['#fff', '#c7e3ff', '#e8f0ff'],
      shapes: ['circle'],
      gravity: 0.3,
      drift: 0.5,
      scalar: 0.8,
    });
    rafId = requestAnimationFrame(() => setTimeout(snowLoop, 50));
  }

  function fireworksLoop() {
    if (!running) return;
    const tick = () => {
      if (!running) return;
      void confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#bb0000', '#ffffff'],
      });
      void confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#bb0000', '#ffffff'],
      });
      rafId = requestAnimationFrame(tick);
    };
    tick();
  }

  function realisticLoop() {
    if (!running) return;
    const burst = () => {
      if (!running) return;
      const count = 200;
      const defaults = { origin: { y: 0.7 } };
      void confetti({
        ...defaults,
        particleCount: Math.floor(count * 0.25),
        spread: 26,
        startVelocity: 55,
      });
      void confetti({
        ...defaults,
        particleCount: Math.floor(count * 0.2),
        spread: 60,
      });
      void confetti({
        ...defaults,
        particleCount: Math.floor(count * 0.35),
        spread: 100,
        decay: 0.91,
        scalar: 0.8,
      });
      void confetti({
        ...defaults,
        particleCount: Math.floor(count * 0.1),
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2,
      });
      void confetti({
        ...defaults,
        particleCount: Math.floor(count * 0.1),
        spread: 120,
        startVelocity: 45,
      });
      rafId = requestAnimationFrame(() => setTimeout(burst, 2000));
    };
    burst();
  }

  function starsLoop() {
    if (!running) return;
    const defaults = {
      spread: 360,
      ticks: 50,
      gravity: 0,
      decay: 0.94,
      startVelocity: 30,
    };
    const burst = () => {
      if (!running) return;
      void confetti({
        ...defaults,
        particleCount: 40,
        scalar: 1.2,
        shapes: ['star'],
        colors: ['FFE400', 'FFBD00', 'E89400', 'FFCA6C', 'FDFFB8'],
      });
      void confetti({
        ...defaults,
        particleCount: 10,
        scalar: 0.75,
        shapes: ['circle'],
        colors: ['FFE400', 'FFBD00', 'E89400', 'FFCA6C', 'FDFFB8'],
      });
      rafId = requestAnimationFrame(() => setTimeout(burst, 900));
    };
    burst();
  }

  function cannonLoop() {
    if (!running) return;
    void confetti({
      particleCount: 80,
      spread: 180,
      origin: { x: 0.5, y: 0.5 },
    });
    rafId = requestAnimationFrame(() => setTimeout(cannonLoop, 1500));
  }

  function continuousLoop() {
    if (!running) return;
    const tick = () => {
      if (!running) return;
      void confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#bb0000', '#ffffff'],
      });
      void confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#bb0000', '#ffffff'],
      });
      rafId = requestAnimationFrame(tick);
    };
    tick();
  }

  function emojiLoop() {
    if (!running) return;
    const emojiShapes = ['🎉', '🚀', '⭐'].map((e) =>
      confetti.shapeFromText({ text: e, scalar: 2 }),
    );
    const burst = () => {
      if (!running) return;
      void confetti({
        shapes: emojiShapes,
        particleCount: 20,
        spread: 360,
        origin: { x: Math.random(), y: Math.random() * 0.4 },
        scalar: 2,
      });
      rafId = requestAnimationFrame(() => setTimeout(burst, 800));
    };
    burst();
  }

  return { mode, start, stop, toggleMode };
}
