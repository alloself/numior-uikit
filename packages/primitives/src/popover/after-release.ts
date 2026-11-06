export const afterRelease = (event: MouseEvent, action: () => void): void => {
  if (event.buttons === 0) {
    action();
    return;
  }

  const released = (): void => {
    window.removeEventListener('pointerup', released, true);
    window.removeEventListener('pointercancel', released, true);
    window.setTimeout(action, 0);
  };

  window.addEventListener('pointerup', released, true);
  window.addEventListener('pointercancel', released, true);
};
