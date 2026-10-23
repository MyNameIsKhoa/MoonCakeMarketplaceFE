import { FormEvent, useState } from 'react';
import { request, setAccessToken } from '../../services/api/http';

/** Development-only login bridge until TV1's login screen is connected. Never shown in production. */
export default function LocalFinanceLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const result = await request<{ accessToken: string }>('/api/auth/login', {
        method: 'POST', body: { email, password },
      });
      setAccessToken(result.accessToken);
      setPassword('');
      setMessage('Đã đăng nhập. Tải đơn bên dưới để kiểm thử.');
    } catch {
      setMessage('Đăng nhập thất bại. Kiểm tra tài khoản và Identity/Gateway.');
    } finally {
      setBusy(false);
    }
  }

  return <details className="mss-card">
    <summary className="cursor-pointer font-semibold">Đăng nhập kiểm thử local</summary>
    <form onSubmit={submit} className="mss-stack mt-4">
      <p className="text-sm text-gray-600">Dùng tài khoản Identity local. Khu vực này chỉ có khi chạy môi trường phát triển.</p>
      <label className="mss-field">Email kiểm thử<input type="email" className="mss-input" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" /></label>
      <label className="mss-field">Mật khẩu kiểm thử<input type="password" className="mss-input" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="off" /></label>
      <button className="mss-button mss-button--secondary" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập local'}</button>
      {message && <p role="status">{message}</p>}
    </form>
  </details>;
}
