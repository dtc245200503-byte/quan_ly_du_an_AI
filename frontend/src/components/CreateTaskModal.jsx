import React, { useState } from 'react';
import api from '../api';
import { X, PlusCircle } from 'lucide-react';
import { AssigneeCombobox } from './AssigneeCombobox';

export const CreateTaskModal = ({ currentProject, onClose, onRefreshTasks, users, sprints, showToast }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Todo');
  const [priority, setPriority] = useState('Medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [sprintId, setSprintId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState(4);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !currentProject) return;
    setLoading(true);

    try {
      await api.post('/api/tasks/', {
        project_id: currentProject.id,
        sprint_id: sprintId ? parseInt(sprintId) : null,
        title,
        description,
        status,
        priority,
        assignee_id: assigneeId ? parseInt(assigneeId) : null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        estimated_hours: parseFloat(estimatedHours) || 0,
      });

      showToast("Tạo nhiệm vụ mới thành công!", "success");
      onRefreshTasks();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.detail || "Lỗi khi tạo nhiệm vụ", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[#18181B] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-white/10 text-white space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-red-500" />
            Tạo Nhiệm Vụ Mới
          </h3>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">Tên nhiệm vụ *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Thiết kế giao diện Auth & Phân quyền Admin"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-white placeholder-zinc-500 focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Trạng thái</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-white focus:ring-2 focus:ring-red-600"
              >
                <option value="Todo">⚪ Todo (Cần làm)</option>
                <option value="InProgress">🔵 InProgress (Đang làm)</option>
                <option value="Review">🟠 Review (Kiểm thử)</option>
                <option value="Done">🟢 Done (Hoàn thành)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Mức ưu tiên</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-white focus:ring-2 focus:ring-red-600"
              >
                <option value="Low">Low (Thấp)</option>
                <option value="Medium">Medium (Vừa)</option>
                <option value="High">High (Cao)</option>
                <option value="Urgent">Urgent (Gấp)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Assignee Combobox Component */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Người làm (Assignee)</label>
              <AssigneeCombobox
                users={users}
                value={assigneeId}
                onChange={setAssigneeId}
                currentProjectId={currentProject?.id}
                showToast={showToast}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Sprint (Chu kỳ)</label>
              <select
                value={sprintId}
                onChange={(e) => setSprintId(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-white focus:ring-2 focus:ring-red-600"
              >
                <option value="">Không thuộc Sprint</option>
                {sprints.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Hạn hoàn thành</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-white focus:ring-2 focus:ring-red-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Giờ ước tính (hours)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-white focus:ring-2 focus:ring-red-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">Mô tả nhiệm vụ</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả chi tiết yêu cầu công việc..."
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-white placeholder-zinc-500 focus:ring-2 focus:ring-red-600"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-zinc-400 hover:bg-zinc-800 rounded-lg font-bold transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-lg shadow-red-900/40 hover:-translate-y-0.5 transition-all"
            >
              {loading ? 'Đang tạo...' : 'Tạo Nhiệm Vụ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
