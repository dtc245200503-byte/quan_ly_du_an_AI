import React, { useState } from 'react';
import api from '../api';
import { 
  X, 
  Trash2, 
  Send, 
  Paperclip, 
  Download, 
  FileText,
  MessageSquare,
  Video
} from 'lucide-react';
import { AssigneeCombobox } from '../components/AssigneeCombobox';

export const TaskDetailModal = ({ task, onClose, onRefresh, users, sprints, showToast, onOpenCreateMeeting }) => {
  if (!task) return null;

  const [title, setTitle] = useState(task.title || '');
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState(task.status || 'Todo');
  const [priority, setPriority] = useState(task.priority || 'Medium');
  const [assigneeId, setAssigneeId] = useState(task.assignee_id ? task.assignee_id.toString() : '');
  const [sprintId, setSprintId] = useState(task.sprint_id ? task.sprint_id.toString() : '');
  const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.split('T')[0] : '');
  const [estimatedHours, setEstimatedHours] = useState(task.estimated_hours || 0);

  // Comments & Attachments
  const [comments, setComments] = useState(task.comments || []);
  const [attachments, setAttachments] = useState(task.attachments || []);
  const [newComment, setNewComment] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSaveTask = async () => {
    setSaving(true);
    try {
      await api.put(`/api/tasks/${task.id}`, {
        title,
        description,
        status,
        priority,
        assignee_id: assigneeId ? parseInt(assigneeId) : null,
        sprint_id: sprintId ? parseInt(sprintId) : null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        estimated_hours: parseFloat(estimatedHours) || 0
      });
      showToast("Cập nhật task thành công", "success");
      onRefresh();
      onClose();
    } catch (err) {
      showToast("Lỗi khi lưu task", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm("Bạn có chắc muốn xóa task này?")) return;
    try {
      await api.delete(`/api/tasks/${task.id}`);
      showToast("Đã xóa task", "success");
      onRefresh();
      onClose();
    } catch (err) {
      showToast("Lỗi khi xóa task", "error");
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await api.post(`/api/tasks/${task.id}/comments`, { content: newComment.trim() });
      setComments([...comments, res.data]);
      setNewComment('');
      showToast("Đã thêm bình luận", "success");
    } catch (err) {
      showToast("Lỗi khi gửi bình luận", "error");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post(`/api/tasks/${task.id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAttachments([...attachments, res.data]);
      showToast("Đã tải tệp lên thành công", "success");
    } catch (err) {
      showToast("Lỗi khi đính kèm tài liệu", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (attId) => {
    try {
      await api.delete(`/api/tasks/attachments/${attId}`);
      setAttachments(attachments.filter(a => a.id !== attId));
      showToast("Đã xóa tài liệu đính kèm", "success");
    } catch (err) {
      showToast("Không thể xóa tệp", "error");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 text-slate-900 overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
              TASK-{task.id}
            </span>
            <span className="text-xs text-slate-500">Chi tiết nhiệm vụ</span>
          </div>
          <div className="flex items-center gap-2">
            {onOpenCreateMeeting && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCreateMeeting(`Họp Thảo Luận: ${task.title}`);
                }}
                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold rounded-lg flex items-center gap-1 transition-all"
                title="Tạo cuộc họp nhóm online về task này"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Họp Task Này</span>
              </button>
            )}
            <button
              onClick={handleDeleteTask}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-200 rounded-lg transition-colors"
              title="Xóa nhiệm vụ"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Title Editor */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tên nhiệm vụ</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-base font-extrabold text-slate-900 bg-transparent border-b border-slate-300 pb-1 focus:border-red-600 focus:outline-none"
            />
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            {/* Status */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Trạng thái</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-white border border-slate-300 text-xs font-semibold rounded-lg p-1.5 text-slate-900 focus:ring-2 focus:ring-red-600"
              >
                <option value="Todo">⚪ Todo (Cần làm)</option>
                <option value="InProgress">🔵 InProgress (Đang làm)</option>
                <option value="Review">🟠 Review (Kiểm thử)</option>
                <option value="Done">🟢 Done (Hoàn thành)</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Mức ưu tiên</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-white border border-slate-300 text-xs font-semibold rounded-lg p-1.5 text-slate-900 focus:ring-2 focus:ring-red-600"
              >
                <option value="Low">Low (Thấp)</option>
                <option value="Medium">Medium (Vừa)</option>
                <option value="High">High (Cao)</option>
                <option value="Urgent">Urgent (Gấp)</option>
              </select>
            </div>

            {/* Assignee Combobox */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Người làm (Assignee)</label>
              <AssigneeCombobox
                users={users}
                value={assigneeId}
                onChange={setAssigneeId}
                currentProjectId={task.project_id}
                showToast={showToast}
              />
            </div>

            {/* Sprint */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Sprint</label>
              <select
                value={sprintId}
                onChange={(e) => setSprintId(e.target.value)}
                className="w-full bg-white border border-slate-300 text-xs font-medium rounded-lg p-1.5 text-slate-900 focus:ring-2 focus:ring-red-600"
              >
                <option value="">Không thuộc Sprint</option>
                {sprints.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Hạn hoàn thành</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-white border border-slate-300 text-xs font-medium rounded-lg p-1.5 text-slate-900 focus:ring-2 focus:ring-red-600"
              />
            </div>

            {/* Estimated Hours */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Giờ ước tính (hours)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                className="w-full bg-white border border-slate-300 text-xs font-medium rounded-lg p-1.5 text-slate-900 focus:ring-2 focus:ring-red-600"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả nhiệm vụ</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập chi tiết yêu cầu công việc..."
              className="w-full p-3 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-red-600"
            />
          </div>

          {/* Attachments Section */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-red-600" />
                Tài Liệu Đính Kèm ({attachments.length})
              </h4>
              <label className="cursor-pointer text-xs font-bold text-red-600 hover:underline flex items-center gap-1">
                <Paperclip className="w-3.5 h-3.5" />
                {uploading ? 'Đang tải lên...' : '+ Tải tệp lên'}
                <input type="file" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            {attachments.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Chưa có tài liệu đính kèm.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {attachments.map(att => (
                  <div key={att.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <FileText className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <span className="truncate font-medium text-slate-800">{att.file_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <a
                        href={`/api/tasks/attachments/${att.id}/download`}
                        download
                        className="p-1 text-slate-500 hover:text-red-600 hover:bg-slate-200 rounded"
                        title="Tải về"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => handleDeleteAttachment(att.id)}
                        className="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-200 rounded"
                        title="Xóa tệp"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-red-600" />
              Bình Luận Trao Đổi ({comments.length})
            </h4>

            {/* Comment Feed */}
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Chưa có bình luận nào. Hãy gửi bình luận đầu tiên!</p>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <img
                      src={c.user?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
                      alt={c.user?.full_name}
                      className="w-7 h-7 rounded-full object-cover border border-slate-300 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-slate-900">{c.user?.full_name}</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(c.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="flex items-center gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Nhập nội dung bình luận..."
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-red-600"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/20"
              >
                <Send className="w-3.5 h-3.5" />
                Gửi
              </button>
            </form>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg"
          >
            Hủy
          </button>
          <button
            onClick={handleSaveTask}
            disabled={saving}
            className="px-5 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md shadow-red-600/20 hover:-translate-y-0.5 transition-all"
          >
            {saving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
          </button>
        </div>
      </div>
    </div>
  );
};
