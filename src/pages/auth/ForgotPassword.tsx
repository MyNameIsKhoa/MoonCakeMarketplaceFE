import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { authApi } from '../../services/api';
import AuthLayout, { authErrorMessage, EMAIL_PATTERN } from './AuthLayout';

/**
 * POST /api/auth/password-reset-requests. Identity answers 202 for any email and only mails verified, active
 * accounts, so the page always shows the same neutral message (no account enumeration).
 */
export default function ForgotPassword({ onBackToLogin }: { onBackToLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_PATTERN.test(value) || value.length > 255) {
      setEmailError('Vui lòng nhập email hợp lệ.');
      return;
    }
    setEmailError(null);
    setFormError(null);
    setSubmitting(true);
    try {
      await authApi.requestPasswordReset(value);
      setSentTo(value);
    } catch (err) {
      setFormError(authErrorMessage(err, 'email-request'));
    } finally {
      setSubmitting(false);
    }
  };

  if (sentTo) {
    return (
      <AuthLayout title="Kiểm tra email của bạn" subtitle="Đặt lại mật khẩu tài khoản MoonCake Marketplace.">
        <div className="mss-stack">
          <p className="mss-alert m-0" role="status">
            Nếu <b>{sentTo}</b> thuộc một tài khoản đã xác minh email, chúng tôi đã gửi liên kết đặt lại mật khẩu tới địa chỉ này.
            Liên kết chỉ dùng được một lần và có thời hạn.
          </p>
          <p className="text-sm text-gray-600">
            Không thấy email? Kiểm tra thư mục spam, hoặc gửi lại yêu cầu sau 1 phút.
            Tài khoản chưa xác minh email cần xác minh trước khi đặt lại mật khẩu.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="mss-button mss-button--primary" onClick={onBackToLogin}>Quay lại đăng nhập</button>
            <button type="button" className="mss-button mss-button--secondary" onClick={() => setSentTo(null)}>Gửi lại yêu cầu</button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Quên mật khẩu" subtitle="Nhập email đăng ký, chúng tôi sẽ gửi liên kết để đặt mật khẩu mới.">
      <form onSubmit={handleSubmit} className="mss-stack" noValidate>
        {formError && <div className="mss-alert mss-alert--danger" role="alert">{formError}</div>}

        <label className="mss-field">
          Email
          <input
            type="email"
            className="mss-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="ban@email.com"
            maxLength={255}
            aria-invalid={!!emailError}
          />
          {emailError && <span className="mss-field-error">{emailError}</span>}
        </label>

        <button type="submit" className="mss-button mss-button--primary mss-button--full" disabled={submitting}>
          <KeyRound className="w-4 h-4" />
          {submitting ? 'Đang gửi…' : 'Gửi liên kết đặt lại mật khẩu'}
        </button>

        <p className="text-sm text-gray-600 text-center">
          Đã nhớ mật khẩu?{' '}
          <button type="button" onClick={onBackToLogin} className="font-bold text-primary-700 hover:underline">
            Đăng nhập
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}
