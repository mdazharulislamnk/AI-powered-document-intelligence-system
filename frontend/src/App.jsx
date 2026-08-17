import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, Send, Loader2, MessageSquare, Bot, User, CheckCircle2, AlertCircle } from 'lucide-react';
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
      const res = await fetch('http://localhost:8000/api/upload', {
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
      const response = await fetch('http://localhost:8000/api/chat', {
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
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30 flex flex-col md:flex-row">
      {/* Sidebar Area */}
      <aside className="w-full md:w-80 border-b md:border-b-0 md:border-r border-white/10 bg-slate-900/50 backdrop-blur-xl p-6 flex flex-col z-10 shadow-2xl shadow-indigo-900/20">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
            <Bot size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 to-purple-200">NidusLab AI</h1>
            <p className="text-xs text-indigo-400 font-medium">Document Intelligence</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Data Source</h2>
            
            <div
              {...getRootProps()}
              className={cn(
                "relative group overflow-hidden border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-300 cursor-pointer bg-white/[0.02] hover:bg-white/[0.04]",
                isDragActive ? "border-indigo-500 bg-indigo-500/10" : "border-white/10 hover:border-indigo-500/50",
                uploadStatus === 'success' && "border-emerald-500/50"
              )}
            >
              <input {...getInputProps()} />
              
              <div className="flex flex-col items-center justify-center gap-3">
                {uploadStatus === 'idle' && (
                  <>
                    <UploadCloud size={32} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-medium text-slate-300">Drag & drop a document here</p>
                    <p className="text-xs text-slate-500">PDF or TXT up to 10MB</p>
                  </>
                )}
                
                {uploadStatus === 'uploading' && (
                  <>
                    <Loader2 size={32} className="text-indigo-400 animate-spin" />
                    <p className="text-sm font-medium text-indigo-300 animate-pulse">{uploadMessage}</p>
                  </>
                )}

                {uploadStatus === 'success' && (
                  <>
                    <div className="p-2 bg-emerald-500/20 rounded-full">
                      <CheckCircle2 size={28} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-emerald-300 line-clamp-1">{uploadedFile}</p>
                      <p className="text-xs text-emerald-500/80 mt-1">{uploadMessage}</p>
                    </div>
                  </>
                )}

                {uploadStatus === 'error' && (
                  <>
                    <AlertCircle size={32} className="text-rose-400" />
                    <p className="text-sm font-medium text-rose-300">Upload failed</p>
                    <p className="text-xs text-rose-400/80">{uploadMessage}</p>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-auto bg-indigo-950/30 rounded-2xl p-4 border border-indigo-500/20">
            <h3 className="text-xs font-semibold text-indigo-300 mb-2 flex items-center gap-2">
              <FileText size={14} /> System Ready
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload a document to extract insights. The AI automatically chunks the text, creates hybrid vector embeddings, and allows semantic questioning.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950">
        
        {/* Background ambient glow */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth z-10">
          <div className="max-w-3xl mx-auto space-y-8 pb-8">
            
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rounded-3xl flex items-center justify-center border border-white/5 backdrop-blur-md shadow-2xl">
                  <MessageSquare size={36} className="text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">How can I help you?</h2>
                  <p className="text-slate-400 max-w-sm mx-auto">Upload a document on the left and ask me anything about its contents. I'll provide answers with exact source citations.</p>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={cn("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "flex gap-4 max-w-[85%] animate-in fade-in slide-in-from-bottom-4 duration-500",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}>
                    <div className={cn(
                      "shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg",
                      msg.role === 'user' 
                        ? "bg-gradient-to-br from-indigo-500 to-indigo-600" 
                        : "bg-gradient-to-br from-purple-500 to-fuchsia-600"
                    )}>
                      {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
                    </div>
                    
                    <div className={cn(
                      "px-5 py-4 rounded-2xl shadow-xl backdrop-blur-md",
                      msg.role === 'user' 
                        ? "bg-indigo-600/90 text-white rounded-tr-sm border border-indigo-500/50" 
                        : "bg-white/5 text-slate-200 rounded-tl-sm border border-white/10 prose prose-invert prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10"
                    )}>
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap text-[15px]">{msg.content}</p>
                      ) : (
                        <ReactMarkdown className="text-[15px] max-w-none break-words">
                          {msg.content}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            {isTyping && (
               <div className="flex justify-start">
                 <div className="flex gap-4 max-w-[85%] flex-row">
                   <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br from-purple-500 to-fuchsia-600">
                     <Bot size={16} className="text-white" />
                   </div>
                   <div className="px-5 py-4 rounded-2xl shadow-xl backdrop-blur-md bg-white/5 text-slate-200 rounded-tl-sm border border-white/10 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                   </div>
                 </div>
               </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-slate-950/50 backdrop-blur-xl border-t border-white/10 z-10">
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <div className="relative flex items-center bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl focus-within:border-indigo-500/50 transition-colors">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={uploadStatus === 'success' ? "Ask a question about the document..." : "Please upload a document first..."}
                disabled={uploadStatus !== 'success'}
                className="w-full bg-transparent border-none text-white px-6 py-4 outline-none placeholder:text-slate-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping || uploadStatus !== 'success'}
                className="p-3 mr-2 bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl transition-colors shrink-0 flex items-center justify-center group-focus-within:shadow-[0_0_20px_rgba(99,102,241,0.4)]"
              >
                <Send size={18} className={cn("transition-transform", input.trim() && !isTyping ? "-translate-y-0.5 translate-x-0.5" : "")} />
              </button>
            </div>
          </form>
          <div className="text-center mt-3">
            <p className="text-[11px] text-slate-500">AI responses are generated based on document context. Verify important information.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
