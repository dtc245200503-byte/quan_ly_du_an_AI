import React from 'react';
import { Plus, Sparkles, Folder } from 'lucide-react';

export const Header = ({ currentProject, onOpenCreateTask, activeTab, onOpenAIHub }) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-50 text-red-600 rounded-lg border border-red-200">
          <Folder className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 leading-tight">
            {currentProject ? currentProject.name : 'Chưa chọn dự án'}
          </h2>
          <p className="text-[11px] text-slate-500 truncate max-w-md">
            {currentProject?.description || 'Hệ thống Quản lý Dự án chuẩn Enterprise SaaS'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* AI Quick Trigger Button */}
        <button
          onClick={onOpenAIHub}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-600/20 hover:-translate-y-0.5 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Trợ Lý AI</span>
        </button>

        {/* Create Task Button */}
        <button
          onClick={onOpenCreateTask}
          disabled={!currentProject}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-md shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Task Mới</span>
        </button>
      </div>
    </header>
  );
};
