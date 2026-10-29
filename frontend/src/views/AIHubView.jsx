import React, { useState, useEffect } from 'react';
import api from '../api';
import { 
  Sparkles, 
  FileText, 
  UserCheck, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2,
  BrainCircuit,
  Bot,
  Video,
  Send,
  History,
  ThumbsUp,
  ThumbsDown,
  ShieldAlert,
  Copy,
  Download,
  Check,
  ShieldCheck,
  AlertCircle,
  Clock,
  Award
} from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { MarkdownRenderer } from '../components/MarkdownRenderer';

export const AIHubView = ({ currentProject, showToast, onOpenCreateMeeting, onOpenCreateProject }) => {
  const [activeTab, setActiveTab] = useState('weekly'); // 'weekly', 'minutes', 'suggest', 'chat', 'reports'

  if (!currentProject) {
    return <EmptyState onOpenCreateProject={onOpenCreateProject} />;
  }

  // Weekly summary state
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyData, setWeeklyData] = useState(null);

  // Risk analysis state (Phase 4)
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskData, setRiskData] = useState(null);

  // AI Reports history state (Phase 3)
  const [reportsList, setReportsList] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);

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

  // Inline Copilot Chat state (TAB 4 - ABSOLUTELY UNTOUCHED)
  const [chatMessages, setChatMessages] = useState([
    { id: 'welcome', role: 'assistant', content: 'Xin chào! Tôi là Trợ Lý AI Senior PM G9. Bạn muốn hỏi thông tin gì về tiến độ, công việc hoặc lịch họp?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Phase 5 Feedback state tracking
  const [feedbacks, setFeedbacks] = useState({});

  // Helper functions for Copy & Export
  const handleCopyText = (text, successMsg = "Đã sao chép nội dung vào bộ nhớ tạm!") => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (showToast) showToast(successMsg, "success");
  };

  const handleDownloadFile = (filename, content, mimeType = "text/plain;charset=utf-8;") => {
    if (!content) return;
    const element = document.createElement("a");
    const file = new Blob([content], { type: mimeType });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    if (showToast) showToast(`Đã tải xuống file ${filename}`, "success");
  };

  const handleFeedback = async (feature, rating, key = feature) => {
    setFeedbacks(prev => ({ ...prev, [key]: rating }));
    try {
      await api.post('/api/ai/feedback', { feature, rating });
      if (showToast) showToast("Cảm ơn bạn đã gửi phản hồi cho AI!", "success");
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReports = async () => {
    if (!currentProject) return;
    setReportsLoading(true);
    try {
      const res = await api.get(`/api/ai/reports?project_id=${currentProject.id}`);
      setReportsList(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports();
    }
  }, [activeTab, currentProject]);

  const handleSendInlineChat = async (prompt) => {
    const text = prompt || chatInput;
    if (!text.trim()) return;

    const newMsgs = [...chatMessages, { id: `user-${Date.now()}`, role: 'user', content: text.trim() }];
    setChatMessages(newMsgs);
    if (!prompt) setChatInput('');
    setChatLoading(true);

    try {
      const res = await api.post('/api/ai-chat/chat', {
        project_id: currentProject ? currentProject.id : null,
        message: text.trim(),
        history: newMsgs.filter(m => m.id !== 'welcome').map(m => ({ role: m.role, content: m.content }))
      });
      setChatMessages([...newMsgs, { id: `bot-${Date.now()}`, role: 'assistant', content: res.data.reply }]);
    } catch (err) {
      setChatMessages([...newMsgs, { id: `bot-err-${Date.now()}`, role: 'assistant', content: '❌ Lỗi khi kết nối với AI Chat Engine.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Tab 1: Weekly Summary Generator
  const handleWeeklySummary = async () => {
    if (!currentProject) {
      showToast("Vui lòng chọn dự án trước khi sinh tóm tắt", "error");
      return;
    }
    setWeeklyLoading(true);
    try {
      const res = await api.post('/api/ai/weekly-summary', { project_id: currentProject.id });
      setWeeklyData(res.data);
      showToast("Tạo báo cáo giám sát tiến độ tuần thành công!", "success");
      fetchReports();
    } catch (err) {
      showToast("Lỗi khi kết nối AI Weekly Summary", "error");
    } finally {
      setWeeklyLoading(false);
    }
  };

  // Tab 5: Technical Risk Analysis Generator
  const handleAnalyzeRisk = async () => {
    if (!currentProject) {
      showToast("Vui lòng chọn dự án trước", "error");
      return;
    }
    setRiskLoading(true);
    try {
      const res = await api.post('/api/ai/analyze-risk', { project_id: currentProject.id });
      setRiskData(res.data);
      showToast(`Đã lập ma trận rủi ro kỹ thuật! Phát hiện ${res.data.high_risk_tasks.length} task nguy cơ cao.`, "success");
      fetchReports();
    } catch (err) {
      showToast("Lỗi khi phân tích rủi ro AI", "error");
    } finally {
      setRiskLoading(false);
    }
  };

  // Tab 2: Meeting Minutes Generator
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
      showToast("Tạo biên bản cuộc họp chuẩn Nghị định 30 thành công!", "success");
    } catch (err) {
      showToast("Lỗi khi sinh biên bản họp", "error");
    } finally {
      setMinutesLoading(false);
    }
  };

  // Tab 3: Smart Task Assignment
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
      showToast("Đã lập Báo cáo đánh giá năng lực & định mức lao động!", "success");
    } catch (err) {
      showToast("Lỗi khi gợi ý phân công AI", "error");
    } finally {
      setSuggestLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-slate-900">
      {/* AI Hub Header Banner */}
      <div className="bg-gradient-to-r from-red-600 via-red-700 to-slate-900 p-6 rounded-2xl text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-white/20 rounded-xl border border-white/30">
                <BrainCircuit className="w-5 h-5 text-white" />
              </span>
              <h1 className="text-xl font-black">G9 AI Hub — Trợ Lý Quản Lý Dự Án Smart</h1>
            </div>
            <p className="text-xs text-red-100 max-w-2xl leading-relaxed">
              Hệ thống trí tuệ nhân tạo giám sát tiến độ dự án, sinh biên bản cuộc họp hành chính chuẩn Nghị định 30, kiểm toán năng lực lao động và ma trận thẩm định rủi ro kỹ thuật.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenCreateMeeting && (
              <button
                onClick={onOpenCreateMeeting}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-red-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Video className="w-4 h-4 text-red-700" />
                <span>Tạo Cuộc Họp Online</span>
              </button>
            )}
            <div className="flex items-center gap-2 bg-black/20 p-2 rounded-xl border border-white/20 text-xs font-bold text-white">
              <Bot className="w-4 h-4 text-white" />
              <span>Dự án: {currentProject?.name || 'Chưa chọn'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('weekly')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'weekly'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          1. Tóm Tắt Tiến Độ Tuần
        </button>

        <button
          onClick={() => setActiveTab('minutes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'minutes'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          2. Sinh Biên Bản Cuộc Họp
        </button>

        <button
          onClick={() => setActiveTab('suggest')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'suggest'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          3. Gợi Ý Phân Công Nhiệm Vụ
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'chat'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Bot className="w-4 h-4" />
          4. Copilot Chat Engine
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'reports'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          5. Báo Cáo & Phân Tích Rủi Ro
        </button>
      </div>

      {/* Tab 1: Weekly Progress Summary */}
      {activeTab === 'weekly' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Báo Cáo Giám Sát Tiến Độ Và Điều Hành Dự Án</h3>
              <p className="text-xs text-slate-500">Phân tích tổng quan chỉ số thực thi, đánh giá mức độ rủi ro tiến độ và đưa ra khuyến nghị hành chính khẩn cấp.</p>
            </div>
            <button
              onClick={handleWeeklySummary}
              disabled={weeklyLoading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-md shadow-red-600/20 flex items-center gap-2 transition-all hover:-translate-y-0.5"
            >
              <Sparkles className="w-4 h-4" />
              {weeklyLoading ? 'AI Đang Sinh Báo Cáo...' : 'Sinh Báo Cáo Ngay'}
            </button>
          </div>

          {weeklyData ? (
            <div className="space-y-6 pt-4 border-t border-slate-100">
              {/* Executive Project Health Alert Banner */}
              <div className={`p-4 rounded-xl border ${
                weeklyData.health_level === 'SEVERE' || weeklyData.overdue_rate > 20
                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-900'
              } flex items-center justify-between shadow-xs`}>
                <div className="flex items-center gap-3">
                  {weeklyData.health_level === 'SEVERE' || weeklyData.overdue_rate > 20 ? (
                    <div className="p-2 bg-rose-200 text-rose-800 rounded-xl">
                      <AlertTriangle className="w-6 h-6 animate-pulse" />
                    </div>
                  ) : (
                    <div className="p-2 bg-emerald-200 text-emerald-800 rounded-xl">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider block">
                      {weeklyData.health_status || (weeklyData.overdue_rate > 20 ? 'CẢNH BÁO CẤP ĐỘ 1 (RỦI RO TIẾN ĐỘ SEVERE)' : 'AN TOÀN / TRONG TẦM KIỂM SOÁT')}
                    </span>
                    <p className="text-xs font-medium mt-0.5">
                      Tỷ lệ nhiệm vụ trễ hạn: <strong className="font-extrabold">{weeklyData.overdue_rate || 0}%</strong> ({weeklyData.overdue_tasks_count} task quá hạn)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyText(weeklyData.summary, "Đã sao chép báo cáo giám sát tiến độ!")}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Sao chép báo cáo
                  </button>
                  <button
                    onClick={() => handleDownloadFile(`Bao_cao_tien_do_${currentProject.id}.txt`, weeklyData.summary)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Xuất báo cáo (.txt)
                  </button>
                </div>
              </div>

              {/* Executive Summary Report Markdown Body */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 leading-relaxed relative">
                <div className="flex justify-between items-center mb-3 border-b border-slate-200 pb-2">
                  <span className="font-extrabold text-red-700 text-sm flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-red-600" />
                    Văn Bản Báo Cáo Quản Trị Dự Án Official
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={!!feedbacks['weekly_summary']}
                      onClick={() => handleFeedback('weekly_summary', 'up', 'weekly_summary')}
                      className={`p-1 rounded hover:bg-slate-200 ${feedbacks['weekly_summary'] === 'up' ? 'text-emerald-600 font-bold bg-emerald-50' : 'text-slate-400'}`}
                      title="Hữu ích"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={!!feedbacks['weekly_summary']}
                      onClick={() => handleFeedback('weekly_summary', 'down', 'weekly_summary')}
                      className={`p-1 rounded hover:bg-slate-200 ${feedbacks['weekly_summary'] === 'down' ? 'text-rose-600 font-bold bg-rose-50' : 'text-slate-400'}`}
                      title="Chưa chính xác"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <MarkdownRenderer content={weeklyData.summary} />
              </div>

              {/* Detailed Overdue Risk & Administrative Recommendations */}
              {weeklyData.risk_details && weeklyData.risk_details.length > 0 && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
                  <h4 className="text-xs font-extrabold text-rose-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Chi Tiết Mã Nhiệm Vụ Quá Hạn & Khuyến Nghị Hành Chính ({weeklyData.risk_details.length})
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs bg-white rounded-lg border border-rose-200 overflow-hidden">
                      <thead className="bg-rose-100 text-rose-900 font-bold border-b border-rose-200">
                        <tr>
                          <th className="p-2.5 text-center">Mã Task</th>
                          <th className="p-2.5">Tên nhiệm vụ</th>
                          <th className="p-2.5 text-center">Trễ hạn</th>
                          <th className="p-2.5">Nhân sự phụ trách</th>
                          <th className="p-2.5">Khuyến nghị hành chính AI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100 font-medium">
                        {weeklyData.risk_details.map((rd, i) => (
                          <tr key={i} className="hover:bg-rose-50/50">
                            <td className="p-2.5 text-center font-bold text-rose-700 bg-rose-50/80">{rd.task_code}</td>
                            <td className="p-2.5 font-bold text-slate-900">{rd.title}</td>
                            <td className="p-2.5 text-center text-rose-600 font-bold">{rd.days_overdue} ngày</td>
                            <td className="p-2.5 text-slate-800 font-bold">{rd.assignee}</td>
                            <td className="p-2.5 text-slate-700 italic">{rd.recommendation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Identified Risks & Priority Actions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Danh Mục Rủi Ro Đe Doạ Tiến Độ ({weeklyData.risks.length})
                  </h4>
                  <ul className="space-y-1.5 text-xs text-rose-800 font-medium">
                    {weeklyData.risks.map((r, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-rose-600 font-bold">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Hành Động Ưu Tiên Hàng Đầu
                  </h4>
                  <ul className="space-y-1.5 text-xs text-emerald-800 font-medium">
                    {weeklyData.priorities.map((p, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-700 font-bold">{i + 1}.</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-xl space-y-2">
              <TrendingUp className="w-8 h-8 mx-auto text-slate-300" />
              <p>Nhấn nút "Sinh Báo Cáo Ngay" để AI lập Báo cáo giám sát tiến độ và điều hành dự án.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Meeting Minutes Generator (Decree 30/2020/NĐ-CP Standard) */}
      {activeTab === 'minutes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Input */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">Nhập Ghi Chú Thô Cuộc Họp</h3>
              <p className="text-xs text-slate-500">Tự động trích xuất thông tin nhân sự thực tế từ CSDL để lập biên bản chuẩn Nghị định 30.</p>
            </div>
            <form onSubmit={handleMeetingMinutes} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tiêu đề cuộc họp</label>
                <input
                  type="text"
                  required
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nội dung ghi chú thô (Raw Notes)</label>
                <textarea
                  rows={9}
                  required
                  value={rawNotes}
                  onChange={(e) => setRawNotes(e.target.value)}
                  placeholder="Dán nội dung trao đổi cuộc họp tại đây..."
                  className="w-full p-3 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-red-600"
                />
              </div>

              <button
                type="submit"
                disabled={minutesLoading}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-md shadow-red-600/20 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
              >
                <Sparkles className="w-4 h-4" />
                {minutesLoading ? 'AI Đang Trích Xuất & Sinh Biên Bản...' : 'Tạo Biên Bản Cuộc Họp AI (Nghị định 30)'}
              </button>
            </form>
          </div>

          {/* Generated Minutes Result */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Biên Bản Chuẩn Hóa</h3>
                <span className="text-[10px] text-red-600 font-bold uppercase tracking-wider">
                  Thể thức văn bản hành chính Nhà nước (Nghị định 30/2020/NĐ-CP)
                </span>
              </div>

              {minutesData && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopyText(minutesData.document_markdown || minutesData.ai_summary, "Đã sao chép biên bản cuộc họp!")}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-xs"
                    title="Sao chép biên bản"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép</span>
                  </button>
                  <button
                    onClick={() => handleDownloadFile(`Bien_ban_cuoc_hop_${currentProject.id}.md`, minutesData.document_markdown || minutesData.ai_summary)}
                    className="px-2.5 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-xs"
                    title="Xuất file markdown"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Xuất .md</span>
                  </button>
                </div>
              )}
            </div>

            {minutesData ? (
              <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
                {/* Formal Decree 30 Document Markdown Box */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <MarkdownRenderer content={minutesData.document_markdown || minutesData.ai_summary} />
                </div>

                {/* Structured Action Items Table with Real Personnel from DB */}
                {minutesData.action_items_detailed && minutesData.action_items_detailed.length > 0 && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
                      Danh sách Action Items Giao Nhiệm Vụ Nhân Sự Thực Tế CSDL
                    </span>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs bg-white rounded-lg border border-slate-200">
                        <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-2 text-center w-10">STT</th>
                            <th className="p-2">Nội dung công việc</th>
                            <th className="p-2">Người thực hiện</th>
                            <th className="p-2 text-center">Thời hạn</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {minutesData.action_items_detailed.map((ai) => (
                            <tr key={ai.stt} className="hover:bg-slate-50">
                              <td className="p-2 text-center font-bold text-slate-500">{ai.stt}</td>
                              <td className="p-2 text-slate-900 font-bold">{ai.title}</td>
                              <td className="p-2 text-blue-700 font-extrabold bg-blue-50/50">{ai.assignee}</td>
                              <td className="p-2 text-center text-slate-600 font-bold">{ai.due_date}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full min-h-[320px] flex items-center justify-center p-12 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-xl">
                Kết quả biên bản cuộc họp chuẩn Nghị định 30 sẽ hiển thị ở đây.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Smart Task Assignment (Technical & Workload Audit) */}
      {activeTab === 'suggest' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Input */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">Yêu Cầu Nhiệm Vụ Cần Phân Công</h3>
              <p className="text-xs text-slate-500">Thuật toán đánh giá năng lực (Skill Fit) và kiểm toán định mức lao động (Workload Audit).</p>
            </div>
            <form onSubmit={handleSuggestAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên nhiệm vụ</label>
                <input
                  type="text"
                  required
                  value={taskTitleInput}
                  onChange={(e) => setTaskTitleInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kỹ năng bắt buộc (phân cách bằng dấu phẩy)</label>
                <input
                  type="text"
                  required
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  placeholder="Python, FastAPI, SQL..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-red-600"
                />
              </div>

              <button
                type="submit"
                disabled={suggestLoading}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-md shadow-red-600/20 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
              >
                <UserCheck className="w-4 h-4" />
                {suggestLoading ? 'AI Đang Tính Điểm Audit...' : 'Chạy Phân Tích & Phân Công Nhiệm Vụ'}
              </button>
            </form>
          </div>

          {/* Candidates Ranking List */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Báo Cáo Đánh Giá Năng Lực & Định Mức Lao Động</h3>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Technical & Workload Audit Report</span>
              </div>
              {suggestData && (
                <button
                  onClick={() => handleCopyText(
                    `BÁO CÁO PHÂN CÔNG NHIỆM VỤ: ${suggestData.task_title}\nỨng viên đề xuất: ${suggestData.suggested_assignee?.full_name}\nGiải trình: ${suggestData.suggested_assignee?.reason}`,
                    "Đã sao chép báo cáo đánh giá phân công!"
                  )}
                  className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép</span>
                </button>
              )}
            </div>

            {suggestData ? (
              <div className="space-y-4">
                {/* Best Suggested Winner */}
                {suggestData.suggested_assignee && (
                  <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2.5 shadow-xs">
                    <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                      <Award className="w-3.5 h-3.5 text-emerald-700" />
                      🏆 Ứng viên đề xuất phân công chính thức
                    </span>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-base font-black text-slate-900">{suggestData.suggested_assignee.full_name}</h4>
                        <span className="text-xs text-slate-600 font-bold">{suggestData.suggested_assignee.job_title}</span>
                      </div>
                      <div className="text-right bg-white p-2 rounded-xl border border-emerald-200">
                        <span className="text-xl font-black text-emerald-600 block">{suggestData.suggested_assignee.final_score}</span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Điểm Audit</span>
                      </div>
                    </div>
                    {/* Professional Justification Statement */}
                    <div className="p-3 bg-white rounded-lg border border-emerald-200 text-xs text-slate-800 font-medium leading-relaxed italic">
                      💡 {suggestData.suggested_assignee.reason}
                    </div>
                  </div>
                )}

                {/* All Candidates Ranking Table with Audit Indicators */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">Ma Trận Bảng So Sánh Chỉ Số Tất Cả Thành Viên:</span>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs bg-white rounded-lg border border-slate-200">
                      <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2 text-center w-8">#</th>
                          <th className="p-2">Thành viên</th>
                          <th className="p-2 text-center">Năng lực (Skill Fit)</th>
                          <th className="p-2 text-center">Khả dụng (Availability)</th>
                          <th className="p-2 text-center">Rủi ro quá tải</th>
                          <th className="p-2 text-right">Điểm tổng hợp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {suggestData.all_candidates.map((cand, idx) => (
                          <tr key={cand.user_id} className="hover:bg-slate-50">
                            <td className="p-2 text-center font-bold text-slate-400">#{idx + 1}</td>
                            <td className="p-2 font-bold text-slate-900">{cand.full_name}</td>
                            <td className="p-2 text-center text-blue-700 font-bold">{cand.skill_fit || cand.skill_match_score}%</td>
                            <td className="p-2 text-center text-emerald-700 font-bold">{cand.availability || roundScore(cand.current_workload_hours)}%</td>
                            <td className="p-2 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                cand.workload_risk === 'Cao'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : cand.workload_risk === 'Trung bình'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}>
                                {cand.workload_risk || 'Thấp'} ({cand.current_workload_hours}h)
                              </span>
                            </td>
                            <td className="p-2 text-right font-black text-red-600 text-sm">{cand.final_score}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[320px] flex items-center justify-center p-12 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-xl">
                Nhập yêu cầu nhiệm vụ và bấm Phân Tích để AI đánh giá năng lực & định mức lao động.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Copilot Chat Engine (ABSOLUTELY UNTOUCHED & 100% PRESERVED) */}
      {activeTab === 'chat' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Bot className="w-5 h-5 text-red-600" />
                Trợ Lý Copilot Chat Engine (Persona Senior PM G9)
              </h3>
              <p className="text-xs text-slate-500">
                Chat trực tiếp với AI chuyên gia quản trị dự án, tự động bơm dữ liệu thực tế (Tasks, Workloads, Meetings) từ CSDL.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {['Tóm tắt tiến độ tuần này', 'Ai đang quá tải công việc?', 'Các cuộc họp sắp tới'].map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleSendInlineChat(p)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-all"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="h-96 bg-slate-50 p-4 rounded-xl border border-slate-200 overflow-y-auto space-y-3">
            {chatMessages.map((m) => (
              <div key={m.id} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`p-3 rounded-2xl text-xs max-w-[80%] ${
                  m.role === 'user'
                    ? 'bg-red-600 text-white font-medium rounded-tr-none'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none whitespace-pre-wrap shadow-xs'
                }`}>
                  {m.role === 'user' ? m.content : <MarkdownRenderer content={m.content} />}
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
              className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-red-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/20"
            >
              <Send className="w-4 h-4" />
              {chatLoading ? 'Đang hỏi...' : 'Gửi'}
            </button>
          </form>
        </div>
      )}

      {/* Tab 5: Technical Risk Assessment Matrix (AI Risk Engine) */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Risk Analysis Trigger Action Banner */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                Ma Trận Thẩm Định Rủi Ro Kỹ Thuật (Technical Risk Assessment Report)
              </h3>
              <p className="text-xs text-slate-500">
                Phân loại rủi ro 3 nhóm (Schedule Risk, Resource Allocation Risk, QA/QC Bottleneck), phân tích nguyên nhân gốc rễ (Root Cause) và lập phương án khắc phục.
              </p>
            </div>
            <button
              onClick={handleAnalyzeRisk}
              disabled={riskLoading}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 flex items-center gap-2 transition-all hover:-translate-y-0.5"
            >
              <Sparkles className="w-4 h-4" />
              {riskLoading ? 'Đang lập Ma Trận Rủi Ro...' : 'Chạy Phân Tích Rủi Ro'}
            </button>
          </div>

          {riskData && (
            <div className="space-y-6">
              {/* Category Breakdown Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-black text-rose-700 uppercase tracking-widest block">
                    🔴 Schedule Risk
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Rủi ro chậm tiến độ</span>
                    <span className="text-xl font-black text-rose-600">{riskData.schedule_risk_count || 0} tasks</span>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest block">
                    🟡 Resource Allocation Risk
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Rủi ro phân bổ nguồn lực</span>
                    <span className="text-xl font-black text-amber-600">{riskData.resource_risk_count || 0} tasks</span>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest block">
                    🔵 QA/QC Bottleneck
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Rủi ro tồn đọng kiểm thử</span>
                    <span className="text-xl font-black text-blue-600">{riskData.qa_risk_count || 0} tasks</span>
                  </div>
                </div>
              </div>

              {/* High Risk Tasks Table with Root Cause Analysis & Mitigation Plan */}
              {riskData.high_risk_tasks && riskData.high_risk_tasks.length > 0 && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      Chi Tiết Ma Trận Phân Tích Nguyên Nhân Gốc Rễ (Root Cause) & Phương Án Khắc Phục
                    </h4>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyText(riskData.matrix_markdown || JSON.stringify(riskData.high_risk_tasks), "Đã sao chép ma trận rủi ro!")}
                        className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-xs"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép ma trận</span>
                      </button>
                      <button
                        onClick={() => handleDownloadFile(`Ma_tran_rui_ro_${currentProject.id}.md`, riskData.matrix_markdown || JSON.stringify(riskData.high_risk_tasks, null, 2))}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Xuất .md</span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs bg-white rounded-xl border border-slate-200">
                      <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5 text-center w-20">Mã Task</th>
                          <th className="p-2.5">Tên nhiệm vụ</th>
                          <th className="p-2.5">Phân loại rủi ro</th>
                          <th className="p-2.5 text-center">Chỉ số rủi ro</th>
                          <th className="p-2.5">Phân tích nguyên nhân gốc rễ (Root Cause)</th>
                          <th className="p-2.5">Phương án khắc phục (Mitigation Plan)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {riskData.high_risk_tasks.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50">
                            <td className="p-2.5 text-center font-bold text-rose-700 bg-rose-50/70">{t.task_code || `[TASK-${String(t.id).padStart(2, '0')}]`}</td>
                            <td className="p-2.5 font-bold text-slate-900">{t.title}</td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                t.risk_category === 'Schedule Risk'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : t.risk_category === 'Resource Allocation Risk'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                              }`}>
                                {t.risk_category || 'Schedule Risk'}
                              </span>
                            </td>
                            <td className="p-2.5 text-center font-black text-rose-600">{Math.round(t.ai_risk_score * 100)}%</td>
                            <td className="p-2.5 text-slate-800 leading-relaxed font-medium">{t.root_cause || "Thời gian còn lại không đủ đáp ứng dung lượng công việc."}</td>
                            <td className="p-2.5 text-emerald-800 bg-emerald-50/50 font-bold leading-relaxed">{t.mitigation_plan || "Điều chuyển nhân sự hỗ trợ khẩn cấp."}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Full Matrix Markdown Document Box */}
              {riskData.matrix_markdown && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
                  <h4 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2">
                    Văn Bản Ma Trận Rủi Ro Markdown Formatted
                  </h4>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <MarkdownRenderer content={riskData.matrix_markdown} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI Reports History List (Phase 3) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-red-600" />
                Lịch Sử Báo Cáo AI Đã Lưu Trong CSDL
              </h3>
              <button
                onClick={fetchReports}
                disabled={reportsLoading}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
              >
                {reportsLoading ? 'Đang tải...' : 'Làm mới'}
              </button>
            </div>

            {reportsList.length > 0 ? (
              <div className="space-y-3">
                {reportsList.map(rep => (
                  <div key={rep.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded uppercase text-[10px]">
                        {rep.report_type}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(rep.generated_at).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <div className="pt-1">
                      <MarkdownRenderer content={rep.content} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-xl">
                Chưa có báo cáo AI nào được lưu. Hãy bấm "Sinh Báo Cáo Ngay" hoặc "Chạy Phân Tích Rủi Ro" ở trên!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function roundScore(val) {
  if (!val) return 100;
  return Math.max(0, Math.round(((40 - Math.min(val, 40)) / 40) * 100));
}
