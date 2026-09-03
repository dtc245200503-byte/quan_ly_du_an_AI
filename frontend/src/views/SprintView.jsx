import React, { useState } from 'react';
import api from '../api';
import { RotateCw, Plus, Play, CheckCircle2, Calendar, Target, Clock, Trash2, X } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';

export const SprintView = ({ currentProject, sprints, onRefreshSprints, onOpenCreateProject, showToast }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  if (!currentProject) {
    return <EmptyState onOpenCreateProject={onOpenCreateProject} />;
  }


  const handleCreateSprint = async (e) => {
    e.preventDefault();
    if (!currentProject) return;
    setLoading(true);
    try {
      await api.post('/api/sprints/', {
        project_id: currentProject.id,
        name,
        goal,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        end_date: endDate ? new Date(endDate).toISOString() : null,
      });
      showToast("Tạo Sprint mới thành công", "success");
      onRefreshSprints();
      setShowCreateModal(false);
      setName('');
      setGoal('');
    } catch (err) {
      showToast("Lỗi khi tạo Sprint", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (sprintId, newStatus) => {
    try {
      await api.put(`/api/sprints/${sprintId}`, { status: newStatus });
      showToast(`Đã chuyển Sprint sang trạng thái '${newStatus}'`, "success");
      onRefreshSprints();
    } catch (err) {
      showToast("Không thể cập nhật trạng thái Sprint", "error");
    }
  };

  const handleDeleteSprint = async (sprintId) => {
    if (!window.confirm("Bạn có chắc muốn xóa Sprint này?")) return;
    try {
      await api.delete(`/api/sprints/${sprintId}`);
      showToast("Đã xóa Sprint", "success");
      onRefreshSprints();
    } catch (err) {
      showToast("Không thể xóa Sprint", "error");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-zinc-100">
      {/* Header Banner */}
      <div className="bg-[#18181B] p-5 rounded-2xl border border-white/10 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-black text-white flex items-center gap-2">
            <RotateCw className="w-5 h-5 text-red-500" />
            Quản Lý Vòng Đời Sprint
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Lập kế hoạch, kích hoạt và theo dõi các chu kỳ phát triển Sprint (Planning → Active → Completed).
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={!currentProject}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-900/40 disabled:opacity-50 hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          Tạo Sprint Mới
        </button>
      </div>

      {/* Sprints Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['Active', 'Planning', 'Completed'].map((statusCategory) => {
          const catSprints = sprints.filter(s => s.status === statusCategory);
          return (
            <div key={statusCategory} className="bg-[#09090B] border border-white/10 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  {statusCategory === 'Active' && <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />}
                  {statusCategory === 'Planning' && <Clock className="w-4 h-4 text-blue-400" />}
                  {statusCategory === 'Completed' && <CheckCircle2 className="w-4 h-4 text-zinc-500" />}
                  {statusCategory} ({catSprints.length})
                </span>
              </div>

              <div className="space-y-3">
                {catSprints.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
                    Không có Sprint ở giai đoạn này
                  </div>
                ) : (
                  catSprints.map(s => (
                    <div key={s.id} className="bg-[#18181B] p-4 rounded-xl border border-white/10 shadow-lg space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-white">{s.name}</h3>
                          <span className="text-[11px] text-red-400 font-bold bg-red-950/60 border border-red-800/60 px-2 py-0.5 rounded mt-1 inline-block">
                            {s.task_count || 0} nhiệm vụ
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteSprint(s.id)}
                          className="text-zinc-500 hover:text-red-500 p-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {s.goal && (
                        <p className="text-xs text-zinc-300 bg-zinc-900 p-2.5 rounded-lg border border-zinc-800 italic">
                          🎯 {s.goal}
                        </p>
                      )}

                      {/* Status Transition Actions */}
                      <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500">
                          {s.start_date ? new Date(s.start_date).toLocaleDateString('vi-VN') : 'N/A'}
                        </span>
                        
                        {s.status === 'Planning' && (
                          <button
                            onClick={() => handleUpdateStatus(s.id, 'Active')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded shadow-md shadow-emerald-900/30"
                          >
                            ▶ Bắt đầu Sprint
                          </button>
                        )}
                        {s.status === 'Active' && (
                          <button
                            onClick={() => handleUpdateStatus(s.id, 'Completed')}
                            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] font-bold rounded border border-zinc-700"
                          >
                            ✓ Hoàn thành Sprint
                          </button>
                        )}
                        {s.status === 'Completed' && (
                          <span className="text-[11px] text-zinc-500 font-bold">Đã đóng</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Sprint Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#18181B] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-white/10 space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-extrabold text-white">Tạo Sprint Mới</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateSprint} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Tên Sprint</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Sprint 3 — AI Features Integration"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-white focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Mục tiêu Sprint (Goal)</label>
                <textarea
                  rows={3}
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Nhập mục tiêu cốt lõi của Sprint..."
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-white focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-white focus:ring-2 focus:ring-red-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-white focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 rounded-lg font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-lg shadow-red-900/30 hover:-translate-y-0.5 transition-all"
                >
                  {loading ? 'Đang tạo...' : 'Tạo Sprint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
