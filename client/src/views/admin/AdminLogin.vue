<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import type { User } from '../../types';
import api from '../../services/api';
import { brand } from '../../config/brand';

interface AuthResponse {
  accessToken?: string;
  user?: User;
}

const router = useRouter();
const authStore = useAuthStore();

const mode = ref<'login' | 'signup'>('login');
const email = ref('');
const password = ref('');
const firstName = ref('');
const lastName = ref('');
const setupKey = ref('');
const error = ref('');
const loading = ref(false);

onMounted(() => {
  if (authStore.isAuthenticated && authStore.user?.role === 'ADMIN') {
    void router.replace({ name: 'admin-dashboard' });
  }
});

async function submitLogin() {
  error.value = '';
  if (!email.value || !password.value) {
    error.value = 'Email and password are required.';
    return;
  }

  loading.value = true;
  try {
    const { data } = await api.post<AuthResponse>('/auth/login', {
      email: email.value,
      password: password.value,
    });

    if (!data.accessToken) throw new Error('No token in response');
    authStore.setToken(data.accessToken);

    if (data.user) {
      authStore.setUser(data.user);
    } else {
      const me = await api.get<User>('/auth/me');
      authStore.setUser(me.data);
    }

    if (authStore.user?.role !== 'ADMIN') {
      authStore.logout();
      error.value = 'Access denied. Admin account required.';
      return;
    }

    void router.replace({ name: 'admin-dashboard' });
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response
      ?.status;
    if (status === 401) {
      error.value = 'Invalid email or password.';
    } else {
      error.value = 'Login failed. Please try again.';
    }
  } finally {
    loading.value = false;
  }
}

