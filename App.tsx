import React, { useState, useEffect, useRef } from 'react';
import RetroScreen from './components/RetroScreen';
import TerminalOutput from './components/TerminalOutput';
import { chatWithExpert, generateVectorExplanation } from './services/geminiService';
import { DisplayMode, ChatMessage, MessageRole, ContentMode, VectorPoint } from './types';
import { Monitor, Zap, Terminal, Send, Activity, PenTool, Type, Play, RotateCcw } from 'lucide-react';

const App: React.FC = () => {
  // Display State
  const [mode, setMode] = useState<DisplayMode>(DisplayMode.VECTOR);
  const [contentMode, setContentMode] = useState<ContentMode>(ContentMode.PRESET);
  
  // Custom Content State
  const [customPoints, setCustomPoints] = useState<VectorPoint[]>([]);
  const [customText, setCustomText] = useState<string>("VECTOR");

  // Chat & AI State
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

  const handleCanvasClick = (x: number, y: number) => {
      if (contentMode === ContentMode.DRAW) {
          setCustomPoints(prev => [...prev, { x, y }]);
      }
  };

  const clearDrawing = () => setCustomPoints([]);

  return (
    <div className="min-h-screen bg-neutral-950 text-green-500 font-sans selection:bg-green-900 selection:text-green-100 overflow-x-hidden">
      
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
                <span>SYS.VER.2.2</span>
                <span className="animate-pulse text-vector-green">ONLINE</span>
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Visualization & Controls */}
        <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Main Display Controls */}
            <div className="bg-neutral-900/50 p-1 rounded-lg border border-green-900/30 flex gap-1">
                <button
                    onClick={() => setMode(DisplayMode.VECTOR)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded font-mono font-bold text-sm transition-all duration-300 ${
                        mode === DisplayMode.VECTOR 
                        ? 'bg-vector-green text-black shadow-[0_0_15px_rgba(57,255,20,0.4)]' 
                        : 'hover:bg-green-900/20'
                    }`}
                >
                    <Zap className="w-4 h-4" />
                    VECTOR
                </button>
                <button
                    onClick={() => setMode(DisplayMode.RASTER)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded font-mono font-bold text-sm transition-all duration-300 ${
                        mode === DisplayMode.RASTER 
                        ? 'bg-vector-green text-black shadow-[0_0_15px_rgba(57,255,20,0.4)]' 
                        : 'hover:bg-green-900/20'
                    }`}
                >
                    <Activity className="w-4 h-4" />
                    RASTER
                </button>
            </div>

            {/* Content Mode Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-green-900/30 pb-1">
                 <button 
                    onClick={() => setContentMode(ContentMode.PRESET)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-mono transition-colors ${contentMode === ContentMode.PRESET ? 'text-vector-green border-b-2 border-vector-green' : 'text-gray-500 hover:text-gray-300'}`}
                 >
                    <Play className="w-3 h-3" /> DEMO
                 </button>
                 <button 
                    onClick={() => setContentMode(ContentMode.DRAW)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-mono transition-colors ${contentMode === ContentMode.DRAW ? 'text-vector-green border-b-2 border-vector-green' : 'text-gray-500 hover:text-gray-300'}`}
                 >
                    <PenTool className="w-3 h-3" /> DRAW
                 </button>
                 <button 
                    onClick={() => setContentMode(ContentMode.TEXT)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-mono transition-colors ${contentMode === ContentMode.TEXT ? 'text-vector-green border-b-2 border-vector-green' : 'text-gray-500 hover:text-gray-300'}`}
                 >
                    <Type className="w-3 h-3" /> TEXT
                 </button>
            </div>

            {/* Contextual Controls */}
            {contentMode === ContentMode.DRAW && (
                <div className="flex items-center justify-between bg-black/40 p-2 rounded border border-dashed border-green-900/50 text-xs font-mono">
                    <span className="text-gray-400">Click on screen to plot vectors.</span>
                    <button onClick={clearDrawing} className="flex items-center gap-1 px-2 py-1 hover:bg-red-900/30 text-red-400 rounded transition-colors">
                        <RotateCcw className="w-3 h-3" /> CLEAR
                    </button>
                </div>
            )}

            {contentMode === ContentMode.TEXT && (
                <div className="flex gap-2 bg-black/40 p-2 rounded border border-green-900/50">
                    <input 
                        type="text" 
                        maxLength={15}
                        placeholder="ENTER TEXT..." 
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        className="bg-transparent border-none outline-none text-vector-green font-mono uppercase w-full placeholder-green-900"
                    />
                </div>
            )}

            {/* CRT Display */}
            <RetroScreen 
                mode={mode} 
                contentMode={contentMode}
                customPoints={customPoints}
                customText={customText}
                onCanvasClick={handleCanvasClick}
            />

            {/* Dynamic Content Box */}
            <div className="bg-black border border-green-900/50 rounded-lg overflow-hidden h-[250px] relative">
                <TerminalOutput content={explanation} isLoading={loading} />
            </div>
        </div>

        {/* Right Column: Chat Interface */}
        <div className="lg:col-span-5 flex flex-col h-[600px] lg:h-[850px] bg-neutral-900/30 border border-green-900/30 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-green-900/30 bg-black/40 flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                <span className="font-mono text-sm font-bold">ENGINEER.UPLINK</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm">
                {chatHistory.length === 0 && (
                    <div className="text-green-800 text-center mt-10 italic px-6">
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