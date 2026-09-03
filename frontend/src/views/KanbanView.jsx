import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../api';
import { 
  Search, 
  Plus, 
  Filter, 
  User, 
  Calendar, 
  MessageSquare, 
  Paperclip, 
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';

import { EmptyState } from '../components/EmptyState';

const COLUMNS = [
  { id: 'Todo', title: 'Cần Làm (Todo)', color: 'bg-zinc-900 border-zinc-700 text-zinc-300' },
  { id: 'InProgress', title: 'Đang Làm (In Progress)', color: 'bg-blue-950/60 border-blue-800 text-blue-300' },
  { id: 'Review', title: 'Kiểm Thử (Review)', color: 'bg-amber-950/60 border-amber-800 text-amber-300' },
  { id: 'Done', title: 'Hoàn Thành (Done)', color: 'bg-emerald-950/60 border-emerald-800 text-emerald-300' },
];

export const KanbanView = ({ currentProject, users, sprints, onOpenTaskDetail, onOpenCreateTask, onOpenCreateProject, showToast }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  if (!currentProject) {
    return <EmptyState onOpenCreateProject={onOpenCreateProject} />;
  }


  // Filter Toolbar State
  const [search, setSearch] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedSprint, setSelectedSprint] = useState('');

  const fetchTasks = async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      let query = `/api/tasks/?project_id=${currentProject.id}`;
      if (selectedSprint) query += `&sprint_id=${selectedSprint}`;
      if (selectedAssignee) query += `&assignee_id=${selectedAssignee}`;
      if (selectedPriority) query += `&priority=${selectedPriority}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;

      const res = await api.get(query);
      setTasks(res.data);
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi tải danh sách task", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [currentProject, selectedSprint, selectedAssignee, selectedPriority, search]);

  // Drag and Drop Handler
  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const taskId = parseInt(draggableId);
    const newStatus = destination.droppableId;

    // Optimistic UI Update
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    setTasks(updatedTasks);

    try {
      await api.patch(`/api/tasks/${taskId}`, { status: newStatus });
      showToast(`Đã chuyển task sang '${newStatus}'`, "success");
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi chuyển trạng thái task", "error");
      fetchTasks(); // Revert on failure
    }
  };

  const getPriorityStyle = (p) => {
    switch (p) {
      case 'Urgent': return 'bg-rose-950/80 text-rose-400 border-rose-800';
      case 'High': return 'bg-orange-950/80 text-orange-400 border-orange-800';
      case 'Medium': return 'bg-blue-950/80 text-blue-400 border-blue-800';
      default: return 'bg-zinc-900 text-zinc-400 border-zinc-700';
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto flex flex-col h-[calc(100vh-4rem)] text-zinc-100">
      {/* Filter Toolbar Header */}
      <div className="bg-[#18181B] p-4 rounded-xl border border-white/10 shadow-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm kiếm task..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-medium text-white placeholder-zinc-500 focus:ring-2 focus:ring-red-600"
            />
          </div>

          {/* Sprint Filter */}
          <select
            value={selectedSprint}
            onChange={(e) => setSelectedSprint(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-200 focus:ring-2 focus:ring-red-600"
          >
            <option value="">Tất cả Sprint</option>
            {sprints.map(s => (
              <option key={s.id} value={s.id}>🏃 {s.name}</option>
            ))}
          </select>

          {/* Assignee Filter */}
          <select
            value={selectedAssignee}
            onChange={(e) => setSelectedAssignee(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-200 focus:ring-2 focus:ring-red-600"
          >
            <option value="">Tất cả người làm</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>👤 {u.full_name}</option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-200 focus:ring-2 focus:ring-red-600"
          >
            <option value="">Tất cả mức ưu tiên</option>
            <option value="Urgent">🔴 Urgent / Gấp</option>
            <option value="High">🟠 High / Cao</option>
            <option value="Medium">🔵 Medium / Vừa</option>
            <option value="Low">⚪ Low / Thấp</option>
          </select>
        </div>

        <button
          onClick={onOpenCreateTask}
          className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-900/40 hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          Tạo Task
        </button>
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 overflow-x-auto min-h-0">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full min-w-[900px]">
            {COLUMNS.map((col) => {
              const columnTasks = tasks.filter(t => t.status === col.id);
              return (
                <div key={col.id} className="bg-[#09090B] border border-white/10 rounded-xl p-3 flex flex-col h-full max-h-full">
                  {/* Column Header */}
                  <div className={`p-2.5 rounded-lg border font-bold text-xs flex items-center justify-between mb-3 ${col.color}`}>
                    <span>{col.title}</span>
                    <span className="bg-black/60 px-2 py-0.5 rounded-full text-[11px] font-black border border-white/10">
                      {columnTasks.length}
                    </span>
                  </div>

                  {/* Droppable Area */}
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 overflow-y-auto space-y-2.5 p-1 transition-colors rounded-lg ${
                          snapshot.isDraggingOver ? 'bg-red-950/20 ring-2 ring-red-600 ring-dashed' : ''
                        }`}
                      >
                        {columnTasks.length === 0 && (
                          <div className="h-24 border border-dashed border-zinc-800 rounded-lg flex items-center justify-center text-[11px] text-zinc-500 font-medium select-none">
                            Kéo task vào đây
                          </div>
                        )}

                        {columnTasks.map((t, index) => {
                          const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'Done';
                          return (
                            <Draggable key={t.id.toString()} draggableId={t.id.toString()} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => onOpenTaskDetail(t)}
                                  className={`bg-[#18181B] p-3.5 rounded-xl border transition-all cursor-pointer select-none space-y-2.5 hover:-translate-y-0.5 ${
                                    snapshot.isDragging ? 'rotate-2 shadow-2xl ring-2 ring-red-600 border-red-500' : 'border-white/10 hover:border-zinc-500 shadow-lg'
                                  }`}
                                >
                                  {/* Priority & Overdue Badge */}
                                  <div className="flex items-center justify-between gap-1">
                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getPriorityStyle(t.priority)}`}>
                                      {t.priority}
                                    </span>
                                    {isOverdue && (
                                      <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-800">
                                        <AlertCircle className="w-3 h-3" /> Quá hạn
                                      </span>
                                    )}
                                  </div>

                                  {/* Task Title */}
                                  <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">
                                    {t.title}
                                  </h4>

                                  {/* Bottom Info: Due Date, Assignee, Comment/Attachment count */}
                                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-[11px] text-zinc-400">
                                    <div className="flex items-center gap-2">
                                      {t.comments?.length > 0 && (
                                        <span className="flex items-center gap-1">
                                          <MessageSquare className="w-3 h-3 text-zinc-500" /> {t.comments.length}
                                        </span>
                                      )}
                                      {t.attachments?.length > 0 && (
                                        <span className="flex items-center gap-1">
                                          <Paperclip className="w-3 h-3 text-zinc-500" /> {t.attachments.length}
                                        </span>
                                      )}
                                      {t.due_date && (
                                        <span className={`flex items-center gap-1 ${isOverdue ? 'text-rose-400 font-bold' : ''}`}>
                                          <Calendar className="w-3 h-3" />
                                          {new Date(t.due_date).toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' })}
                                        </span>
                                      )}
                                    </div>

                                    {/* Assignee Avatar */}
                                    {t.assignee ? (
                                      <img
                                        src={t.assignee.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
                                        alt={t.assignee.full_name}
                                        title={t.assignee.full_name}
                                        className="w-6 h-6 rounded-full border border-zinc-700 object-cover"
                                      />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-500" title="Chưa phân công">
                                        ?
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
};
