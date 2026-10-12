import { createContext, useContext, useEffect, useState } from 'react';
const ThemeContext = createContext(null);
const valid = value => ['system', 'light', 'dark'].includes(value) ? value : 'system';
export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(() => valid(document.documentElement.dataset.themePreference));
  const [stored, setStored] = useState(true);
  useEffect(() => {
    const system = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const resolved = preference === 'system' ? system.matches ? 'dark' : 'light' : preference;
      document.documentElement.dataset.themePreference = preference;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
    };
    apply(); system.addEventListener('change', apply);
    return () => system.removeEventListener('change', apply);
  }, [preference]);
  useEffect(() => {
    const sync = event => { if (event.key === 'workflow.theme' || event.key === null) setPreference(valid(event.newValue)); };
    window.addEventListener('storage', sync); return () => window.removeEventListener('storage', sync);
  }, []);
  function choose(value) {
    const next = valid(value); setPreference(next);
    try { localStorage.setItem('workflow.theme', next); setStored(true); } catch { setStored(false); }
  }
  return <ThemeContext.Provider value={{ preference, choose, stored }}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
