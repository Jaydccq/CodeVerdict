import { type Ref, ref, watch } from 'vue';
import { PAGE_LIMIT } from '../constants';
import type { PaginatedResponse, PaginationParams } from '../types/admin';

export interface UsePaginationOptions<T> {
  limit?: number;
  fetcher: (params: PaginationParams) => Promise<PaginatedResponse<T>>;
  immediate?: boolean;
}

export interface UsePaginationReturn<T> {
  items: Ref<T[]>;
  page: Ref<number>;
  total: Ref<number>;
  loading: Ref<boolean>;
  error: Ref<string>;
  load: () => Promise<void>;
  resetAndLoad: () => void;
}

export function usePagination<T>(
  options: UsePaginationOptions<T>,
): UsePaginationReturn<T> {
  const limit = options.limit ?? PAGE_LIMIT;
  const items = ref<T[]>([]) as Ref<T[]>;
  const page = ref(1);
  const total = ref(0);
  const loading = ref(false);
  const error = ref('');

  let skipNextWatch = false;

  async function load() {
    loading.value = true;
    error.value = '';
    try {
      const result = await options.fetcher({ page: page.value, limit });
      items.value = result.data;
      total.value = result.total;
    } catch {
      error.value = 'Failed to load data.';
    } finally {
      loading.value = false;
    }
  }

  function resetAndLoad() {
    if (page.value === 1) {
      void load();
    } else {
      skipNextWatch = true;
      page.value = 1;
      // watcher fires asynchronously - it will see skipNextWatch=true and call load() itself
    }
  }

  watch(page, () => {
    if (skipNextWatch) {
      skipNextWatch = false;
      void load();
      return;
    }
    void load();
  });

  if (options.immediate !== false) {
    void load();
  }

  return { items, page, total, loading, error, load, resetAndLoad };
}
