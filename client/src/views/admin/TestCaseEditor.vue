<script setup lang="ts">
import type { TestCaseRow } from '../../types/admin';
import RegalButton from '../../components/admin/RegalButton.vue';

const props = defineProps<{
  modelValue: TestCaseRow[];
}>();

const emit = defineEmits<{
  'update:modelValue': [rows: TestCaseRow[]];
}>();

let keyCounter = 0;

function newRow(): TestCaseRow {
  return {
    _key: `tc_${Date.now()}_${keyCounter++}`,
    input: '',
    expectedOutput: '',
    isVisible: false,
    displayOrder: props.modelValue.length,
  };
}

function addRow() {
  const next = [...props.modelValue, newRow()];
  emit('update:modelValue', next);
}

function removeRow(key: string) {
  const next = props.modelValue
    .filter((r) => r._key !== key)
    .map((r, i) => ({ ...r, displayOrder: i }));
  emit('update:modelValue', next);
}

function updateRow(key: string, field: keyof TestCaseRow, value: unknown) {
  const next = props.modelValue.map((r) =>
    r._key === key ? { ...r, [field]: value } : r,
  );
  emit('update:modelValue', next);
}
</script>

<template>
  <div
    class="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/[0.06] rounded-xl overflow-hidden"
  >
    <div
      class="flex items-center gap-3 px-[18px] py-3.5 border-b border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02]"
    >
      <span
        class="text-[13px] font-bold text-slate-900 dark:text-white uppercase tracking-wider"
        >Test Cases</span
      >
      <span class="text-xs text-slate-400 flex-1"
        >{{ modelValue.length }} case{{
          modelValue.length !== 1 ? 's' : ''
        }}</span
      >
      <RegalButton type="button" @click="addRow"> + Add Test Case </RegalButton>
    </div>

    <div
      v-if="modelValue.length === 0"
      class="py-6 text-[13px] text-slate-400 text-center"
    >
      No test cases yet. Add at least one.
    </div>

    <div v-else class="flex flex-col">
      <div
        v-for="(row, i) in modelValue"
        :key="row._key"
        class="border-b border-slate-200 dark:border-white/[0.06] last:border-b-0 px-[18px] py-4"
      >
        <div class="flex items-center gap-3 mb-3">
          <span class="text-xs font-bold text-slate-500 font-mono min-w-[60px]"
            >Test #{{ i + 1 }}</span
          >
          <label
            class="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer flex-1"
          >
            <input
              type="checkbox"
              :checked="row.isVisible"
              @change="
                updateRow(
                  row._key,
                  'isVisible',
                  ($event.target as HTMLInputElement).checked,
                )
              "
            />
            Visible to students
          </label>
          <input
            type="number"
            class="w-[72px] bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/[0.08] rounded-lg px-2 py-1 text-xs text-center text-slate-900 dark:text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-colors"
            :value="row.displayOrder"
            min="0"
            placeholder="Order"
            title="Display order"
            @input="
              updateRow(
                row._key,
                'displayOrder',
                parseInt(($event.target as HTMLInputElement).value, 10) || 0,
              )
            "
          />
          <RegalButton
            type="button"
            variant="danger"
            @click="removeRow(row._key)"
          >
            ✕
          </RegalButton>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <label
              class="text-[11px] font-semibold uppercase tracking-wider text-slate-500"
              >Input</label
            >
            <textarea
              class="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-colors font-mono leading-relaxed resize-y min-h-[80px]"
              :value="row.input"
              placeholder="stdin input"
              rows="4"
              spellcheck="false"
              @input="
                updateRow(
                  row._key,
                  'input',
                  ($event.target as HTMLTextAreaElement).value,
                )
              "
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label
              class="text-[11px] font-semibold uppercase tracking-wider text-slate-500"
              >Expected Output</label
            >
            <textarea
              class="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-colors font-mono leading-relaxed resize-y min-h-[80px]"
              :value="row.expectedOutput"
              placeholder="expected stdout"
              rows="4"
              spellcheck="false"
              @input="
                updateRow(
                  row._key,
                  'expectedOutput',
                  ($event.target as HTMLTextAreaElement).value,
                )
              "
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
