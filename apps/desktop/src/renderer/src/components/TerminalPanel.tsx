import { useRef, useEffect } from 'react';
import './terminal.css';

interface TerminalPanelProps {
  output: string;
  onClear: () => void;
}

export function TerminalPanel({ output, onClear }: TerminalPanelProps) {
  const ref = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [output]);

  return (
    <div className="terminal">
      <div className="terminal__toolbar">
        <button type="button" onClick={onClear}>
          Clear
        </button>
      </div>
      <pre ref={ref} className="terminal__output">
        {output || 'Build output will appear here.'}
      </pre>
    </div>
  );
}
