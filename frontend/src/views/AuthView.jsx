import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Phone, Lock, User, ShieldCheck, ArrowRight, KeyRound, CheckCircle2, Sparkles, Cpu, Bot, Zap } from 'lucide-react';
import api from '../api';

export const AuthView = ({ showToast }) => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [registrationMethod, setRegistrationMethod] = useState('email');
  const [deliveryEmail, setDeliveryEmail] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('Member');
  const [loading, setLoading] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotStep, setForgotStep] = useState(1);
  const [registerOtp, setRegisterOtp] = useState('');
  const [registerPending, setRegisterPending] = useState(false);
  const [registerWait, setRegisterWait] = useState(0);
  const [forgotWait, setForgotWait] = useState(0);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const errorMessage = (err) => typeof err.response?.data?.detail === 'string' ? err.response.data.detail : 'Không thể kết nối. Vui lòng kiểm tra thông tin và thử lại.';
  useEffect(() => {
    const timer = setInterval(() => {
      setRegisterWait(v => Math.max(0, v - 1));
      setForgotWait(v => Math.max(0, v - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);
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
    const nodeCount = Math.floor(Math.min(width, height) / 14);
    const nodes = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      radius: Math.random() * 2 + 1,
      color: Math.random() > 0.5 ? '#DC2626' : '#2563EB',
    }));

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Light Slate base gradient
      const gradient = ctx.createRadialGradient(width / 2, height / 2, 100, width / 2, height / 2, Math.max(width, height));
      gradient.addColorStop(0, '#FFFFFF');
      gradient.addColorStop(0.6, '#F8FAFC');
      gradient.addColorStop(1, '#F1F5F9');
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
            const alpha = (1 - dist / 140) * 0.2;
            ctx.strokeStyle = nodes[i].color === '#DC2626'
              ? `rgba(220, 38, 38, ${alpha})`
              : `rgba(37, 99, 235, ${alpha})`;
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
        ctx.shadowBlur = 6;
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
        if (registerPending) {
          const res = await api.post('/api/auth/register/verify', { identifier: pendingEmail, token_or_otp: registerOtp });
          setRegisterPending(false); setRegisterOtp(''); setIsRegister(false); setPassword('');
          showToast(res.data.message, 'success');
        } else {
          if (registrationMethod === 'phone' && !isPhone(identifier)) {
            showToast('Vui lòng nhập số điện thoại đăng nhập hợp lệ', 'error');
            return;
          }
          const res = await register(identifier, password, fullName, role,
            registrationMethod === 'phone' ? deliveryEmail : undefined);
          setPendingEmail(res.registration_email);
          setRegisterPending(true); setRegisterWait(res.resend_after); setPassword('');
          showToast(res.message, 'success');
        }
      } else {
        await login(identifier, password);
        showToast("Đăng nhập thành công!", "success");
      }
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  };

  const resendRegistration = async () => {
    setLoading(true);
    try {
      const res = await api.post('/api/auth/register/resend', { identifier: pendingEmail });
      setRegisterWait(res.data.resend_after); showToast(res.data.message, 'success');
    } catch (err) { showToast(errorMessage(err), 'error'); }
    finally { setLoading(false); }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const res = await api.post('/api/auth/forgot-password', { identifier: forgotIdentifier });
      setForgotStep(2); setForgotWait(res.data.resend_after); setOtpInput(''); setResetToken('');
      showToast(res.data.message, 'info');
    } catch (err) { showToast(errorMessage(err), 'error'); }
    finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (forgotStep === 2) {
        const res = await api.post('/api/auth/reset-password/verify', { identifier: forgotIdentifier, token_or_otp: otpInput });
        setResetToken(res.data.reset_token); setOtpInput(''); setForgotStep(3);
      } else {
        if (newPasswordInput !== confirmPassword) { showToast('Xác nhận mật khẩu không khớp', 'error'); return; }
        const res = await api.post('/api/auth/reset-password', {
          identifier: forgotIdentifier, token_or_otp: resetToken,
          new_password: newPasswordInput, confirm_password: confirmPassword
        });
        showToast(res.data.message, 'success'); setShowForgotModal(false); setForgotStep(1);
        setIdentifier(forgotIdentifier); setPassword(''); setNewPasswordInput(''); setConfirmPassword(''); setResetToken('');
      }
    } catch (err) { showToast(errorMessage(err), 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 md:p-6 overflow-hidden bg-slate-50">
      {/* Background Interactive Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

      {/* Main Login Card Container - Light Corporate Glass Style */}
      <div className="relative z-10 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-w-4xl w-full grid grid-cols-1 md:grid-cols-2">

        {/* Left Banner: Technology Dynamic Illustration */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-8 text-white flex flex-col justify-between relative overflow-hidden border-b md:border-b-0 md:border-r border-slate-800">
          {/* Subtle Red & Blue Ambient Glow */}
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Logo */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-red-600 to-red-500 text-white font-black flex items-center justify-center text-xl shadow-md shadow-red-600/30">
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

            <h2 className="text-xl md:text-2xl font-black text-white mb-2 leading-tight tracking-tight">
              Kiến tạo tương lai quản trị dự án thông minh
            </h2>
            <p className="text-slate-300 text-xs leading-relaxed">
              Nền tảng tích hợp trí tuệ nhân tạo AI tóm tắt tiến độ, tự động hóa phân công công việc và quản lý Sprint chuẩn Light Corporate Theme.
            </p>
          </div>

          {/* Center AI Animation */}
          <div className="my-6 relative z-10 flex items-center justify-center">
            <div className="relative w-44 h-44 flex items-center justify-center">
              {/* Outer Orbit Ring 1 */}
              <div className="absolute inset-0 border-2 border-dashed border-red-500/40 rounded-full animate-[spin_12s_linear_infinite]" />

              {/* Middle Orbit Ring 2 */}
              <div className="absolute inset-3 border border-blue-500/50 rounded-full animate-[spin_8s_linear_infinite_reverse]" />

              {/* Glowing Core Sphere */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-red-600 via-red-500 to-blue-600 flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.5)] animate-pulse">
                <Cpu className="w-10 h-10 text-white animate-bounce" />
              </div>

              {/* Orbiting Satellite Nodes */}
              <div className="absolute top-2 left-6 p-1.5 bg-slate-900 border border-red-500/60 rounded-lg text-red-400 shadow-md">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="absolute bottom-3 right-5 p-1.5 bg-slate-900 border border-blue-500/60 rounded-lg text-blue-400 shadow-md">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="absolute top-1/2 -right-2 p-1.5 bg-slate-900 border border-slate-700 rounded-lg text-emerald-400 shadow-md">
                <Zap className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Bottom Feature Badges */}
          <div className="space-y-2 relative z-10 bg-white/10 p-3.5 rounded-xl border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Bảo mật JWT Bearer & Phân quyền Admin</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>Bảng Kanban Light Theme kéo thả</span>
            </div>
          </div>

          <div className="mt-4 text-[10px] text-slate-400 relative z-10 text-center">
            © 2026 G9 Technology System. Professional Light Corporate.
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="p-8 flex flex-col justify-center bg-white text-slate-900">
          <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-3">
            <h2 className="text-lg font-extrabold text-slate-900">
              {isRegister ? 'Tạo Tài Khoản Mới' : 'Đăng Nhập System'}
            </h2>
            <button
              disabled={loading} onClick={() => { setIsRegister(!isRegister); setRegisterPending(false); setPassword(''); setRegisterOtp(''); }}
              className="text-xs text-red-600 font-bold hover:underline"
            >
              {isRegister ? 'Đã có tài khoản? Đăng nhập' : 'Tạo tài khoản mới'}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {registerPending && <div className="space-y-3 text-xs text-slate-700" aria-live="polite">
              <p className="break-words">Nhập mã OTP 6 số đã gửi đến {pendingEmail}. Mã có thời hạn; kiểm tra cả thư rác.</p>
              <input aria-label="Mã OTP đăng ký" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={registerOtp} onChange={e => setRegisterOtp(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-center tracking-widest focus:ring-2 focus:ring-red-600" />
              <button type="button" disabled={loading || registerWait > 0} onClick={resendRegistration} className="text-red-600 font-bold disabled:opacity-50">{registerWait ? `Gửi lại sau ${registerWait}s` : 'Gửi lại mã'}</button>
              <button type="button" disabled={loading} onClick={() => { setRegisterPending(false); setRegisterOtp(''); }} className="ml-3 text-slate-500">Nhập lại thông tin</button>
            </div>}
            {isRegister && !registerPending && (
              <div>
                <label htmlFor="registration-method" className="block text-xs font-bold text-slate-700 mb-1">Đăng ký bằng</label>
                <select id="registration-method" value={registrationMethod} disabled={loading}
                  onChange={e => { setRegistrationMethod(e.target.value); setIdentifier(''); setDeliveryEmail(''); }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-red-600">
                  <option value="email">Email</option>
                  <option value="phone">Số điện thoại (xác minh qua email)</option>
                </select>
              </div>
            )}
            {isRegister && !registerPending && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Họ và tên</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn Thanh"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all"
                  />
                </div>
              </div>
            )}

            <div hidden={registerPending}>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">{isRegister ? (registrationMethod === 'phone' ? 'Số điện thoại đăng nhập' : 'Email đăng nhập và nhận OTP') : 'Email hoặc Số điện thoại'}</label>
                {identifier && (
                  <span className="text-[10px] text-red-600 font-bold uppercase bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                    {isPhone(identifier) ? 'SĐT' : 'Email'}
                  </span>
                )}
              </div>
              <div className="relative">
                {isPhone(identifier) ? (
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                ) : (
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                )}
                <input
                  type={isRegister ? (registrationMethod === 'phone' ? 'tel' : 'email') : 'text'}
                  disabled={registerPending || loading}
                  required={!registerPending}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={isRegister ? (registrationMethod === 'phone' ? 'Ví dụ: 0912345678' : 'Nhập email đăng ký') : 'admin@g9.vn hoặc 0988888888'}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all"
                />
              </div>
            </div>

            {isRegister && !registerPending && registrationMethod === 'phone' && (
              <div>
                <label htmlFor="registration-email" className="block text-xs font-bold text-slate-700 mb-1">Email nhận mã OTP</label>
                <input id="registration-email" type="email" required disabled={loading} value={deliveryEmail}
                  onChange={e => setDeliveryEmail(e.target.value)} placeholder="Nhập email để xác minh tài khoản"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-red-600" />
                <p className="text-[11px] text-slate-500 mt-1">OTP và mã khôi phục được gửi qua email này. Sau xác minh, bạn có thể đăng nhập bằng số điện thoại hoặc email.</p>
              </div>
            )}
            <div hidden={registerPending}>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">Mật khẩu</label>
                {!isRegister && (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotIdentifier(isPhone(identifier) ? '' : identifier); setForgotStep(1); setOtpInput(''); setResetToken(''); setNewPasswordInput(''); setConfirmPassword('');
                      setShowForgotModal(true);
                    }}
                    className="text-[11px] text-slate-500 hover:text-red-600 font-medium transition-colors"
                  >
                    Quên mật khẩu?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? "text" : "password"}
                  disabled={registerPending || loading}
                  minLength={isRegister ? 8 : undefined}
                  required={!registerPending}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete={isRegister ? "new-password" : "current-password"}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all"
                />
              </div>
            </div>

            {!registerPending && <button type="button" onClick={() => setShowPassword(v => !v)} className="text-xs text-slate-500">{showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</button>}
            {isRegister && !registerPending && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Vai trò</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-red-600"
                >
                  <option value="Member">Thành viên (Member)</option>
                  <option value="PM">Quản lý dự án (PM)</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs shadow-md shadow-red-600/20 hover:-translate-y-0.5 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span>Đang xử lý...</span>
              ) : (
                <>
                  <span>{isRegister ? (registerPending ? 'Xác minh và hoàn tất đăng ký' : 'Gửi mã xác minh email') : 'Đăng Nhập Ngay'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {import.meta.env.DEV && !isRegister && (
            <section aria-label="Tài khoản demo — Đăng nhập nhanh" className="mt-6 pt-4 border-t border-slate-200">
              <h3 className="text-xs font-bold text-slate-700 mb-2">Tài khoản demo — Đăng nhập nhanh</h3>
              <p className="text-[11px] text-slate-500 mb-3">Chọn tài khoản để điền thông tin, sau đó nhấn Đăng Nhập Ngay.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { email: 'admin@g9.vn', role: 'Admin' },
                  { email: 'pm@g9.vn', role: 'PM' },
                  { email: 'dev1@g9.vn', role: 'Member' },
                ].map(account => (
                  <button
                    key={account.email}
                    type="button"
                    disabled={loading}
                    onClick={() => { setIdentifier(account.email); setPassword('123456'); }}
                    className="min-w-0 px-2 py-2 bg-slate-50 hover:bg-red-50 border border-slate-300 hover:border-red-300 rounded-lg text-slate-700 transition-colors disabled:opacity-50"
                  >
                    <span className="block text-xs font-bold">{account.role}</span>
                    <span className="block text-[10px] break-all mt-1">{account.email}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-900 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-red-600" />
              Khôi Phục Mật Khẩu
            </h3>
            <p className="text-xs text-slate-500">
              {forgotStep === 1
                ? 'Nhập email để nhận mã xác minh OTP đặt lại mật khẩu.'
                : forgotStep === 2 ? 'Nếu email đã đăng ký, mã OTP sẽ được gửi đến hộp thư. Kiểm tra cả thư rác.' : 'Email đã được xác minh. Nhập mật khẩu mới.'}
            </p>

            {forgotStep === 1 ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="Nhập email..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-red-600"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                  >
                    Quay lại đăng nhập
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-md shadow-red-600/20"
                  >
                    {loading ? 'Đang gửi...' : 'Gửi Mã OTP'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {forgotStep === 2 && <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mã OTP xác thực</label>
                  <input
                    type="text"
                    required
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    placeholder="Nhập 6 chữ số" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold tracking-widest text-center text-slate-900 focus:ring-2 focus:ring-red-600"
                  />
                </div>}
                {forgotStep === 3 && <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mật khẩu mới</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    minLength={8}
                    required
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Nhập mật khẩu mới..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-red-600"
                  />
                </div>}
                {forgotStep === 3 && <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">Xác nhận mật khẩu mới</label>
                  <input aria-label="Xác nhận mật khẩu mới" type={showPassword ? 'text' : 'password'} required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600" />
                  <button type="button" className="text-xs text-slate-500" onClick={() => setShowPassword(v => !v)}>{showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</button>
                </div>}
                {forgotStep === 2 && <button type="button" disabled={loading || forgotWait > 0} onClick={handleSendOtp} className="text-xs text-red-600 disabled:opacity-50">{forgotWait ? `Gửi lại sau ${forgotWait}s` : 'Gửi lại mã'}</button>}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowForgotModal(false); setResetToken(''); setNewPasswordInput(''); setConfirmPassword(''); }}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                  >
                    Quay lại đăng nhập
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-md shadow-red-600/20"
                  >
                    {loading ? 'Đang xử lý...' : forgotStep === 2 ? 'Xác minh OTP' : 'Xác Nhận Đổi Mật Khẩu'}
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
