import { useCallback, useEffect, useRef, useState } from 'react';
import { AppShell } from '@jibo-studio/ui-shell';
import { getEditorForFile, isGeneratedArtifactPath } from '@jibo-studio/skill-model';
import type {
  FileEntry,
  ProjectModeInfo,
  RobotProfile,
  SourceDiagnostic,
} from '../../shared/types';
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
  generated: boolean;
}

type SidebarView = 'explorer' | 'robot' | 'debug' | 'api' | 'tutorial' | 'settings';

export function App() {
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [projectMode, setProjectMode] = useState<ProjectModeInfo | null>(null);
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
  const [building, setBuilding] = useState(false);
  const [watching, setWatching] = useState(false);
  const [diagnosticsByPath, setDiagnosticsByPath] = useState<Record<string, SourceDiagnostic[]>>({});
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  const refreshFiles = useCallback(async (root: string) => {
    const tree = await window.jiboStudio.listFiles(root);
    setFiles(tree);
  }, []);

  const refreshMode = useCallback(async (root: string) => {
    const mode = await window.jiboStudio.getProjectMode(root);
    setProjectMode(mode);
    return mode;
  }, []);

  const relativePath = useCallback(
    (filePath: string) => {
      if (!projectPath) return filePath;
      return filePath.startsWith(projectPath)
        ? filePath.slice(projectPath.length).replace(/^[\\/]/, '')
        : filePath;
    },
    [projectPath],
  );

  const openProject = useCallback(
    async (path: string) => {
      try {
        setProjectPath(path);
        await refreshFiles(path);
        const mode = await refreshMode(path);
        setShowTutorial(false);
        setStatusMessage(
          `Opened ${path.split('/').pop()} (${mode.mode === 'dsl-v1' ? 'JiboScript' : 'Legacy'})`,
        );
        if (watching) {
          await window.jiboStudio.toolchainStopWatch();
          setWatching(false);
        }
      } catch (error) {
        setProjectPath(null);
        setProjectMode(null);
        setFiles([]);
        const message = error instanceof Error ? error.message : 'Failed to open project';
        setStatusMessage(message);
        console.error('Failed to open project', error);
      }
    },
    [refreshFiles, refreshMode, watching],
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
      const mode = projectMode?.mode ?? 'legacy-artifacts';
      const generated = mode === 'dsl-v1' && isGeneratedArtifactPath(relativePath(filePath));
      const tab: OpenTab = {
        id: `${filePath}:${Date.now()}`,
        path: filePath,
        name,
        content,
        dirty: false,
        editorType: getEditorForFile(filePath, mode),
        generated,
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

  const runValidate = useCallback(
    async (path: string, content: string) => {
      if (!projectPath || !path.endsWith('.jibo')) return;
      const diags = await window.jiboStudio.validateSkillSource(projectPath, path, content);
      setDiagnosticsByPath((prev) => ({ ...prev, [path]: diags }));
    },
    [projectPath],
  );

  useEffect(() => {
    const tab = tabs.find((t) => t.path === activeTab);
    if (!tab || !tab.path.endsWith('.jibo')) return;
    const handle = window.setTimeout(() => {
      void runValidate(tab.path, tab.content);
    }, 350);
    return () => window.clearTimeout(handle);
  }, [tabs, activeTab, runValidate]);

  const refreshOpenGeneratedTabs = useCallback(async () => {
    const generatedTabs = tabsRef.current.filter((t) => t.generated);
    for (const tab of generatedTabs) {
      try {
        const content = await window.jiboStudio.readFile(tab.path);
        setTabs((prev) =>
          prev.map((t) => (t.path === tab.path ? { ...t, content, dirty: false } : t)),
        );
      } catch {
        // file may have been removed
      }
    }
  }, []);

  const saveActiveTab = async () => {
    const tab = tabs.find((t) => t.path === activeTab);
    if (!tab || !tab.dirty || tab.generated) return;
    await window.jiboStudio.writeFile(tab.path, tab.content);
    setTabs((prev) => prev.map((t) => (t.path === tab.path ? { ...t, dirty: false } : t)));
    setStatusMessage(`Saved ${tab.name}`);

    if (projectPath && tab.path.endsWith('.jibo')) {
      setTerminalOutput((prev) => `${prev}Compiling ${tab.name}...\n`);
      const result = await window.jiboStudio.compileSkill(projectPath);
      setTerminalOutput((prev) => `${prev}${result.output}\n`);
      setDiagnosticsByPath((prev) => ({ ...prev, [tab.path]: result.diagnostics ?? [] }));
      if (result.success) {
        await refreshFiles(projectPath);
        await refreshOpenGeneratedTabs();
        setStatusMessage('Compiled legacy artifacts');
      } else {
        setStatusMessage('Compile failed');
      }
    }
  };

  const closeTab = useCallback(
    (path: string) => {
      const tab = tabsRef.current.find((t) => t.path === path);
      if (tab?.dirty && !tab.generated) {
        const ok = window.confirm(`Discard unsaved changes to ${tab.name}?`);
        if (!ok) return;
      }
      setTabs((prev) => prev.filter((t) => t.path !== path));
      setActiveTab((current) => (current === path ? null : current));
    },
    [],
  );

  const runBuild = async () => {
    if (!projectPath) return;
    setBuilding(true);
    setTerminalOutput('');
    setStatusMessage('Building...');
    try {
      const result = await window.jiboStudio.toolchainBuild(projectPath);
      setStatusMessage(result.success ? 'Build succeeded' : 'Build failed');
      if (projectMode?.mode === 'dsl-v1') {
        await refreshFiles(projectPath);
        await refreshOpenGeneratedTabs();
      }
    } finally {
      setBuilding(false);
    }
  };

  const toggleWatch = async () => {
    if (!projectPath) return;
    if (watching) {
      await window.jiboStudio.toolchainStopWatch();
      setWatching(false);
      setStatusMessage('Watch stopped');
      return;
    }
    setTerminalOutput('');
    setStatusMessage('Starting watch...');
    try {
      await window.jiboStudio.toolchainWatch(projectPath);
      setWatching(true);
      setStatusMessage('Watching for changes');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setTerminalOutput((prev) => `${prev}${message}\n`);
      setStatusMessage('Watch failed');
    }
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
        void saveActiveTab();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        void runBuild();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    return () => {
      void window.jiboStudio.toolchainStopWatch();
    };
  }, []);

  const activeTabData = tabs.find((t) => t.path === activeTab) ?? null;
  const modeLabel =
    projectMode?.mode === 'dsl-v1'
      ? 'JiboScript'
      : projectMode?.mode === 'legacy-artifacts'
        ? 'Legacy'
        : null;

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
            projectMode={projectMode?.mode ?? null}
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
            diagnosticsByPath={diagnosticsByPath}
            onSave={saveActiveTab}
            onBuild={runBuild}
            onToggleWatch={toggleWatch}
            watching={watching}
            building={building}
            hasProject={!!projectPath}
            projectModeLabel={modeLabel}
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
            mode={modeLabel}
            watching={watching}
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
