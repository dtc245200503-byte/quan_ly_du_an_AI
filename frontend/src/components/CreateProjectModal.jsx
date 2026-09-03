import React, { useState } from 'react';
import api from '../api';
import { X, FolderPlus } from 'lucide-react';

export const CreateProjectModal = ({ onClose, onProjectCreated, showToast }) => {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !key.trim()) return;

    setLoading(true);
    try {
      const res = await api.post('/api/projects/', {
        name,
        key: key.toUpperCase(),
        description,
      });

      showToast("Tạo dự án thành công!", "success");
      onProjectCreated(res.data);
      onClose();
    } catch (err) {
      showToast(err.response?.data?.detail || "Lỗi khi tạo dự án mới", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-[#18181B] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-white/10 text-white space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-red-500" />
            Tạo Dự Án Mới
          </h3>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">Tên dự án *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!key) {
                  const autoKey = e.target.value.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 5);
                  setKey(autoKey);
                }
              }}
              placeholder="Ví dụ: Hệ Thống G9 AI Engine v5"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-white placeholder-zinc-500 focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">Mã viết tắt (Key) *</label>
            <input
              type="text"
              required
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder="G9AI"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono font-bold uppercase text-white placeholder-zinc-500 focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">Mô tả dự án</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả mục tiêu và quy mô dự án..."
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-white placeholder-zinc-500 focus:ring-2 focus:ring-red-600"
            />
          </div>

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
              {loading ? 'Đang tạo...' : 'Tạo Dự Án'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
