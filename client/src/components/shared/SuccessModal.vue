<script setup lang="ts">
import { onMounted } from 'vue';
import confetti from 'canvas-confetti';
import { themeColors } from '../../config/theme';

defineProps<{
  mode: 'submit' | 'run';
  problemTitle: string;
  score: number;
  passedTests: number;
  totalTests: number;
  language: string;
}>();

const emit = defineEmits<{
  close: [];
  'go-submit': [];
}>();

onMounted(() => {
  void confetti({
    particleCount: 60,
    angle: 60,
    spread: 55,
    origin: { x: 0 },
    colors: ['#10b981', themeColors.primary, '#ffffff'],
  });
  void confetti({
    particleCount: 60,
    angle: 120,
    spread: 55,
    origin: { x: 1 },
    colors: ['#10b981', themeColors.primary, '#ffffff'],
  });
});
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div
        class="modal-enter max-w-sm w-full mx-4 rounded-2xl bg-[#0d1117] border border-white/[0.08] overflow-hidden"
      >
        <!-- Header -->
        <div class="flex flex-col items-center px-6 pt-8 pb-5 text-center">
          <span
            class="material-symbols-outlined text-emerald-400 trophy-bounce mb-3"
            style="font-size: 48px"
            >check_circle</span
          >
          <h2 class="text-xl font-bold text-emerald-400 mb-1">
            {{ mode === 'submit' ? 'Accepted!' : 'All Samples Passed!' }}
          </h2>
          <p
            v-if="problemTitle"
            class="text-sm text-slate-400 truncate max-w-full"
          >
            {{ problemTitle }}
          </p>
        </div>

        <!-- Stats -->
        <div class="flex gap-2 px-6 pb-6 justify-center flex-wrap">
          <template v-if="mode === 'submit'">
            <div
              v-if="score"
              class="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300"
            >
              🏆 {{ score }} pts
            </div>
            <div
              v-if="totalTests"
              class="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300"
            >
              {{ passedTests }}/{{ totalTests }} tests
            </div>
          </template>
          <template v-else>
            <div
              v-if="passedTests"
              class="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300"
            >
              {{ passedTests }}/{{ passedTests }} cases
            </div>
          </template>
          <div
            v-if="language"
            class="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300"
          >
            {{ language }}
          </div>
        </div>

        <!-- Footer -->
        <div
          class="flex gap-2 px-6 pb-6"
          :class="mode === 'run' ? 'justify-between' : 'justify-center'"
        >
          <button
            v-if="mode === 'run'"
            class="flex-1 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold transition-colors"
            @click="emit('go-submit')"
          >
            Submit Solution →
          </button>
          <button
            class="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            :class="
              mode === 'submit'
                ? 'bg-emerald-500 hover:bg-emerald-400 text-white px-10'
                : 'border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.04]'
            "
            @click="emit('close')"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@keyframes modal-in {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.modal-enter {
  animation: modal-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes trophy-bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-4px);
  }
}
.trophy-bounce {
  animation: trophy-bounce 0.7s ease-out 0.15s both;
}
</style>
