import React, { useState, useEffect, useRef } from 'react';
import RetroScreen from './components/RetroScreen';
import TerminalOutput from './components/TerminalOutput';
import { chatWithExpert, generateVectorExplanation } from './services/geminiService';
import { DisplayMode, ChatMessage, MessageRole } from './types';
import { Monitor, Zap, Terminal, Send, Activity } from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<DisplayMode>(DisplayMode.VECTOR);
  const [explanation, setExplanation] = useState<string>("Initializing system... Select a mode to begin analysis.");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  // Initial explanation fetch when mode changes
  useEffect(() => {
    let isMounted = true;
    const fetchExplanation = async () => {
      setLoading(true);
      const text = await generateVectorExplanation(mode);
      if (isMounted) {
        setExplanation(text);
        setLoading(false);
      }
    };

    fetchExplanation();
    return () => { isMounted = false; };
  }, [mode]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const newMsg: ChatMessage = {
        role: MessageRole.USER,
        text: userInput,
        timestamp: Date.now()
    };

    setChatHistory(prev => [...prev, newMsg]);
    setUserInput("");
    setChatLoading(true);

    const responseText = await chatWithExpert(chatHistory, newMsg.text);
    
    setChatHistory(prev => [...prev, {
        role: MessageRole.MODEL,
        text: responseText,
        timestamp: Date.now()
    }]);
    setChatLoading(false);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-green-500 font-sans selection:bg-green-900 selection:text-green-100">
      
      {/* Header */}
      <header className="border-b border-green-900/50 bg-black/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Monitor className="w-6 h-6 text-vector-green" />
                <h1 className="text-xl md:text-2xl font-mono font-bold tracking-tighter text-white">
                    VECTOR<span className="text-vector-green">.CONSOLE</span>
                </h1>
            </div>
            <div className="flex gap-2 text-xs font-mono text-green-700">
                <span>SYS.VER.1.0</span>
                <span>ONLINE</span>
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Visualization & Controls */}
        <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Controls */}
            <div className="flex gap-4 bg-neutral-900/50 p-2 rounded-lg border border-green-900/30">
                <button
                    onClick={() => setMode(DisplayMode.VECTOR)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded font-mono font-bold transition-all duration-300 ${
                        mode === DisplayMode.VECTOR 
                        ? 'bg-vector-green text-black shadow-[0_0_15px_rgba(57,255,20,0.4)]' 
                        : 'bg-transparent text-green-700 hover:text-green-400 hover:bg-green-900/20'
                    }`}
                >
                    <Zap className="w-4 h-4" />
                    VECTOR MODE
                </button>
                <button
                    onClick={() => setMode(DisplayMode.RASTER)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded font-mono font-bold transition-all duration-300 ${
                        mode === DisplayMode.RASTER 
                        ? 'bg-vector-green text-black shadow-[0_0_15px_rgba(57,255,20,0.4)]' 
                        : 'bg-transparent text-green-700 hover:text-green-400 hover:bg-green-900/20'
                    }`}
                >
                    <Activity className="w-4 h-4" />
                    RASTER MODE
                </button>
            </div>

            {/* CRT Display */}
            <RetroScreen mode={mode} />

            {/* Dynamic Content Box */}
            <div className="bg-black border border-green-900/50 rounded-lg overflow-hidden h-[300px]">
                <TerminalOutput content={explanation} isLoading={loading} />
            </div>
        </div>

        {/* Right Column: Chat Interface */}
        <div className="lg:col-span-5 flex flex-col h-[600px] lg:h-auto bg-neutral-900/30 border border-green-900/30 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-green-900/30 bg-black/40 flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                <span className="font-mono text-sm font-bold">ENGINEER.UPLINK</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm">
                {chatHistory.length === 0 && (
                    <div className="text-green-800 text-center mt-10 italic">
                        Ask about XY monitors, DACs, or the Vectrex console...
                    </div>
                )}
                {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col ${msg.role === MessageRole.USER ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-lg ${
                            msg.role === MessageRole.USER 
                            ? 'bg-green-900/20 text-green-100 border border-green-700/30' 
                            : 'bg-black text-green-400 border border-green-900/50'
                        }`}>
                            {msg.text}
                        </div>
                        <span className="text-[10px] text-green-900 mt-1 uppercase">{msg.role}</span>
                    </div>
                ))}
                {chatLoading && (
                    <div className="flex items-start">
                        <div className="bg-black text-green-400 border border-green-900/50 p-3 rounded-lg animate-pulse">
                            Analyzing signal...
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 bg-black border-t border-green-900/30 flex gap-2">
                <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Query the database..."
                    className="flex-1 bg-neutral-900 border border-green-900/50 rounded px-4 py-2 text-green-100 focus:outline-none focus:border-vector-green focus:ring-1 focus:ring-vector-green/50 font-mono placeholder-green-900"
                />
                <button 
                    type="submit"
                    disabled={chatLoading || !userInput.trim()}
                    className="bg-vector-green text-black px-4 py-2 rounded font-bold hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Send className="w-4 h-4" />
                </button>
            </form>
        </div>

      </main>
    </div>
  );
};

export default App;