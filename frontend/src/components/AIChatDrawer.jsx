import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { 
  Bot, 
  Sparkles, 
  Send, 
  X, 
  Minimize2, 
  Maximize2, 
  Copy, 
  Check, 
  RefreshCw, 
  MessageSquare,
  ChevronDown
} from 'lucide-react';

// Custom Markdown & Code Renderer for obsidian dark mode
const MarkdownRenderer = ({ content }) => {
  const [copiedIndex, setCopiedIndex] = useState(null);

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Simple clean parser for bold, inline code, headers, code blocks, lists, links
  const renderFormattedText = (text) => {
    const lines = text.split('\n');
    let inCodeBlock = false;
    let codeBlockContent = [];
    let codeBlockLang = '';

    return lines.map((line, lIdx) => {
      // Code block start/end
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          inCodeBlock = false;
          const codeText = codeBlockContent.join('\n');
          codeBlockContent = [];
          const currentCodeIdx = lIdx;
          return (
            <div key={lIdx} className="my-2 bg-[#09090B] border border-zinc-800 rounded-xl overflow-hidden font-mono text-xs">
              <div className="bg-zinc-900/90 px-3 py-1.5 border-b border-zinc-800 flex items-center justify-between text-[10px] text-zinc-400">
                <span className="uppercase font-bold">{codeBlockLang || 'code'}</span>
                <button 
                  onClick={() => copyToClipboard(codeText, currentCodeIdx)}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  {copiedIndex === currentCodeIdx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedIndex === currentCodeIdx ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>
              <pre className="p-3 overflow-x-auto text-zinc-200 text-[11px] leading-relaxed">
                <code>{codeText}</code>
              </pre>
            </div>
          );
        } else {
          inCodeBlock = true;
          codeBlockLang = line.trim().replace('```', '');
          return null;
        }
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return null;
      }

      // Headers
      if (line.startsWith('### ')) {
        return <h4 key={lIdx} className="text-xs font-black text-white mt-2 mb-1">{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('#### ')) {
        return <h5 key={lIdx} className="text-xs font-bold text-red-400 mt-2 mb-1">{line.replace('#### ', '')}</h5>;
      }

      // Bullet lists
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const itemText = line.trim().substring(2);
        return (
          <li key={lIdx} className="ml-3 my-0.5 list-disc text-zinc-300">
            {parseInline(itemText)}
          </li>
        );
      }

      // Numbered lists
      if (/^\d+\.\s/.test(line.trim())) {
        return (
          <div key={lIdx} className="ml-2 my-0.5 text-zinc-300 font-medium">
            {parseInline(line)}
          </div>
        );
      }

      if (!line.trim()) return <div key={lIdx} className="h-1.5" />;

      return <p key={lIdx} className="my-1 leading-relaxed text-zinc-200">{parseInline(line)}</p>;
    });
  };

  const parseInline = (text) => {
    // Replace **bold**, `code`, and [link](url)
    const parts = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      // Bold
      const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
      // Code
      const codeMatch = remaining.match(/`(.*?)`/);
      // Link
      const linkMatch = remaining.match(/\[(.*?)\]\((.*?)\)/);

      // Find first match
      let firstMatch = null;
      let matchType = null;
      let minPos = remaining.length;

      if (boldMatch && boldMatch.index < minPos) {
        minPos = boldMatch.index;
        firstMatch = boldMatch;
        matchType = 'bold';
      }
      if (codeMatch && codeMatch.index < minPos) {
        minPos = codeMatch.index;
        firstMatch = codeMatch;
        matchType = 'code';
      }
      if (linkMatch && linkMatch.index < minPos) {
        minPos = linkMatch.index;
        firstMatch = linkMatch;
        matchType = 'link';
      }

      if (!firstMatch) {
        parts.push(<span key={keyIdx++}>{remaining}</span>);
        break;
      }

      if (firstMatch.index > 0) {
        parts.push(<span key={keyIdx++}>{remaining.substring(0, firstMatch.index)}</span>);
      }

      if (matchType === 'bold') {
        parts.push(<strong key={keyIdx++} className="font-black text-white">{firstMatch[1]}</strong>);
      } else if (matchType === 'code') {
        parts.push(
          <code key={keyIdx++} className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700/80 rounded font-mono text-[11px] text-red-400">
            {firstMatch[1]}
          </code>
        );
      } else if (matchType === 'link') {
        parts.push(
          <a 
            key={keyIdx++} 
            href={firstMatch[2]} 
            target="_blank" 
            rel="noreferrer" 
            className="text-red-400 font-bold underline hover:text-red-300"
          >
            {firstMatch[1]}
          </a>
        );
      }

      remaining = remaining.substring(firstMatch.index + firstMatch[0].length);
    }

    return parts;
  };

  return <div className="space-y-1 text-xs">{renderFormattedText(content)}</div>;
};

