import { useEffect, useState } from 'react';
import { authApi, ApiError } from '../../services/api';
import AuthLayout from './AuthLayout';

export default function VerifyEmail({ token, onLogin }: { token: string; onLogin: () => void }) {
  const [state, setState] = useState<'loading' | 'success' | 'error'>(token ? 'loading' : 'error');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setMessage('Link xác minh thiếu token. Hãy yêu cầu gửi lại email xác minh.');
      return;
    }
    let active = true;
    authApi.verifyEmail(token).then(() => {
      if (active) { setState('success'); setMessage('Email đã được xác minh. Bạn có thể đăng nhập.'); }
    }).catch((error: unknown) => {
      if (!active) return;
      setState('error');
      setMessage(error instanceof ApiError && error.status === 401
        ? 'Link xác minh không hợp lệ hoặc đã hết hạn. Hãy yêu cầu gửi lại email.'
        : 'Chưa xác minh được email. Vui lòng thử lại sau.');
    });
    return () => { active = false; };
  }, [token]);

  return <AuthLayout title="Xác minh email" subtitle="Hoàn tất xác minh tài khoản MoonCake Marketplace.">
    <div className="mss-stack">
      <p role="status" className={state === 'error' ? 'mss-alert mss-alert--danger' : 'mss-alert mss-alert--success'}>
        {state === 'loading' ? 'Đang xác minh email…' : message}
      </p>
      {state === 'success' && <button className="mss-button mss-button--primary" onClick={onLogin}>Đi tới đăng nhập</button>}
      {state === 'error' && <button className="mss-button mss-button--secondary" onClick={onLogin}>Quay lại đăng nhập</button>}
    </div>
  </AuthLayout>;
}
