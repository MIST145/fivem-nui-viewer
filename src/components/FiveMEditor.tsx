import { useState, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Upload, Play, Code2, Terminal, FileCode, Monitor,
  Trash2, RefreshCw, BarChart3, Eye,
} from 'lucide-react';
import { FileUploader } from './FileUploader';
import { CodeEditor } from './CodeEditor';
import { PreviewFrame } from './PreviewFrame';
import { FiveMConsole } from './FiveMConsole';
import { ProjectAnalysis } from './ProjectAnalysis';
import { Project, ProjectFile } from '@/lib/projectTypes';
import { PreviewScenario } from '@/lib/fivemAnalyzer';

type Tab = 'upload' | 'analysis' | 'editor' | 'preview';

const DEFAULT_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>FiveM NUI Preview</title></head>
<body style="font-family:sans-serif;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;">
<div><h1>FiveM NUI Preview</h1><p>Importa um projeto para começar.</p></div></body></html>`;

function pickMainHtml(project: Project): ProjectFile | undefined {
  if (project.manifest?.uiPage) {
    const m = project.files.find((f) => f.path.endsWith(project.manifest!.uiPage!));
    if (m) return m;
  }
  return project.files.find((f) => f.path.endsWith('index.html')) ||
         project.files.find((f) => f.kind === 'html');
}

function dirOf(path: string): string {
  const i = path.lastIndexOf('/');
  return i >= 0 ? path.slice(0, i + 1) : '';
}

function resolveRelative(base: string, ref: string): string {
  if (ref.startsWith('/')) return ref.slice(1);
  const parts = (base + ref).split('/');
  const out: string[] = [];
  for (const p of parts) {
    if (p === '.' || p === '') continue;
    if (p === '..') out.pop();
    else out.push(p);
  }
  return out.join('/');
}

function extractLinkedAssets(html: string, baseDir: string) {
  const css: string[] = [];
  const js: string[] = [];
  const linkRe = /<link[^>]*href=["']([^"']+\.css)["'][^>]*>/gi;
  const scriptRe = /<script[^>]*src=["']([^"']+\.js)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html))) css.push(resolveRelative(baseDir, m[1]));
  while ((m = scriptRe.exec(html))) js.push(resolveRelative(baseDir, m[1]));
  return { css, js };
}

export function FiveMEditor() {
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [pendingScenario, setPendingScenario] = useState<PreviewScenario | null>(null);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [consoleMessages, setConsoleMessages] = useState<Array<{
    type: 'log' | 'error' | 'warn'; message: string; timestamp: Date;
  }>>([{ type: 'log', message: 'FiveM Preview iniciado', timestamp: new Date() }]);

  const addConsoleMessage = useCallback((type: 'log' | 'error' | 'warn', message: string) => {
    setConsoleMessages((prev) => [...prev, { type, message, timestamp: new Date() }]);
  }, []);

  const handleProjectReady = (p: Project) => {
    setProject(p);
    setActiveTab('analysis');
    const main = pickMainHtml(p);
    setActiveFilePath(main?.path || p.files[0]?.path || null);
    addConsoleMessage('log', `Projeto carregado: ${p.name} (${p.files.length} ficheiros)`);
  };

  // Aggregate preview content from the project
  const previewBundle = useMemo(() => {
    if (!project) return { html: DEFAULT_HTML, css: '', js: '' };
    const mainHtml = pickMainHtml(project);
    if (!mainHtml) return { html: DEFAULT_HTML, css: '', js: '' };
    const baseDir = dirOf(mainHtml.path);
    const linked = extractLinkedAssets(mainHtml.content, baseDir);
    const cssParts: string[] = [];
    const jsParts: string[] = [];
    for (const cssPath of linked.css) {
      const f = project.files.find((x) => x.path === cssPath);
      if (f) cssParts.push(`/* ${cssPath} */\n${f.content}`);
    }
    for (const jsPath of linked.js) {
      const f = project.files.find((x) => x.path === jsPath);
      if (f) jsParts.push(`// ${jsPath}\n${f.content}`);
    }
    // Fallbacks: include all CSS/JS in same dir if nothing linked
    if (!cssParts.length) {
      for (const f of project.files) if (f.kind === 'css' && f.path.startsWith(baseDir)) cssParts.push(f.content);
    }
    if (!jsParts.length) {
      for (const f of project.files) if (f.kind === 'js' && f.path.startsWith(baseDir)) jsParts.push(f.content);
    }
    return { html: mainHtml.content, css: cssParts.join('\n\n'), js: jsParts.join('\n\n') };
  }, [project]);

  const updateFileContent = (path: string, content: string) => {
    if (!project) return;
    setProject({
      ...project,
      files: project.files.map((f) => (f.path === path ? { ...f, content } : f)),
    });
  };

  const runScenario = (s: PreviewScenario) => {
    setPendingScenario({ ...s, id: `${s.id}-${Date.now()}` });
  };

  const activeFile = project?.files.find((f) => f.path === activeFilePath) || null;
  const langFor = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();
    if (ext === 'html' || ext === 'htm') return 'html';
    if (ext === 'css') return 'css';
    if (ext === 'lua') return 'lua';
    if (ext === 'json') return 'json';
    return 'javascript';
  };

  return (
    <div className="min-h-screen bg-gradient-dark p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            FiveM NUI Preview
          </h1>
          <p className="text-muted-foreground">Importa ficheiros, pastas ou repositórios GitHub e previsualiza interfaces FiveM</p>
        </div>

        <div className="mb-6 flex justify-center">
          <div className="flex space-x-2 bg-card rounded-lg p-1 shadow-elegant">
            <Button variant={activeTab === 'upload' ? 'fivem' : 'ghost'} onClick={() => setActiveTab('upload')} size="sm">
              <Upload className="h-4 w-4" />Importar
            </Button>
            <Button variant={activeTab === 'analysis' ? 'fivem' : 'ghost'} onClick={() => setActiveTab('analysis')} size="sm" disabled={!project}>
              <BarChart3 className="h-4 w-4" />Análise
            </Button>
            <Button variant={activeTab === 'editor' ? 'fivem' : 'ghost'} onClick={() => setActiveTab('editor')} size="sm" disabled={!project}>
              <Code2 className="h-4 w-4" />Editor
            </Button>
            <Button variant={activeTab === 'preview' ? 'fivem' : 'ghost'} onClick={() => setActiveTab('preview')} size="sm">
              <Monitor className="h-4 w-4" />Preview
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card className="p-6 bg-card/50 backdrop-blur border-border shadow-elegant">
              {activeTab === 'upload' && <FileUploader onProjectReady={handleProjectReady} />}

              {activeTab === 'analysis' && project && (
                <ProjectAnalysis
                  project={project}
                  onRunScenario={runScenario}
                  onOpenEditor={() => setActiveTab('preview')}
                />
              )}

              {activeTab === 'editor' && project && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Editor</h2>
                    <Button variant="secondary" size="sm" onClick={() => setActiveTab('preview')}>
                      <Play className="h-4 w-4 mr-2" />Preview
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-1 border border-border rounded p-2 max-h-[600px] overflow-y-auto space-y-1">
                      {project.files.filter((f) => f.kind !== 'image').map((f) => (
                        <button
                          key={f.path}
                          onClick={() => setActiveFilePath(f.path)}
                          className={`w-full text-left text-xs font-mono px-2 py-1 rounded truncate flex items-center gap-2 ${
                            activeFilePath === f.path ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                          }`}
                        >
                          <FileCode className="h-3 w-3 shrink-0" />
                          <span className="truncate">{f.path}</span>
                        </button>
                      ))}
                    </div>
                    <div className="col-span-3">
                      {activeFile ? (
                        <CodeEditor
                          language={langFor(activeFile.path)}
                          value={activeFile.content}
                          onChange={(v) => updateFileContent(activeFile.path, v)}
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground p-8 text-center">Seleciona um ficheiro</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'preview' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Preview</h2>
                    <Badge variant="secondary"><Eye className="h-3 w-3 mr-1" />Live</Badge>
                  </div>
                  <PreviewFrame
                    html={previewBundle.html}
                    css={previewBundle.css}
                    js={previewBundle.js}
                    project={project}
                    pendingScenario={pendingScenario}
                    onConsoleMessage={addConsoleMessage}
                  />
                </div>
              )}
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="p-4 bg-card/50 backdrop-blur border-border shadow-elegant h-[600px] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center">
                  <Terminal className="h-4 w-4 mr-2" />Console
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setConsoleMessages([])}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <FiveMConsole messages={consoleMessages} />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
