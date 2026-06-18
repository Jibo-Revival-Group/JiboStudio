import { useEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  GoldenLayout,
  ContentItem,
  ComponentItem,
  type ComponentContainer,
  type ResolvedComponentItemConfig,
} from 'golden-layout';
import type { OpenTab } from '../App';
import { TabEditorContent } from './TabEditorContent';
import './golden-layout.css';

const EDITOR_COMPONENT = 'file-editor';

interface EditorComponentState {
  path: string;
  tabId: string;
}

interface GoldenLayoutEditorProps {
  tabs: OpenTab[];
  activeTab: string | null;
  onSelectTab: (path: string | null) => void;
  onCloseTab: (path: string) => void;
  onChangeContent: (path: string, content: string) => void;
  hidden?: boolean;
}

interface BoundPanel {
  root: Root;
  tabId: string;
  path: string;
}

function formatTabTitle(tab: OpenTab): string {
  return tab.dirty ? `● ${tab.name}` : tab.name;
}

function getComponentState(item: ComponentItem): EditorComponentState | undefined {
  const state = item.container.state as EditorComponentState | undefined;
  const initial = item.container.initialState as EditorComponentState | undefined;
  return state?.tabId ? state : initial?.tabId ? initial : undefined;
}

function getPathFromItem(item: ComponentItem): string | undefined {
  return getComponentState(item)?.path;
}

function getTabIdFromItem(item: ComponentItem): string | undefined {
  return getComponentState(item)?.tabId;
}

function collectComponentItems(item: ContentItem): ComponentItem[] {
  const items: ComponentItem[] = [];
  if (ContentItem.isComponentItem(item)) {
    items.push(item);
  }
  for (const child of item.contentItems) {
    items.push(...collectComponentItems(child));
  }
  return items;
}

function getLayoutItems(layout: GoldenLayout): ComponentItem[] {
  return layout.rootItem ? collectComponentItems(layout.rootItem) : [];
}

function createEmptyLayoutConfig() {
  return {
    root: {
      type: 'stack' as const,
      isClosable: true,
      content: [],
    },
    settings: {
      showPopoutIcon: true,
      showMaximiseIcon: true,
      showCloseIcon: true,
      reorderEnabled: true,
    },
    header: {
      show: 'top' as const,
      popout: 'Pop out',
      maximise: 'Maximize',
      close: 'Close',
    },
  };
}

function tabIdsSignature(tabs: OpenTab[]): string {
  return tabs.map((tab) => tab.id).join('\0');
}

function tabTitlesSignature(tabs: OpenTab[]): string {
  return tabs.map((tab) => `${tab.id}\0${tab.name}\0${tab.dirty}`).join('\0');
}

