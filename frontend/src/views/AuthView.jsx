import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Phone, Lock, User, ShieldCheck, ArrowRight, KeyRound, CheckCircle2, Sparkles, Cpu, Bot, Zap } from 'lucide-react';
import api from '../api';

export const AuthView = ({ showToast }) => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [identifier, setIdentifier] = useState('admin@g9.vn');
  const [password, setPassword] = useState('admin123');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('Member');
  const [loading, setLoading] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotStep, setForgotStep] = useState(1);
  const [demoOtp, setDemoOtp] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Interactive AI Background Particle Canvas Ref
  const canvasRef = useRef(null);

  // Set document title
  useEffect(() => {
    document.title = "G9 - Quản Lý Dự Án | Đăng Nhập";
  }, []);

  // Canvas AI Node Mesh Particle Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Generate AI nodes
    const nodeCount = Math.floor(Math.min(width, height) / 12);
    const nodes = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      radius: Math.random() * 2 + 1,
      color: Math.random() > 0.5 ? '#E50914' : '#3B82F6',
    }));

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Deep obsidian base with radial glow gradient
      const gradient = ctx.createRadialGradient(width / 2, height / 2, 100, width / 2, height / 2, Math.max(width, height));
      gradient.addColorStop(0, '#0f0f13');
      gradient.addColorStop(0.6, '#09090b');
      gradient.addColorStop(1, '#030305');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw mesh connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 140) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            const alpha = (1 - dist / 140) * 0.25;
            ctx.strokeStyle = nodes[i].color === '#E50914' 
              ? `rgba(229, 9, 20, ${alpha})` 
              : `rgba(59, 130, 246, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Update & render nodes
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = n.color;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const isPhone = (val) => /^[0-9+-\s()]+$/.test(val) && val.replace(/\D/g, '').length >= 8;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        if (!fullName.trim()) {
          showToast("Vui lòng nhập họ và tên", "error");
          setLoading(false);
          return;
        }
        await register(identifier, password, fullName, role);
        showToast("Đăng ký tài khoản thành công!", "success");
      } else {
        await login(identifier, password);
        showToast("Đăng nhập thành công!", "success");
      }
    } catch (err) {
      showToast(err.response?.data?.detail || "Đã xảy ra lỗi xác thực", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      showToast("Vui lòng nhập Email hoặc SĐT", "error");
      return;
    }
    try {
      const res = await api.post('/api/auth/forgot-password', { identifier: forgotIdentifier });
      setDemoOtp(res.data.demo_otp || "889966");
      setForgotStep(2);
      showToast(res.data.message, "info");
    } catch (err) {
      showToast(err.response?.data?.detail || "Không thể gửi mã khôi phục", "error");
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/auth/reset-password', {
        identifier: forgotIdentifier,
        token_or_otp: otpInput,
        new_password: newPasswordInput
      });
      showToast(res.data.message, "success");
      setShowForgotModal(false);
      setForgotStep(1);
      setIdentifier(forgotIdentifier);
      setPassword(newPasswordInput);
    } catch (err) {
      showToast(err.response?.data?.detail || "Không thể đặt lại mật khẩu", "error");
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 md:p-6 overflow-hidden bg-[#09090B]">
      {/* Background Interactive Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

      {/* Main Login Card Container - Netflix Obsidian Glass Style */}
      <div className="relative z-10 bg-[#18181B]/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden max-w-4xl w-full grid grid-cols-1 md:grid-cols-2">
        
        {/* Left Banner: 3D AI Technology Dynamic Illustration */}
        <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-8 text-white flex flex-col justify-between relative overflow-hidden border-b md:border-b-0 md:border-r border-white/10">
          {/* Subtle Ambient Red Glow */}
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Logo */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-red-600 to-red-500 text-white font-black flex items-center justify-center text-xl shadow-lg shadow-red-600/30">
                G9
              </div>
              <div>
                <h1 className="font-extrabold text-base leading-none text-white tracking-wide">
                  G9 - Quản Lý Dự Án
                </h1>
                <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest">
                  Enterprise AI Engine v5
                </span>
              </div>
            </div>

            <h2 className="text-xl md:text-2xl font-black text-zinc-100 mb-2 leading-tight tracking-tight">
              Kiến tạo tương lai quản trị dự án thông minh
            </h2>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Nền tảng tích hợp trí tuệ nhân tạo AI tóm tắt tiến độ, tự động hóa phân công công việc và quản lý Sprint chuẩn Netflix.
            </p>
          </div>

          {/* Center 3D AI Holographic Interactive Animation */}
          <div className="my-6 relative z-10 flex items-center justify-center">
            <div className="relative w-44 h-44 flex items-center justify-center">
              {/* Outer Orbit Ring 1 */}
              <div className="absolute inset-0 border-2 border-dashed border-red-500/40 rounded-full animate-[spin_12s_linear_infinite]" />
              
              {/* Middle Orbit Ring 2 */}
              <div className="absolute inset-3 border border-blue-500/50 rounded-full animate-[spin_8s_linear_infinite_reverse]" />

              {/* Glowing Core Sphere */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-red-600 via-red-500 to-blue-600 flex items-center justify-center shadow-[0_0_30px_rgba(229,9,20,0.6)] animate-pulse">
                <Cpu className="w-10 h-10 text-white animate-bounce" />
              </div>

              {/* Orbiting Satellite Nodes */}
              <div className="absolute top-2 left-6 p-1.5 bg-zinc-900 border border-red-500/60 rounded-lg text-red-400 shadow-md">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="absolute bottom-3 right-5 p-1.5 bg-zinc-900 border border-blue-500/60 rounded-lg text-blue-400 shadow-md">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="absolute top-1/2 -right-2 p-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-emerald-400 shadow-md">
                <Zap className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Bottom Feature Badges */}
          <div className="space-y-2 relative z-10 bg-zinc-900/60 p-3.5 rounded-xl border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Bảo mật JWT Bearer & Phân quyền Admin</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>Bảng Kanban Dark Theme kéo thả</span>
            </div>
          </div>

          <div className="mt-4 text-[10px] text-zinc-500 relative z-10 text-center">
            © 2026 G9 Technology System. Premium Dark Experience.
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="p-8 flex flex-col justify-center bg-[#18181B]">
          <div className="flex items-center justify-between mb-6 border-b border-zinc-800 pb-3">
            <h2 className="text-lg font-extrabold text-white">
              {isRegister ? 'Tạo Tài Khoản Mới' : 'Đăng Nhập System'}
            </h2>
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-xs text-red-500 font-bold hover:underline"
            >
              {isRegister ? 'Đã có tài khoản? Đăng nhập' : 'Tạo tài khoản mới'}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Họ và tên</label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn Thanh"
                    className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-white placeholder-zinc-500 focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-zinc-300">Email hoặc Số điện thoại</label>
                {identifier && (
                  <span className="text-[10px] text-red-400 font-bold uppercase bg-red-950/60 border border-red-800/50 px-1.5 py-0.5 rounded">
                    {isPhone(identifier) ? 'SĐT' : 'Email'}
                  </span>
                )}
              </div>
              <div className="relative">
                {isPhone(identifier) ? (
                  <Phone className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                ) : (
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                )}
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin@g9.vn hoặc 0988888888"
                  className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-white placeholder-zinc-500 focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-zinc-300">Mật khẩu</label>
                {!isRegister && (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotIdentifier(identifier);
                      setShowForgotModal(true);
                    }}
                    className="text-[11px] text-zinc-400 hover:text-red-400 font-medium transition-colors"
                  >
                    Quên mật khẩu?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-white placeholder-zinc-500 focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Vai trò</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-white focus:ring-2 focus:ring-red-600"
                >
                  <option value="Member">Thành viên (Member)</option>
                  <option value="PM">Quản lý dự án (PM)</option>
                  <option value="Admin">Quản trị viên (Admin)</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs shadow-lg shadow-red-900/40 hover:-translate-y-0.5 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span>Đang xử lý...</span>
              ) : (
                <>
                  <span>{isRegister ? 'Tạo Tài Khoản G9' : 'Đăng Nhập Ngay'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Test Buttons */}
          {!isRegister && (
            <div className="mt-6 pt-4 border-t border-zinc-800">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">
                Đăng nhập nhanh (Quick Demo)
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => { setIdentifier('admin@g9.vn'); setPassword('admin123'); }}
                  className="py-1.5 px-2 bg-zinc-900 hover:bg-red-600 hover:text-white border border-zinc-800 rounded text-[11px] font-bold text-zinc-300 transition-colors"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => { setIdentifier('pm@g9.vn'); setPassword('pm123'); }}
                  className="py-1.5 px-2 bg-zinc-900 hover:bg-red-600 hover:text-white border border-zinc-800 rounded text-[11px] font-bold text-zinc-300 transition-colors"
                >
                  PM Lead
                </button>
                <button
                  type="button"
                  onClick={() => { setIdentifier('dev1@g9.vn'); setPassword('dev123'); }}
                  className="py-1.5 px-2 bg-zinc-900 hover:bg-red-600 hover:text-white border border-zinc-800 rounded text-[11px] font-bold text-zinc-300 transition-colors"
                >
                  Dev Member
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#18181B] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-white/10 text-white space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-red-500" />
              Khôi Phục Mật Khẩu
            </h3>
            <p className="text-xs text-zinc-400">
              {forgotStep === 1 
                ? 'Nhập Email hoặc Số điện thoại để nhận mã xác minh OTP đặt lại mật khẩu.' 
                : `Nhập mã OTP đã được gửi đến ${forgotIdentifier}.`}
            </p>

            {forgotStep === 1 ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Email / SĐT</label>
                  <input
                    type="text"
                    required
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="Nhập email hoặc số điện thoại..."
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-white focus:ring-2 focus:ring-red-600"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 rounded-lg font-medium"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-md shadow-red-900/30"
                  >
                    Gửi Mã OTP
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {demoOtp && (
                  <div className="p-2.5 bg-zinc-900 border border-amber-500/40 rounded-lg text-[11px] text-amber-400 font-mono">
                    💡 Mã OTP demo của bạn: <strong className="text-amber-300 font-bold">{demoOtp}</strong>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Mã OTP xác thực</label>
                  <input
                    type="text"
                    required
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    placeholder="889966"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono font-bold tracking-widest text-center text-white focus:ring-2 focus:ring-red-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Mật khẩu mới</label>
                  <input
                    type="password"
                    required
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Nhập mật khẩu mới..."
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-white focus:ring-2 focus:ring-red-600"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 rounded-lg font-medium"
                  >
                    Quay lại
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-md shadow-red-900/30"
                  >
                    Xác Nhận Đổi Mật Khẩu
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
