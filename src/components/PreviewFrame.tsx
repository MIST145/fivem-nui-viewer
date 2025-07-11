import { useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  Smartphone, 
  Monitor, 
  Tablet,
  AlertTriangle,
  CheckCircle,
  ExternalLink
} from 'lucide-react';

interface PreviewFrameProps {
  html: string;
  css: string;
  js: string;
  onConsoleMessage: (type: 'log' | 'error' | 'warn', message: string) => void;
}

type ViewportSize = 'mobile' | 'tablet' | 'desktop' | 'fullscreen';

export function PreviewFrame({ html, css, js, onConsoleMessage }: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const viewportSizes = {
    mobile: { width: '375px', height: '667px', label: 'Mobile' },
    tablet: { width: '768px', height: '1024px', label: 'Tablet' },
    desktop: { width: '100%', height: '100%', label: 'Desktop' },
    fullscreen: { width: '100vw', height: '100vh', label: 'Fullscreen' }
  };

  const injectFiveMAPI = () => {
    return `
      <script>
        // FiveM NUI API Simulation
        window.fetchNui = function(event, data) {
          console.log('[NUI] fetchNui called:', event, data);
          window.parent.postMessage({
            type: 'console',
            level: 'log',
            message: 'fetchNui: ' + event + (data ? ' with data: ' + JSON.stringify(data) : '')
          }, '*');
          
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({ status: 'ok', event: event });
            }, 100);
          });
        };

        window.PostNUI = function(data) {
          console.log('[NUI] PostNUI called:', data);
          window.parent.postMessage({
            type: 'console',
            level: 'log',
            message: 'PostNUI: ' + JSON.stringify(data)
          }, '*');
        };

        // Simulate resource name
        window.GetParentResourceName = function() {
          return 'fivem-preview';
        };

        // Console override to capture messages
        const originalConsole = {
          log: console.log,
          error: console.error,
          warn: console.warn
        };

        console.log = function(...args) {
          originalConsole.log(...args);
          window.parent.postMessage({
            type: 'console',
            level: 'log',
            message: args.join(' ')
          }, '*');
        };

        console.error = function(...args) {
          originalConsole.error(...args);
          window.parent.postMessage({
            type: 'console',
            level: 'error',
            message: args.join(' ')
          }, '*');
        };

        console.warn = function(...args) {
          originalConsole.warn(...args);
          window.parent.postMessage({
            type: 'console',
            level: 'warn',
            message: args.join(' ')
          }, '*');
        };

        // Simulate F8 key for console
        document.addEventListener('keydown', function(e) {
          if (e.key === 'F8') {
            e.preventDefault();
            console.log('[FiveM] F8 Console triggered');
          }
        });

        window.addEventListener('error', function(e) {
          console.error('JavaScript Error:', e.message, 'at', e.filename + ':' + e.lineno);
        });
      </script>
    `;
  };

  const createPreviewDocument = () => {
    const injectedCSS = css || '';
    const injectedJS = js || '';
    const fiveMAPI = injectFiveMAPI();

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>FiveM NUI Preview</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            overflow-x: hidden;
          }
          ${injectedCSS}
        </style>
        ${fiveMAPI}
      </head>
      <body>
        ${html.replace(/<script\s+src=[^>]*><\/script>/gi, '')}
        <script>
          try {
            ${injectedJS}
          } catch (error) {
            console.error('Script Error:', error.message);
          }
        </script>
      </body>
      </html>
    `;
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
        onConsoleMessage('log', 'Preview updated successfully');
      };

      iframe.onerror = () => {
        setIsLoading(false);
        setHasError(true);
        onConsoleMessage('error', 'Failed to load preview');
      };

      const blob = new Blob([doc], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      iframe.src = url;
      
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);

    } catch (error) {
      setIsLoading(false);
      setHasError(true);
      onConsoleMessage('error', `Preview error: ${error}`);
    }
  };

  useEffect(() => {
    updatePreview();
  }, [html, css, js]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'console') {
        onConsoleMessage(event.data.level, event.data.message);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onConsoleMessage]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      setViewport('fullscreen');
    } else {
      setViewport('desktop');
    }
  };

  const getViewportIcon = (size: ViewportSize) => {
    const icons = {
      mobile: Smartphone,
      tablet: Tablet,
      desktop: Monitor,
      fullscreen: Maximize2
    };
    return icons[size];
  };

  return (
    <div className="space-y-4">
      {/* Preview Controls */}
      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
        <div className="flex items-center space-x-2">
          <Badge variant={hasError ? 'destructive' : 'secondary'} className="flex items-center space-x-1">
            {hasError ? (
              <AlertTriangle className="h-3 w-3" />
            ) : (
              <CheckCircle className="h-3 w-3" />
            )}
            <span>{hasError ? 'Error' : 'Ready'}</span>
          </Badge>
          
          {isLoading && (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Viewport Size Buttons */}
          {Object.entries(viewportSizes).map(([size, config]) => {
            if (size === 'fullscreen') return null;
            const Icon = getViewportIcon(size as ViewportSize);
            return (
              <Button
                key={size}
                variant={viewport === size ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewport(size as ViewportSize)}
              >
                <Icon className="h-4 w-4" />
              </Button>
            );
          })}
          
          <div className="w-px h-6 bg-border mx-2" />
          
          <Button variant="ghost" size="sm" onClick={updatePreview}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          
          <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Preview Frame Container */}
      <Card className={`relative overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
        <div 
          className="mx-auto transition-all duration-300"
          style={{
            width: isFullscreen ? '100%' : viewportSizes[viewport].width,
            height: isFullscreen ? '100vh' : '600px'
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

      {/* Preview Info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center space-x-4">
          <span>Viewport: {viewportSizes[viewport].label}</span>
          <span>Size: {viewportSizes[viewport].width} × {viewportSizes[viewport].height}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span>FiveM NUI API: Ativo</span>
          <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}