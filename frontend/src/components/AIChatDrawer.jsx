import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { 
  Bot, 
  Sparkles, 
  Send, 
  X, 
  Minimize2, 
  Copy, 
  Check,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

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

  const fetchHistory = async () => {
    try {
      let query = '/api/ai-chat/history';
      if (currentProject) query += `?project_id=${currentProject.id}`;
      const res = await api.get(query);
      if (res.data && res.data.length > 0) {
        const historyMsgs = res.data.map(m => ({
          id: `db-${m.id}`,
          role: m.role,
          content: m.content,
          streaming: false
        }));
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: `Xin chào! Tôi là **Trợ lý AI Copilot Senior G9**.\n\nĐã tải ${historyMsgs.length} tin nhắn trong lịch sử hội thoại của bạn.`,
            streaming: false
          },
          ...historyMsgs
        ]);
      }
    } catch (err) {
      console.error("Lỗi khi tải lịch sử chat:", err);
    }
  };

  // Phase 2: Tự động tải lịch sử chat từ CSDL khi mở Drawer
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      fetchHistory();
    }
  }, [isOpen, currentProject]);

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages]);


  // Phase 5 & Rule R4: Gửi phản hồi 👍/👎 và cập nhật UI ngay lập tức
  const handleFeedback = async (msgId, rating) => {
    setMessages(prev =>
      prev.map(m => (m.id === msgId ? { ...m, feedbackSubmitted: rating } : m))
    );
    try {
      await api.post('/api/ai/feedback', {
        feature: 'chat',
        rating: rating
      });
      if (showToast) showToast("Cảm ơn bạn đã gửi phản hồi đánh giá!", "success");
    } catch (err) {
      console.error(err);
    }
  };

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
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-red-600 via-red-500 to-red-700 text-white p-3.5 rounded-full shadow-xl shadow-red-600/30 hover:scale-110 transition-all border border-red-400 flex items-center gap-2 group"
          title="Mở Trợ Lý AI Chat G9"
        >
          <div className="relative">
            <Bot className="w-6 h-6 text-white" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white"></span>
          </div>
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 font-extrabold text-xs whitespace-nowrap pr-1">
            G9 AI Copilot
          </span>
        </button>
      )}

      {/* Expanded Chat Drawer Container */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-[92vw] sm:w-[420px] h-[600px] max-h-[88vh] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-900 animate-in slide-in-from-bottom duration-300">
          
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-red-600 via-red-700 to-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white font-black shadow-sm">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-black text-white">G9 AI Copilot Assistant</h3>
                  <span className="bg-white text-red-700 text-[9px] font-black px-1.5 rounded uppercase">RAG</span>
                </div>
                <span className="text-[10px] text-red-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Project: {currentProject?.name || 'G9 SaaS'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Thu nhỏ"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 flex-shrink-0 mt-1 shadow-xs">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className="flex flex-col space-y-1 max-w-[85%]">
                    <div
                      className={`p-3.5 rounded-2xl text-xs ${
                        isUser
                          ? 'bg-red-600 text-white rounded-tr-none shadow-md shadow-red-600/20'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-xs'
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
                      ) : (
                        <MarkdownRenderer content={msg.content} />
                      )}

                      {msg.streaming && (
                        <span className="inline-block w-2 h-4 bg-red-600 animate-pulse ml-1 align-middle"></span>
                      )}
                    </div>

                    {/* Phase 5: Feedback 👍/👎 rating buttons */}
                    {!isUser && !msg.streaming && msg.id !== 'welcome' && (
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 pl-1">
                        <span>Hữu ích?</span>
                        <button
                          disabled={!!msg.feedbackSubmitted}
                          onClick={() => handleFeedback(msg.id, 'up')}
                          className={`p-1 rounded hover:bg-slate-200 transition-colors ${
                            msg.feedbackSubmitted === 'up' ? 'text-emerald-600 font-bold bg-emerald-50' : 'text-slate-500'
                          }`}
                          title="Hữu ích"
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button
                          disabled={!!msg.feedbackSubmitted}
                          onClick={() => handleFeedback(msg.id, 'down')}
                          className={`p-1 rounded hover:bg-slate-200 transition-colors ${
                            msg.feedbackSubmitted === 'down' ? 'text-rose-600 font-bold bg-rose-50' : 'text-slate-500'
                          }`}
                          title="Chưa chính xác"
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                        {msg.feedbackSubmitted && (
                          <span className="text-[9px] text-emerald-600 font-bold">✓ Cảm ơn!</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>


          {/* Quick Prompts */}
          <div className="px-3 py-2 bg-slate-100 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <Sparkles className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                disabled={loading}
                onClick={() => handleSendMessage(qp)}
                className="px-2.5 py-1 bg-white hover:bg-red-50 hover:text-red-600 text-slate-700 text-[10px] font-bold rounded-lg whitespace-nowrap border border-slate-200 transition-all flex-shrink-0 shadow-xs"
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 bg-white border-t border-slate-200">
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
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-600 font-medium"
              />
              <button
                type="submit"
                disabled={loading || !inputMsg.trim()}
                className="p-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl shadow-md shadow-red-600/20 transition-all"
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
