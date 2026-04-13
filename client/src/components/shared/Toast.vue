<script setup lang="ts">
import { useToastStore } from '../../stores/toast';

const toastStore = useToastStore();

const iconMap: Record<string, string> = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
};
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed top-[52px] right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      <TransitionGroup name="toast">
        <div
          v-for="toast in toastStore.toasts"
          :key="toast.id"
          class="toast-card pointer-events-auto"
          :class="[`toast-${toast.type}`]"
          role="status"
          tabindex="0"
          @click="toastStore.remove(toast.id)"
          @keydown.enter="toastStore.remove(toast.id)"
          @keydown.space.prevent="toastStore.remove(toast.id)"
        >
          <div class="flex items-start gap-2.5">
            <span
              class="material-symbols-outlined toast-icon"
              :class="[`icon-${toast.type}`]"
              >{{ iconMap[toast.type] ?? 'info' }}</span
            >
            <span class="toast-text">{{ toast.text }}</span>
          </div>

          <!-- Progress bar -->
          <div class="toast-progress-track">
            <div
              class="toast-progress-bar"
              :class="[`bar-${toast.type}`]"
              :style="{ animationDuration: `${toast.duration}ms` }"
            />
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-card {
  position: relative;
  overflow: hidden;
  max-width: 360px;
  padding: 12px 16px 14px;
  border-radius: 12px;
  border: 1px solid;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.04) inset;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    opacity 0.15s ease;
}
.toast-card:hover {
  transform: translateX(-2px);
}

/* Type variants */
.toast-success {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.2);
}
.toast-error {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.2);
}
.toast-warning {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.2);
}
.toast-info {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.2);
}

/* Icon */
.toast-icon {
  font-size: 18px;
  line-height: 1;
  flex-shrink: 0;
  margin-top: 1px;
}
.icon-success {
  color: #10b981;
}
.icon-error {
  color: #ef4444;
}
.icon-warning {
  color: #f59e0b;
}
.icon-info {
  color: #3b82f6;
}

/* Text */
.toast-text {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.88);
}

/* Progress bar */
.toast-progress-track {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(255, 255, 255, 0.06);
}
.toast-progress-bar {
  height: 100%;
  width: 100%;
  transform-origin: left;
  animation-name: shrink;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
  border-radius: 0 2px 2px 0;
}
.toast-card:hover .toast-progress-bar {
  animation-play-state: paused;
}
.bar-success {
  background: #10b981;
}
.bar-error {
  background: #ef4444;
}
.bar-warning {
  background: #f59e0b;
}
.bar-info {
  background: #3b82f6;
}

@keyframes shrink {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

/* Transitions */
.toast-enter-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-leave-active {
  transition: all 0.2s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(40px) scale(0.95);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(20px) scale(0.97);
}

@media (prefers-reduced-motion: reduce) {
  .toast-progress-bar {
    animation: none;
  }
  .toast-enter-active,
  .toast-leave-active {
    transition: opacity 0.1s ease;
  }
  .toast-enter-from,
  .toast-leave-to {
    opacity: 0;
    transform: none;
  }
}
</style>
