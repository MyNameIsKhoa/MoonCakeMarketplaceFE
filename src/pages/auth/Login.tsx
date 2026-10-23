import React, { useState } from 'react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AuthLayout, { authErrorMessage, EMAIL_PATTERN } from './AuthLayout';

interface LoginProps {
  /** Called after a successful login. */
  onSuccess: () => void;
  onSwitchToRegister: () => void;
  notice?: string;
}

export default function Login({ onSuccess, onSwitchToRegister, notice }: LoginProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (!EMAIL_PATTERN.test(email.trim())) nextErrors.email = 'Vui lòng nhập email hợp lệ.';
    if (!password) nextErrors.password = 'Vui lòng nhập mật khẩu.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await login(email, password);
      setPassword('');
      onSuccess();
    } catch (err) {
      setFormError(authErrorMessage(err, 'login'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Đăng nhập" subtitle="Chào mừng bạn quay lại MoonCake Marketplace." notice={notice}>
      <form onSubmit={handleSubmit} className="mss-stack" noValidate>
        {formError && <div className="mss-alert mss-alert--danger" role="alert">{formError}</div>}

        <label className="mss-field">
          Email
          <input
            type="email"
            className="mss-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            placeholder="ban@email.com"
            aria-invalid={!!errors.email}
          />
          {errors.email && <span className="mss-field-error">{errors.email}</span>}
        </label>

        <label className="mss-field">
          Mật khẩu
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className="mss-input w-full pr-11"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              aria-invalid={!!errors.password}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-800"
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <span className="mss-field-error">{errors.password}</span>}
        </label>

        <button type="submit" className="mss-button mss-button--primary mss-button--full" disabled={submitting}>
          <LogIn className="w-4 h-4" />
          {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>

        <p className="text-sm text-gray-600 text-center">
          Chưa có tài khoản?{' '}
          <button type="button" onClick={onSwitchToRegister} className="font-bold text-primary-700 hover:underline">
            Đăng ký ngay
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}
