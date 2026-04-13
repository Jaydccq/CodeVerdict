import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from '../types';

function loadCachedUser(): User | null {
  try {
    return JSON.parse(
      localStorage.getItem('cachedUser') ?? 'null',
    ) as User | null;
  } catch (e) {
    console.warn('[auth] Failed to parse cached user', e);
    return null;
  }
}

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'));
  const user = ref<User | null>(loadCachedUser());

  const isAuthenticated = computed(() => !!accessToken.value);

  function setToken(token: string) {
    accessToken.value = token;
    localStorage.setItem('accessToken', token);
  }

  function setUser(u: User) {
    user.value = u;
    localStorage.setItem('cachedUser', JSON.stringify(u));
  }

  function logout() {
    accessToken.value = null;
    user.value = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('cachedUser');
  }

  return { accessToken, user, isAuthenticated, setToken, setUser, logout };
});
