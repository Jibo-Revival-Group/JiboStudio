import type { ActivityIconId } from './icons';
import { ActivityIcon } from './icons';

type SidebarView = 'explorer' | 'robot' | 'debug' | 'guide' | 'api' | 'tutorial' | 'settings';

interface ActivityBarProps {
  active: SidebarView;
  sidebarVisible: boolean;
  onChange: (view: SidebarView) => void;
  hasProject: boolean;
}

const items: { id: SidebarView; icon: ActivityIconId; title: string }[] = [
  { id: 'explorer', icon: 'folder', title: 'Explorer' },
  { id: 'robot', icon: 'jibo', title: 'Robot' },
  { id: 'debug', icon: 'bug_report', title: 'Debugger' },
  { id: 'guide', icon: 'auto_stories', title: 'JiboScript Guide' },
  { id: 'api', icon: 'menu_book', title: 'Jibo API Docs' },
  { id: 'tutorial', icon: 'help', title: 'Tutorial' },
  { id: 'settings', icon: 'settings', title: 'Settings' },
];

export function ActivityBar({ active, sidebarVisible, onChange }: ActivityBarProps) {
  return (
    <>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`js-activity-btn ${sidebarVisible && active === item.id ? 'active' : ''}`}
          title={item.title}
          aria-label={item.title}
          aria-pressed={sidebarVisible && active === item.id}
          onClick={() => onChange(item.id)}
        >
          <ActivityIcon icon={item.icon} title={item.title} />
        </button>
      ))}
    </>
  );
}
