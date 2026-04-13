<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import RegalButton from '../../components/admin/RegalButton.vue';
import RegalSelect from '../../components/admin/RegalSelect.vue';
import { useRoute, useRouter } from 'vue-router';
import { getUser, createUser, updateUser } from '../../services/adminApi';

const route = useRoute();
const router = useRouter();

const isEdit = computed(() => !!route.params.id);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const errorRaw = ref('');

const form = ref({
  rollNumber: '',
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  countryCode: '',
  phoneNumber: '',
  role: 'STUDENT' as 'STUDENT' | 'ADMIN',
});

onMounted(async () => {
  if (!isEdit.value) return;
  loading.value = true;
  try {
    const u = await getUser(Number(route.params.id));
    form.value = {
      rollNumber: u.rollNumber ?? '',
      firstName: u.firstName ?? '',
      lastName: u.lastName ?? '',
      email: u.email ?? '',
      password: '',
      countryCode: u.countryCode ?? '',
      phoneNumber: u.phoneNumber ?? '',
      role: u.role ?? 'STUDENT',
    };
  } catch (err: unknown) {
    const e = extractError(err);
    error.value = 'Failed to load user.';
    errorRaw.value = e.raw;
  } finally {
    loading.value = false;
  }
});

async function save() {
  saving.value = true;
  error.value = '';
  errorRaw.value = '';
  try {
    if (isEdit.value) {
      await updateUser(Number(route.params.id), {
        firstName: form.value.firstName,
        lastName: form.value.lastName,
        email: form.value.email,
        countryCode: form.value.countryCode || undefined,
        phoneNumber: form.value.phoneNumber || undefined,
        role: form.value.role,
      });
    } else {
      await createUser({
        rollNumber: form.value.rollNumber,
        firstName: form.value.firstName,
        lastName: form.value.lastName,
        email: form.value.email,
        password: form.value.password,
        role: form.value.role,
      });
    }
    void router.push({ name: 'admin-users' });
  } catch (err: unknown) {
    const e = extractError(err);
    error.value = isEdit.value
      ? 'Failed to update user.'
      : 'Failed to create user.';
    errorRaw.value = e.raw;
  } finally {
    saving.value = false;
  }
}

function extractError(err: unknown): { message: string; raw: string } {
  const ax = err as {
    response?: { status?: number; statusText?: string; data?: unknown };
    message?: string;
  };
  if (ax.response) {
    const respData = ax.response.data as { message?: string } | undefined;
    return {
      message: respData?.message ?? ax.response.statusText ?? 'Error',
      raw: `${ax.response.status} ${ax.response.statusText}: ${JSON.stringify(ax.response.data, null, 2)}`,
    };
  }
  return {
    message: ax.message ?? 'Unknown error',
    raw: ax.message ?? 'Unknown error',
  };
}
</script>

<template>
  <div class="max-w-[620px]">
    <div class="flex items-center gap-3 mb-6">
      <RegalButton @click="router.push({ name: 'admin-users' })"
        >← Back</RegalButton
      >
      <h2 class="text-xl font-bold text-slate-900 dark:text-white">
        {{ isEdit ? 'Edit User' : 'Create User' }}
      </h2>
    </div>

    <div v-if="loading" class="text-sm text-slate-400">Loading…</div>

    <form v-else class="flex flex-col gap-[18px]" @submit.prevent="save">
      <div
        v-if="isEdit"
        class="flex gap-6 px-4 py-3 bg-slate-50 dark:bg-white/[0.02] rounded-lg border border-slate-200 dark:border-white/[0.06]"
      >
        <div class="flex flex-col gap-0.5">
          <span
            class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold"
            >ID</span
          >
          <span class="text-sm text-slate-900 dark:text-white font-mono">{{
            route.params.id
          }}</span>
        </div>
        <div class="flex flex-col gap-0.5">
          <span
            class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold"
            >Roll Number</span
          >
          <span class="text-sm text-slate-900 dark:text-white font-mono">{{
            form.rollNumber
          }}</span>
        </div>
      </div>

      <div v-if="!isEdit" class="flex flex-col gap-1.5">
        <label
          class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
          >Roll Number <span class="text-primary ml-0.5">*</span></label
        >
        <input
          v-model="form.rollNumber"
          class="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-colors"
          required
        />
      </div>

      <div class="flex flex-col sm:flex-row gap-3.5">
        <div class="flex flex-col gap-1.5 flex-1">
          <label
            class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
            >First Name <span class="text-primary ml-0.5">*</span></label
          >
          <input
            v-model="form.firstName"
            class="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-colors"
            required
          />
        </div>
        <div class="flex flex-col gap-1.5 flex-1">
          <label
            class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
            >Last Name <span class="text-primary ml-0.5">*</span></label
          >
          <input
            v-model="form.lastName"
            class="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-colors"
            required
          />
        </div>
      </div>

      <div class="flex flex-col gap-1.5">
        <label
          class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
          >Email <span class="text-primary ml-0.5">*</span></label
        >
        <input
          v-model="form.email"
          type="email"
          class="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-colors"
          required
        />
      </div>

      <div v-if="!isEdit" class="flex flex-col gap-1.5">
        <label
          class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
          >Password <span class="text-primary ml-0.5">*</span></label
        >
        <input
          v-model="form.password"
          type="password"
          class="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-colors"
          minlength="6"
          required
        />
        <span class="text-[11px] text-slate-400">Minimum 6 characters</span>
      </div>

      <div class="flex flex-col sm:flex-row gap-3.5">
        <div class="flex flex-col gap-1.5 flex-[0.4]">
          <label
            class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
            >Country Code</label
          >
          <input
            v-model="form.countryCode"
            class="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-colors"
            placeholder="+1"
          />
        </div>
        <div class="flex flex-col gap-1.5 flex-[0.6]">
          <label
            class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
            >Phone Number</label
          >
          <input
            v-model="form.phoneNumber"
            class="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-colors"
          />
        </div>
      </div>

      <div class="flex flex-col gap-1.5">
        <label
          class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
          >Role</label
        >
        <RegalSelect
          v-model="form.role"
          :options="[
            { value: 'STUDENT', label: 'STUDENT' },
            { value: 'ADMIN', label: 'ADMIN' },
          ]"
          placeholder="Select role…"
        />
      </div>

      <div
        v-if="error"
        class="border-l-[3px] border-red-500 bg-slate-50 dark:bg-white/[0.02] p-3 rounded-r-lg"
      >
        <div class="text-sm text-red-400 font-medium">{{ error }}</div>
        <pre
          v-if="errorRaw"
          class="mt-2 font-mono text-xs text-slate-400 max-h-[120px] overflow-y-auto whitespace-pre-wrap break-all"
          >{{ errorRaw }}</pre
        >
      </div>

      <div class="flex gap-2.5 pt-2">
        <RegalButton
          type="submit"
          variant="primary"
          size="sm"
          :disabled="saving"
        >
          {{ saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User' }}
        </RegalButton>
        <RegalButton type="button" @click="router.push({ name: 'admin-users' })"
          >Cancel</RegalButton
        >
      </div>
    </form>
  </div>
</template>
