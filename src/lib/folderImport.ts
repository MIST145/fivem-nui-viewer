import { Project, ProjectFile, inferKind } from './projectTypes';
import { parseFxManifest } from './fivemAnalyzer';

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next']);
const TEXT_KINDS = new Set(['html', 'css', 'js', 'lua', 'json']);
const MAX_FILE_SIZE = 500 * 1024;

async function readAsText(file: File): Promise<string> {
  return await file.text();
}

async function readAsDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

interface RawEntry { path: string; file: File }

async function walkEntry(entry: any, prefix: string, out: RawEntry[]): Promise<void> {
  if (entry.isFile) {
    await new Promise<void>((resolve) => {
      entry.file((file: File) => {
        const path = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (!IGNORED_DIRS.has(entry.name)) out.push({ path, file });
        resolve();
      }, () => resolve());
    });
  } else if (entry.isDirectory) {
    if (IGNORED_DIRS.has(entry.name)) return;
    const reader = entry.createReader();
    const entries: any[] = await new Promise((resolve) => reader.readEntries((e: any[]) => resolve(e)));
    const subPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
    for (const sub of entries) await walkEntry(sub, subPrefix, out);
  }
}

export async function rawEntriesFromDataTransfer(items: DataTransferItemList): Promise<RawEntry[]> {
  const out: RawEntry[] = [];
  const entries: any[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const entry = (it as any).webkitGetAsEntry?.();
    if (entry) entries.push(entry);
    else {
      const f = it.getAsFile?.();
      if (f) out.push({ path: f.name, file: f });
    }
  }
  for (const e of entries) await walkEntry(e, '', out);
  return out;
}

export function rawEntriesFromFileList(files: FileList): RawEntry[] {
  const out: RawEntry[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    // webkitRelativePath available for folder picks
    const path = (f as any).webkitRelativePath || f.name;
    if (path.split('/').some((seg: string) => IGNORED_DIRS.has(seg))) continue;
    out.push({ path, file: f });
  }
  return out;
}

export async function entriesToProject(
  entries: RawEntry[],
  name: string,
  source: Project['source']
): Promise<Project> {
  const files: ProjectFile[] = [];
  for (const { path, file } of entries) {
    const kind = inferKind(path);
    if (file.size > MAX_FILE_SIZE && kind !== 'image') continue;
    if (kind === 'image') {
      const url = await readAsDataUrl(file);
      files.push({ path, content: '', kind, url, size: file.size });
    } else if (TEXT_KINDS.has(kind) || kind === 'other') {
      if (kind === 'other' && file.size > 50 * 1024) continue;
      try {
        const content = await readAsText(file);
        files.push({ path, content, kind, size: file.size });
      } catch {
        /* ignore */
      }
    }
  }
  const manifestFile = files.find((f) => f.path.endsWith('fxmanifest.lua') || f.path.endsWith('__resource.lua'));
  const manifest = manifestFile ? parseFxManifest(manifestFile.content) : undefined;
  if (manifest) manifest.resourceName = name;
  return { name, source, files, manifest };
}

export function mergeProjects(a: Project | null, b: Project): Project {
  if (!a) return b;
  const map = new Map<string, ProjectFile>();
  for (const f of a.files) map.set(f.path, f);
  for (const f of b.files) map.set(f.path, f);
  return {
    name: a.name === b.name ? a.name : `${a.name} + ${b.name}`,
    source: a.source,
    files: Array.from(map.values()),
    manifest: b.manifest || a.manifest,
  };
}
