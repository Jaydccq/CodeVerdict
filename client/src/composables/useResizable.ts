import { onUnmounted } from 'vue';

export type ResizeDirection = 'horizontal' | 'vertical';

export function useResizable(
  direction: ResizeDirection,
  onResize: (delta: number) => void,
) {
  let startPos = 0;
  let active = false;

  function onMouseDown(e: MouseEvent) {
    if (active) return;
    e.preventDefault();
    active = true;
    startPos = direction === 'vertical' ? e.clientX : e.clientY;
    document.body.style.userSelect = 'none';
    document.body.style.cursor =
      direction === 'vertical' ? 'col-resize' : 'row-resize';

    const monacoEls = document.querySelectorAll<HTMLElement>('.monaco-editor');
    monacoEls.forEach((el) => {
      el.style.pointerEvents = 'none';
    });

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  function onMouseMove(e: MouseEvent) {
    if (!active) return;
    const current = direction === 'vertical' ? e.clientX : e.clientY;
    const delta = current - startPos;
    startPos = current;
    onResize(delta);
  }

  function onMouseUp() {
    active = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';

    const monacoEls = document.querySelectorAll<HTMLElement>('.monaco-editor');
    monacoEls.forEach((el) => {
      el.style.pointerEvents = '';
    });

    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  onUnmounted(() => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  });

  return { onMouseDown };
}
