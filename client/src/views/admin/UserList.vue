<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { listUsers, deleteUser } from '../../services/adminApi';
import type { AdminUser } from '../../types/admin';
import ConfirmModal from '../../components/shared/ConfirmModal.vue';
import RegalButton from '../../components/admin/RegalButton.vue';
import TablePagination from '../../components/shared/TablePagination.vue';
import { usePagination } from '../../composables/usePagination';
import { PAGE_LIMIT } from '../../constants';

const router = useRouter();

const search = ref('');
const qaFilterOnly = ref(false);

const {
  items: users,
  page,
  total,
  loading,
  error,
  resetAndLoad,
} = usePagination<AdminUser>({
  fetcher: (params) =>
    listUsers(
      { ...params, search: search.value || undefined },
      qaFilterOnly.value ? { qaRoleOptIn: true } : undefined,
    ),
});

let searchTimer: ReturnType<typeof setTimeout> | null = null;
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(resetAndLoad, 300);
});

function toggleQaFilter() {
  qaFilterOnly.value = !qaFilterOnly.value;
  resetAndLoad();
}

const confirmDelete = ref<AdminUser | null>(null);
const deleting = ref(false);

async function onDelete() {
  if (!confirmDelete.value) return;
  const id = confirmDelete.value.id;
  deleting.value = true;
  try {
    await deleteUser(id);
    users.value = users.value.filter((u) => u.id !== id);
    confirmDelete.value = null;
  } catch {
    error.value = 'Failed to delete user.';
    confirmDelete.value = null;
  } finally {
    deleting.value = false;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}
</script>

<template>
  <div class="max-w-[1000px]">
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3"
    >
      <div class="flex items-center gap-2.5">
        <h2 class="text-xl font-bold text-slate-900 dark:text-white">Users</h2>
        <span
          class="bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] rounded-full px-2 py-0.5 text-xs font-semibold text-slate-500"
          >{{ total }}</span
        >
      </div>
      <div class="flex flex-wrap items-center gap-2.5">
        <input
          v-model="search"
          class="px-3 py-1.5 border border-slate-200 dark:border-white/[0.08] rounded-lg bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-white text-[13px] w-full sm:w-44 placeholder-slate-400 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none"
          placeholder="Search users…"
        />
        <button
          class="px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-colors"
          :class="
            qaFilterOnly
              ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
              : 'bg-slate-50 dark:bg-background-dark border-slate-200 dark:border-white/[0.08] text-slate-500 hover:border-purple-500/30 hover:text-purple-400'
          "
          @click="toggleQaFilter"
        >
          QA Opt-In
        </button>
        <RegalButton
          variant="primary"
          size="sm"
          @click="router.push({ name: 'admin-user-create' })"
        >
          + Add User
        </RegalButton>
      </div>
    </div>

    <div v-if="loading" class="text-sm text-slate-400">Loading…</div>
    <div v-else-if="error" class="text-sm text-red-400">{{ error }}</div>

    <template v-else>
      <div v-if="users.length === 0" class="text-sm text-slate-400">
        No users registered yet.
      </div>

      <template v-else>
        <!-- Desktop table -->
        <div
          class="hidden sm:block overflow-x-auto border border-slate-200 dark:border-white/[0.06] rounded-xl"
        >
          <table class="w-full text-[13px]">
            <thead>
              <tr>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Roll No
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Name
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Email
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Role
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Phone
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Registered
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="u in users"
                :key="u.id"
                class="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                @click="
                  router.push({ name: 'admin-user-edit', params: { id: u.id } })
                "
              >
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle font-mono text-xs text-slate-500"
                >
                  {{ u.rollNumber }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle font-medium"
                >
                  {{ u.firstName }} {{ u.lastName }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] align-middle text-slate-500"
                >
                  {{ u.email }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle"
                >
                  <span
                    class="inline-flex px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider"
                    :class="
                      u.role === 'ADMIN'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-slate-500/10 text-slate-400'
                    "
                    >{{ u.role }}</span
                  >
                  <span
                    v-if="u.metadata?.qaRoleOptIn"
                    class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 ml-1"
                    >QA</span
                  >
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] align-middle text-slate-500"
                >
                  {{
                    u.countryCode && u.phoneNumber
                      ? `${u.countryCode} ${u.phoneNumber}`
                      : '-'
                  }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle font-mono text-xs text-slate-500"
                >
                  {{ formatDate(u.createdAt) }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle"
                  @click.stop
                >
                  <div class="flex gap-1.5 items-center">
                    <RegalButton
                      @click="
                        router.push({
                          name: 'admin-user-edit',
                          params: { id: u.id },
                        })
                      "
                    >
                      Edit
                    </RegalButton>
                    <RegalButton variant="danger" @click="confirmDelete = u">
                      Delete
                    </RegalButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile cards -->
        <div class="sm:hidden space-y-2">
          <div
            v-for="u in users"
            :key="u.id"
            class="border border-slate-200 dark:border-white/[0.06] rounded-xl p-3.5 bg-white dark:bg-surface-dark cursor-pointer"
            @click="
              router.push({ name: 'admin-user-edit', params: { id: u.id } })
            "
          >
            <div class="flex items-start justify-between gap-2 mb-2">
              <div class="font-medium text-sm text-slate-900 dark:text-white">
                {{ u.firstName }} {{ u.lastName }}
              </div>
              <div class="flex items-center gap-1 flex-shrink-0">
                <span
                  class="inline-flex px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider"
                  :class="
                    u.role === 'ADMIN'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-slate-500/10 text-slate-400'
                  "
                  >{{ u.role }}</span
                >
                <span
                  v-if="u.metadata?.qaRoleOptIn"
                  class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400"
                  >QA</span
                >
              </div>
            </div>
            <div class="text-xs text-slate-500 space-y-0.5 mb-3">
              <div>Roll: {{ u.rollNumber }}</div>
              <div>{{ u.email }}</div>
              <div v-if="u.countryCode || u.phoneNumber">
                {{ u.countryCode }} {{ u.phoneNumber }}
              </div>
            </div>
            <div class="flex gap-1.5 flex-wrap" @click.stop>
              <RegalButton
                @click="
                  router.push({ name: 'admin-user-edit', params: { id: u.id } })
                "
                >Edit</RegalButton
              >
              <RegalButton variant="danger" @click="confirmDelete = u"
                >Delete</RegalButton
              >
            </div>
          </div>
        </div>
      </template>
    </template>

    <TablePagination
      :page="page"
      :total="total"
      :limit="PAGE_LIMIT"
      @update:page="page = $event"
    />

    <ConfirmModal
      v-if="confirmDelete"
      title="Delete User"
      :message="`Delete user &quot;${confirmDelete.firstName} ${confirmDelete.lastName}&quot; (${confirmDelete.rollNumber})? This cannot be undone.`"
      confirm-label="Delete"
      :danger="true"
      @confirm="onDelete"
      @cancel="confirmDelete = null"
    />
  </div>
</template>
