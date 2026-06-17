import type { ReactNode } from 'react';
import { theme } from './theme';
import './theme.css';
import './shell.css';

export interface AppShellProps {
  activityBar: ReactNode;
  sidebar: ReactNode;
  editor: ReactNode;
  panel?: ReactNode;
  panelTitle?: string;
  panelVisible?: boolean;
  statusBar: ReactNode;
  title?: string;
  logo?: ReactNode;
}

export function AppShell({
  activityBar,
  sidebar,
  editor,
  panel,
  panelTitle = 'Terminal',
  panelVisible = true,
  statusBar,
  title = 'Jibo Studio',
  logo,
}: AppShellProps) {
  return (
    <div className="js-shell" style={{ fontFamily: theme.fontFamily }}>
      <header className="js-titlebar">
        {logo ? <span className="js-titlebar__logo">{logo}</span> : null}
        <span className="js-titlebar__title">{title}</span>
      </header>
      <div className="js-body">
        <aside className="js-activity-bar">{activityBar}</aside>
        <aside className="js-sidebar">{sidebar}</aside>
        <main className="js-main">
          <div className="js-editor-area">{editor}</div>
          {panelVisible && panel && (
            <div className="js-panel">
              <div className="js-panel__header">{panelTitle}</div>
              <div className="js-panel__content">{panel}</div>
            </div>
          )}
        </main>
      </div>
      <footer className="js-status-bar">{statusBar}</footer>
    </div>
  );
}
