import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Project } from '@/lib/projectTypes';
import { analyzeProject, generateScenarios, PreviewScenario } from '@/lib/fivemAnalyzer';
import { Play, FileCode, Radio, MessageSquare, Terminal } from 'lucide-react';

interface Props {
  project: Project;
  onRunScenario: (scenario: PreviewScenario) => void;
  onOpenEditor: () => void;
}

export function ProjectAnalysis({ project, onRunScenario, onOpenEditor }: Props) {
  const report = useMemo(() => analyzeProject(project), [project]);
  const scenarios = useMemo(() => generateScenarios(report), [report]);
  const [scenarioPayloads, setScenarioPayloads] = useState<Record<string, string>>(
    Object.fromEntries(scenarios.map((s) => [s.id, JSON.stringify(s.payload, null, 2)]))
  );

  const run = (s: PreviewScenario) => {
    try {
      const payload = JSON.parse(scenarioPayloads[s.id] || '{}');
      onRunScenario({ ...s, payload });
      onOpenEditor();
    } catch {
      onRunScenario(s);
      onOpenEditor();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Análise do Projeto</h2>
          <p className="text-sm text-muted-foreground">{project.name}</p>
        </div>
        <Button onClick={onOpenEditor}>
          <FileCode className="h-4 w-4 mr-2" /> Abrir Editor
        </Button>
      </div>

      {project.manifest && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <FileCode className="h-4 w-4" /> fxmanifest
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {project.manifest.uiPage && <div><span className="text-muted-foreground">ui_page:</span> <code>{project.manifest.uiPage}</code></div>}
            {project.manifest.author && <div><span className="text-muted-foreground">author:</span> {project.manifest.author}</div>}
            {project.manifest.version && <div><span className="text-muted-foreground">version:</span> {project.manifest.version}</div>}
            <div><span className="text-muted-foreground">client scripts:</span> {project.manifest.clientScripts.length}</div>
          </div>
        </Card>
      )}

      <Tabs defaultValue="scenarios">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="scenarios"><Play className="h-3 w-3 mr-1" />Cenários ({scenarios.length})</TabsTrigger>
          <TabsTrigger value="messages"><MessageSquare className="h-3 w-3 mr-1" />NUI ({report.nuiMessages.length})</TabsTrigger>
          <TabsTrigger value="callbacks"><Radio className="h-3 w-3 mr-1" />Callbacks ({report.nuiCallbacks.length + report.jsFetchEvents.length})</TabsTrigger>
          <TabsTrigger value="events"><Terminal className="h-3 w-3 mr-1" />Eventos ({report.fivemEvents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="scenarios" className="space-y-3 mt-4">
          {scenarios.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum SendNUIMessage detetado nos ficheiros Lua.
            </p>
          )}
          {scenarios.map((s) => (
            <Card key={s.id} className="p-3">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="font-mono text-sm font-semibold">{s.label}</div>
                  <Badge variant="outline" className="text-xs mt-1">{s.field}</Badge>
                </div>
                <Button size="sm" onClick={() => run(s)}>
                  <Play className="h-3 w-3 mr-1" /> Disparar
                </Button>
              </div>
              <textarea
                className="w-full text-xs font-mono bg-muted p-2 rounded border border-border min-h-[80px]"
                value={scenarioPayloads[s.id] || ''}
                onChange={(e) => setScenarioPayloads({ ...scenarioPayloads, [s.id]: e.target.value })}
              />
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="messages" className="mt-4 space-y-2">
          {report.nuiMessages.map((m, i) => (
            <Card key={i} className="p-3">
              <div className="flex items-center justify-between">
                <code className="text-sm font-semibold">{m.key}</code>
                <span className="text-xs text-muted-foreground font-mono">{m.origin.file}:{m.origin.line}</span>
              </div>
              {m.payloadKeys.length > 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  Campos: {m.payloadKeys.map((k) => <code key={k} className="mr-1">{k}</code>)}
                </div>
              )}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="callbacks" className="mt-4 space-y-2">
          <h4 className="text-sm font-semibold">RegisterNUICallback (Lua)</h4>
          {report.nuiCallbacks.map((c, i) => (
            <div key={i} className="text-sm flex justify-between p-2 bg-muted rounded">
              <code>{c.name}</code>
              <span className="text-xs text-muted-foreground font-mono">{c.origin.file}:{c.origin.line}</span>
            </div>
          ))}
          <h4 className="text-sm font-semibold mt-4">fetchNui / fetch (JS)</h4>
          {report.jsFetchEvents.map((c, i) => (
            <div key={i} className="text-sm flex justify-between p-2 bg-muted rounded">
              <code>{c.name}</code>
              <span className="text-xs text-muted-foreground font-mono">{c.origin.file}:{c.origin.line}</span>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="events" className="mt-4 space-y-2">
          {report.fivemEvents.map((e, i) => (
            <div key={i} className="text-sm flex items-center justify-between p-2 bg-muted rounded">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{e.kind}</Badge>
                <code>{e.name}</code>
              </div>
              <span className="text-xs text-muted-foreground font-mono">{e.origin.file}:{e.origin.line}</span>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
