import { useAuthLocale } from '../features/auth/AuthLocale.jsx';
import { shellText } from './shell-copy.js';
export function useShellText() {
  const { locale } = useAuthLocale();
  return { locale, t: (value, values) => shellText(value, locale, values) };
}
