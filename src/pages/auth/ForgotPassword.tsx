import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { authApi } from '../../services/api';
import AuthLayout, { authErrorMessage, EMAIL_PATTERN } from './AuthLayout';

/** Request a six-digit reset code, then set a new password with that code. */
export default function ForgotPassword({ onBackToLogin }: { onBackToLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRequest = async (e: React.FormEvent) => {
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

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setFormError('Vui lòng nhập mã gồm 6 chữ số.');
      return;
    }
    if (password.length < 6 || password.length > 100) {
      setFormError('Mật khẩu cần từ 6 đến 100 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Mật khẩu nhập lại không khớp.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await authApi.resetPassword({ email: sentTo!, code, newPassword: password });
      onBackToLogin();
    } catch (err) {
      setFormError(authErrorMessage(err, 'password-reset'));
    } finally {
      setSubmitting(false);
    }
  };

  if (sentTo) {
    return (
      <AuthLayout title="Kiểm tra email của bạn" subtitle="Đặt lại mật khẩu tài khoản MoonCake Marketplace.">
        <form onSubmit={handleReset} className="mss-stack" noValidate>
          <p className="mss-alert m-0" role="status">
            Nếu <b>{sentTo}</b> thuộc tài khoản đủ điều kiện, mã đặt lại mật khẩu đã được gửi tới email. Mã có hiệu lực trong 10 phút.
          </p>
          <p className="text-sm text-gray-600">Không thấy email? Kiểm tra thư mục spam. Bạn có thể yêu cầu mã mới sau 1 phút.</p>
          {formError && <div className="mss-alert mss-alert--danger" role="alert">{formError}</div>}
          <label className="mss-field">Mã đặt lại mật khẩu
            <input className="mss-input" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          </label>
          <label className="mss-field">Mật khẩu mới
            <input className="mss-input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <label className="mss-field">Nhập lại mật khẩu mới
            <input className="mss-input" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </label>
          <button type="submit" className="mss-button mss-button--primary" disabled={submitting}>
            <KeyRound className="w-4 h-4" />
            {submitting ? 'Đang cập nhật…' : 'Đặt lại mật khẩu'}
          </button>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="mss-button mss-button--secondary" onClick={() => { setSentTo(null); setFormError(null); }}>Gửi mã mới</button>
            <button type="button" className="mss-button mss-button--secondary" onClick={onBackToLogin}>Quay lại đăng nhập</button>
          </div>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Quên mật khẩu" subtitle="Nhập email đăng ký để nhận mã đặt lại mật khẩu.">
      <form onSubmit={handleRequest} className="mss-stack" noValidate>
        {formError && <div className="mss-alert mss-alert--danger" role="alert">{formError}</div>}
        <label className="mss-field">
          Email
          <input type="email" className="mss-input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="ban@email.com" maxLength={255} aria-invalid={!!emailError} />
          {emailError && <span className="mss-field-error">{emailError}</span>}
        </label>
        <button type="submit" className="mss-button mss-button--primary mss-button--full" disabled={submitting}>
          <KeyRound className="w-4 h-4" />
          {submitting ? 'Đang gửi…' : 'Gửi mã đặt lại mật khẩu'}
        </button>
        <p className="text-sm text-gray-600 text-center">
          Đã nhớ mật khẩu?{' '}
          <button type="button" onClick={onBackToLogin} className="font-bold text-primary-700 hover:underline">Đăng nhập</button>
        </p>
      </form>
    </AuthLayout>
  );
}
