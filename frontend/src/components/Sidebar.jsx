import React from 'react';
import { 
  LayoutDashboard, 
  Kanban, 
  Sparkles, 
  RotateCw, 
  User, 
  PlusCircle, 
  LogOut, 
  ShieldAlert,
  ChevronRight,
  Video
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = ({ activeTab, setActiveTab, projects, currentProject, setCurrentProject, onOpenCreateProject }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'kanban', label: 'Bảng Kanban & Task', icon: Kanban },
    { id: 'sprints', label: 'Quản Lý Sprint', icon: RotateCw },
    { id: 'meetings', label: 'Cuộc Họp Online', icon: Video, badge: 'New' },
    { id: 'ai-hub', label: 'AI Hub Trí Tuệ', icon: Sparkles, highlight: true },
    { id: 'profile', label: 'Hồ Sơ & Quản Trị', icon: User },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between h-screen sticky top-0 shadow-sm select-none z-20">
      {/* Brand Header */}
      <div>
        <div className="h-16 flex items-center px-5 border-b border-slate-200 gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-red-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-red-600/30">
            G9
          </div>
          <div className="flex flex-col">
            <h1 className="font-extrabold text-slate-900 text-sm leading-tight tracking-tight">
              G9 - Quản Lý Dự Án
            </h1>
            <span className="text-[10px] text-red-600 font-bold tracking-wider uppercase">
              Corporate SaaS v5
            </span>
          </div>
        </div>

        {/* Project Selector Dropdown */}
        <div className="p-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dự án hiện tại</span>
            <button 
              onClick={onOpenCreateProject}
              className="text-[11px] text-red-600 font-bold hover:underline flex items-center gap-0.5"
            >
              <PlusCircle className="w-3 h-3" /> Tạo mới
            </button>
          </div>
          <select 
            value={currentProject ? currentProject.id : ''} 
            onChange={(e) => {
              const selected = projects.find(p => p.id === parseInt(e.target.value));
              if (selected) setCurrentProject(selected);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg p-2 font-medium focus:ring-2 focus:ring-red-600 focus:border-red-600 shadow-sm"
          >
            {projects.length === 0 && <option value="">Chưa có dự án nào</option>}
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                📁 {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive 
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30 hover:-translate-y-0.5' 
                    : item.highlight 
                    ? 'text-red-600 bg-red-50 hover:bg-red-100 border border-red-200' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-red-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && !isActive && (
                  <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase">NEW</span>
                )}
                {item.highlight && !isActive && (
                  <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase">AI</span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between">
          <div 
            onClick={() => setActiveTab('profile')}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity min-w-0"
          >
            <img 
              src={user?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"} 
              alt="Avatar"
              className="w-8 h-8 rounded-full object-cover border border-slate-300 flex-shrink-0"
            />
            <div className="min-w-0 flex flex-col">
              <span className="text-xs font-bold text-slate-900 truncate">{user?.full_name}</span>
              <span className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                {user?.role === 'Admin' && <ShieldAlert className="w-3 h-3 text-amber-500" />}
                {user?.job_title || user?.role || 'Thành viên'}
              </span>
            </div>
          </div>
          <button 
            onClick={logout} 
            title="Đăng xuất"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