export const AIChatDrawer = ({ currentProject, showToast }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Xin chào! Tôi là **Trợ lý AI Copilot Senior G9**.\n\nTôi có thể giúp bạn tóm tắt tiến độ thời gian thực, kiểm tra thành viên quá tải công việc, và tổng hợp lịch họp cho dự án **${currentProject?.name || 'G9'}**.\n\nHãy chọn các gợi ý bên dưới hoặc nhập câu hỏi bất kỳ!`,
      streaming: false
    }
  ]);

  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const quickPrompts = [
    "Tóm tắt tiến độ tuần này",
    "Ai đang quá tải công việc?",
    "Các cuộc họp sắp tới",
    "Gợi ý phân công task X"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  // Handle send message
  const handleSendMessage = async (userPromptText) => {
    const text = userPromptText || inputMsg;
    if (!text || !text.trim()) return;

    const userMessageId = `user-${Date.now()}`;
    const userMsgObj = { id: userMessageId, role: 'user', content: text.trim() };
    
    setMessages(prev => [...prev, userMsgObj]);
    if (!userPromptText) setInputMsg('');
    setLoading(true);

    try {
      // Prepare history
      const historyPayload = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));

      const res = await api.post('/api/ai-chat/chat', {
        project_id: currentProject ? currentProject.id : null,
        message: text.trim(),
        history: historyPayload
      });

      const fullReply = res.data.reply || "Không nhận được phản hồi từ AI.";

      // Typing streaming effect simulation
      const botMsgId = `bot-${Date.now()}`;
      setMessages(prev => [...prev, { id: botMsgId, role: 'assistant', content: '', streaming: true }]);

      let currentText = '';
      const chunkSize = 6;
      let charIdx = 0;

      const timer = setInterval(() => {
        if (charIdx < fullReply.length) {
          currentText += fullReply.slice(charIdx, charIdx + chunkSize);
          charIdx += chunkSize;
          setMessages(prev =>
            prev.map(m => (m.id === botMsgId ? { ...m, content: currentText } : m))
          );
        } else {
          clearInterval(timer);
          setMessages(prev =>
            prev.map(m => (m.id === botMsgId ? { ...m, content: fullReply, streaming: false } : m))
          );
          setLoading(false);
        }
      }, 25);

    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          role: 'assistant',
          content: "❌ **Đã xảy ra lỗi khi kết nối với Trợ lý AI G9.** Vui lòng thử lại sau.",
          streaming: false
        }
      ]);
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Widget Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-red-600 via-red-500 to-red-700 text-white p-3.5 rounded-full shadow-2xl shadow-red-900/80 hover:scale-110 transition-all border border-red-400 flex items-center gap-2 group"
          title="Mở Trợ Lý AI Chat G9"
        >
          <div className="relative">
            <Bot className="w-6 h-6 text-white" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#09090B]"></span>
          </div>
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 font-extrabold text-xs whitespace-nowrap pr-1">
            G9 AI Copilot
          </span>
        </button>
      )}

      {/* Expanded Chat Drawer Container */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-[92vw] sm:w-[420px] h-[600px] max-h-[88vh] bg-[#09090B] border border-white/15 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white animate-in slide-in-from-bottom duration-300">
          
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-red-950 via-zinc-900 to-black border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 to-red-500 flex items-center justify-center text-white font-black shadow-lg shadow-red-600/30">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-black text-white">G9 AI Copilot Assistant</h3>
                  <span className="bg-red-600 text-white text-[9px] font-black px-1.5 rounded uppercase">RAG</span>
                </div>
                <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Project: {currentProject?.name || 'G9 SaaS'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                title="Thu nhỏ"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#09090B]">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-xl bg-red-950 border border-red-800/80 flex items-center justify-center text-red-400 flex-shrink-0 mt-1 shadow-md">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl text-xs ${
                      isUser
                        ? 'bg-gradient-to-r from-red-600 to-red-700 text-white rounded-tr-none shadow-lg shadow-red-950/50'
                        : 'bg-[#18181B] border border-white/10 text-zinc-200 rounded-tl-none shadow-xl'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
                    ) : (
                      <MarkdownRenderer content={msg.content} />
                    )}

                    {msg.streaming && (
                      <span className="inline-block w-2 h-4 bg-red-500 animate-pulse ml-1 align-middle"></span>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-2 bg-zinc-900/90 border-t border-zinc-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <Sparkles className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                disabled={loading}
                onClick={() => handleSendMessage(qp)}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-red-950/60 hover:text-red-300 text-zinc-300 text-[10px] font-bold rounded-lg whitespace-nowrap border border-zinc-700/80 transition-all flex-shrink-0"
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 bg-zinc-950 border-t border-zinc-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                placeholder="Hỏi AI Copilot về tiến độ, công việc, cuộc họp..."
                disabled={loading}
                className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-600 font-medium"
              />
              <button
                type="submit"
                disabled={loading || !inputMsg.trim()}
                className="p-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl shadow-md shadow-red-900/50 transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>
      )}
    </>
  );
};
