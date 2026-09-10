import React, { useState, useEffect } from 'react';
import api from '../api';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Layers, 
  TrendingUp, 
  Users
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';
import { EmptyState } from '../components/EmptyState';

export const DashboardView = ({ currentProject, onOpenTaskDetail, showToast, onOpenCreateProject }) => {
  const [stats, setStats] = useState(null);
  const [workload, setWorkload] = useState([]);
  const [overdueTasks, setOverdueTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const projParam = currentProject ? `?project_id=${currentProject.id}` : '';
      const [statsRes, workloadRes, overdueRes] = await Promise.all([
        api.get(`/api/reports/dashboard-stats${projParam}`),
        api.get(`/api/reports/workload${projParam}`),
        api.get(`/api/reports/overdue-tasks${projParam}`),
      ]);
      setStats(statsRes.data);
      setWorkload(workloadRes.data);
      setOverdueTasks(overdueRes.data);
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi tải dữ liệu dashboard", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentProject]);

  if (!currentProject || stats?.total_projects === 0) {
    return <EmptyState onOpenCreateProject={onOpenCreateProject} />;
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-28 skeleton-loader rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 skeleton-loader rounded-xl" />
          <div className="h-72 skeleton-loader rounded-xl" />
        </div>
      </div>
    );
  }

  // Data for Status Breakdown Pie Chart
  const statusData = [
    { name: 'Cần làm (Todo)', value: stats?.todo_tasks || 0, color: '#64748b' },
    { name: 'Đang làm (InProgress)', value: stats?.in_progress_tasks || 0, color: '#2563eb' },
    { name: 'Kiểm thử (Review)', value: stats?.review_tasks || 0, color: '#d97706' },
    { name: 'Hoàn thành (Done)', value: stats?.completed_tasks || 0, color: '#16a34a' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-slate-900">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-lg font-black text-slate-900 flex items-center gap-2">
            Dashboard Tổng Quan Dự Án
            <span className="text-[10px] bg-red-50 border border-red-200 text-red-700 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Real-time Analytics
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi chỉ số hiệu suất KPI, khối lượng công việc và tiến độ nhiệm vụ quá hạn.
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-2 self-start md:self-auto transition-colors"
        >
          <TrendingUp className="w-3.5 h-3.5 text-red-600" />
          Làm mới dữ liệu
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Tasks */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Tổng Nhiệm Vụ
            </span>
            <div className="text-2xl font-black text-slate-900">{stats?.total_tasks || 0}</div>
            <span className="text-[11px] text-slate-500 mt-1 block">Tất cả trạng thái</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center font-bold">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Completion Rate */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Tỷ Lệ Hoàn Thành
            </span>
            <div className="text-2xl font-black text-emerald-600">{stats?.completion_rate || 0}%</div>
            <span className="text-[11px] text-emerald-600 font-bold mt-1 block">
              {stats?.completed_tasks || 0} / {stats?.total_tasks || 0} nhiệm vụ Done
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Overdue Tasks */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Nhiệm Vụ Quá Hạn
            </span>
            <div className="text-2xl font-black text-rose-600">{stats?.overdue_tasks || 0}</div>
            <span className="text-[11px] text-rose-600 font-bold mt-1 block">Cần xử lý gấp</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center font-bold">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Active Sprints */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Sprint Đang Chạy
            </span>
            <div className="text-2xl font-black text-blue-600">{stats?.active_sprints || 0}</div>
            <span className="text-[11px] text-slate-500 mt-1 block">Vòng đời Active</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workload Distribution Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-red-600" />
                Khối Lượng Công Việc (Workload) Theo Thành Viên
              </h3>
              <p className="text-xs text-slate-500">Giờ ước tính (hours) của các công việc đang đảm nhận</p>
            </div>
          </div>
          
          <div className="h-64 w-full">
            {workload.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Chưa có dữ liệu thành viên
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workload} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="full_name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#0F172A', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                    formatter={(val) => [`${val} giờ`, 'Khối lượng tồn đọng']}
                  />
                  <Bar dataKey="pending_hours" fill="#DC2626" radius={[4, 4, 0, 0]} name="Số giờ tồn đọng" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Task Status Breakdown Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Phân Bố Trạng Thái Nhiệm Vụ
              </h3>
              <p className="text-xs text-slate-500">Tỷ lệ các nhiệm vụ ở từng giai đoạn Todo, In Progress, Review, Done</p>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#0F172A', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center">
            {statusData.map((item, i) => (
              <div key={i} className="p-1.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 block truncate">{item.name}</span>
                <span className="text-xs font-bold" style={{ color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Overdue Tasks Warning Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            Danh Sách Nhiệm Vụ Quá Hạn ({overdueTasks.length})
          </h3>
          <span className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 font-extrabold px-2 py-0.5 rounded-md uppercase">
            Chậm tiến độ
          </span>
        </div>

        {overdueTasks.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            🎉 Tuyệt vời! Không có nhiệm vụ nào bị quá hạn.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200 tracking-wider">
                  <th className="p-3">Nhiệm vụ</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3">Ưu tiên</th>
                  <th className="p-3">Người thực hiện</th>
                  <th className="p-3">Hạn hoàn thành</th>
                  <th className="p-3 text-right">Trễ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {overdueTasks.map((t) => (
                  <tr 
                    key={t.id} 
                    onClick={() => onOpenTaskDetail(t)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="p-3 font-semibold text-slate-900 max-w-xs truncate">
                      {t.title}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        {t.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.priority === 'Urgent' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-orange-50 text-orange-700 border border-orange-200'
                      }`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700">
                      {t.assignee ? t.assignee.full_name : 'Chưa phân công'}
                    </td>
                    <td className="p-3 text-slate-500">
                      {t.due_date ? new Date(t.due_date).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td className="p-3 text-right font-black text-rose-600">
                      +{t.delay_days} ngày
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
