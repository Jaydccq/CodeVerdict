<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from 'vue';

export interface SelectOption {
  value: string | number;
  label: string;
}

const props = withDefaults(
  defineProps<{
    modelValue: string | number;
    options: SelectOption[];
    placeholder?: string;
    searchable?: boolean;
    disabled?: boolean;
    required?: boolean;
  }>(),
  {
    placeholder: 'Select…',
    searchable: false,
    disabled: false,
    required: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string | number];
  change: [];
}>();

const open = ref(false);
const searchQuery = ref('');
const highlightIndex = ref(-1);
const wrapperRef = ref<HTMLElement | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);
const listRef = ref<HTMLElement | null>(null);

const selectedLabel = computed(() => {
  const opt = props.options.find((o) => o.value === props.modelValue);
  return opt?.label ?? '';
});

const filtered = computed(() => {
  if (!searchQuery.value) return props.options;
  const q = searchQuery.value.toLowerCase();
  return props.options.filter((o) => o.label.toLowerCase().includes(q));
});

function toggle() {
  if (props.disabled) return;
  if (open.value) {
    close();
  } else {
    openDropdown();
  }
}

function openDropdown() {
  open.value = true;
  searchQuery.value = '';
  highlightIndex.value = -1;
  void nextTick(() => {
    if (props.searchable && searchInputRef.value) {
      searchInputRef.value.focus();
    }
  });
}

function close() {
  open.value = false;
  searchQuery.value = '';
}

function select(opt: SelectOption) {
  emit('update:modelValue', opt.value);
  emit('change');
  close();
}

function onClickOutside(e: MouseEvent) {
  if (wrapperRef.value && !wrapperRef.value.contains(e.target as Node)) {
    close();
  }
}

function onKeydown(e: KeyboardEvent) {
  if (!open.value) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      openDropdown();
    }
    return;
  }

  const list = filtered.value;

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      highlightIndex.value = Math.min(
        highlightIndex.value + 1,
        list.length - 1,
      );
      scrollToHighlighted();
      break;
    case 'ArrowUp':
      e.preventDefault();
      highlightIndex.value = Math.max(highlightIndex.value - 1, 0);
      scrollToHighlighted();
      break;
    case 'Enter':
      e.preventDefault();
      if (highlightIndex.value >= 0 && highlightIndex.value < list.length) {
        select(list[highlightIndex.value]);
      }
      break;
    case 'Escape':
      e.preventDefault();
      close();
      break;
  }
}

function scrollToHighlighted() {
  void nextTick(() => {
    const el = listRef.value?.children[highlightIndex.value] as
      | HTMLElement
      | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  });
}

watch(searchQuery, () => {
  highlightIndex.value = 0;
});

onMounted(() => {
  document.addEventListener('mousedown', onClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onClickOutside);
});
</script>

<template>
  <div ref="wrapperRef" class="relative" @keydown="onKeydown">
    <!-- Trigger button -->
    <button
      type="button"
      class="w-full flex items-center justify-between gap-2 bg-slate-50 dark:bg-background-dark border rounded-lg px-3 py-2 text-sm text-left outline-none transition-colors"
      :class="[
        open
          ? 'border-primary/50 ring-1 ring-primary/20'
          : 'border-slate-200 dark:border-white/[0.08]',
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'cursor-pointer hover:border-slate-300 dark:hover:border-white/[0.12]',
      ]"
      :disabled="disabled"
      @click="toggle"
    >
      <span
        :class="
          selectedLabel ? 'text-slate-900 dark:text-white' : 'text-slate-400'
        "
        class="truncate"
      >
        {{ selectedLabel || placeholder }}
      </span>
      <svg
        class="w-4 h-4 flex-shrink-0 text-slate-400 transition-transform duration-150"
        :class="{ 'rotate-180': open }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>

    <!-- Hidden native input for form validation -->
    <input
      v-if="required"
      type="text"
      :value="modelValue"
      required
      tabindex="-1"
      class="absolute inset-0 opacity-0 pointer-events-none"
    />

    <!-- Dropdown -->
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 scale-[0.97] -translate-y-1"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-[0.97] -translate-y-1"
    >
      <div
        v-if="open"
        class="absolute z-50 mt-1 w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/[0.08] rounded-xl shadow-lg shadow-black/[0.08] dark:shadow-black/[0.25] overflow-hidden"
      >
        <!-- Search input -->
        <div
          v-if="searchable"
          class="p-2 border-b border-slate-100 dark:border-white/[0.06]"
        >
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            class="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/[0.08] rounded-lg px-2.5 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
            placeholder="Search…"
            @keydown.stop="onKeydown"
          />
        </div>

        <!-- Options list -->
        <div ref="listRef" class="max-h-[220px] overflow-y-auto py-1">
          <div
            v-if="filtered.length === 0"
            class="px-3 py-2 text-sm text-slate-400 text-center"
          >
            No results
          </div>
          <button
            v-for="(opt, i) in filtered"
            :key="opt.value"
            type="button"
            class="w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2"
            :class="[
              opt.value === modelValue
                ? 'bg-primary/[0.08] text-primary font-medium'
                : i === highlightIndex
                  ? 'bg-slate-50 dark:bg-white/[0.04] text-slate-900 dark:text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]',
            ]"
            @click="select(opt)"
            @mouseenter="highlightIndex = i"
          >
            <span class="truncate flex-1">{{ opt.label }}</span>
            <svg
              v-if="opt.value === modelValue"
              class="w-4 h-4 flex-shrink-0 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
