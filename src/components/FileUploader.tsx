import { useState, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Upload, Folder, FolderTree, Github, CheckCircle, FileCode,
  Image as ImageIcon, File as FileIcon, Trash2, Check, Loader2, Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Project } from '@/lib/projectTypes';
import {
  rawEntriesFromDataTransfer, rawEntriesFromFileList, entriesToProject, mergeProjects,
} from '@/lib/folderImport';
import { importGithubRepo } from '@/lib/githubImport';
import { toast } from 'sonner';

interface Props {
  onProjectReady: (project: Project) => void;
}

export function FileUploader({ onProjectReady }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [project, setProject] = useState<Project | null>(null);
  const [repoUrl, setRepoUrl] = useState('');
  const [token, setToken] = useState('');
  const filesRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const ingest = async (entries: { path: string; file: File }[], name: string, source: Project['source']) => {
    if (!entries.length) return;
    setBusy(true);
    try {
      const newProj = await entriesToProject(entries, name, source);
      const merged = mergeProjects(project, newProj);
      setProject(merged);
      toast.success(`${newProj.files.length} ficheiros adicionados`);
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const entries = await rawEntriesFromDataTransfer(e.dataTransfer.items);
    const name = entries[0]?.path.split('/')[0] || 'Drop';
    await ingest(entries, name, entries.some((x) => x.path.includes('/')) ? 'folder' : 'files');
  }, [project]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const entries = rawEntriesFromFileList(e.target.files);
    ingest(entries, project?.name || 'Files', 'files');
    if (filesRef.current) filesRef.current.value = '';
  };

  const handleFolder = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const entries = rawEntriesFromFileList(e.target.files);
    const folderName = (e.target.files[0] as any).webkitRelativePath?.split('/')[0] || 'Folder';
    ingest(entries, folderName, 'folder');
    if (folderRef.current) folderRef.current.value = '';
  };

  const handleGithub = async () => {
    if (!repoUrl.trim()) return;
    setBusy(true);
    setProgress('A iniciar...');
    try {
      const proj = await importGithubRepo(repoUrl, {
        token: token || undefined,
        onProgress: setProgress,
      });
      const merged = mergeProjects(project, proj);
      setProject(merged);
      toast.success(`Importado: ${proj.files.length} ficheiros`);
      setRepoUrl('');
    } catch (e) {
      toast.error(`GitHub: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  const confirm = () => {
    if (!project) return;
    onProjectReady(project);
  };
  const clear = () => {
    setProject(null);
  };

  const countByKind = (k: string) => project?.files.filter((f) => f.kind === k).length || 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Importar Projeto FiveM</h2>
        <p className="text-muted-foreground">
          Ficheiros soltos, pasta completa ou repositório GitHub
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Files */}
        <Card
          className={cn(
            'p-6 border-2 border-dashed cursor-pointer transition-all',
            isDragging ? 'border-primary bg-primary/10' : 'hover:border-primary/50',
            busy && 'opacity-50 pointer-events-none'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => filesRef.current?.click()}
        >
          <div className="flex flex-col items-center text-center space-y-2">
            <Upload className="h-8 w-8 text-primary" />
            <p className="font-medium">Ficheiros</p>
            <p className="text-xs text-muted-foreground">HTML, CSS, JS, Lua, imagens</p>
          </div>
        </Card>

        {/* Folder */}
        <Card
          className={cn(
            'p-6 border-2 border-dashed cursor-pointer transition-all hover:border-primary/50',
            busy && 'opacity-50 pointer-events-none'
          )}
          onClick={() => folderRef.current?.click()}
        >
          <div className="flex flex-col items-center text-center space-y-2">
            <FolderTree className="h-8 w-8 text-secondary" />
            <p className="font-medium">Pasta inteira</p>
            <p className="text-xs text-muted-foreground">Mantém estrutura</p>
          </div>
        </Card>

        {/* Github */}
        <Card className="p-6 border-2 border-dashed">
          <div className="flex flex-col items-center text-center space-y-2 mb-3">
            <Github className="h-8 w-8 text-accent" />
            <p className="font-medium">GitHub</p>
            <p className="text-xs text-muted-foreground">Repositório público</p>
          </div>
          <Input
            placeholder="https://github.com/owner/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            className="mb-2"
            disabled={busy}
          />
          <Input
            placeholder="Token (opcional)"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="mb-2 text-xs"
            type="password"
            disabled={busy}
          />
          <Button size="sm" className="w-full" onClick={handleGithub} disabled={busy || !repoUrl}>
            {busy ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
            Importar
          </Button>
        </Card>
      </div>

      <input
        ref={filesRef}
        type="file"
        multiple
        accept=".html,.htm,.css,.js,.ts,.lua,.json,.md,.png,.jpg,.jpeg,.gif,.webp,.svg"
        onChange={handleFiles}
        className="hidden"
      />
      <input
        ref={folderRef}
        type="file"
        {...({ webkitdirectory: '', directory: '' } as any)}
        multiple
        onChange={handleFolder}
        className="hidden"
      />

      {busy && progress && (
        <div className="text-sm text-center text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {progress}
        </div>
      )}

      {project && project.files.length > 0 && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-secondary" />
                {project.name}
              </h3>
              <p className="text-xs text-muted-foreground">{project.files.length} ficheiros · fonte: {project.source}</p>
            </div>
            {project.manifest?.uiPage && (
              <div className="text-xs text-muted-foreground">
                ui_page: <code className="text-primary">{project.manifest.uiPage}</code>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {(['html', 'css', 'js', 'lua', 'json', 'image'] as const).map((k) => {
              const n = countByKind(k);
              if (!n) return null;
              return (
                <div key={k} className="text-center p-2 bg-muted rounded">
                  <div className="text-xs uppercase text-muted-foreground">{k}</div>
                  <div className="text-lg font-bold">{n}</div>
                </div>
              );
            })}
          </div>

          <div className="max-h-40 overflow-y-auto border border-border rounded p-2 space-y-1">
            {project.files.slice(0, 200).map((f) => (
              <div key={f.path} className="flex items-center gap-2 text-xs">
                {f.kind === 'image' ? <ImageIcon className="h-3 w-3 text-green-400" /> :
                 f.kind === 'lua' ? <FileCode className="h-3 w-3 text-purple-400" /> :
                 <FileCode className="h-3 w-3 text-muted-foreground" />}
                <span className="font-mono truncate">{f.path}</span>
              </div>
            ))}
            {project.files.length > 200 && (
              <div className="text-xs text-muted-foreground text-center">... +{project.files.length - 200}</div>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={confirm} className="flex-1">
              <Check className="h-4 w-4 mr-2" /> Confirmar e Analisar
            </Button>
            <Button variant="destructive" onClick={clear}>
              <Trash2 className="h-4 w-4 mr-2" /> Limpar
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
