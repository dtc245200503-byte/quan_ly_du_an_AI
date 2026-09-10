import React, { useState, useEffect } from 'react';
import api from '../api';
import { 
  Video, 
  Plus, 
  Calendar, 
  Clock, 
  ExternalLink, 
  Trash2 
} from 'lucide-react';
import { MeetingModal } from '../components/MeetingModal';
import { EmptyState } from '../components/EmptyState';

export const MeetingsView = ({ currentProject, users = [], onOpenCreateProject, showToast }) => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  if (!currentProject) {
    return <EmptyState onOpenCreateProject={onOpenCreateProject} />;
  }

  const fetchMeetings = async () => {
    if (!currentProject) {
      setMeetings([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/api/meetings/?project_id=${currentProject.id}`);
      setMeetings(res.data);
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi lấy danh sách cuộc họp", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [currentProject]);

  const handleDeleteMeeting = async (meetingId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa cuộc họp này?")) return;
    try {
      await api.delete(`/api/meetings/${meetingId}`);
      showToast("Đã xóa cuộc họp", "success");
      fetchMeetings();
    } catch (err) {
      showToast("Không thể xóa cuộc họp", "error");
    }
  };

  // Group meetings into Upcoming vs Past
  const now = new Date();
  const upcomingMeetings = meetings.filter(m => new Date(m.start_time) >= new Date(now.getTime() - 2 * 3600000));
  const pastMeetings = meetings.filter(m => new Date(m.start_time) < new Date(now.getTime() - 2 * 3600000));

  const getPlatformBadge = (platform) => {
    switch (platform) {
      case 'Google Meet':
        return { label: 'Google Meet', icon: '📹', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'Microsoft Teams':
        return { label: 'MS Teams', icon: '💼', style: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'Zoom':
        return { label: 'Zoom', icon: '🔷', style: 'bg-sky-50 text-sky-700 border-sky-200' };
      case 'Jitsi Meet':
        return { label: 'Jitsi Meet', icon: '🌐', style: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { label: platform || 'Online', icon: '📹', style: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleString('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-slate-900">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-red-600 via-red-700 to-slate-900 p-6 rounded-2xl text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-white/20 rounded-xl border border-white/30">
                <Video className="w-5 h-5 text-white" />
              </span>
              <h1 className="text-xl font-black">Họp Nhóm Online — G9 Meeting Workspace</h1>
            </div>
            <p className="text-xs text-red-100 max-w-2xl leading-relaxed">
              Tổ chức cuộc họp video trực tuyến với Google Meet, MS Teams, Zoom hoặc Jitsi Meet. Đồng bộ lịch họp và kết nối thành viên dự án tức thì.
            </p>
          </div>

          <button
            onClick={() => {
              if (!currentProject) {
                showToast("Vui lòng chọn dự án trước", "error");
                return;
              }
              setShowModal(true);
            }}
            className="px-5 py-2.5 bg-white hover:bg-slate-100 text-red-700 font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4 text-red-700" />
            Tạo Cuộc Họp Mới
          </button>
        </div>
      </div>

      {/* Content Section */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Đang tải lịch họp nhóm...</div>
      ) : meetings.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-3 shadow-xs">
          <Video className="w-10 h-10 text-slate-400 mx-auto animate-pulse" />
          <h3 className="text-sm font-bold text-slate-800">Chưa có cuộc họp online nào</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Nhấn nút **"Tạo Cuộc Họp Mới"** để tạo đường dẫn Google Meet hoặc Jitsi Meet cho dự án <span className="text-red-600 font-bold">{currentProject?.name}</span>.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-md"
          >
            Tạo cuộc họp ngay
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Upcoming Meetings */}
          <div className="space-y-4">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              Cuộc Họp Sắp Diễn Ra ({upcomingMeetings.length})
            </h2>

            {upcomingMeetings.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Không có cuộc họp nào sắp diễn ra.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingMeetings.map(mt => {
                  const badge = getPlatformBadge(mt.platform);
                  return (
                    <div 
                      key={mt.id} 
                      className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-red-500/50 transition-all shadow-sm space-y-4 flex flex-col justify-between group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${badge.style}`}>
                            <span>{badge.icon}</span>
                            <span>{badge.label}</span>
                          </span>

                          <button
                            onClick={() => handleDeleteMeeting(mt.id)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                            title="Xóa cuộc họp"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900 leading-snug group-hover:text-red-600 transition-colors">
                            {mt.title}
                          </h3>
                        </div>

                        {/* Meeting Schedule Time */}
                        <div className="space-y-1 text-xs text-slate-500">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-red-600" />
                            <span className="font-semibold text-slate-800">{formatDate(mt.start_time)}</span>
                          </div>
                        </div>

                        {/* Participants avatars */}
                        <div className="space-y-1 pt-1 border-t border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Thành viên tham gia:</span>
                          <div className="flex items-center -space-x-2 overflow-hidden">
                            {mt.participant_users && mt.participant_users.length > 0 ? (
                              mt.participant_users.map(pu => (
                                <img
                                  key={pu.id}
                                  src={pu.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
                                  alt={pu.full_name}
                                  title={pu.full_name}
                                  className="w-7 h-7 rounded-full object-cover border-2 border-white"
                                />
                              ))
                            ) : (
                              <span className="text-xs text-slate-500 italic">Toàn bộ thành viên dự án</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Join Meeting Action Button */}
                      <div className="pt-2">
                        <a
                          href={mt.meeting_link}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-black rounded-xl shadow-md shadow-red-600/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                        >
                          <Video className="w-4 h-4" />
                          THAM GIA NGAY (Join Meeting)
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past Meetings */}
          {pastMeetings.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h2 className="text-sm font-bold text-slate-600 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                Lịch Sử Cuộc Họp Đã Diễn Ra ({pastMeetings.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pastMeetings.map(mt => {
                  const badge = getPlatformBadge(mt.platform);
                  return (
                    <div 
                      key={mt.id} 
                      className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 opacity-80 hover:opacity-100 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badge.style}`}>
                          {badge.icon} {badge.label}
                        </span>
                        <span className="text-[10px] text-slate-400">{formatDate(mt.start_time)}</span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-800">{mt.title}</h4>

                      <a
                        href={mt.meeting_link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-slate-500 hover:text-red-600 flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Mở lại link cuộc họp
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Meeting Modal */}
      {showModal && (
        <MeetingModal
          project={currentProject}
          users={users}
          onClose={() => setShowModal(false)}
          onMeetingCreated={() => fetchMeetings()}
          showToast={showToast}
        />
      )}
    </div>
  );
};
