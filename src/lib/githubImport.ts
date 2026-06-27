import { Project, ProjectFile, inferKind } from './projectTypes';
import { parseFxManifest } from './fivemAnalyzer';

const TEXT_EXTS = new Set([
  'html', 'htm', 'css', 'js', 'mjs', 'ts', 'lua', 'json', 'md', 'txt', 'cfg',
]);
const IGNORED_DIRS = ['node_modules/', '.git/', 'dist/', 'build/', '.next/'];
const MAX_FILE_SIZE = 500 * 1024;

function parseRepoUrl(url: string): { owner: string; repo: string; branch?: string } | null {
  try {
    const u = new URL(url.trim());
    if (u.hostname !== 'github.com') return null;
    const parts = u.pathname.replace(/^\/+|\/+$/g, '').split('/');
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, '');
    let branch: string | undefined;
    if (parts[2] === 'tree' && parts[3]) branch = parts[3];
    return { owner, repo, branch };
  } catch {
    return null;
  }
}

export interface GithubImportOptions {
  token?: string;
  onProgress?: (msg: string) => void;
}

export async function importGithubRepo(
  url: string,
  opts: GithubImportOptions = {}
): Promise<Project> {
  const parsed = parseRepoUrl(url);
  if (!parsed) throw new Error('URL inválida. Use https://github.com/owner/repo');
  const { owner, repo } = parsed;
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  opts.onProgress?.('A obter informação do repositório...');
  let branch = parsed.branch;
  if (!branch) {
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!r.ok) throw new Error(`GitHub API: ${r.status} ${r.statusText}`);
    const data = await r.json();
    branch = data.default_branch || 'main';
  }

  opts.onProgress?.(`A listar ficheiros (${branch})...`);
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers }
  );
  if (!treeRes.ok) throw new Error(`GitHub tree: ${treeRes.status} ${treeRes.statusText}`);
  const tree = await treeRes.json();
  if (tree.truncated) opts.onProgress?.('Aviso: árvore truncada pelo GitHub.');

  const candidates = (tree.tree as Array<{ path: string; type: string; size?: number }>).filter(
    (n) => n.type === 'blob' && !IGNORED_DIRS.some((d) => n.path.startsWith(d))
  );

  const files: ProjectFile[] = [];
  let textFetches = 0;
  for (const node of candidates) {
    const ext = node.path.toLowerCase().split('.').pop() || '';
    const kind = inferKind(node.path);
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${encodeURI(node.path)}`;

    if (kind === 'image') {
      files.push({ path: node.path, content: '', kind, url: rawUrl, size: node.size });
      continue;
    }
    if (!TEXT_EXTS.has(ext)) continue;
    if (node.size && node.size > MAX_FILE_SIZE) continue;
    textFetches++;
    if (textFetches % 5 === 0) opts.onProgress?.(`A descarregar... (${textFetches})`);
    try {
      const res = await fetch(rawUrl);
      if (!res.ok) continue;
      const content = await res.text();
      files.push({ path: node.path, content, kind, size: content.length });
    } catch {
      // ignore individual failures
    }
  }

  const manifestFile = files.find((f) => f.path.endsWith('fxmanifest.lua') || f.path.endsWith('__resource.lua'));
  const manifest = manifestFile ? parseFxManifest(manifestFile.content) : undefined;
  if (manifest) manifest.resourceName = repo;

  opts.onProgress?.(`Concluído: ${files.length} ficheiros.`);
  return { name: `${owner}/${repo}`, source: 'github', files, manifest };
}
