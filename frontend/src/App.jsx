import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, Send, Loader2, MessageSquare, Bot, User, CheckCircle2, AlertCircle, Menu, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import ReactMarkdown from 'react-markdown';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');

  const messagesEndRef = useRef(null);

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
        body: JSON.stringify({ messages: updatedMessages }),
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
      setMessages((prev) => [...prev, { role: 'model', content: 'Sorry, I encountered an error answering your question.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-[#131314] text-slate-200 font-sans selection:bg-indigo-500/30 flex overflow-hidden">
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:relative top-0 left-0 h-full w-72 bg-[#1e1f20] p-4 flex flex-col z-30 transition-transform duration-300 ease-in-out border-r border-white/5",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="flex items-center justify-between mb-8 px-2 mt-2">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
              <Bot size={20} className="text-white" />
            </div>
            <h1 className="text-sm font-semibold tracking-tight text-slate-100 leading-tight">AI-powered Document Intelligence System</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            
            <div
              {...getRootProps()}
              className={cn(
                "relative group overflow-hidden border border-dashed rounded-2xl p-6 text-center transition-all duration-300 cursor-pointer bg-white/[0.02] hover:bg-white/[0.04]",
                isDragActive ? "border-indigo-500 bg-indigo-500/10" : "border-white/10 hover:border-indigo-500/50",
                uploadStatus === 'success' && "border-emerald-500/30"
              )}
            >
              <input {...getInputProps()} />
              
              <div className="flex flex-col items-center justify-center gap-3">
                {uploadStatus === 'idle' && (
                  <>
                    <UploadCloud size={28} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-medium text-slate-300">Upload Document</p>
                    <p className="text-xs text-slate-500">PDF or TXT</p>
                  </>
                )}
                
                {uploadStatus === 'uploading' && (
                  <>
                    <Loader2 size={28} className="text-indigo-400 animate-spin" />
                    <p className="text-sm font-medium text-indigo-300">{uploadMessage}</p>
                  </>
                )}

                {uploadStatus === 'success' && (
                  <>
                    <div className="p-1.5 bg-emerald-500/20 rounded-full">
                      <CheckCircle2 size={24} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-emerald-300 line-clamp-1">{uploadedFile}</p>
                      <p className="text-xs text-emerald-500/80 mt-1">{uploadMessage}</p>
                    </div>
                  </>
                )}

                {uploadStatus === 'error' && (
                  <>
                    <AlertCircle size={28} className="text-rose-400" />
                    <p className="text-sm font-medium text-rose-300">Upload failed</p>
                    <p className="text-xs text-rose-400/80">{uploadMessage}</p>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-auto bg-[#282a2c] rounded-2xl p-4 border border-white/5">
            <h3 className="text-xs font-medium text-indigo-300 mb-2 flex items-center gap-2">
              <FileText size={14} /> System Ready
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload a document to extract insights. The AI automatically chunks the text, creates embeddings, and allows semantic questioning.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full relative w-full bg-[#131314]">
        
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-[#131314] shrink-0 z-10">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-300 hover:bg-white/5 rounded-full">
            <Menu size={24} />
          </button>
          <span className="font-semibold text-slate-200">AI Assistant</span>
          <div className="w-8" /> {/* Spacer */}
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth flex flex-col items-center relative custom-scrollbar">
          <div className="w-full max-w-3xl space-y-8 pb-8 flex flex-col">
            
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center space-y-6 my-auto fade-in slide-in-from-bottom-4 duration-700">
                <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-2xl">
                  <Bot size={32} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-slate-200 mb-2">How can I help you today?</h2>
                  <p className="text-slate-400 text-sm max-w-sm mx-auto">Upload a document to get started. I'll provide answers with exact source citations.</p>
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
                        ? "bg-[#282a2c] text-slate-200 rounded-br-sm" 
                        : "bg-transparent text-slate-200 prose prose-invert prose-p:leading-relaxed prose-pre:bg-[#1e1f20] prose-pre:border prose-pre:border-white/5"
                    )}>
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap text-[15px]">{msg.content}</p>
                      ) : (
                        <div className="text-[15px] max-w-none break-words prose-sm prose-invert">
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
            {isTyping && (
               <div className="flex justify-start">
                 <div className="flex gap-4 max-w-[85%] flex-row">
                   <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm bg-gradient-to-br from-indigo-500 to-purple-600 mt-1">
                     <Bot size={16} className="text-white" />
                   </div>
                   <div className="px-5 py-4 rounded-3xl bg-transparent text-slate-200 flex items-center gap-1.5">
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
        <div className="p-4 md:px-8 bg-[#131314] shrink-0 w-full max-w-4xl mx-auto z-10 pb-6">
          <form onSubmit={handleSendMessage} className="relative group flex items-end bg-[#1e1f20] rounded-3xl p-1 shadow-sm border border-white/5 focus-within:border-white/20 transition-colors">
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
              disabled={uploadStatus !== 'success'}
              className="w-full bg-transparent border-none text-slate-200 px-5 py-4 min-h-[56px] max-h-[150px] resize-none outline-none placeholder:text-slate-500 disabled:opacity-50 text-[15px]"
            />
            <div className="p-2 shrink-0 h-[56px] flex items-center">
              <button
                type="submit"
                disabled={!input.trim() || isTyping || uploadStatus !== 'success'}
                className="p-2.5 bg-slate-200 hover:bg-white disabled:bg-[#131314] disabled:text-slate-600 text-slate-900 rounded-full transition-colors flex items-center justify-center group-focus-within:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
              >
                <Send size={18} className={cn("transition-transform", input.trim() && !isTyping ? "-translate-y-0.5 translate-x-0.5" : "")} />
              </button>
            </div>
          </form>
          <div className="text-center mt-3 hidden md:block">
            <p className="text-[11px] text-slate-500">Gemini can make mistakes. Verify important information.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
