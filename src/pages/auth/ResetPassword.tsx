import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { ApiError, authApi } from '../../services/api';
import AuthLayout, { authErrorMessage } from './AuthLayout';

interface ResetPasswordProps {
  /** `token` query param of the email link `${APP_FRONTEND_URL}/reset-password?token=…`. */
  token: string;
  onLogin: () => void;
  onRequestNewLink: () => void;
}

/** POST /api/auth/password-resets: 204 on success, 401 when the token is invalid, expired or already used. */
export default function ResetPassword({ token, onLogin, onRequestNewLink }: ResetPasswordProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(
    token ? null : 'Liên kết đặt lại mật khẩu thiếu mã xác thực. Hãy mở lại liên kết trong email hoặc yêu cầu liên kết mới.'
  );
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Same rules as Register (Identity PasswordResetRequest: 6–100 characters).
    const nextErrors: typeof errors = {};
    if (password.length < 6 || password.length > 100) nextErrors.password = 'Mật khẩu cần từ 6 đến 100 ký tự.';
    if (confirmPassword !== password) nextErrors.confirmPassword = 'Mật khẩu nhập lại không khớp.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await authApi.resetPassword({ token, newPassword: password });
      setPassword('');
      setConfirmPassword('');
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setLinkError(authErrorMessage(err, 'password-reset'));
      else setFormError(authErrorMessage(err, 'password-reset'));
    } finally {
      setSubmitting(false);
    }
  };

  const subtitle = 'Tạo mật khẩu mới cho tài khoản MoonCake Marketplace.';

  if (done) {
    return (
      <AuthLayout title="Đặt lại mật khẩu" subtitle={subtitle}>
        <div className="mss-stack">
          <p className="mss-alert m-0" role="status">Đã đặt lại mật khẩu. Hãy đăng nhập bằng mật khẩu mới.</p>
          <button type="button" className="mss-button mss-button--primary" onClick={onLogin}>Đi tới đăng nhập</button>
        </div>
      </AuthLayout>
    );
  }

  if (linkError) {
    return (
      <AuthLayout title="Đặt lại mật khẩu" subtitle={subtitle}>
        <div className="mss-stack">
          <p className="mss-alert mss-alert--danger m-0" role="alert">{linkError}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="mss-button mss-button--primary" onClick={onRequestNewLink}>Yêu cầu liên kết mới</button>
            <button type="button" className="mss-button mss-button--secondary" onClick={onLogin}>Quay lại đăng nhập</button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Đặt lại mật khẩu" subtitle={subtitle}>
      <form onSubmit={handleSubmit} className="mss-stack" noValidate>
        {formError && <div className="mss-alert mss-alert--danger" role="alert">{formError}</div>}

        <label className="mss-field">
          Mật khẩu mới
          <input
            type="password"
            className="mss-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            aria-invalid={!!errors.password}
          />
          {errors.password && <span className="mss-field-error">{errors.password}</span>}
        </label>

        <label className="mss-field">
          Nhập lại mật khẩu mới
          <input
            type="password"
            className="mss-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
          />
          {errors.confirmPassword && <span className="mss-field-error">{errors.confirmPassword}</span>}
        </label>

        <button type="submit" className="mss-button mss-button--primary mss-button--full" disabled={submitting}>
          <KeyRound className="w-4 h-4" />
          {submitting ? 'Đang lưu…' : 'Đặt mật khẩu mới'}
        </button>
      </form>
    </AuthLayout>
  );
}
