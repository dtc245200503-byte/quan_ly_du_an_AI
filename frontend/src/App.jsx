import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import api from './api';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Toast } from './components/Toast';

import { AuthView } from './views/AuthView';
import { DashboardView } from './views/DashboardView';
import { KanbanView } from './views/KanbanView';
import { SprintView } from './views/SprintView';
import { AIHubView } from './views/AIHubView';
import { ProfileAdminView } from './views/ProfileAdminView';
import { MeetingsView } from './views/MeetingsView';

import { TaskDetailModal } from './views/TaskDetailModal';
import { CreateTaskModal } from './components/CreateTaskModal';
import { CreateProjectModal } from './components/CreateProjectModal';
import { MeetingModal } from './components/MeetingModal';
import { AIChatDrawer } from './components/AIChatDrawer';

const AppContent = () => {
  const { user, loading: authLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [users, setUsers] = useState([]);
  const [sprints, setSprints] = useState([]);

  // Modals state
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);

  // Meeting modal state
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingInitialTitle, setMeetingInitialTitle] = useState('');

  const handleOpenCreateMeeting = (title = '') => {
    setMeetingInitialTitle(title);
    setShowMeetingModal(true);
  };

  // Toast state
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Projects List
  const fetchProjects = async () => {
    try {
      const res = await api.get('/api/projects/');
      setProjects(res.data);
      if (res.data.length > 0 && !currentProject) {
        setCurrentProject(res.data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Users List
  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/users/');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Sprints List for Current Project
  const fetchSprints = async () => {
    if (!currentProject) {
      setSprints([]);
      return;
    }
    try {
      const res = await api.get(`/api/sprints/?project_id=${currentProject.id}`);
      setSprints(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchUsers();
    }
  }, [user]);

  useEffect(() => {
    if (currentProject) {
      fetchSprints();
    }
  }, [currentProject]);

  if (authLoading) {
    return (
      <div className="h-screen bg-[#09090B] flex flex-col items-center justify-center space-y-4 text-white">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-red-500 animate-bounce flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-red-900/50">
          G9
        </div>
        <span className="text-xs font-bold text-zinc-400 tracking-wider">Đang khởi chạy hệ thống G9 v5...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthView showToast={showToast} />
        <Toast toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  return (
    <div className="flex h-screen bg-[#09090B] overflow-hidden font-sans text-zinc-100">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        projects={projects}
        currentProject={currentProject}
        setCurrentProject={setCurrentProject}
        onOpenCreateProject={() => setShowCreateProjectModal(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header
          currentProject={currentProject}
          onOpenCreateTask={() => setShowCreateTaskModal(true)}
          activeTab={activeTab}
          onOpenAIHub={() => setActiveTab('ai-hub')}
        />

        <main className="flex-1">
          {activeTab === 'dashboard' && (
            <DashboardView
              currentProject={currentProject}
              onOpenTaskDetail={(t) => setSelectedTask(t)}
              showToast={showToast}
              onOpenCreateProject={() => setShowCreateProjectModal(true)}
            />
          )}

          {activeTab === 'kanban' && (
            <KanbanView
              currentProject={currentProject}
              users={users}
              sprints={sprints}
              onOpenTaskDetail={(t) => setSelectedTask(t)}
              onOpenCreateTask={() => setShowCreateTaskModal(true)}
              onOpenCreateProject={() => setShowCreateProjectModal(true)}
              showToast={showToast}
            />
          )}

          {activeTab === 'sprints' && (
            <SprintView
              currentProject={currentProject}
              sprints={sprints}
              onRefreshSprints={fetchSprints}
              showToast={showToast}
              onOpenCreateProject={() => setShowCreateProjectModal(true)}
            />
          )}

          {activeTab === 'meetings' && (
            <MeetingsView
              currentProject={currentProject}
              users={users}
              showToast={showToast}
              onOpenCreateProject={() => setShowCreateProjectModal(true)}
            />
          )}

          {activeTab === 'ai-hub' && (
            <AIHubView
              currentProject={currentProject}
              showToast={showToast}
              onOpenCreateMeeting={() => handleOpenCreateMeeting()}
              onOpenCreateProject={() => setShowCreateProjectModal(true)}
            />
          )}


          {activeTab === 'profile' && (
            <ProfileAdminView
              showToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Global AI Copilot Chat Drawer */}
      <AIChatDrawer
        currentProject={currentProject}
        showToast={showToast}
      />

      {/* Modals */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onRefresh={() => {
            fetchSprints();
          }}
          users={users}
          sprints={sprints}
          showToast={showToast}
          onOpenCreateMeeting={(tTitle) => handleOpenCreateMeeting(tTitle)}
        />
      )}

      {showMeetingModal && (
        <MeetingModal
          project={currentProject}
          users={users}
          initialTitle={meetingInitialTitle}
          onClose={() => setShowMeetingModal(false)}
          onMeetingCreated={() => {
            if (activeTab !== 'meetings') setActiveTab('meetings');
          }}
          showToast={showToast}
        />
      )}

      {showCreateTaskModal && (
        <CreateTaskModal
          currentProject={currentProject}
          users={users}
          sprints={sprints}
          onClose={() => setShowCreateTaskModal(false)}
          onRefreshTasks={() => {
            fetchSprints();
          }}
          showToast={showToast}
        />
      )}

      {showCreateProjectModal && (
        <CreateProjectModal
          onClose={() => setShowCreateProjectModal(false)}
          onProjectCreated={(newProj) => {
            fetchProjects();
            setCurrentProject(newProj);
          }}
          showToast={showToast}
        />
      )}

      {/* Global Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

