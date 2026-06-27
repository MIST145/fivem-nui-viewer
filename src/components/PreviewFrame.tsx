import { useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Maximize2, Minimize2, RotateCcw, Smartphone, Monitor, Tablet,
  AlertTriangle, CheckCircle,
} from 'lucide-react';
import { Project } from '@/lib/projectTypes';
import { PreviewScenario } from '@/lib/fivemAnalyzer';

interface PreviewFrameProps {
  html: string;
  css: string;
  js: string;
  project?: Project | null;
  pendingScenario?: PreviewScenario | null;
  onConsoleMessage: (type: 'log' | 'error' | 'warn', message: string) => void;
}

type ViewportSize = 'mobile' | 'tablet' | 'desktop' | 'fullscreen';

export function PreviewFrame({ html, css, js, project, pendingScenario, onConsoleMessage }: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const viewportSizes = {
    mobile: { width: '375px', height: '667px', label: 'Mobile' },
    tablet: { width: '768px', height: '1024px', label: 'Tablet' },
    desktop: { width: '100%', height: '100%', label: 'Desktop' },
    fullscreen: { width: '100vw', height: '100vh', label: 'Fullscreen' },
  };

  // Rewrite relative asset references (e.g. images/foo.png) to data/URL from project
  const resolveAssets = (text: string): string => {
    if (!project) return text;
    let out = text;
    for (const f of project.files) {
      if (f.kind !== 'image') continue;
      const target = f.url || '';
      if (!target) continue;
      const base = f.path.split('/').pop()!;
      // replace occurrences of path or basename
      const patterns = [f.path, `./${f.path}`, base, `./${base}`, `images/${base}`, `./images/${base}`];
      for (const p of patterns) {
        const safe = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        out = out.replace(new RegExp(`(["'\\(])${safe}(["'\\)])`, 'g'), `$1${target}$2`);
      }
    }
    return out;
  };

  const injectFiveMAPI = () => `
    <script>
      window.fetchNui = function(event, data) {
        window.parent.postMessage({ type: 'console', level: 'log',
          message: 'fetchNui: ' + event + (data ? ' ' + JSON.stringify(data) : '') }, '*');
        return Promise.resolve({ status: 'ok', event: event });
      };
      window.GetParentResourceName = function() { return 'fivem-preview'; };
      ['log','error','warn'].forEach(function(lvl){
        var orig = console[lvl].bind(console);
        console[lvl] = function(){
          orig.apply(null, arguments);
          var msg = Array.from(arguments).map(function(a){
            try { return typeof a === 'string' ? a : JSON.stringify(a); } catch(e){ return String(a); }
          }).join(' ');
          window.parent.postMessage({ type:'console', level:lvl, message: msg }, '*');
        };
      });
      window.addEventListener('error', function(e){
        console.error('JS Error:', e.message, 'at', e.filename + ':' + e.lineno);
      });
      // Allow parent to dispatch scenarios as window message events
      window.addEventListener('message', function(e){
        if (e.data && e.data.__scenario){
          var payload = e.data.payload;
          window.dispatchEvent(new MessageEvent('message', { data: payload }));
        }
      });
    </script>`;

  const createPreviewDocument = () => {
    const resolvedHtml = resolveAssets(html || '');
    const resolvedCss = resolveAssets(css || '');
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>FiveM NUI Preview</title>
<style>body{margin:0;padding:0;overflow-x:hidden;}${resolvedCss}</style>
${injectFiveMAPI()}
</head>
<body>
${resolvedHtml.replace(/<script\s+src=[^>]*><\/script>/gi, '').replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, '')}
<script>try{${js || ''}}catch(e){console.error('Script Error:', e.message);}</script>
</body></html>`;
  };

  const updatePreview = () => {
    if (!iframeRef.current) return;
    setIsLoading(true);
    setHasError(false);
    try {
      const doc = createPreviewDocument();
      const iframe = iframeRef.current;
      iframe.onload = () => {
        setIsLoading(false);
        onConsoleMessage('log', 'Preview updated');
      };
      iframe.onerror = () => { setIsLoading(false); setHasError(true); };
      const blob = new Blob([doc], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      iframe.src = url;
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (e) {
      setIsLoading(false);
      setHasError(true);
      onConsoleMessage('error', `Preview error: ${e}`);
    }
  };

  useEffect(() => { updatePreview(); /* eslint-disable-next-line */ }, [html, css, js]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'console') onConsoleMessage(e.data.level, e.data.message);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onConsoleMessage]);

  // Dispatch scenario into iframe
  useEffect(() => {
    if (!pendingScenario || !iframeRef.current) return;
    const send = () => {
      iframeRef.current?.contentWindow?.postMessage(
        { __scenario: true, payload: pendingScenario.payload },
        '*'
      );
      onConsoleMessage('log', `→ Cenário: ${pendingScenario.label}`);
    };
    // Wait one tick for iframe ready
    const t = setTimeout(send, 200);
    return () => clearTimeout(t);
  }, [pendingScenario]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setViewport(!isFullscreen ? 'fullscreen' : 'desktop');
  };

  const icons = { mobile: Smartphone, tablet: Tablet, desktop: Monitor, fullscreen: Maximize2 };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
        <Badge variant={hasError ? 'destructive' : 'secondary'} className="flex items-center gap-1">
          {hasError ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
          {hasError ? 'Error' : 'Ready'}
        </Badge>
        <div className="flex items-center gap-2">
          {(['mobile', 'tablet', 'desktop'] as const).map((s) => {
            const Icon = icons[s];
            return (
              <Button key={s} variant={viewport === s ? 'default' : 'ghost'} size="sm" onClick={() => setViewport(s)}>
                <Icon className="h-4 w-4" />
              </Button>
            );
          })}
          <Button variant="ghost" size="sm" onClick={updatePreview}><RotateCcw className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <Card className={`relative overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
        <div
          className="mx-auto transition-all duration-300"
          style={{
            width: isFullscreen ? '100%' : viewportSizes[viewport].width,
            height: isFullscreen ? '100vh' : '600px',
          }}
        >
          <iframe
            ref={iframeRef}
            className="w-full h-full border-none bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms"
            title="FiveM NUI Preview"
          />
        </div>
      </Card>
      {isLoading && <div className="text-xs text-muted-foreground text-center">Loading...</div>}
    </div>
  );
}
