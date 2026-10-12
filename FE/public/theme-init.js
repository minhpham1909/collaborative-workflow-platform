// Runs before the app/styles to apply the device preference without a light flash.
(() => {
  let preference = 'system';
  try { const saved = localStorage.getItem('workflow.theme'); if (['system', 'light', 'dark'].includes(saved)) preference = saved; } catch {}
  const dark = preference === 'dark' || (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
})();