async function submitSignup() {
  error.value = '';
  if (
    !setupKey.value ||
    !firstName.value ||
    !lastName.value ||
    !email.value ||
    !password.value
  ) {
    error.value = 'All fields are required.';
    return;
  }

  loading.value = true;
  try {
    const { data } = await api.post<AuthResponse>('/admin/register', {
      setupKey: setupKey.value,
      firstName: firstName.value,
      lastName: lastName.value,
      email: email.value,
      password: password.value,
    });

    if (!data.accessToken) throw new Error('No token in response');
    authStore.setToken(data.accessToken);
    if (data.user) authStore.setUser(data.user);

    void router.replace({ name: 'admin-dashboard' });
  } catch (err: unknown) {
    const res = (
      err as { response?: { status?: number; data?: { message?: string } } }
    )?.response;
    if (res?.status === 403) {
      error.value = 'Invalid setup key.';
    } else if (res?.status === 409) {
      error.value = res.data?.message || 'User already exists.';
    } else {
      error.value = 'Registration failed. Please try again.';
    }
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-root">
    <!-- Background grid + glow -->
    <div class="bg-grid" aria-hidden="true" />
    <div class="bg-glow" aria-hidden="true" />

    <div class="card">
      <!-- Logo + heading -->
      <div class="card-header">
        <img
          :src="brand.logoPath"
          :alt="brand.appName"
          class="logo"
          style="filter: drop-shadow(0 0 12px rgb(var(--color-primary) / 0.6))"
        />
        <p class="subtitle">Admin Panel</p>
      </div>

      <!-- Mode tabs -->
      <div class="tabs">
        <button
          class="tab"
          :class="mode === 'login' ? 'tab-active' : 'tab-inactive'"
          @click="
            mode = 'login';
            error = '';
          "
        >
          Sign In
        </button>
        <button
          class="tab"
          :class="mode === 'signup' ? 'tab-active' : 'tab-inactive'"
          @click="
            mode = 'signup';
            error = '';
          "
        >
          Sign Up
        </button>
      </div>

      <!-- Login form -->
      <form v-if="mode === 'login'" class="form" @submit.prevent="submitLogin">
        <div class="field">
          <label class="label">Email</label>
          <input
            v-model="email"
            type="email"
            class="input"
            placeholder="admin@example.com"
            autocomplete="username"
            :disabled="loading"
          />
        </div>

        <div class="field">
          <label class="label">Password</label>
          <input
            v-model="password"
            type="password"
            class="input"
            placeholder="••••••••"
            autocomplete="current-password"
            :disabled="loading"
          />
        </div>

        <div v-if="error" class="error-box">
          <span class="material-symbols-outlined text-[14px]">error</span>
          {{ error }}
        </div>

        <button type="submit" class="submit-btn" :disabled="loading">
          <span v-if="loading" class="btn-spinner" />
          {{ loading ? 'Signing in…' : 'Sign In' }}
        </button>
      </form>

      <!-- Signup form -->
      <form v-else class="form" @submit.prevent="submitSignup">
        <div class="field">
          <label class="label">Setup Key</label>
          <input
            v-model="setupKey"
            type="password"
            class="input"
            placeholder="Secret admin setup key"
            autocomplete="off"
            :disabled="loading"
          />
        </div>

        <div class="name-row">
          <div class="field">
            <label class="label">First Name</label>
            <input
              v-model="firstName"
              type="text"
              class="input"
              placeholder="John"
              autocomplete="given-name"
              :disabled="loading"
            />
          </div>
          <div class="field">
            <label class="label">Last Name</label>
            <input
              v-model="lastName"
              type="text"
              class="input"
              placeholder="Doe"
              autocomplete="family-name"
              :disabled="loading"
            />
          </div>
        </div>

        <div class="field">
          <label class="label">Email</label>
          <input
            v-model="email"
            type="email"
            class="input"
            placeholder="admin@example.com"
            autocomplete="username"
            :disabled="loading"
          />
        </div>

        <div class="field">
          <label class="label">Password</label>
          <input
            v-model="password"
            type="password"
            class="input"
            placeholder="Min 6 characters"
            autocomplete="new-password"
            :disabled="loading"
          />
        </div>

        <div v-if="error" class="error-box">
          <span class="material-symbols-outlined text-[14px]">error</span>
          {{ error }}
        </div>

        <button type="submit" class="submit-btn" :disabled="loading">
          <span v-if="loading" class="btn-spinner" />
          {{ loading ? 'Creating account…' : 'Create Admin Account' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-root {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #080a0f;
  padding: 24px;
  position: relative;
  overflow: hidden;
  font-family: 'Figtree', sans-serif;
}

/* Subtle dot-grid background */
.bg-grid {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(
    rgba(255, 255, 255, 0.04) 1px,
    transparent 1px
  );
  background-size: 28px 28px;
  pointer-events: none;
}

/* Ambient glow */
.bg-glow {
  position: absolute;
  top: -160px;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 400px;
  background: radial-gradient(
    ellipse at center,
    rgb(var(--color-primary) / 0.12) 0%,
    transparent 70%
  );
  pointer-events: none;
}

/* Card */
.card {
  width: 100%;
  max-width: 420px;
  background: #0d1117;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  padding: 36px 32px 32px;
  box-shadow:
    0 24px 64px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(255, 255, 255, 0.03);
  position: relative;
  z-index: 1;
}

/* Top accent line */
.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 20%;
  right: 20%;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgb(var(--color-primary) / 0.6),
    transparent
  );
  border-radius: 1px;
}

.card-header {
  text-align: center;
  margin-bottom: 28px;
}

.logo {
  height: 40px;
  object-fit: contain;
  margin: 0 auto 12px;
  display: block;
}

.subtitle {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #475569;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 4px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 3px;
  margin-bottom: 24px;
}

.tab {
  flex: 1;
  padding: 7px 0;
  font-size: 13px;
  font-weight: 500;
  border-radius: 7px;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'Figtree', sans-serif;
}

.tab-active {
  background: rgb(var(--color-primary));
  color: #fff;
  box-shadow: 0 2px 8px rgb(var(--color-primary) / 0.35);
}

.tab-inactive {
  background: transparent;
  color: #64748b;
}
.tab-inactive:hover {
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.04);
}

/* Form */
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.name-row {
  display: flex;
  gap: 12px;
}
.name-row .field {
  flex: 1;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 11.5px;
  font-weight: 600;
  color: #64748b;
  letter-spacing: 0.02em;
}

.input {
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13.5px;
  color: #f1f5f9;
  font-family: 'Figtree', sans-serif;
  outline: none;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.input::placeholder {
  color: #334155;
}
.input:focus {
  border-color: rgb(var(--color-primary) / 0.45);
  box-shadow: 0 0 0 3px rgb(var(--color-primary) / 0.08);
}
.input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Error */
.error-box {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: #f87171;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.18);
  border-radius: 8px;
  padding: 9px 12px;
}

/* Submit button */
.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 11px 0;
  margin-top: 4px;
  background: rgb(var(--color-primary));
  color: #fff;
  font-size: 13.5px;
  font-weight: 600;
  font-family: 'Figtree', sans-serif;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition:
    background 0.15s,
    box-shadow 0.15s,
    opacity 0.15s;
  box-shadow: 0 4px 16px rgb(var(--color-primary) / 0.3);
}
.submit-btn:hover:not(:disabled) {
  background: color-mix(in srgb, rgb(var(--color-primary)) 85%, black);
  box-shadow: 0 4px 24px rgb(var(--color-primary) / 0.45);
}
.submit-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* Spinner */
.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
