import { FormEvent, useState } from 'react';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { errorMessage } from '../../../services/api/http';
import { signIn } from '../api';

/** Temporary sign-in for TV4 screens until the shared auth flow (TV1) exists. */
export default function SignInCard({ onCancel }: { onCancel?: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError('Nhập email và mật khẩu.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mss-card mss-stack mx-auto w-full max-w-md" aria-labelledby="signin-title" noValidate>
      <div>
        <h2 id="signin-title" className="mss-section-title">
          Đăng nhập
        </h2>
        <p className="mss-card-meta">Dùng tài khoản người mua để đăng yêu cầu, hoặc tài khoản nhà cung cấp đã xác minh để báo giá.</p>
      </div>
      <div className="mss-field">
        <label className="mss-label" htmlFor="signin-email">
          Email
        </label>
        <input id="signin-email" className="mss-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="mss-field">
        <label className="mss-label" htmlFor="signin-password">
          Mật khẩu
        </label>
        <div className="flex gap-2">
          <input
            id="signin-password"
            className="mss-input"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="mss-button mss-button--secondary"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </div>
      {error && (
        <p className="mss-alert mss-alert--danger m-0" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        {onCancel && (
          <button type="button" className="mss-button mss-button--secondary" onClick={onCancel} disabled={busy}>
            Để sau
          </button>
        )}
        <button type="submit" className="mss-button mss-button--primary" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden /> : <LogIn className="h-4 w-4" aria-hidden />}
          Đăng nhập
        </button>
      </div>
    </form>
  );
}
