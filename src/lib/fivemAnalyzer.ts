import {
  Project,
  ProjectFile,
  AnalysisReport,
  NuiMessage,
  NuiCallback,
  FiveMEventRef,
  JsListener,
  ParsedManifest,
} from './projectTypes';

function lineOf(content: string, index: number): number {
  return content.slice(0, index).split('\n').length;
}

/** Extract { ... } literal starting at openIdx (must point to '{'). Returns text incl braces. */
function extractBraceBlock(content: string, openIdx: number): string | null {
  if (content[openIdx] !== '{') return null;
  let depth = 0;
  for (let i = openIdx; i < content.length && i < openIdx + 4000; i++) {
    const ch = content[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return content.slice(openIdx, i + 1);
    }
  }
  return null;
}

function extractPayloadKeys(block: string): string[] {
  // matches "key =" or "key:" — Lua and JS object keys
  const keys = new Set<string>();
  const re = /(?:^|[,{\s])([a-zA-Z_][a-zA-Z0-9_]*)\s*[=:]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) {
    const k = m[1];
    if (['true', 'false', 'nil', 'null'].includes(k)) continue;
    keys.add(k);
  }
  return Array.from(keys);
}

function analyzeLuaFile(file: ProjectFile, report: AnalysisReport) {
  const c = file.content;

  // SendNUIMessage({ ... })
  const sendRe = /SendNUIMessage\s*\(\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = sendRe.exec(c))) {
    const braceIdx = c.indexOf('{', m.index);
    const block = extractBraceBlock(c, braceIdx);
    if (!block) continue;
    const fieldMatch =
      block.match(/\b(action|type|event)\s*=\s*['"]([^'"]+)['"]/);
    const key = fieldMatch ? fieldMatch[2] : '(dynamic)';
    const field = (fieldMatch ? fieldMatch[1] : 'unknown') as NuiMessage['field'];
    report.nuiMessages.push({
      key,
      field,
      payloadKeys: extractPayloadKeys(block).filter(
        (k) => k !== 'action' && k !== 'type' && k !== 'event'
      ),
      origin: { file: file.path, line: lineOf(c, m.index) },
      rawSnippet: block.slice(0, 240),
    });
  }

  // RegisterNUICallback('name', ...)
  const cbRe = /RegisterNUICallback\s*\(\s*['"]([^'"]+)['"]/g;
  while ((m = cbRe.exec(c))) {
    report.nuiCallbacks.push({
      name: m[1],
      origin: { file: file.path, line: lineOf(c, m.index) },
    });
  }

  // Events + commands
  const kinds: Array<[FiveMEventRef['kind'], RegExp]> = [
    ['RegisterNetEvent', /RegisterNetEvent\s*\(\s*['"]([^'"]+)['"]/g],
    ['AddEventHandler', /AddEventHandler\s*\(\s*['"]([^'"]+)['"]/g],
    ['TriggerEvent', /TriggerEvent\s*\(\s*['"]([^'"]+)['"]/g],
    ['TriggerServerEvent', /TriggerServerEvent\s*\(\s*['"]([^'"]+)['"]/g],
    ['RegisterCommand', /RegisterCommand\s*\(\s*['"]([^'"]+)['"]/g],
  ];
  for (const [kind, re] of kinds) {
    while ((m = re.exec(c))) {
      report.fivemEvents.push({
        kind,
        name: m[1],
        origin: { file: file.path, line: lineOf(c, m.index) },
      });
    }
  }
}

function analyzeJsFile(file: ProjectFile, report: AnalysisReport) {
  const c = file.content;

  // window.addEventListener('message', e => { ... e.data.action === 'x' ... })
  // Just capture string equality on e.data.action / .type / .event
  const re = /(?:e\.data|event\.data|data|msg|message)\s*\.\s*(action|type|event)\s*===?\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(c))) {
    report.jsListeners.push({
      key: m[2],
      field: m[1] as JsListener['field'],
      origin: { file: file.path, line: lineOf(c, m.index) },
    });
  }

  // fetchNui('eventName' ...) or fetch(`https://${...}/eventName`
  const fetchRe1 = /fetchNui\s*\(\s*['"]([^'"]+)['"]/g;
  while ((m = fetchRe1.exec(c))) {
    report.jsFetchEvents.push({
      name: m[1],
      origin: { file: file.path, line: lineOf(c, m.index) },
    });
  }
  const fetchRe2 = /fetch\s*\(\s*`https:\/\/\$\{[^}]+\}\/([^`?\s]+)`/g;
  while ((m = fetchRe2.exec(c))) {
    report.jsFetchEvents.push({
      name: m[1],
      origin: { file: file.path, line: lineOf(c, m.index) },
    });
  }
}

export function parseFxManifest(content: string): ParsedManifest {
  const grab = (key: string): string | undefined => {
    const m = content.match(new RegExp(`${key}\\s+['"]([^'"]+)['"]`));
    return m?.[1];
  };
  const grabBlock = (key: string): string[] => {
    const m = content.match(new RegExp(`${key}\\s*\\{([\\s\\S]*?)\\}`));
    if (!m) return [];
    return Array.from(m[1].matchAll(/['"]([^'"]+)['"]/g)).map((x) => x[1]);
  };
  return {
    uiPage: grab('ui_page'),
    files: grabBlock('files'),
    clientScripts: grabBlock('client_scripts?'),
    sharedScripts: grabBlock('shared_scripts?'),
    serverScripts: grabBlock('server_scripts?'),
    author: grab('author'),
    description: grab('description'),
    version: grab('version'),
  };
}

export function analyzeProject(project: Project): AnalysisReport {
  const report: AnalysisReport = {
    nuiMessages: [],
    nuiCallbacks: [],
    fivemEvents: [],
    jsListeners: [],
    jsFetchEvents: [],
  };
  for (const f of project.files) {
    if (f.kind === 'lua') analyzeLuaFile(f, report);
    else if (f.kind === 'js' || f.kind === 'html') analyzeJsFile(f, report);
  }
  // Dedupe NUI messages by key (keep payload union)
  const merged = new Map<string, NuiMessage>();
  for (const msg of report.nuiMessages) {
    const prev = merged.get(msg.key);
    if (!prev) merged.set(msg.key, { ...msg, payloadKeys: [...msg.payloadKeys] });
    else {
      const set = new Set([...prev.payloadKeys, ...msg.payloadKeys]);
      prev.payloadKeys = Array.from(set);
    }
  }
  report.nuiMessages = Array.from(merged.values());
  return report;
}

export interface PreviewScenario {
  id: string;
  label: string;
  field: 'action' | 'type' | 'event' | 'unknown';
  payload: Record<string, unknown>;
}

export function generateScenarios(report: AnalysisReport): PreviewScenario[] {
  const scenarios: PreviewScenario[] = [];
  for (const msg of report.nuiMessages) {
    const payload: Record<string, unknown> = {};
    if (msg.field !== 'unknown') payload[msg.field] = msg.key;
    for (const k of msg.payloadKeys) {
      // Naive defaults based on common names
      if (/visible|show|open|active|has|is|enabled/i.test(k)) payload[k] = true;
      else if (/count|index|amount|value|level/i.test(k)) payload[k] = 1;
      else payload[k] = '';
    }
    scenarios.push({
      id: `${msg.key}-${scenarios.length}`,
      label: msg.key,
      field: msg.field,
      payload,
    });
  }
  return scenarios;
}
