import React, { useState } from 'react';
import api from '../api';
import { 
  X, 
  Video, 
  Calendar, 
  Link as LinkIcon, 
  ExternalLink, 
  Sparkles, 
  CheckCircle2 
} from 'lucide-react';

export const MeetingModal = ({ project, users = [], initialTitle = '', onClose, onMeetingCreated, showToast }) => {
  const [title, setTitle] = useState(initialTitle || 'Họp Đồng Bộ Tiến Độ & Thảo Luận Dự Án');
  const [platform, setPlatform] = useState('Google Meet');
  const [meetingLink, setMeetingLink] = useState('https://meet.google.com/new');
  
  // Default to 1 hour from now formatted for datetime-local input
  const getDefaultStartTime = () => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    d.setMinutes(0, 0, 0);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const [startTime, setStartTime] = useState(getDefaultStartTime());
  const [selectedUserIds, setSelectedUserIds] = useState(users.map(u => u.id));
  const [saving, setSaving] = useState(false);

  // Platform configs
  const platforms = [
    { id: 'Google Meet', label: 'Google Meet', icon: '📹' },
    { id: 'Microsoft Teams', label: 'MS Teams', icon: '💼' },
    { id: 'Zoom', label: 'Zoom Meeting', icon: '🔷' },
    { id: 'Jitsi Meet', label: 'Jitsi Meet', icon: '🌐' }
  ];

  // Quick generator for Google Meet & Jitsi
  const handleQuickCreateGoogleMeet = () => {
    setPlatform('Google Meet');
    setMeetingLink('https://meet.google.com/new');
    showToast("Đã thiết lập đường dẫn Google Meet nhanh!", "info");
  };

  const handleQuickCreateJitsi = () => {
    setPlatform('Jitsi Meet');
    const roomName = `g9-meeting-${Math.random().toString(36).substring(2, 9)}`;
    const link = `https://meet.jit.si/${roomName}`;
    setMeetingLink(link);
    showToast("Đã sinh phòng họp Jitsi tự động!", "success");
  };

  const toggleUser = (userId) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!project) {
      showToast("Vui lòng chọn dự án trước khi tạo cuộc họp", "error");
      return;
    }
    if (!title.trim()) {
      showToast("Tên cuộc họp không được để trống", "error");
      return;
    }
    if (!meetingLink.trim()) {
      showToast("Đường dẫn cuộc họp không được để trống", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await api.post('/api/meetings/', {
        project_id: project.id,
        title: title.trim(),
        platform: platform,
        meeting_link: meetingLink.trim(),
        start_time: new Date(startTime).toISOString(),
        participants: selectedUserIds
      });

      showToast("Tạo cuộc họp nhóm online thành công!", "success");
      if (onMeetingCreated) onMeetingCreated(res.data);
      onClose();
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi tạo cuộc họp: " + (err.response?.data?.detail || err.message), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 text-slate-900 overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-red-600 via-red-700 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl border border-white/30">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white">Tạo Cuộc Họp Nhóm Online</h2>
              <span className="text-[11px] text-red-100">Dự án: {project?.name || 'G9'}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          
          {/* Quick Create Buttons */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Sinh nhanh đường dẫn họp (Quick Link)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleQuickCreateGoogleMeet}
                className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-bold border border-emerald-200 flex items-center justify-center gap-1.5 transition-all"
              >
                <span>📹</span> Google Meet Nhanh
              </button>
              <button
                type="button"
                onClick={handleQuickCreateJitsi}
                className="py-1.5 px-3 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg font-bold border border-purple-200 flex items-center justify-center gap-1.5 transition-all"
              >
                <span>🌐</span> Sinh Room Jitsi
              </button>
            </div>
          </div>

          {/* Platform Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Nền Tảng Họp (Platform Selector)</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {platforms.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlatform(p.id)}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    platform === p.id 
                      ? 'bg-red-600 text-white font-black border-red-600 shadow-md shadow-red-600/20 scale-105'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="text-base block mb-0.5">{p.icon}</span>
                  <span className="text-[11px] block truncate">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Meeting Title */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Tiêu Đề Cuộc Họp</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Họp Review Sprint 2..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-red-600 focus:outline-none"
            />
          </div>

          {/* Meeting Link Input */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Đường Dẫn Liên Kết (Meeting URL)</span>
              {meetingLink && (
                <a 
                  href={meetingLink} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-red-600 hover:underline flex items-center gap-0.5 text-[10px]"
                >
                  <ExternalLink className="w-3 h-3" /> Kiểm tra link
                </a>
              )}
            </label>
            <div className="relative">
              <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="url"
                required
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/... hoặc https://teams.microsoft.com/..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-[11px] focus:ring-2 focus:ring-red-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Start Time */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Thời Gian Bắt Đầu (Meeting Schedule)</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="datetime-local"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-red-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Select Participants */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Thành Viên Tham Gia ({selectedUserIds.length}/{users.length})
            </label>
            <div className="max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              {users.map(u => {
                const isSelected = selectedUserIds.includes(u.id);
                return (
                  <div
                    key={u.id}
                    onClick={() => toggleUser(u.id)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-white border border-red-300 text-slate-900 shadow-xs' 
                        : 'bg-slate-100/60 border border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img 
                        src={u.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"} 
                        alt={u.full_name}
                        className="w-6 h-6 rounded-full object-cover border border-slate-300 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-[11px] block truncate">{u.full_name}</span>
                        <span className="text-[9px] text-slate-500 block truncate">{u.job_title || u.role}</span>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-red-600 flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md shadow-red-600/20 flex items-center gap-1.5 transition-all hover:-translate-y-0.5"
            >
              <Video className="w-4 h-4" />
              {saving ? 'Đang tạo cuộc họp...' : 'Tạo Cuộc Họp Ngay'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
