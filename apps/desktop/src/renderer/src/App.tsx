import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@jibo-studio/ui-shell';
import { getEditorForFile } from '@jibo-studio/skill-model';
import type { FileEntry, RobotProfile } from '../../shared/types';
import { FileExplorer } from './components/FileExplorer';
import { EditorArea } from './components/EditorArea';
import { TerminalPanel } from './components/TerminalPanel';
import { ActivityBar } from './components/ActivityBar';
import { RobotPanel } from './components/RobotPanel';
import { DebuggerPanel } from './components/DebuggerPanel';
import { NewSkillWizard } from './components/NewSkillWizard';
import { ApiDocsPanel } from './components/ApiDocsPanel';
import { WelcomeTutorial } from './components/WelcomeTutorial';
import { SettingsPanel } from './components/SettingsPanel';
import { StatusBar } from './components/StatusBar';
import { StudioLogo } from './components/icons';
import './app.css';

export interface OpenTab {
  id: string;
  path: string;
  name: string;
  content: string;
  dirty: boolean;
  editorType: ReturnType<typeof getEditorForFile>;
}

type SidebarView = 'explorer' | 'robot' | 'debug' | 'api' | 'tutorial' | 'settings';

export function App() {
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [sidebarView, setSidebarView] = useState<SidebarView>('explorer');
  const [terminalOutput, setTerminalOutput] = useState<string>('');
  const [showWizard, setShowWizard] = useState(false);
  const [robotProfiles, setRobotProfiles] = useState<RobotProfile[]>([]);
  const [activeRobot, setActiveRobot] = useState<RobotProfile | null>(null);
  const [showTutorial, setShowTutorial] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Ready');

  const refreshFiles = useCallback(async (root: string) => {
    const tree = await window.jiboStudio.listFiles(root);
    setFiles(tree);
  }, []);

  const openProject = useCallback(
    async (path: string) => {
      try {
        setProjectPath(path);
        await refreshFiles(path);
        setShowTutorial(false);
        setStatusMessage(`Opened ${path.split('/').pop()}`);
      } catch (error) {
        setProjectPath(null);
        setFiles([]);
        const message = error instanceof Error ? error.message : 'Failed to open project';
        setStatusMessage(message);
        console.error('Failed to open project', error);
      }
    },
    [refreshFiles],
  );

  const handleOpenProject = async () => {
    const path = await window.jiboStudio.openProject();
    if (path) await openProject(path);
  };

  const openFile = async (filePath: string) => {
    try {
      const existing = tabs.find((t) => t.path === filePath);
      if (existing) {
        setActiveTab(filePath);
        return;
      }
      const content = await window.jiboStudio.readFile(filePath);
      const name = filePath.split('/').pop() ?? filePath;
      const tab: OpenTab = {
        id: `${filePath}:${Date.now()}`,
        path: filePath,
        name,
        content,
        dirty: false,
        editorType: getEditorForFile(filePath),
      };
      setTabs((prev) => {
        if (prev.some((entry) => entry.path === filePath)) {
          return prev;
        }
        return [...prev, tab];
      });
      setActiveTab(filePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to open file';
      setStatusMessage(message);
      console.error('Failed to open file', error);
    }
  };

  const updateTabContent = (path: string, content: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.path === path ? { ...t, content, dirty: true } : t)),
    );
  };

  const saveActiveTab = async () => {
    const tab = tabs.find((t) => t.path === activeTab);
    if (!tab || !tab.dirty) return;
    await window.jiboStudio.writeFile(tab.path, tab.content);
    setTabs((prev) => prev.map((t) => (t.path === tab.path ? { ...t, dirty: false } : t)));
    setStatusMessage(`Saved ${tab.name}`);
  };

  const closeTab = useCallback((path: string) => {
    setTabs((prev) => prev.filter((t) => t.path !== path));
  }, []);

  const runBuild = async () => {
    if (!projectPath) return;
    setTerminalOutput('');
    setStatusMessage('Building...');
    const result = await window.jiboStudio.toolchainBuild(projectPath);
    setStatusMessage(result.success ? 'Build succeeded' : 'Build failed');
  };

  useEffect(() => {
    const unsub = window.jiboStudio.onToolchainEvent((event) => {
      if (event.data) setTerminalOutput((prev) => prev + event.data);
    });
    return unsub;
  }, []);

  useEffect(() => {
    window.jiboStudio.getRobotProfiles().then(setRobotProfiles);
  }, []);

  useEffect(() => {
    if (!projectPath) return;
    const unsub = window.jiboStudio.watchProject(projectPath, () => refreshFiles(projectPath));
    return unsub;
  }, [projectPath, refreshFiles]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveActiveTab();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const activeTabData = tabs.find((t) => t.path === activeTab) ?? null;

  const sidebarContent = () => {
    switch (sidebarView) {
      case 'robot':
        return (
          <RobotPanel
            profiles={robotProfiles}
            activeRobot={activeRobot}
            projectPath={projectPath}
            onProfilesChange={setRobotProfiles}
            onActiveRobotChange={setActiveRobot}
            onTerminalOutput={setTerminalOutput}
            onStatus={setStatusMessage}
          />
        );
      case 'debug':
        return <DebuggerPanel host={activeRobot?.host ?? null} />;
      case 'api':
        return <ApiDocsPanel />;
      case 'tutorial':
        return (
          <WelcomeTutorial
            onDismiss={() => setShowTutorial(false)}
            onNewSkill={() => setShowWizard(true)}
            onOpenProject={handleOpenProject}
          />
        );
      case 'settings':
        return <SettingsPanel />;
      default:
        return (
          <FileExplorer
            files={files}
            projectPath={projectPath}
            selectedPath={activeTab}
            onOpenFile={openFile}
            onOpenProject={handleOpenProject}
            onNewSkill={() => setShowWizard(true)}
          />
        );
    }
  };

  return (
    <>
      <AppShell
        title={projectPath ? `Jibo Studio — ${projectPath.split('/').pop()}` : 'Jibo Studio'}
        logo={<StudioLogo size={20} title="Jibo Studio" />}
        activityBar={
          <ActivityBar
            active={sidebarView}
            onChange={setSidebarView}
            hasProject={!!projectPath}
          />
        }
        sidebar={sidebarContent()}
        editor={
          <EditorArea
            tabs={tabs}
            activeTab={activeTab}
            activeTabData={activeTabData}
            onSelectTab={setActiveTab}
            onCloseTab={closeTab}
            onChangeContent={updateTabContent}
            onSave={saveActiveTab}
            onBuild={runBuild}
            hasProject={!!projectPath}
            onOpenProject={handleOpenProject}
            onNewSkill={() => setShowWizard(true)}
          />
        }
        panel={<TerminalPanel output={terminalOutput} onClear={() => setTerminalOutput('')} />}
        panelTitle="Build Output"
        panelVisible={true}
        statusBar={
          <StatusBar
            message={statusMessage}
            projectPath={projectPath}
            robot={activeRobot}
            dirty={activeTabData?.dirty}
          />
        }
      />
      {showWizard && (
        <NewSkillWizard
          onClose={() => setShowWizard(false)}
          onCreated={async (path) => {
            setShowWizard(false);
            await openProject(path);
          }}
        />
      )}
      {showTutorial && !projectPath && sidebarView !== 'tutorial' && (
        <div className="tutorial-banner">
          <span>New to Jibo Studio?</span>
          <button type="button" onClick={() => setSidebarView('tutorial')}>
            Start tutorial
          </button>
          <button type="button" onClick={() => setShowTutorial(false)}>
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}