export function GoldenLayoutEditor({
  tabs,
  activeTab,
  onSelectTab,
  onCloseTab,
  onChangeContent,
  hidden = false,
}: GoldenLayoutEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<GoldenLayout | null>(null);
  const panelsRef = useRef<Map<string, BoundPanel>>(new Map());
  const suppressEventsRef = useRef(false);
  const tabsRef = useRef(tabs);
  const activeTabRef = useRef(activeTab);
  const handlersRef = useRef({ onSelectTab, onCloseTab, onChangeContent });
  const syncedTabIdsRef = useRef('');
  const syncedTitlesRef = useRef('');
  const syncedActiveTabRef = useRef<string | null>(null);
  const [layoutReady, setLayoutReady] = useState(false);

  tabsRef.current = tabs;
  activeTabRef.current = activeTab;
  handlersRef.current = { onSelectTab, onCloseTab, onChangeContent };

  const unmountAllPanels = () => {
    panelsRef.current.forEach((bound) => bound.root.unmount());
    panelsRef.current.clear();
  };

  const renderPanel = (tabId: string) => {
    const tab = tabsRef.current.find((entry) => entry.id === tabId);
    const bound = panelsRef.current.get(tabId);
    if (!tab || !bound) return;
    bound.root.render(
      <TabEditorContent
        tab={tab}
        onChange={(content) => handlersRef.current.onChangeContent(tab.path, content)}
      />,
    );
  };

  const runWithSuppressedEvents = (fn: () => void) => {
    suppressEventsRef.current = true;
    try {
      fn();
    } finally {
      queueMicrotask(() => {
        suppressEventsRef.current = false;
      });
    }
  };

  const addTabToLayout = (layout: GoldenLayout, tab: OpenTab) => {
    const componentState: EditorComponentState = { path: tab.path, tabId: tab.id };
    try {
      layout.newComponent(EDITOR_COMPONENT, componentState, formatTabTitle(tab));
    } catch (error) {
      console.error('Failed to open editor tab in Golden Layout', error);
      runWithSuppressedEvents(() => {
        unmountAllPanels();
        layout.loadLayout(createEmptyLayoutConfig());
        layout.newComponent(EDITOR_COMPONENT, componentState, formatTabTitle(tab));
      });
    }
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const layout = new GoldenLayout(
      host,
      (container: ComponentContainer, itemConfig: ResolvedComponentItemConfig) => {
        const state = itemConfig.componentState as EditorComponentState | undefined;
        const path = state?.path;
        const tabId = state?.tabId;
        if (!path || !tabId) {
          return { component: {}, virtual: false };
        }

        const existing = panelsRef.current.get(tabId);
        if (existing) {
          existing.root.unmount();
          panelsRef.current.delete(tabId);
        }

        container.element.replaceChildren();
        const root = createRoot(container.element);
        panelsRef.current.set(tabId, { root, tabId, path });
        renderPanel(tabId);

        container.on('resize', () => {
          window.dispatchEvent(new Event('resize'));
        });

        return { component: {}, virtual: false };
      },
      (container: ComponentContainer) => {
        const state = (container.state ?? container.initialState) as EditorComponentState | undefined;
        const tabId = state?.tabId;
        if (!tabId) return;
        const bound = panelsRef.current.get(tabId);
        if (bound) {
          bound.root.unmount();
          panelsRef.current.delete(tabId);
        }
      },
    );

    layout.loadLayout(createEmptyLayoutConfig());

    layout.on('activeContentItemChanged', (item: ComponentItem) => {
      if (suppressEventsRef.current) return;

      const path = getPathFromItem(item);
      if (path && tabsRef.current.some((tab) => tab.path === path)) {
        handlersRef.current.onSelectTab(path);
      }
    });

    layout.on('itemDestroyed', (event) => {
      if (suppressEventsRef.current) return;

      const target = event.target;
      if (!ContentItem.isComponentItem(target)) return;

      const tabId = getTabIdFromItem(target);
      const path = getPathFromItem(target);
      if (!tabId || !path) return;
      if (!tabsRef.current.some((tab) => tab.id === tabId)) return;

      handlersRef.current.onCloseTab(path);

      const remaining = getLayoutItems(layout);
      if (remaining.length === 0) {
        handlersRef.current.onSelectTab(null);
      }
    });

    layoutRef.current = layout;
    setLayoutReady(true);

    return () => {
      setLayoutReady(false);
      layoutRef.current = null;
      syncedTabIdsRef.current = '';
      syncedTitlesRef.current = '';
      syncedActiveTabRef.current = null;
      unmountAllPanels();
      layout.destroy();
      host.replaceChildren();
    };
  }, []);

  useEffect(() => {
    const layout = layoutRef.current;
    if (!layoutReady || !layout) return;

    const tabIdsSignatureValue = tabIdsSignature(tabs);
    if (tabIdsSignatureValue !== syncedTabIdsRef.current) {
      runWithSuppressedEvents(() => {
        const openTabIds = new Set(tabs.map((tab) => tab.id));
        const openPaths = new Set(tabs.map((tab) => tab.path));

        const staleItems = getLayoutItems(layout).filter((item) => {
          const tabId = getTabIdFromItem(item);
          const path = getPathFromItem(item);
          return (tabId && !openTabIds.has(tabId)) || (path && !openPaths.has(path));
        });

        for (const item of staleItems) {
          item.close();
        }

        const layoutTabIds = new Set(
          getLayoutItems(layout)
            .map((item) => getTabIdFromItem(item))
            .filter((tabId): tabId is string => !!tabId),
        );

        for (const tab of tabs) {
          if (!layoutTabIds.has(tab.id)) {
            addTabToLayout(layout, tab);
          }
        }
      });

      syncedTabIdsRef.current = tabIdsSignatureValue;
      syncedTitlesRef.current = '';
    }
  }, [tabs, layoutReady]);

  useEffect(() => {
    const layout = layoutRef.current;
    if (!layoutReady || !layout) return;

    const titlesSignature = tabTitlesSignature(tabs);
    if (titlesSignature === syncedTitlesRef.current) return;

    for (const item of getLayoutItems(layout)) {
      const tabId = getTabIdFromItem(item);
      if (!tabId) continue;
      const tab = tabs.find((entry) => entry.id === tabId);
      if (tab) {
        item.setTitle(formatTabTitle(tab));
      }
    }

    syncedTitlesRef.current = titlesSignature;
  }, [tabs, layoutReady]);

  useEffect(() => {
    const layout = layoutRef.current;
    if (!layoutReady || !layout) return;
    if (activeTab === syncedActiveTabRef.current) return;

    syncedActiveTabRef.current = activeTab;

    if (!activeTab) return;

    const activeItem = getLayoutItems(layout).find((item) => getPathFromItem(item) === activeTab);
    if (activeItem) {
      activeItem.focus(true);
    }
  }, [activeTab, layoutReady]);

  return (
    <div className={`golden-layout-host${hidden ? ' golden-layout-host--hidden' : ''}`}>
      <div ref={hostRef} className="golden-layout-editor-panel" />
      {!hidden && tabs.length === 0 ? (
        <div className="editor-empty">Select a file from the explorer.</div>
      ) : null}
    </div>
  );
}
