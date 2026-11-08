import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, LogIn, MailCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ApiError, authApi } from '../../services/api';
import AuthLayout, { authErrorMessage, EMAIL_PATTERN } from './AuthLayout';
import GoogleSignInButton from './GoogleSignInButton';

interface LoginProps {
  /** Called after a successful login. */
  onSuccess: () => void;
  onSwitchToRegister: () => void;
  onForgotPassword: () => void;
  notice?: string;
}

/** Identity answers a correct password on an unverified account with 403 "EMAIL_NOT_VERIFIED". */
const isEmailNotVerified = (err: unknown) =>
  err instanceof ApiError && err.status === 403 && (err.code === 'EMAIL_NOT_VERIFIED' || err.message.includes('EMAIL_NOT_VERIFIED'));

/** Identity issues at most one verification email per minute per account (later requests are silently skipped). */
const RESEND_COOLDOWN_MS = 60_000;

export default function Login({ onSuccess, onSwitchToRegister, onForgotPassword, notice }: LoginProps) {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /** Email of the last login that failed with EMAIL_NOT_VERIFIED: offers "Gửi lại email xác minh". */
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resend, setResend] = useState<{ state: 'idle' | 'sending' | 'sent' | 'error'; message?: string }>({ state: 'idle' });
  const [resendLocked, setResendLocked] = useState(false);

  useEffect(() => {
    if (!resendLocked) return;
    const timer = setTimeout(() => setResendLocked(false), RESEND_COOLDOWN_MS);
    return () => clearTimeout(timer);
  }, [resendLocked]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (!EMAIL_PATTERN.test(email.trim())) nextErrors.email = 'Vui lòng nhập email hợp lệ.';
    if (!password) nextErrors.password = 'Vui lòng nhập mật khẩu.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setFormError(null);
    setUnverifiedEmail(null);
    setResend({ state: 'idle' });
    try {
      await login(email, password);
      setPassword('');
      onSuccess();
    } catch (err) {
      // An unverified account gets its own notice with the resend action instead of the generic error.
      if (isEmailNotVerified(err)) setUnverifiedEmail(email.trim());
      else setFormError(authErrorMessage(err, 'login'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    setResend({ state: 'sending' });
    try {
      await authApi.requestEmailVerification(unverifiedEmail);
      setResend({ state: 'sent' });
      setResendLocked(true);
    } catch (err) {
      setResend({ state: 'error', message: authErrorMessage(err, 'email-request') });
    }
  };

  const handleGoogleIdToken = async (idToken: string) => {
    if (submitting) return;
    setSubmitting(true);
    setFormError(null);
    setUnverifiedEmail(null);
    try {
      await loginWithGoogle(idToken);
      onSuccess();
    } catch (err) {
      setFormError(authErrorMessage(err, 'google'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Đăng nhập" subtitle="Chào mừng bạn quay lại MoonCake Marketplace." notice={notice}>
      <form onSubmit={handleSubmit} className="mss-stack" noValidate>
        {formError && <div className="mss-alert mss-alert--danger" role="alert">{formError}</div>}

        {unverifiedEmail && (
          <div className="mss-alert mss-alert--warning mss-stack" role="alert">
            <p className="m-0">
              Email <b>{unverifiedEmail}</b> chưa được xác minh. Mở liên kết trong email xác minh trước khi đăng nhập,
              hoặc gửi lại email nếu bạn chưa nhận được hay liên kết đã hết hạn.
            </p>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resend.state === 'sending' || resendLocked}
              className="mss-button mss-button--secondary mss-button--sm self-start"
            >
              <MailCheck className="w-4 h-4" />
              {resend.state === 'sending' ? 'Đang gửi…' : 'Gửi lại email xác minh'}
            </button>
            {resend.state === 'sent' && (
              <p className="m-0">
                Đã gửi lại email xác minh. Kiểm tra hộp thư (kể cả thư mục spam). Bạn có thể gửi lại sau 1 phút nếu vẫn chưa nhận được.
              </p>
            )}
            {resend.state === 'error' && <p className="m-0 text-red-700">{resend.message}</p>}
          </div>
        )}

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

        <div className="flex justify-end -mt-1">
          <button type="button" onClick={onForgotPassword} className="text-sm font-semibold text-primary-700 hover:underline">
            Quên mật khẩu?
          </button>
        </div>

        <button type="submit" className="mss-button mss-button--primary mss-button--full" disabled={submitting}>
          <LogIn className="w-4 h-4" />
          {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>

        <GoogleSignInButton onIdToken={handleGoogleIdToken} />

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
