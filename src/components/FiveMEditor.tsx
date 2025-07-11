import { useState, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Play, 
  Code2, 
  Eye, 
  Terminal, 
  FileCode, 
  Monitor, 
  Settings,
  Download,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { FileUploader } from './FileUploader';
import { CodeEditor } from './CodeEditor';
import { PreviewFrame } from './PreviewFrame';
import { FiveMConsole } from './FiveMConsole';

interface FileStructure {
  html: string;
  css: string;
  js: string;
  lua?: string;
}

export function FiveMEditor() {
  const [files, setFiles] = useState<FileStructure>({
    html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>FiveM NUI Preview</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>FiveM NUI Interface</h1>
        <p>Upload your files to start previewing!</p>
    </div>
    <script src="script.js"></script>
</body>
</html>`,
    css: `body {
    font-family: 'Roboto', sans-serif;
    margin: 0;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    min-height: 100vh;
}

.container {
    max-width: 800px;
    margin: 0 auto;
    text-align: center;
    padding: 40px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 10px;
    backdrop-filter: blur(10px);
}

h1 {
    font-size: 2.5rem;
    margin-bottom: 20px;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}`,
    js: `// FiveM NUI Script
console.log('FiveM NUI Preview loaded');

// Simulate FiveM functions
window.fetchNui = (event, data) => {
    console.log('NUI Event:', event, data);
    return Promise.resolve({ status: 'ok' });
};

// Simulate post message to client
window.PostNUI = (data) => {
    console.log('PostNUI:', data);
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded - FiveM NUI ready');
});`
  });

  const [activeTab, setActiveTab] = useState<'upload' | 'editor' | 'preview'>('upload');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [consoleMessages, setConsoleMessages] = useState<Array<{
    type: 'log' | 'error' | 'warn';
    message: string;
    timestamp: Date;
  }>>([
    { type: 'log', message: 'FiveM Preview Console initialized', timestamp: new Date() }
  ]);

  const addConsoleMessage = useCallback((type: 'log' | 'error' | 'warn', message: string) => {
    setConsoleMessages(prev => [...prev, { type, message, timestamp: new Date() }]);
  }, []);

  const handleFilesUploaded = (uploadedFiles: FileStructure) => {
    setFiles(uploadedFiles);
    setActiveTab('editor');
    addConsoleMessage('log', 'Files uploaded successfully');
  };

  const handleCodeChange = (type: keyof FileStructure, content: string) => {
    setFiles(prev => ({ ...prev, [type]: content }));
  };

  const runPreview = () => {
    setIsPreviewMode(true);
    setActiveTab('preview');
    addConsoleMessage('log', 'Running FiveM NUI Preview...');
  };

  const clearConsole = () => {
    setConsoleMessages([]);
  };

  return (
    <div className="min-h-screen bg-gradient-dark p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4 animate-fade-in">
            FiveM NUI Preview
          </h1>
          <p className="text-muted-foreground text-lg animate-slide-up">
            Desenvolva e teste suas interfaces FiveM sem precisar rodar o jogo
          </p>
        </div>

        {/* Navigation */}
        <div className="mb-6 flex justify-center">
          <div className="flex space-x-2 bg-card rounded-lg p-1 shadow-elegant">
            <Button
              variant={activeTab === 'upload' ? 'fivem' : 'ghost'}
              onClick={() => setActiveTab('upload')}
              size="sm"
            >
              <Upload className="h-4 w-4" />
              Upload
            </Button>
            <Button
              variant={activeTab === 'editor' ? 'fivem' : 'ghost'}
              onClick={() => setActiveTab('editor')}
              size="sm"
            >
              <Code2 className="h-4 w-4" />
              Editor
            </Button>
            <Button
              variant={activeTab === 'preview' ? 'fivem' : 'ghost'}
              onClick={() => setActiveTab('preview')}
              size="sm"
            >
              <Monitor className="h-4 w-4" />
              Preview
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card className="p-6 bg-card/50 backdrop-blur border-border shadow-elegant">
              {activeTab === 'upload' && (
                <FileUploader onFilesUploaded={handleFilesUploaded} />
              )}
              
              {activeTab === 'editor' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Code Editor</h2>
                    <div className="flex space-x-2">
                      <Button variant="secondary" size="sm" onClick={runPreview}>
                        <Play className="h-4 w-4" />
                        Preview
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                        Export
                      </Button>
                    </div>
                  </div>
                  
                  <Tabs defaultValue="html" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-muted">
                      <TabsTrigger value="html">
                        <FileCode className="h-4 w-4 mr-2" />
                        HTML
                      </TabsTrigger>
                      <TabsTrigger value="css">
                        <FileCode className="h-4 w-4 mr-2" />
                        CSS
                      </TabsTrigger>
                      <TabsTrigger value="js">
                        <FileCode className="h-4 w-4 mr-2" />
                        JavaScript
                      </TabsTrigger>
                      <TabsTrigger value="lua">
                        <FileCode className="h-4 w-4 mr-2" />
                        Lua
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="html" className="mt-4">
                      <CodeEditor
                        language="html"
                        value={files.html}
                        onChange={(value) => handleCodeChange('html', value)}
                      />
                    </TabsContent>
                    
                    <TabsContent value="css" className="mt-4">
                      <CodeEditor
                        language="css"
                        value={files.css}
                        onChange={(value) => handleCodeChange('css', value)}
                      />
                    </TabsContent>
                    
                    <TabsContent value="js" className="mt-4">
                      <CodeEditor
                        language="javascript"
                        value={files.js}
                        onChange={(value) => handleCodeChange('js', value)}
                      />
                    </TabsContent>
                    
                    <TabsContent value="lua" className="mt-4">
                      <CodeEditor
                        language="lua"
                        value={files.lua || '-- Lua script for reference only'}
                        onChange={(value) => handleCodeChange('lua', value)}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              )}
              
              {activeTab === 'preview' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">NUI Preview</h2>
                    <div className="flex space-x-2">
                      <Badge variant="secondary" className="bg-gradient-secondary">
                        <Eye className="h-3 w-3 mr-1" />
                        Live Preview
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => addConsoleMessage('log', 'Preview refreshed')}>
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                      </Button>
                    </div>
                  </div>
                  
                  <PreviewFrame 
                    html={files.html}
                    css={files.css}
                    js={files.js}
                    onConsoleMessage={addConsoleMessage}
                  />
                </div>
              )}
            </Card>
          </div>

          {/* Console Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-4 bg-card/50 backdrop-blur border-border shadow-elegant h-[600px] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center">
                  <Terminal className="h-4 w-4 mr-2" />
                  Console
                </h3>
                <Button variant="ghost" size="sm" onClick={clearConsole}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <FiveMConsole messages={consoleMessages} />
              
              <div className="mt-4 pt-4 border-t border-border">
                <Badge variant="outline" className="text-xs">
                  Press F8 for console
                </Badge>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}