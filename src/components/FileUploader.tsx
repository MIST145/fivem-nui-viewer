import { useState, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Upload, 
  FileText, 
  Folder, 
  CheckCircle, 
  AlertCircle,
  FileCode,
  Image,
  File,
  Trash2,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileStructure {
  html: string;
  css: string;
  js: string;
  lua?: string;
}

interface AccumulatedFiles {
  html: string[];
  css: string[];
  js: string[];
  lua: string[];
}

interface FileUploaderProps {
  onFilesUploaded: (files: FileStructure) => void;
}

export function FileUploader({ onFilesUploaded }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [accumulatedFiles, setAccumulatedFiles] = useState<AccumulatedFiles>({
    html: [],
    css: [],
    js: [],
    lua: []
  });
  const [uploadedFileNames, setUploadedFileNames] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFiles = async (files: FileList | File[]) => {
    setIsUploading(true);
    const fileArray = Array.from(files);
    const newFileNames: string[] = [];

    const tempAccumulated: AccumulatedFiles = {
      html: [...accumulatedFiles.html],
      css: [...accumulatedFiles.css],
      js: [...accumulatedFiles.js],
      lua: [...accumulatedFiles.lua]
    };

    for (const file of fileArray) {
      const text = await file.text();
      const fileName = file.name.toLowerCase();
      newFileNames.push(file.name);

      if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
        tempAccumulated.html.push(text);
      } else if (fileName.endsWith('.css')) {
        tempAccumulated.css.push(text);
      } else if (fileName.endsWith('.js')) {
        tempAccumulated.js.push(text);
      } else if (fileName.endsWith('.lua')) {
        tempAccumulated.lua.push(text);
      }
    }

    setAccumulatedFiles(tempAccumulated);
    setUploadedFileNames(prev => [...prev, ...newFileNames]);
    setIsUploading(false);
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const confirmUpload = () => {
    const fileStructure: FileStructure = {
      html: accumulatedFiles.html.length > 0 ? accumulatedFiles.html[accumulatedFiles.html.length - 1] : '',
      css: accumulatedFiles.css.join('\n\n/* ========== */\n\n'),
      js: accumulatedFiles.js.join('\n\n// ==========\n\n'),
      lua: accumulatedFiles.lua.join('\n\n-- ==========\n\n')
    };

    // If no HTML file found, create a basic template
    if (!fileStructure.html) {
      fileStructure.html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>FiveM NUI</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>Your FiveM Interface</h1>
    </div>
    <script src="script.js"></script>
</body>
</html>`;
    }

    onFilesUploaded(fileStructure);
  };

  const clearFiles = () => {
    setAccumulatedFiles({
      html: [],
      css: [],
      js: [],
      lua: []
    });
    setUploadedFileNames([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getTotalFileCount = () => {
    return accumulatedFiles.html.length + 
           accumulatedFiles.css.length + 
           accumulatedFiles.js.length + 
           accumulatedFiles.lua.length;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const items = e.dataTransfer.items;
    const files: File[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      processFiles(files);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'html':
      case 'htm':
        return <FileCode className="h-4 w-4 text-orange-400" />;
      case 'css':
        return <FileCode className="h-4 w-4 text-blue-400" />;
      case 'js':
        return <FileCode className="h-4 w-4 text-yellow-400" />;
      case 'lua':
        return <FileCode className="h-4 w-4 text-purple-400" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        return <Image className="h-4 w-4 text-green-400" />;
      default:
        return <File className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Upload FiveM Files</h2>
        <p className="text-muted-foreground">
          Arraste e solte seus arquivos HTML, CSS, JS e Lua aqui
        </p>
      </div>

      {/* Drop Zone */}
      <Card
        className={cn(
          "relative border-2 border-dashed transition-all duration-300 cursor-pointer",
          isDragging
            ? "border-primary bg-primary/10 shadow-primary"
            : "border-border hover:border-primary/50",
          isUploading && "opacity-50 pointer-events-none"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <div className="p-12 text-center">
          {isUploading ? (
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Processando arquivos...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-gradient-primary flex items-center justify-center">
                <Upload className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <p className="text-lg font-medium">
                  Clique para selecionar ou arraste arquivos
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Suporta: HTML, CSS, JS, Lua, imagens
                </p>
              </div>
              <Button variant="outline" className="mt-4">
                <Folder className="h-4 w-4 mr-2" />
                Selecionar Arquivos
              </Button>
            </div>
          )}
        </div>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".html,.htm,.css,.js,.lua,.png,.jpg,.jpeg,.gif"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* File Summary and Action Buttons */}
      {getTotalFileCount() > 0 && (
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center">
              <CheckCircle className="h-4 w-4 text-secondary mr-2" />
              Arquivos Acumulados ({getTotalFileCount()})
            </h3>
            
            {/* File type counters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {accumulatedFiles.html.length > 0 && (
                <div className="text-center p-2 bg-orange-500/10 rounded border border-orange-500/20">
                  <FileCode className="h-5 w-5 text-orange-400 mx-auto mb-1" />
                  <div className="text-sm font-medium">HTML: {accumulatedFiles.html.length}</div>
                </div>
              )}
              {accumulatedFiles.css.length > 0 && (
                <div className="text-center p-2 bg-blue-500/10 rounded border border-blue-500/20">
                  <FileCode className="h-5 w-5 text-blue-400 mx-auto mb-1" />
                  <div className="text-sm font-medium">CSS: {accumulatedFiles.css.length}</div>
                </div>
              )}
              {accumulatedFiles.js.length > 0 && (
                <div className="text-center p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
                  <FileCode className="h-5 w-5 text-yellow-400 mx-auto mb-1" />
                  <div className="text-sm font-medium">JS: {accumulatedFiles.js.length}</div>
                </div>
              )}
              {accumulatedFiles.lua.length > 0 && (
                <div className="text-center p-2 bg-purple-500/10 rounded border border-purple-500/20">
                  <FileCode className="h-5 w-5 text-purple-400 mx-auto mb-1" />
                  <div className="text-sm font-medium">Lua: {accumulatedFiles.lua.length}</div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex space-x-3">
              <Button onClick={confirmUpload} className="flex-1">
                <Check className="h-4 w-4 mr-2" />
                Confirmar Carregamento
              </Button>
              <Button variant="destructive" onClick={clearFiles}>
                <Trash2 className="h-4 w-4 mr-2" />
                Apagar Ficheiros
              </Button>
            </div>
          </Card>

          {/* Detailed file list */}
          {uploadedFileNames.length > 0 && (
            <Card className="p-4">
              <h4 className="font-medium mb-3">Ficheiros Carregados</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {uploadedFileNames.map((fileName, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 p-2 rounded bg-muted/50"
                  >
                    {getFileIcon(fileName)}
                    <span className="text-sm font-medium flex-1">{fileName}</span>
                    <CheckCircle className="h-4 w-4 text-secondary" />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Framework Templates */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Templates Populares</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button variant="outline" className="h-auto p-4 flex flex-col space-y-2">
            <FileText className="h-6 w-6 text-primary" />
            <span className="font-medium">ESX Template</span>
            <span className="text-xs text-muted-foreground">Interface básica ESX</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col space-y-2">
            <FileText className="h-6 w-6 text-secondary" />
            <span className="font-medium">QBCore Template</span>
            <span className="text-xs text-muted-foreground">Interface QBCore</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col space-y-2">
            <FileText className="h-6 w-6 text-accent" />
            <span className="font-medium">vRP Template</span>
            <span className="text-xs text-muted-foreground">Interface vRP básica</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}