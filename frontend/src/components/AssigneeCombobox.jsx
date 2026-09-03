import React, { useState, useEffect, useRef } from 'react';
import { User, Check, Plus, Search, ChevronDown, Loader2 } from 'lucide-react';
import api from '../api';

export const AssigneeCombobox = ({ users = [], value, onChange, currentProjectId, showToast }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const [localUsers, setLocalUsers] = useState(users);
  const containerRef = useRef(null);

  useEffect(() => {
    setLocalUsers(users);
  }, [users]);

  // Find currently selected user
  const selectedUser = localUsers.find(u => u.id.toString() === value?.toString());

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredUsers = query.trim() === ''
    ? localUsers
    : localUsers.filter(u => u.full_name.toLowerCase().includes(query.toLowerCase()));

  const showCreateOption = query.trim() !== '' && !localUsers.some(
    u => u.full_name.toLowerCase() === query.trim().toLowerCase()
  );

  const handleSelectUser = (user) => {
    if (!user) {
      onChange('');
    } else {
      onChange(user.id.toString());
    }
    setIsOpen(false);
    setQuery('');
  };

  const handleQuickAddUser = async () => {
    if (!query.trim()) return;
    setAddingNew(true);
    try {
      const res = await api.post('/api/users/quick-add', {
        full_name: query.trim(),
        project_id: currentProjectId || null
      });
      const newUser = res.data;
      setLocalUsers(prev => [...prev.filter(u => u.id !== newUser.id), newUser]);
      onChange(newUser.id.toString());
      if (showToast) showToast(`Đã thêm thành viên mới: ${newUser.full_name}`, 'success');
      setIsOpen(false);
      setQuery('');
    } catch (err) {
      if (showToast) showToast('Lỗi khi thêm người làm mới', 'error');
    } finally {
      setAddingNew(false);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Input Display Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-zinc-900 border border-zinc-700/80 hover:border-zinc-500 rounded-lg px-3 py-2 text-xs font-medium text-zinc-100 flex items-center justify-between cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-2 truncate">
          {selectedUser ? (
            <>
              <img
                src={selectedUser.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
                alt={selectedUser.full_name}
                className="w-5 h-5 rounded-full object-cover border border-zinc-700 flex-shrink-0"
              />
              <span className="font-semibold text-zinc-100 truncate">{selectedUser.full_name}</span>
            </>
          ) : (
            <>
              <User className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              <span className="text-zinc-500 italic">Chưa phân công</span>
            </>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 bg-[#18181B] border border-white/10 rounded-xl shadow-2xl z-50 p-2 space-y-1 max-h-64 overflow-y-auto">
          {/* Search Field */}
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Gõ tên để tìm hoặc thêm mới..."
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Unassigned Option */}
          <div
            onClick={() => handleSelectUser(null)}
            className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer hover:bg-zinc-800 transition-colors ${
              !value ? 'bg-red-950/40 text-red-400 font-bold' : 'text-zinc-400'
            }`}
          >
            <span>Chưa phân công</span>
            {!value && <Check className="w-3.5 h-3.5 text-red-500" />}
          </div>

          {/* Filtered Users List */}
          {filteredUsers.map((u) => {
            const isSelected = value?.toString() === u.id.toString();
            return (
              <div
                key={u.id}
                onClick={() => handleSelectUser(u)}
                className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer hover:bg-zinc-800 transition-colors ${
                  isSelected ? 'bg-red-950/40 text-red-400 font-bold' : 'text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={u.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
                    alt={u.full_name}
                    className="w-6 h-6 rounded-full object-cover border border-zinc-700 flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="block truncate font-semibold">{u.full_name}</span>
                    <span className="block text-[10px] text-zinc-500 truncate">{u.job_title || u.role}</span>
                  </div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
              </div>
            );
          })}

          {/* Add New User Option if query doesn't match existing */}
          {showCreateOption && (
            <div
              onClick={handleQuickAddUser}
              className="px-2.5 py-2 mt-1 rounded-lg text-xs bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 font-semibold flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 truncate">
                {addingNew ? (
                  <Loader2 className="w-4 h-4 text-red-500 animate-spin flex-shrink-0" />
                ) : (
                  <Plus className="w-4 h-4 text-red-500 flex-shrink-0" />
                )}
                <span className="truncate">Thêm người mới: "{query}"</span>
              </div>
              <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded uppercase font-bold flex-shrink-0">Tạo</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
