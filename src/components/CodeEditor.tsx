import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Copy, 
  Download, 
  RotateCcw, 
  Search, 
  Settings,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface CodeEditorProps {
  language: string;
  value: string;
  onChange: (value: string) => void;
}

export function CodeEditor({ language, value, onChange }: CodeEditorProps) {
  const [fontSize, setFontSize] = useState(14);
  const [lineNumbers, setLineNumbers] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(value);
  };

  const downloadFile = () => {
    const extensions: Record<string, string> = {
      html: 'html',
      css: 'css',
      javascript: 'js',
      lua: 'lua'
    };
    
    const ext = extensions[language] || 'txt';
    const blob = new Blob([value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `file.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCode = () => {
    // Basic formatting for different languages
    let formatted = value;
    
    if (language === 'html') {
      // Basic HTML formatting
      formatted = formatted
        .replace(/></g, '>\n<')
        .replace(/^\s+|\s+$/gm, '');
    } else if (language === 'css') {
      // Basic CSS formatting
      formatted = formatted
        .replace(/\{/g, ' {\n  ')
        .replace(/\}/g, '\n}\n')
        .replace(/;/g, ';\n  ')
        .replace(/^\s+|\s+$/gm, '');
    } else if (language === 'javascript') {
      // Basic JS formatting
      formatted = formatted
        .replace(/\{/g, ' {\n  ')
        .replace(/\}/g, '\n}\n')
        .replace(/;/g, ';\n')
        .replace(/^\s+|\s+$/gm, '');
    }
    
    onChange(formatted);
  };

  const increaseFontSize = () => {
    setFontSize(prev => Math.min(prev + 2, 24));
  };

  const decreaseFontSize = () => {
    setFontSize(prev => Math.max(prev - 2, 10));
  };

  const getLanguageColor = () => {
    const colors: Record<string, string> = {
      html: 'text-orange-400',
      css: 'text-blue-400',
      javascript: 'text-yellow-400',
      lua: 'text-purple-400'
    };
    return colors[language] || 'text-gray-400';
  };

  const lines = value.split('\n');

  return (
    <div className="space-y-4">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between p-3 bg-muted rounded-t-lg border-b border-border">
        <div className="flex items-center space-x-2">
          <span className={`font-mono text-sm font-medium ${getLanguageColor()}`}>
            {language.toUpperCase()}
          </span>
          <span className="text-xs text-muted-foreground">
            {lines.length} linhas
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="sm" onClick={decreaseFontSize}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground px-2">
            {fontSize}px
          </span>
          <Button variant="ghost" size="sm" onClick={increaseFontSize}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={formatCode}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={copyToClipboard}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={downloadFile}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Editor Area */}
      <Card className="relative overflow-hidden bg-muted/20">
        <div className="flex">
          {/* Line Numbers */}
          {lineNumbers && (
            <div 
              className="bg-muted/50 border-r border-border p-4 text-muted-foreground font-mono text-right select-none"
              style={{ fontSize: `${fontSize}px`, lineHeight: '1.5' }}
            >
              {lines.map((_, index) => (
                <div key={index + 1} className="leading-6">
                  {index + 1}
                </div>
              ))}
            </div>
          )}
          
          {/* Code Area */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              className="w-full h-96 p-4 bg-transparent border-none outline-none resize-none font-mono text-foreground leading-6"
              style={{ fontSize: `${fontSize}px` }}
              placeholder={`Digite seu código ${language} aqui...`}
              spellCheck={false}
            />
            
            {/* Syntax highlighting overlay would go here in a real implementation */}
          </div>
        </div>
      </Card>

      {/* Editor Stats */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center space-x-4">
          <span>Caracteres: {value.length}</span>
          <span>Linhas: {lines.length}</span>
          <span>Palavras: {value.split(/\s+/).filter(word => word.length > 0).length}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span>Codificação: UTF-8</span>
          <span>|</span>
          <span>Espaços: 2</span>
        </div>
      </div>
    </div>
  );
}