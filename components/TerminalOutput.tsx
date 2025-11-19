import React from 'react';

interface TerminalOutputProps {
  content: string;
  isLoading?: boolean;
}

const TerminalOutput: React.FC<TerminalOutputProps> = ({ content, isLoading }) => {
  // Simple formatter: splits by newline, bold text between ** **, handles bullet points
  const formatLine = (line: string, index: number) => {
    if (line.trim().startsWith('- ')) {
        return <li key={index} className="ml-4 list-disc marker:text-vector-green mb-1 text-gray-300">{line.replace('- ', '')}</li>;
    }
    // Bold parsing
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
        <p key={index} className="mb-2 min-h-[1rem]">
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <span key={i} className="font-bold text-white">{part.slice(2, -2)}</span>;
                }
                return part;
            })}
        </p>
    );
  };

  return (
    <div className="font-mono text-sm md:text-base leading-relaxed p-4 md:p-6 bg-vector-bg text-vector-green border-l-2 border-vector-dim h-full overflow-y-auto">
      <div className="mb-4 border-b border-vector-dim pb-2 flex items-center gap-2">
        <div className="w-3 h-3 bg-vector-green rounded-full animate-pulse"></div>
        <span className="uppercase tracking-widest text-xs">Incoming Transmission</span>
      </div>
      
      {isLoading ? (
        <div className="flex flex-col gap-2">
            <div className="h-4 bg-vector-dim w-3/4 animate-pulse rounded"></div>
            <div className="h-4 bg-vector-dim w-1/2 animate-pulse rounded"></div>
            <div className="h-4 bg-vector-dim w-5/6 animate-pulse rounded"></div>
        </div>
      ) : (
        <div>
            {content.split('\n').map((line, idx) => formatLine(line, idx))}
        </div>
      )}
    </div>
  );
};

export default TerminalOutput;