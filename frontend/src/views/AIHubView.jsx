import React, { useState } from 'react';
import api from '../api';
import { 
  Sparkles, 
  FileText, 
  UserCheck, 
  TrendingUp, 
  AlertTriangle, 
  ListOrdered, 
  CheckCircle2,
  ArrowRight,
  BrainCircuit,
  Bot,
  Video,
  MessageSquare,
  Send
} from 'lucide-react';
import { EmptyState } from '../components/EmptyState';


export const AIHubView = ({ currentProject, showToast, onOpenCreateMeeting, onOpenCreateProject }) => {
  const [activeTab, setActiveTab] = useState('weekly'); // 'weekly', 'minutes', 'suggest', 'chat'

  if (!currentProject) {
    return <EmptyState onOpenCreateProject={onOpenCreateProject} />;
  }


  // Weekly summary state
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyData, setWeeklyData] = useState(null);

  // Meeting minutes state
  const [meetingTitle, setMeetingTitle] = useState('Họp Đánh Giá Tiến Độ & Phân Công Sprint');
  const [rawNotes, setRawNotes] = useState(`Thảo luận tiến độ hoàn thành các module cốt lõi của ứng dụng G9.
- Nguyễn Văn Thanh đã hoàn tất cài đặt CSDL SQLite và Auth JWT.
- Lữ Văn Chinh & Cao Phạm Phú Anh cần hoàn thiện bảng Kanban kéo thả và giao diện Netflix Dark Mode trong tuần.
- Đỗ Hoàng Long, Phạm Minh Đức & Hoàng Thu Thảo phụ trách unit tests pytest và API báo cáo.`);
  const [minutesLoading, setMinutesLoading] = useState(false);
  const [minutesData, setMinutesData] = useState(null);

  // Suggest assignment state
  const [taskTitleInput, setTaskTitleInput] = useState('Tích hợp Module Thanh Toán qua API Stripe');
  const [skillsInput, setSkillsInput] = useState('Python, FastAPI, Docker');
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestData, setSuggestData] = useState(null);

  // Inline Copilot Chat state
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Xin chào! Tôi là Trợ Lý AI Senior PM G9. Bạn muốn hỏi thông tin gì về tiến độ, công việc hoặc lịch họp?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const handleSendInlineChat = async (prompt) => {
    const text = prompt || chatInput;
    if (!text.trim()) return;

    const newMsgs = [...chatMessages, { role: 'user', content: text.trim() }];
    setChatMessages(newMsgs);
    if (!prompt) setChatInput('');
    setChatLoading(true);

    try {
      const res = await api.post('/api/ai-chat/chat', {
        project_id: currentProject ? currentProject.id : null,
        message: text.trim(),
        history: newMsgs.filter(m => m.role !== 'system')
      });
      setChatMessages([...newMsgs, { role: 'assistant', content: res.data.reply }]);
    } catch (err) {
      setChatMessages([...newMsgs, { role: 'assistant', content: '❌ Lỗi khi kết nối với AI Chat Engine.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Handlers
  const handleWeeklySummary = async () => {
    if (!currentProject) {
      showToast("Vui lòng chọn dự án trước khi sinh tóm tắt", "error");
      return;
    }
    setWeeklyLoading(true);
    try {
      const res = await api.post('/api/ai/weekly-summary', { project_id: currentProject.id });
      setWeeklyData(res.data);
      showToast("Tạo tóm tắt tiến độ thành công!", "success");
    } catch (err) {
      showToast("Lỗi khi kết nối AI Weekly Summary", "error");
    } finally {
      setWeeklyLoading(false);
    }
  };

  const handleMeetingMinutes = async (e) => {
    e.preventDefault();
    if (!currentProject) {
      showToast("Vui lòng chọn dự án trước", "error");
      return;
    }
    setMinutesLoading(true);
    try {
      const res = await api.post('/api/ai/meeting-minutes', {
        project_id: currentProject.id,
        title: meetingTitle,
        raw_notes: rawNotes
      });
      setMinutesData(res.data);
      showToast("Tạo biên bản họp AI thành công!", "success");
    } catch (err) {
      showToast("Lỗi khi sinh biên bản họp", "error");
    } finally {
      setMinutesLoading(false);
    }
  };

  const handleSuggestAssignment = async (e) => {
    e.preventDefault();
    if (!currentProject) {
      showToast("Vui lòng chọn dự án trước", "error");
      return;
    }
    setSuggestLoading(true);
    const skillsList = skillsInput.split(',').map(s => s.trim()).filter(Boolean);
    try {
      const res = await api.post('/api/ai/suggest-assignment', {
        project_id: currentProject.id,
        task_title: taskTitleInput,
        required_skills: skillsList
      });
      setSuggestData(res.data);
      showToast("Đã phân tích điểm Skill & Workload!", "success");
    } catch (err) {
      showToast("Lỗi khi gợi ý phân công AI", "error");
    } finally {
      setSuggestLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-zinc-100">
      {/* AI Hub Header Banner */}
      <div className="bg-gradient-to-r from-red-950 via-zinc-900 to-black p-6 rounded-2xl text-white shadow-2xl border border-white/10 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-red-600/30 rounded-xl border border-red-500/50">
                <BrainCircuit className="w-5 h-5 text-red-500" />
              </span>
              <h1 className="text-xl font-black">G9 AI Hub — Trợ Lý Quản Lý Dự Án Smart</h1>
            </div>
            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              Trí tuệ nhân tạo tóm tắt tiến độ tuần, tự động trích xuất biên bản họp, thuật toán gợi ý phân công nhiệm vụ và Trợ lý AI Copilot Chat Engine RAG Light.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenCreateMeeting && (
              <button
                onClick={onOpenCreateMeeting}
                className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Video className="w-4 h-4 text-red-500" />
                <span>Tạo Cuộc Họp Online</span>
              </button>
            )}
            <div className="flex items-center gap-2 bg-zinc-900/80 p-2 rounded-xl border border-zinc-800 text-xs font-bold text-red-400">
              <Bot className="w-4 h-4 text-red-500" />
              <span>Project: {currentProject?.name || 'Chưa chọn'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-3">
        <button
          onClick={() => setActiveTab('weekly')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'weekly'
              ? 'bg-red-600 text-white shadow-lg shadow-red-900/40'
              : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          1. Tóm Tắt Tiến Độ Tuần
        </button>

        <button
          onClick={() => setActiveTab('minutes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'minutes'
              ? 'bg-red-600 text-white shadow-lg shadow-red-900/40'
              : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          2. Sinh Biên Bản Cuộc Họp
        </button>

        <button
          onClick={() => setActiveTab('suggest')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'suggest'
              ? 'bg-red-600 text-white shadow-lg shadow-red-900/40'
              : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          3. Gợi Ý Phân Công Nhiệm Vụ
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'chat'
              ? 'bg-red-600 text-white shadow-lg shadow-red-900/40'
              : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800'
          }`}
        >
          <Bot className="w-4 h-4" />
          4. Copilot Chat Engine
        </button>
      </div>


      {/* Tab 1: Weekly Summary Generator */}
      {activeTab === 'weekly' && (
        <div className="bg-[#18181B] p-6 rounded-2xl border border-white/10 shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-white">Báo Cáo Tiến Độ Tuần Tự Động (Weekly Progress Summary)</h3>
              <p className="text-xs text-zinc-400">Phân tích tổng quan số lượng nhiệm vụ completed vs pending, rủi ro đe dọa tiến độ và ưu tiên cao nhất.</p>
            </div>
            <button
              onClick={handleWeeklySummary}
              disabled={weeklyLoading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-lg shadow-red-900/40 flex items-center gap-2 transition-all hover:-translate-y-0.5"
            >
              <Sparkles className="w-4 h-4" />
              {weeklyLoading ? 'AI Đang Phân Tích...' : 'Sinh Báo Cáo Ngay'}
            </button>
          </div>

          {weeklyData ? (
            <div className="space-y-4 pt-4 border-t border-zinc-800">
              {/* Executive Summary Card */}
              <div className="p-4 bg-zinc-900/90 border border-red-500/30 rounded-xl text-xs font-medium text-zinc-200 leading-relaxed">
                <span className="font-extrabold text-red-400 block mb-1">📝 Tóm Tắt Tổng Quan:</span>
                {weeklyData.summary}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Identified Risks */}
                <div className="p-4 bg-rose-950/30 border border-rose-800/60 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    Rủi Ro Cần Lưu Ý ({weeklyData.risks.length})
                  </h4>
                  <ul className="space-y-1.5 text-xs text-rose-200 font-medium">
                    {weeklyData.risks.map((r, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-rose-500">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Priority Actions */}
                <div className="p-4 bg-emerald-950/30 border border-emerald-800/60 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Hành Động Ưu Tiên Hàng Đầu
                  </h4>
                  <ul className="space-y-1.5 text-xs text-emerald-200 font-medium">
                    {weeklyData.priorities.map((p, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">{i + 1}.</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
              Nhấn nút "Sinh Báo Cáo Ngay" để trí tuệ nhân tạo phân tích tiến độ dự án.
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Meeting Minutes Generator */}
      {activeTab === 'minutes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Input */}
          <div className="bg-[#18181B] p-6 rounded-2xl border border-white/10 shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-white">Nhập Ghi Chú Thô Cuộc Họp</h3>
            <form onSubmit={handleMeetingMinutes} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Tiêu đề cuộc họp</label>
                <input
                  type="text"
                  required
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-white focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Nội dung ghi chú thô (Raw Notes)</label>
                <textarea
                  rows={8}
                  required
                  value={rawNotes}
                  onChange={(e) => setRawNotes(e.target.value)}
                  placeholder="Dán nội dung trao đổi cuộc họp tại đây..."
                  className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-white focus:ring-2 focus:ring-red-600"
                />
              </div>

              <button
                type="submit"
                disabled={minutesLoading}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-lg shadow-red-900/40 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
              >
                <Sparkles className="w-4 h-4" />
                {minutesLoading ? 'AI Đang Sinh Biên Bản...' : 'Tạo Biên Bản Cuộc Họp AI'}
              </button>
            </form>
          </div>

          {/* Generated Minutes Result */}
          <div className="bg-[#18181B] p-6 rounded-2xl border border-white/10 shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-white">Biên Bản Chuẩn Hóa</h3>

            {minutesData ? (
              <div className="space-y-4">
                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                  <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider block">Tóm tắt thảo luận</span>
                  <p className="text-xs text-zinc-300 leading-relaxed font-medium">{minutesData.ai_summary}</p>
                </div>

                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                  <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">Danh sách Action Items (Việc cần làm)</span>
                  <ul className="space-y-2 text-xs font-medium text-zinc-200">
                    {minutesData.action_items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-12 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                Kết quả biên bản cuộc họp và Action Items sẽ hiển thị ở đây.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Smart Assignment Advisor */}
      {activeTab === 'suggest' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Input */}
          <div className="bg-[#18181B] p-6 rounded-2xl border border-white/10 shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-white">Nhập Yêu Cầu Nhiệm Vụ Cần Phân Công</h3>
            <form onSubmit={handleSuggestAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Tên nhiệm vụ</label>
                <input
                  type="text"
                  required
                  value={taskTitleInput}
                  onChange={(e) => setTaskTitleInput(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-white focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Kỹ năng bắt buộc (phân cách bằng dấu phẩy)</label>
                <input
                  type="text"
                  required
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  placeholder="Python, FastAPI, SQL..."
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-white focus:ring-2 focus:ring-red-600"
                />
              </div>

              <button
                type="submit"
                disabled={suggestLoading}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-lg shadow-red-900/40 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
              >
                <UserCheck className="w-4 h-4" />
                {suggestLoading ? 'AI Đang Tính Toán Match...' : 'Phân Tích & Phân Công Nhiệm Vụ'}
              </button>
            </form>
          </div>

          {/* Candidates Ranking List */}
          <div className="bg-[#18181B] p-6 rounded-2xl border border-white/10 shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-white">Kết Quả Phân Tích Kỹ Năng & Workload</h3>

            {suggestData ? (
              <div className="space-y-3">
                {/* Best Suggested Winner */}
                {suggestData.suggested_assignee && (
                  <div className="p-4 bg-emerald-950/40 border border-emerald-500/60 rounded-xl space-y-2">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-900/80 px-2 py-0.5 rounded">
                      🏆 Ứng viên tối ưu nhất (Best Match)
                    </span>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white">{suggestData.suggested_assignee.full_name}</h4>
                        <span className="text-xs text-zinc-400">{suggestData.suggested_assignee.job_title}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-black text-emerald-400">{suggestData.suggested_assignee.final_score}</span>
                        <span className="text-[10px] text-zinc-500 block">Điểm tổng hợp</span>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-300 border-t border-emerald-900/60 pt-2 italic">
                      💡 {suggestData.suggested_assignee.reason}
                    </p>
                  </div>
                )}

                {/* All Candidates Ranking Table */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-zinc-300 block">Xếp hạng tất cả thành viên trong dự án:</span>
                  <div className="space-y-2">
                    {suggestData.all_candidates.map((cand, idx) => (
                      <div key={cand.user_id} className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-zinc-500 w-4">#{idx + 1}</span>
                          <div>
                            <span className="font-bold text-white block">{cand.full_name}</span>
                            <span className="text-[11px] text-zinc-400">
                              Workload: {cand.current_workload_hours}h | Skill Match: {cand.skill_match_score}%
                            </span>
                          </div>
                        </div>
                        <span className="font-black text-red-500 text-sm">{cand.final_score} điểm</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-12 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                Nhập yêu cầu nhiệm vụ và bấm Phân Tích để AI đánh giá năng lực & tải công việc.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Copilot Chat Engine */}
      {activeTab === 'chat' && (

        <div className="bg-[#18181B] p-6 rounded-2xl border border-white/10 shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-red-500" />
                Trợ Lý Copilot Chat Engine (Persona Senior PM G9)
              </h3>
              <p className="text-xs text-zinc-400">
                Chat trực tiếp với AI chuyên gia quản trị dự án, tự động bơm dữ liệu thực tế (Tasks, Workloads, Meetings) từ SQLite CSDL.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {['Tóm tắt tiến độ tuần này', 'Ai đang quá tải công việc?', 'Các cuộc họp sắp tới'].map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleSendInlineChat(p)}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-red-950/60 border border-zinc-800 text-zinc-300 text-xs font-bold rounded-lg transition-all"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="h-96 bg-[#09090B] p-4 rounded-xl border border-zinc-800 overflow-y-auto space-y-3">
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`p-3 rounded-2xl text-xs max-w-[80%] ${
                  m.role === 'user'
                    ? 'bg-red-600 text-white font-medium rounded-tr-none'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-none whitespace-pre-wrap'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSendInlineChat(); }} className="flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Nhập câu hỏi bất kỳ cho Chuyên gia AI G9..."
              disabled={chatLoading}
              className="flex-1 px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-red-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-900/40"
            >
              <Send className="w-4 h-4" />
              {chatLoading ? 'Đang hỏi...' : 'Gửi'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

