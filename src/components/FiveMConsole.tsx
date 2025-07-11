import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Terminal, 
  Send, 
  AlertTriangle, 
  Info, 
  AlertCircle,
  ChevronRight,
  Hash
} from 'lucide-react';

interface ConsoleMessage {
  type: 'log' | 'error' | 'warn';
  message: string;
  timestamp: Date;
}

interface FiveMConsoleProps {
  messages: ConsoleMessage[];
}

export function FiveMConsole({ messages }: FiveMConsoleProps) {
  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fiveMCommands = [
    'restart resourcename',
    'start resourcename',
    'stop resourcename',
    'refresh',
    'exec server.cfg',
    'clientkick id',
    'banid id',
    'unban id',
    'list',
    'players',
    'resources'
  ];

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    // Add to history
    setCommandHistory(prev => [...prev, command]);
    setHistoryIndex(-1);

    // Simulate command execution
    console.log(`[FiveM Console] Executing: ${command}`);
    
    // Clear input
    setCommand('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex >= 0) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCommand('');
        } else {
          setHistoryIndex(newIndex);
          setCommand(commandHistory[newIndex]);
        }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Auto-complete commands
      const matches = fiveMCommands.filter(cmd => cmd.startsWith(command.toLowerCase()));
      if (matches.length === 1) {
        setCommand(matches[0]);
      }
    }
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-3 w-3 text-destructive" />;
      case 'warn':
        return <AlertCircle className="h-3 w-3 text-yellow-500" />;
      default:
        return <Info className="h-3 w-3 text-blue-400" />;
    }
  };

  const getMessageColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'text-destructive';
      case 'warn':
        return 'text-yellow-400';
      default:
        return 'text-foreground';
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Console Header */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-border">
        <Badge variant="outline" className="text-xs">
          <Terminal className="h-3 w-3 mr-1" />
          FiveM Console
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {messages.length} msgs
        </Badge>
      </div>

      {/* Messages Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 pr-2">
        <div className="space-y-1">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Console vazio</p>
              <p className="text-xs">Execute comandos ou monitore logs</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className="flex items-start space-x-2 text-xs p-2 rounded hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center space-x-1 min-w-0">
                  {getMessageIcon(msg.type)}
                  <span className="text-muted-foreground font-mono text-[10px]">
                    {formatTimestamp(msg.timestamp)}
                  </span>
                </div>
                <div className={`flex-1 min-w-0 ${getMessageColor(msg.type)} font-mono break-words`}>
                  {msg.message}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Command Input */}
      <form onSubmit={handleCommandSubmit} className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center space-x-2">
          <div className="flex items-center text-muted-foreground">
            <ChevronRight className="h-3 w-3" />
          </div>
          <Input
            ref={inputRef}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite um comando..."
            className="flex-1 font-mono text-xs bg-muted/50 border-none h-8"
          />
          <Button type="submit" size="sm" variant="ghost" className="h-8 w-8 p-0">
            <Send className="h-3 w-3" />
          </Button>
        </div>
        
        {/* Command Suggestions */}
        {command && (
          <div className="mt-2 text-[10px] text-muted-foreground">
            <div className="flex flex-wrap gap-1">
              {fiveMCommands
                .filter(cmd => cmd.startsWith(command.toLowerCase()))
                .slice(0, 3)
                .map((suggestion, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="text-[10px] cursor-pointer hover:bg-muted"
                    onClick={() => setCommand(suggestion)}
                  >
                    {suggestion}
                  </Badge>
                ))}
            </div>
          </div>
        )}
      </form>

      {/* Help Text */}
      <div className="mt-2 text-[10px] text-muted-foreground">
        <div className="flex items-center space-x-2">
          <span>↑↓ Histórico</span>
          <span>•</span>
          <span>Tab Completar</span>
          <span>•</span>
          <span>F8 Console</span>
        </div>
      </div>
    </div>
  );
}