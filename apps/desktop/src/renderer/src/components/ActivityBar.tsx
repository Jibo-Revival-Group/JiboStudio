import type { ActivityIconId } from './icons';
import { ActivityIcon } from './icons';

type SidebarView = 'explorer' | 'robot' | 'debug' | 'api' | 'tutorial' | 'settings';

interface ActivityBarProps {
  active: SidebarView;
  onChange: (view: SidebarView) => void;
  hasProject: boolean;
}

const items: { id: SidebarView; icon: ActivityIconId; title: string }[] = [
  { id: 'explorer', icon: 'folder', title: 'Explorer' },
  { id: 'robot', icon: 'jibo', title: 'Robot' },
  { id: 'debug', icon: 'bug_report', title: 'Debugger' },
  { id: 'api', icon: 'menu_book', title: 'API Docs' },
  { id: 'tutorial', icon: 'help', title: 'Tutorial' },
  { id: 'settings', icon: 'settings', title: 'Settings' },
];

export function ActivityBar({ active, onChange }: ActivityBarProps) {
  return (
    <>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`js-activity-btn ${active === item.id ? 'active' : ''}`}
          title={item.title}
          aria-label={item.title}
          onClick={() => onChange(item.id)}
        >
          <ActivityIcon icon={item.icon} title={item.title} />
        </button>
      ))}
    </>
  );
}
