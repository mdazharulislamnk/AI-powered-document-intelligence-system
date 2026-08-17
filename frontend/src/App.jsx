import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, Send, Loader2, Bot, CheckCircle2, AlertCircle, Menu, X, Sun, Moon, ChevronDown, Activity } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import ReactMarkdown from 'react-markdown';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3.0 Flash' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash' }
];

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');

  // New Features
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const messagesEndRef = useRef(null);

  // Apply dark mode class to html tag dynamically
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadStatus('uploading');
    setUploadMessage('Processing document...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:8001/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (res.ok) {
        setUploadStatus('success');
        setUploadedFile(file.name);
        setUploadMessage(data.message || 'Ready to chat!');
      } else {
        setUploadStatus('error');
        setUploadMessage(data.detail || 'Upload failed');
      }
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage('Network error during upload');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
  });

  const handleEvaluate = async () => {
    if (uploadStatus !== 'success' || isEvaluating || isTyping) return;
    setIsEvaluating(true);
    setIsSidebarOpen(false);
    
    setMessages(prev => [...prev, { role: 'user', content: 'Run comprehensive RAG System Evaluation.' }]);
    setMessages(prev => [...prev, { role: 'model', content: 'Initializing rigorous AI evaluation protocol... This will test 5 predefined questions against the document context. This will take a few seconds.' }]);
    
    try {
      const res = await fetch(`http://localhost:8001/api/evaluate?model=${selectedModel}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Evaluation failed');
      
      const hasError = data.details.some(d => d.explanation && d.explanation.includes('Judge Model'));
      const errorNote = hasError ? `\n\n**⚠️ Evaluation Interrupted**: ${data.details.find(d => d.explanation && d.explanation.includes('Judge Model')).explanation}` : '';

      let scorecard = `**📊 Final RAG System Evaluation Scorecard**\n\n` +
        `- **Average Latency**: ${data.avg_latency}s per query\n` +
        `- **Retrieval Accuracy**: ${data.avg_retrieval}/5.0\n` +
        `- **Answer Relevance**: ${data.avg_relevance}/5.0\n` +
        `- **Faithfulness (No Hallucination)**: ${data.avg_hallucination}/5.0\n\n` +
        `*Evaluation conducted using ${selectedModel} as the judge.*` + errorNote;

      if (data.details && data.details.length > 0 && !hasError) {
        scorecard += `\n\n---\n\n### 📝 Detailed Question Breakdown\n\n`;
        data.details.forEach((d, idx) => {
          scorecard += `**[Q${idx + 1}] ${d.question}**\n\n`;
          scorecard += `* **Scores:** Retrieval: ${d.retrieval_score}/5 | Relevance: ${d.relevance_score}/5 | Faithfulness: ${d.hallucination_score}/5\n`;
          if (d.explanation) {
            scorecard += `* **Reasoning:** ${d.explanation}\n\n`;
          }
        });
      }
        
      setMessages(prev => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1].content = scorecard;
        return newMsgs;
      });
    } catch (err) {
      setMessages(prev => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1].content = `**Evaluation Error**: ${err.message}`;
        return newMsgs;
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch('http://localhost:8001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages, model: selectedModel }),
      });

      if (!response.ok) throw new Error('Chat request failed');
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let botMessageContent = '';

      setMessages((prev) => [...prev, { role: 'model', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        botMessageContent += chunk;
        
        setMessages((prev) => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].content = botMessageContent;
          return newMsgs;
        });
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: 'model', content: 'Sorry, I encountered an error answering your question. Please check if the backend is running.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-white dark:bg-[#131314] text-slate-800 dark:text-slate-200 font-sans selection:bg-indigo-500/30 flex overflow-hidden transition-colors duration-300">
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:relative top-0 left-0 h-full w-72 bg-slate-50 dark:bg-[#1e1f20] p-4 flex flex-col z-30 transition-transform duration-300 ease-in-out border-r border-slate-200 dark:border-white/5",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="flex items-center justify-between mb-8 px-2 mt-2">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
              <Bot size={20} className="text-white" />
            </div>
            <h1 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">AI-powered Document Intelligence System</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            
            <div
              {...getRootProps()}
              className={cn(
                "relative group overflow-hidden border border-dashed rounded-2xl p-6 text-center transition-all duration-300 cursor-pointer bg-slate-100/50 hover:bg-slate-100 dark:bg-white/[0.02] dark:hover:bg-white/[0.04]",
                isDragActive ? "border-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/10" : "border-slate-300 hover:border-indigo-500/50 dark:border-white/10 dark:hover:border-indigo-500/50",
                uploadStatus === 'success' && "border-emerald-500/50 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5"
              )}
            >
              <input {...getInputProps()} />
              
              <div className="flex flex-col items-center justify-center gap-3">
                {uploadStatus === 'idle' && (
                  <>
                    <UploadCloud size={28} className="text-indigo-500 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Upload Document</p>
                    <p className="text-xs text-slate-500">PDF or TXT</p>
                  </>
                )}
                
                {uploadStatus === 'uploading' && (
                  <>
                    <Loader2 size={28} className="text-indigo-500 dark:text-indigo-400 animate-spin" />
                    <p className="text-sm font-medium text-indigo-600 dark:text-indigo-300">{uploadMessage}</p>
                  </>
                )}

                {uploadStatus === 'success' && (
                  <>
                    <div className="p-1.5 bg-emerald-100 dark:bg-emerald-500/20 rounded-full">
                      <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 break-all px-2 line-clamp-3 text-center leading-tight">{uploadedFile}</p>
                      <p className="text-xs text-emerald-600/80 dark:text-emerald-500/80 mt-1">{uploadMessage}</p>
                    </div>
                  </>
                )}

                {uploadStatus === 'error' && (
                  <>
                    <AlertCircle size={28} className="text-rose-500 dark:text-rose-400" />
                    <p className="text-sm font-medium text-rose-700 dark:text-rose-300">Upload failed</p>
                    <p className="text-xs text-rose-600/80 dark:text-rose-400/80">{uploadMessage}</p>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-auto bg-slate-100 dark:bg-[#282a2c] rounded-2xl p-4 border border-slate-200 dark:border-white/5 transition-colors duration-300">
            <h3 className="text-xs font-medium text-indigo-600 dark:text-indigo-300 mb-2 flex items-center gap-2">
              <FileText size={14} /> System Ready
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Upload a document to extract insights. The AI automatically chunks the text, creates embeddings, and allows semantic questioning.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full relative w-full bg-white dark:bg-[#131314] transition-colors duration-300">
        
        {/* Header containing Theme Toggle and Model Selector */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-white/5 shrink-0 z-10 bg-white/80 dark:bg-[#131314]/80 backdrop-blur-md sticky top-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5 rounded-full">
              <Menu size={24} />
            </button>
            
            {/* Model Selector */}
            <div className="relative">
              <button 
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 transition-colors"
              >
                <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px] sm:max-w-none">
                  {MODELS.find(m => m.id === selectedModel)?.name}
                </span>
                <ChevronDown size={14} className="text-slate-500 dark:text-slate-400 shrink-0" />
              </button>
              
              {isModelDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsModelDropdownOpen(false)} />
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-[#1e1f20] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-20 py-1 overflow-hidden">
                    {MODELS.map(model => (
                      <button
                        key={model.id}
                        onClick={() => {
                          setSelectedModel(model.id);
                          setIsModelDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-4 py-2 text-sm transition-colors",
                          selectedModel === model.id 
                            ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium" 
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                        )}
                      >
                        {model.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Evaluate Button */}
            <button
              onClick={handleEvaluate}
              disabled={uploadStatus !== 'success' || isEvaluating || isTyping}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 disabled:opacity-50 transition-colors text-xs sm:text-sm font-medium"
              title="Run Automated Evaluation"
            >
              {isEvaluating ? <Loader2 size={16} className="animate-spin" /> : <Activity size={16} />}
              <span className="hidden sm:inline">Evaluate</span>
            </button>
            
            {/* Theme Toggle */}
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              className="p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5 rounded-full transition-colors"
              title="Toggle theme"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth flex flex-col items-center relative custom-scrollbar">
          <div className="w-full max-w-3xl space-y-8 pb-8 flex flex-col justify-end">
            
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center space-y-6 my-auto py-20 fade-in slide-in-from-bottom-4 duration-700">
                <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg dark:shadow-2xl">
                  <Bot size={32} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-2">How can I help you today?</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">Upload a document to get started. I'll provide answers with exact source citations.</p>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={cn("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "flex gap-4 max-w-[95%] md:max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}>
                    {msg.role === 'model' && (
                      <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm bg-gradient-to-br from-indigo-500 to-purple-600 mt-1">
                        <Bot size={16} className="text-white" />
                      </div>
                    )}
                    
                    <div className={cn(
                      "px-5 py-3.5 rounded-3xl",
                      msg.role === 'user' 
                        ? "bg-slate-100 dark:bg-[#282a2c] text-slate-800 dark:text-slate-200 rounded-br-sm" 
                        : "bg-transparent text-slate-800 dark:text-slate-200 prose prose-slate dark:prose-invert prose-p:leading-relaxed prose-pre:bg-slate-50 dark:prose-pre:bg-[#1e1f20] prose-pre:border prose-pre:border-slate-200 dark:prose-pre:border-white/5"
                    )}>
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap text-[15px]">{msg.content}</p>
                      ) : (
                        <div className="text-[15px] max-w-none break-words prose-sm dark:prose-invert">
                          <ReactMarkdown>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            {(isTyping || isEvaluating) && (
               <div className="flex justify-start">
                 <div className="flex gap-4 max-w-[85%] flex-row">
                   <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm bg-gradient-to-br from-indigo-500 to-purple-600 mt-1">
                     <Bot size={16} className="text-white" />
                   </div>
                   <div className="px-5 py-4 rounded-3xl bg-transparent text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                   </div>
                 </div>
               </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 md:px-8 bg-white dark:bg-[#131314] shrink-0 w-full max-w-4xl mx-auto z-10 pb-4 md:pb-6 transition-colors duration-300">
          <form onSubmit={handleSendMessage} className="relative group flex items-end bg-slate-50 dark:bg-[#1e1f20] rounded-3xl p-1 shadow-sm border border-slate-200 dark:border-white/5 focus-within:border-slate-300 dark:focus-within:border-white/20 transition-colors">
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              rows={1}
              placeholder={uploadStatus === 'success' ? "Ask a question..." : "Please upload a document first..."}
              disabled={uploadStatus !== 'success' || isEvaluating}
              className="w-full bg-transparent border-none text-slate-800 dark:text-slate-200 px-5 py-4 min-h-[56px] max-h-[150px] resize-none outline-none placeholder:text-slate-500 disabled:opacity-50 text-[15px]"
            />
            <div className="p-2 shrink-0 h-[56px] flex items-center">
              <button
                type="submit"
                disabled={!input.trim() || isTyping || isEvaluating || uploadStatus !== 'success'}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-200 dark:hover:bg-white disabled:bg-slate-100 disabled:dark:bg-[#131314] disabled:text-slate-400 disabled:dark:text-slate-600 text-white dark:text-slate-900 rounded-full transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-[#131314]"
              >
                <Send size={18} className={cn("transition-transform", input.trim() && !isTyping && !isEvaluating ? "-translate-y-0.5 translate-x-0.5" : "")} />
              </button>
            </div>
          </form>
          <div className="text-center mt-3 pb-2 md:pb-0">
            <p className="text-[11px] text-slate-500 px-4 leading-tight">Gemini can make mistakes. Verify important information. • Developed by Md. Azharul Islam</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
