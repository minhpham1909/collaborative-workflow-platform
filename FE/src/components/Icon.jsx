import {
  Archive, Bell, CalendarDays, Check, ChevronLeft, ChevronRight, CodeXml, Eye, EyeOff,
  FileText, Folder, House, Layers, LayoutGrid, List, ListTodo, Megaphone,
  Menu, Monitor, Moon, Sun, Pin, PinOff, Palette, Plus, RefreshCw, Search, Settings2, SlidersHorizontal, UsersRound, X,
} from 'lucide-react';
// Static imports retain the shared name API and allow tree shaking.
const icons = {
  pin: Pin, 'pin-off': PinOff, search: Search, refresh: RefreshCw, plus: Plus, menu: Menu, close: X,
  'chevron-left': ChevronLeft, 'chevron-right': ChevronRight, grid: LayoutGrid, list: List, archive: Archive,
  eye: Eye, 'eye-off': EyeOff, calendar: CalendarDays, check: Check, folder: Folder,
  palette: Palette, code: CodeXml, megaphone: Megaphone, layers: Layers,
  document: FileText, people: UsersRound, home: House, tasks: ListTodo,
  sun: Sun, moon: Moon, monitor: Monitor, bell: Bell, settings: Settings2, filter: SlidersHorizontal,
};
export default function Icon({ name, className = '' }) {
  const Glyph = icons[name] ?? SlidersHorizontal;
  return <Glyph className={'ui-icon ' + className} size={24} strokeWidth={1.8} aria-hidden="true" focusable="false" />;
}
