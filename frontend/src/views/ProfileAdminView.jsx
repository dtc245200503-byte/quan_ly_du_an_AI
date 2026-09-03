import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { 
  User, 
  ShieldAlert, 
  Key, 
  Plus, 
  X, 
  Save, 
  Users, 
  Camera, 
  Loader2, 
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  UploadCloud
} from 'lucide-react';

export const ProfileAdminView = ({ showToast }) => {
  const { user, updateUserProfile } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('profile');

  // Personal Profile Form
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone_number || '');
  const [jobTitle, setJobTitle] = useState(user?.job_title || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [skills, setSkills] = useState(user?.skills || []);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // File Input Ref
  const fileInputRef = useRef(null);

  // Change Password Form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  // Admin User List
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setEmail(user.email || '');
      setPhone(user.phone_number || '');
      setJobTitle(user.job_title || '');
      setBio(user.bio || '');
      setAvatarUrl(user.avatar_url || '');
      setSkills(user.skills || []);
    }
  }, [user]);

  const fetchAllUsers = async () => {
    if (user?.role !== 'Admin') return;
    setLoadingUsers(true);
    try {
      const res = await api.get('/api/users/');
      setAllUsers(res.data);
    } catch (err) {
      showToast("Lỗi khi tải danh sách người dùng", "error");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'admin') {
      fetchAllUsers();
    }
  }, [activeSubTab]);

  // Handle Direct Avatar Upload from PC/Phone
  const handleAvatarFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      showToast("Vui lòng chọn tệp hình ảnh định dạng .jpg, .png hoặc .webp", "error");
      return;
    }

    setUploadingAvatar(true);

    // Instant Client-Side Base64 Reader Preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarUrl(event.target.result);
    };
    reader.readAsDataURL(file);

    // Upload to Backend API
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/api/users/upload-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAvatarUrl(res.data.avatar_url);
      updateUserProfile(res.data.user);
      showToast("Đã tải ảnh đại diện lên thành công!", "success");
    } catch (err) {
      showToast("Không thể tải ảnh lên máy chủ, đã dùng bản xem trước", "info");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.put(`/api/users/${user.id}`, {
        full_name: fullName,
        email,
        phone_number: phone,
        job_title: jobTitle,
        bio,
        avatar_url: avatarUrl,
        skills
      });
      updateUserProfile(res.data);
      showToast("Cập nhật hồ sơ cá nhân thành công!", "success");
    } catch (err) {
      showToast(err.response?.data?.detail || "Lỗi khi cập nhật hồ sơ", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangingPwd(true);
    try {
      await api.post('/api/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword
      });
      showToast("Đổi mật khẩu thành công!", "success");
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      showToast(err.response?.data?.detail || "Không thể đổi mật khẩu", "error");
    } finally {
      setChangingPwd(false);
    }
  };

  const handleAddSkill = () => {
    if (!newSkillInput.trim()) return;
    if (!skills.includes(newSkillInput.trim())) {
      setSkills([...skills, newSkillInput.trim()]);
    }
    setNewSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  const handleUserRoleChange = async (targetUserId, newRole) => {
    try {
      await api.patch(`/api/users/${targetUserId}/role`, { role: newRole });
      showToast("Cập nhật vai trò người dùng thành công", "success");
      fetchAllUsers();
    } catch (err) {
      showToast("Lỗi khi thay đổi vai trò", "error");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-zinc-100">
      {/* Sub Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
        <button
          onClick={() => setActiveSubTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'profile'
              ? 'bg-red-600 text-white shadow-lg shadow-red-900/40'
              : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800'
          }`}
        >
          <User className="w-4 h-4" />
          Hồ Sơ Cá Nhân
        </button>

        {user?.role === 'Admin' && (
          <button
            onClick={() => setActiveSubTab('admin')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'admin'
                ? 'bg-red-600 text-white shadow-lg shadow-red-900/40'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            Quản Trị Hệ Thống (Admin)
          </button>
        )}
      </div>

      {/* Sub Tab 1: Personal Profile */}
      {activeSubTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Form */}
          <div className="lg:col-span-2 bg-[#18181B] p-6 rounded-2xl border border-white/10 shadow-2xl space-y-6">
            <h3 className="text-base font-extrabold text-white border-b border-zinc-800 pb-3">
              Thông Tin Cá Nhân & Kỹ Năng
            </h3>

            {/* AVATAR UPLOAD COMPONENT - Direct File Upload from PC/Phone */}
            <div className="p-4 bg-zinc-900/80 rounded-xl border border-zinc-800 flex flex-col sm:flex-row items-center gap-5">
              {/* Circular Avatar Preview */}
              <div className="relative group flex-shrink-0">
                <img
                  src={avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
                  alt="Avatar Preview"
                  className="w-24 h-24 rounded-full object-cover border-2 border-red-600 shadow-xl shadow-red-900/30"
                />
                
                {/* Upload Trigger Overlay */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                >
                  <Camera className="w-6 h-6 mb-1 text-red-500" />
                  <span className="text-[10px] font-bold">Đổi ảnh</span>
                </div>

                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/75 rounded-full flex items-center justify-center text-red-500">
                    <Loader2 className="w-7 h-7 animate-spin" />
                  </div>
                )}
              </div>

              {/* Upload Action Details */}
              <div className="space-y-2 text-center sm:text-left flex-1">
                <span className="text-xs font-bold text-zinc-200 block">Ảnh đại diện tài khoản</span>
                <p className="text-[11px] text-zinc-400">
                  Hỗ trợ định dạng file <strong className="text-red-400">.jpg, .png, .webp</strong> từ máy tính hoặc điện thoại của bạn.
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarFileSelect}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="px-3.5 py-1.5 bg-red-600/20 hover:bg-red-600 border border-red-500/40 text-red-400 hover:text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{uploadingAvatar ? 'Đang tải lên...' : 'Chọn ảnh từ máy (This PC / Mobile)'}</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Họ và tên</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-white focus:ring-2 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Chức danh / Vị trí</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Ví dụ: Senior Fullstack Developer"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-white focus:ring-2 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Email liên hệ</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-white focus:ring-2 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-white focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Giới thiệu bản thân (Bio)</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Giới thiệu kinh nghiệm và năng lực làm việc..."
                  className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-white focus:ring-2 focus:ring-red-600"
                />
              </div>

              {/* Skills Tags Manager */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Kỹ năng làm việc (dùng cho AI Gợi Ý Phân Công)</label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    placeholder="Nhập tên kỹ năng (Ví dụ: Python, React, FastAPI, Docker)..."
                    className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-white focus:ring-2 focus:ring-red-600"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    + Thêm
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 p-3 bg-zinc-900 border border-zinc-800 rounded-xl min-h-[48px]">
                  {skills.length === 0 ? (
                    <span className="text-xs text-zinc-500 italic">Chưa thêm kỹ năng nào.</span>
                  ) : (
                    skills.map((s, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-red-950/60 text-red-400 border border-red-800/60 px-2.5 py-1 rounded-full text-xs font-bold">
                        {s}
                        <button type="button" onClick={() => handleRemoveSkill(s)} className="hover:text-white">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow-lg shadow-red-900/40 flex items-center gap-1.5 hover:-translate-y-0.5 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {savingProfile ? 'Đang lưu...' : 'Lưu Thay Đổi Hồ Sơ'}
                </button>
              </div>
            </form>
          </div>

          {/* Side: Password Change Box */}
          <div className="bg-[#18181B] p-6 rounded-2xl border border-white/10 shadow-2xl space-y-4 self-start">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Key className="w-4 h-4 text-red-500" />
              Đổi Mật Khẩu
            </h3>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Mật khẩu hiện tại</label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-white focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Mật khẩu mới</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-white focus:ring-2 focus:ring-red-600"
                />
              </div>

              <button
                type="submit"
                disabled={changingPwd}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-lg border border-zinc-700 transition-colors"
              >
                {changingPwd ? 'Đang cập nhật...' : 'Xác Nhận Đổi Mật Khẩu'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Sub Tab 2: Admin Users Management */}
      {activeSubTab === 'admin' && user?.role === 'Admin' && (
        <div className="bg-[#18181B] rounded-2xl border border-white/10 shadow-2xl overflow-hidden space-y-4 p-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-red-500" />
                Quản Lý Tài Khoản Người Dùng ({allUsers.length})
              </h3>
              <p className="text-xs text-zinc-400">Admin phân quyền vai trò (Admin, PM, Member) và theo dõi tài khoản hệ thống.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-900 text-[11px] font-bold text-zinc-400 uppercase border-b border-zinc-800">
                  <th className="p-3">Họ và tên</th>
                  <th className="p-3">Liên hệ</th>
                  <th className="p-3">Chức danh</th>
                  <th className="p-3">Vai trò hệ thống</th>
                  <th className="p-3 text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-xs font-medium">
                {allUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={u.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
                          alt={u.full_name}
                          className="w-8 h-8 rounded-full object-cover border border-zinc-700"
                        />
                        <span className="font-bold text-zinc-100">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-zinc-400">
                      <div className="space-y-0.5">
                        {u.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3 text-zinc-500" /> {u.email}</div>}
                        {u.phone_number && <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-zinc-500" /> {u.phone_number}</div>}
                      </div>
                    </td>
                    <td className="p-3 text-zinc-400">{u.job_title || 'Thành viên'}</td>
                    <td className="p-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleUserRoleChange(u.id, e.target.value)}
                        className="bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs font-bold text-zinc-200"
                      >
                        <option value="Member">Member</option>
                        <option value="PM">PM (Project Manager)</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-1 rounded border border-emerald-800/60">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
