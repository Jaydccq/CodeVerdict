<script setup lang="ts">
import { ref, computed } from 'vue';
import { apiGroups } from '../../data/api-docs';
import type { ApiEndpoint } from '../../data/api-docs';
import DocsSidebar from '../docs/DocsSidebar.vue';
import EndpointView from '../docs/EndpointView.vue';
import CodeBlock from '../docs/CodeBlock.vue';
import { brand } from '../../config/brand';

const activeEndpointId = ref('intro');

// Flatten all endpoints for easy lookup
const allEndpoints = computed(() => {
  const map = new Map<string, ApiEndpoint>();
  for (const group of apiGroups) {
    for (const ep of group.endpoints) {
      map.set(ep.id, ep);
    }
  }
  return map;
});

const activeEndpoint = computed(() =>
  allEndpoints.value.get(activeEndpointId.value),
);

function selectEndpoint(id: string) {
  activeEndpointId.value = id;
}
</script>

<template>
  <div class="flex h-full overflow-hidden">
    <!-- Sidebar -->
    <DocsSidebar
      :active-endpoint-id="activeEndpointId"
      @select="selectEndpoint"
    />

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto bg-white dark:bg-background-dark">
      <div class="px-8 py-8">
        <!-- Introduction -->
        <div v-if="activeEndpointId === 'intro'">
          <div class="max-w-3xl">
            <div class="flex items-center gap-3 mb-2">
              <span class="material-symbols-outlined text-primary text-[28px]"
                >terminal</span
              >
              <h1 class="text-3xl font-bold text-slate-900 dark:text-white">
                {{ brand.apiTitle }}
              </h1>
            </div>
            <p class="text-sm text-slate-500 dark:text-slate-400 mb-8">
              Complete API reference. Use these endpoints to register,
              authenticate, fetch problems, and submit your solutions.
            </p>

            <!-- Quick start -->
            <div class="space-y-6">
              <div>
                <h2
                  class="text-lg font-semibold text-slate-900 dark:text-white mb-3"
                >
                  Quick Start
                </h2>
                <div class="space-y-3">
                  <div
                    class="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02]"
                  >
                    <span
                      class="flex items-center justify-center w-6 h-6 rounded bg-primary/10 text-primary text-xs font-bold flex-shrink-0"
                      >1</span
                    >
                    <div>
                      <p
                        class="text-sm font-medium text-slate-900 dark:text-white"
                      >
                        Register your account
                      </p>
                      <p class="text-xs text-slate-500 mt-0.5">
                        Returns your user profile only - no token is issued at
                        registration
                      </p>
                    </div>
                  </div>
                  <div
                    class="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02]"
                  >
                    <span
                      class="flex items-center justify-center w-6 h-6 rounded bg-primary/10 text-primary text-xs font-bold flex-shrink-0"
                      >2</span
                    >
                    <div>
                      <p
                        class="text-sm font-medium text-slate-900 dark:text-white"
                      >
                        Log in to get your token
                      </p>
                      <p class="text-xs text-slate-500 mt-0.5">
                        Save the
                        <code class="bg-slate-200 dark:bg-white/10 px-1 rounded"
                          >accessToken</code
                        >
                        - required for all authenticated requests
                      </p>
                    </div>
                  </div>
                  <div
                    class="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02] cursor-pointer hover:border-primary/30 transition-colors"
                    @click="selectEndpoint('exams-upcoming')"
                  >
                    <span
                      class="flex items-center justify-center w-6 h-6 rounded bg-primary/10 text-primary text-xs font-bold flex-shrink-0"
                      >3</span
                    >
                    <div>
                      <p
                        class="text-sm font-medium text-slate-900 dark:text-white"
                      >
                        Get exam details
                      </p>
                      <p class="text-xs text-slate-500 mt-0.5">
                        Fetch the active exam to get its
                        <code class="bg-slate-200 dark:bg-white/10 px-1 rounded"
                          >id</code
                        >, time window, and allowed languages
                      </p>
                    </div>
                  </div>
                  <div
                    class="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02]"
                  >
                    <span
                      class="flex items-center justify-center w-6 h-6 rounded bg-primary/10 text-primary text-xs font-bold flex-shrink-0"
                      >4</span
                    >
                    <div>
                      <p
                        class="text-sm font-medium text-slate-900 dark:text-white"
                      >
                        Enroll in the exam
                      </p>
                      <p class="text-xs text-slate-500 mt-0.5">
                        Enrollment is required - problems and submissions are
                        inaccessible without it
                      </p>
                    </div>
                  </div>
                  <div
                    class="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02]"
                  >
                    <span
                      class="flex items-center justify-center w-6 h-6 rounded bg-primary/10 text-primary text-xs font-bold flex-shrink-0"
                      >5</span
                    >
                    <div>
                      <p
                        class="text-sm font-medium text-slate-900 dark:text-white"
                      >
                        List problems
                      </p>
                      <p class="text-xs text-slate-500 mt-0.5">
                        Call
                        <code class="bg-slate-200 dark:bg-white/10 px-1 rounded"
                          >GET /api/exams/:examId/problems</code
                        >
                        to get all available problems and their IDs
                      </p>
                    </div>
                  </div>
                  <div
                    class="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02]"
                  >
                    <span
                      class="flex items-center justify-center w-6 h-6 rounded bg-primary/10 text-primary text-xs font-bold flex-shrink-0"
                      >6</span
                    >
                    <div>
                      <p
                        class="text-sm font-medium text-slate-900 dark:text-white"
                      >
                        Fetch problem details by id
                      </p>
                      <p class="text-xs text-slate-500 mt-0.5">
                        Call
                        <code class="bg-slate-200 dark:bg-white/10 px-1 rounded"
                          >GET /api/exams/:examId/problems/:id</code
                        >
                        for full description, constraints, and sample I/O
                      </p>
                    </div>
                  </div>
                  <div
                    class="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02]"
                  >
                    <span
                      class="flex items-center justify-center w-6 h-6 rounded bg-primary/10 text-primary text-xs font-bold flex-shrink-0"
                      >7</span
                    >
                    <div>
                      <p
                        class="text-sm font-medium text-slate-900 dark:text-white"
                      >
                        Write & submit code
                      </p>
                      <p class="text-xs text-slate-500 mt-0.5">
                        Test against sample cases first, then submit for full
                        grading against all hidden test cases
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- QA Role Opt-In banner -->
              <div
                class="px-5 py-4 rounded-xl border border-purple-500/20 bg-purple-500/5 dark:bg-purple-500/10"
              >
                <div class="flex items-start gap-3">
                  <span
                    class="material-symbols-outlined text-purple-400 text-[22px] mt-0.5 flex-shrink-0"
                    >bug_report</span
                  >
                  <div>
                    <h4 class="text-sm font-bold text-purple-400 mb-1">
                      Interested in QA Engineering? Let us know before you start
                    </h4>
                    <p
                      class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-2"
                    >
                      Would you like to be considered for the QA Engineering
                      track if you're not selected as a developer? Add
                      <code
                        class="bg-purple-500/10 text-purple-400 px-1 rounded"
                        >"qaRoleOptIn": true</code
                      >
                      to your
                      <button
                        class="text-purple-400 underline underline-offset-2 hover:text-purple-300 font-medium"
                        @click="selectEndpoint('auth-register')"
                      >
                        registration request
                      </button>
                      - this is your choice to make upfront. Already registered?
                      You can still update your preference via the
                      <button
                        class="text-purple-400 underline underline-offset-2 hover:text-purple-300 font-medium"
                        @click="selectEndpoint('user-qa-opt-in')"
                      >
                        QA Opt-In endpoint
                      </button>
                      any time before the exam ends.
                    </p>
                  </div>
                </div>
              </div>

              <!-- Authentication info -->
              <div>
                <h2
                  class="text-lg font-semibold text-slate-900 dark:text-white mb-3"
                >
                  Authentication
                </h2>
                <p class="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  Most endpoints require a JWT Bearer token. Include it in the
                  Authorization header:
                </p>
                <CodeBlock
                  code="Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
                  title="Header Format"
                />
              </div>

              <!-- Endpoint overview -->
              <div>
                <h2
                  class="text-lg font-semibold text-slate-900 dark:text-white mb-3"
                >
                  Available Endpoints
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div
                    v-for="group in apiGroups"
                    :key="group.id"
                    class="p-4 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02] hover:border-primary/30 transition-colors cursor-pointer"
                    @click="selectEndpoint(group.endpoints[0].id)"
                  >
                    <div class="flex items-center gap-2 mb-2">
                      <span
                        class="material-symbols-outlined text-primary text-[18px]"
                        >{{ group.icon }}</span
                      >
                      <h3
                        class="text-sm font-semibold text-slate-900 dark:text-white"
                      >
                        {{ group.title }}
                      </h3>
                    </div>
                    <p class="text-xs text-slate-500">
                      {{ group.endpoints.length }} endpoint{{
                        group.endpoints.length > 1 ? 's' : ''
                      }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Endpoint Detail -->
        <EndpointView v-else-if="activeEndpoint" :endpoint="activeEndpoint" />
      </div>
    </main>
  </div>
</template>
