import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ActiveTab = 'api-docs' | 'api-client' | 'code-editor';
export type BottomTab = 'run-results' | 'custom-input' | 'test-results';

export const useUiStore = defineStore('ui', () => {
  const activeTab = ref<ActiveTab>(
    (localStorage.getItem('activeTab') as ActiveTab) || 'api-docs',
  );
  const bottomTab = ref<BottomTab>('run-results');
  const bannerDismissed = ref(
    (() => {
      try {
        const raw = localStorage.getItem('bannerDismissedExamId');
        const examRaw = localStorage.getItem('cachedActiveExam');
        if (!raw || !examRaw) return false;
        const examId = (JSON.parse(examRaw) as { id: number }).id;
        return raw === String(examId);
      } catch {
        return false;
      }
    })(),
  );
  const sidebarWidth = ref(
    parseInt(sessionStorage.getItem('sidebarWidth') || '400', 10),
  );
  const bottomPanelHeight = ref(
    parseInt(sessionStorage.getItem('bottomPanelHeight') || '200', 10),
  );
  const sidebarCollapsed = ref(false);
  const editorExpanded = ref(false);
  const coachmarksVisible = ref(
    localStorage.getItem('coachmarksDismissed') !== 'true',
  );
  const helpModalVisible = ref(false);

  function setActiveTab(tab: ActiveTab) {
    activeTab.value = tab;
    localStorage.setItem('activeTab', tab);
  }

  function setBottomTab(tab: BottomTab) {
    bottomTab.value = tab;
  }

  function dismissBanner() {
    bannerDismissed.value = true;
    try {
      const examRaw = localStorage.getItem('cachedActiveExam');
      if (examRaw) {
        const examId = (JSON.parse(examRaw) as { id: number }).id;
        localStorage.setItem('bannerDismissedExamId', String(examId));
      }
    } catch {
      // ignore
    }
  }

  function setSidebarWidth(w: number) {
    sidebarWidth.value = w;
    sessionStorage.setItem('sidebarWidth', String(w));
  }

  function setBottomPanelHeight(h: number) {
    bottomPanelHeight.value = h;
    sessionStorage.setItem('bottomPanelHeight', String(h));
  }

  function setSidebarCollapsed(val: boolean) {
    if (!val && sidebarWidth.value < 280) setSidebarWidth(400);
    sidebarCollapsed.value = val;
  }

  function toggleEditorExpanded() {
    editorExpanded.value = !editorExpanded.value;
  }

  function dismissCoachmarks() {
    coachmarksVisible.value = false;
    localStorage.setItem('coachmarksDismissed', 'true');
  }

  function showCoachmarks() {
    localStorage.removeItem('coachmarksDismissed');
    coachmarksVisible.value = true;
  }

  function openHelpModal() {
    helpModalVisible.value = true;
  }

  function closeHelpModal() {
    helpModalVisible.value = false;
  }

  return {
    activeTab,
    bottomTab,
    bannerDismissed,
    sidebarWidth,
    bottomPanelHeight,
    sidebarCollapsed,
    editorExpanded,
    coachmarksVisible,
    helpModalVisible,
    setActiveTab,
    setBottomTab,
    dismissBanner,
    setSidebarWidth,
    setBottomPanelHeight,
    setSidebarCollapsed,
    toggleEditorExpanded,
    dismissCoachmarks,
    showCoachmarks,
    openHelpModal,
    closeHelpModal,
  };
});
