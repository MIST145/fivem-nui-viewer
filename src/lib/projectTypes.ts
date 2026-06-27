export type FileKind = 'html' | 'css' | 'js' | 'lua' | 'json' | 'image' | 'other';

export interface ProjectFile {
  path: string;          // relative path within the project
  content: string;       // text content (empty for binary images stored as URL)
  kind: FileKind;
  url?: string;          // for remote binary assets (github images)
  size?: number;
}

export interface ParsedManifest {
  uiPage?: string;
  files: string[];
  clientScripts: string[];
  sharedScripts: string[];
  serverScripts: string[];
  author?: string;
  description?: string;
  version?: string;
  resourceName?: string;
}

export interface Project {
  name: string;
  source: 'files' | 'folder' | 'github';
  files: ProjectFile[];
  manifest?: ParsedManifest;
}

export interface NuiMessage {
  key: string;            // value of action / type / event
  field: 'action' | 'type' | 'event' | 'unknown';
  payloadKeys: string[];  // detected payload field names
  origin: { file: string; line: number };
  rawSnippet: string;
}

export interface NuiCallback {
  name: string;
  origin: { file: string; line: number };
}

export interface FiveMEventRef {
  kind: 'RegisterNetEvent' | 'AddEventHandler' | 'TriggerEvent' | 'TriggerServerEvent' | 'RegisterCommand';
  name: string;
  origin: { file: string; line: number };
}

export interface JsListener {
  key: string;
  field: 'action' | 'type' | 'event' | 'unknown';
  origin: { file: string; line: number };
}

export interface AnalysisReport {
  nuiMessages: NuiMessage[];        // SendNUIMessage from Lua
  nuiCallbacks: NuiCallback[];      // RegisterNUICallback from Lua
  fivemEvents: FiveMEventRef[];     // events / commands
  jsListeners: JsListener[];        // window message handlers in JS
  jsFetchEvents: { name: string; origin: { file: string; line: number } }[];
}

export function inferKind(path: string): FileKind {
  const ext = path.toLowerCase().split('.').pop() || '';
  if (ext === 'html' || ext === 'htm') return 'html';
  if (ext === 'css') return 'css';
  if (ext === 'js' || ext === 'mjs' || ext === 'ts') return 'js';
  if (ext === 'lua') return 'lua';
  if (ext === 'json') return 'json';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico'].includes(ext)) return 'image';
  return 'other';
}
