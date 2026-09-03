import React from 'react';
import { FolderPlus, Layers, ShieldCheck, Sparkles } from 'lucide-react';

export const EmptyState = ({ title, message, onOpenCreateProject }) => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in select-none">
      <div className="max-w-md w-full bg-[#18181B] border border-white/10 p-8 rounded-3xl shadow-2xl space-y-6 backdrop-blur-xl relative overflow-hidden">
        {/* Glow accent effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Icon Header */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600/30 to-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-500 shadow-xl shadow-red-950/50">
          <FolderPlus className="w-8 h-8 animate-pulse" />
        </div>

        {/* Text Content */}
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            {title || "Chưa Thuộc Dự Án Nào"}
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {message || "Bạn chưa thuộc dự án nào trong hệ thống G9. Hãy tạo dự án mới hoặc nhờ Quản trị viên (PM/Admin) thêm tài khoản của bạn vào nhóm làm việc!"}
          </p>
        </div>

        {/* Feature Highlights Badges */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-[10px] font-bold text-zinc-400">
          <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-full flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" /> Bảo mật phân quyền RBAC
          </span>
          <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-red-400" /> Tích hợp Trợ lý AI G9
          </span>
        </div>

        {/* Primary Action Button */}
        {onOpenCreateProject && (
          <div className="pt-2">
            <button
              onClick={onOpenCreateProject}
              className="w-full py-3 px-6 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xl shadow-red-900/40 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Tạo Dự Án Mới Ngay</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
