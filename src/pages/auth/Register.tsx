import React, { useState } from 'react';
import { Building2, User, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supplierDraftStorage } from '../../services/api/identityApi';
import AuthLayout, { authErrorMessage, EMAIL_PATTERN } from './AuthLayout';
import GoogleSignInButton from './GoogleSignInButton';

type AccountType = 'customer' | 'supplier';

interface RegisterProps {
  /** Called once registration succeeds; email verification is required before login. */
  onSuccess: (accountType: AccountType) => void;
  /** Called after signing up/in with Google: the account is verified and already logged in. */
  onGoogleLogin: () => void;
  onSwitchToLogin: () => void;
  defaultAccountType?: AccountType;
}

const EMPTY_FORM = {
  fullName: '', email: '', phone: '', password: '', confirmPassword: '', companyName: '', taxCode: ''
};
type FormField = keyof typeof EMPTY_FORM;

/** Same limits as Identity's RegisterRequest / SupplierProfileRequest, with Vietnamese messages. */
function validate(form: typeof EMPTY_FORM, accountType: AccountType) {
  const errors: Partial<Record<FormField, string>> = {};
  if (!form.fullName.trim()) errors.fullName = 'Vui lòng nhập họ và tên.';
  else if (form.fullName.trim().length > 255) errors.fullName = 'Họ và tên tối đa 255 ký tự.';
  if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = 'Vui lòng nhập email hợp lệ.';
  // Cùng quy tắc với Identity (ValidationPatterns.PHONE_OR_EMPTY).
  if (form.phone.trim() && !/^\+?[0-9][0-9 .-]{6,28}[0-9]$/.test(form.phone.trim())) errors.phone = 'Số điện thoại không hợp lệ.';
  if (form.password.length < 6 || form.password.length > 100) errors.password = 'Mật khẩu cần từ 6 đến 100 ký tự.';
  if (form.confirmPassword !== form.password) errors.confirmPassword = 'Mật khẩu nhập lại không khớp.';
  if (accountType === 'supplier') {
    if (!form.companyName.trim()) errors.companyName = 'Vui lòng nhập tên công ty / xưởng bánh.';
    if (!form.taxCode.trim()) errors.taxCode = 'Vui lòng nhập mã số thuế.';
    else if (form.taxCode.trim().length > 100) errors.taxCode = 'Mã số thuế tối đa 100 ký tự.';
  }
  return errors;
}

export default function Register({ onSuccess, onGoogleLogin, onSwitchToLogin, defaultAccountType = 'customer' }: RegisterProps) {
  const { register, loginWithGoogle } = useAuth();
  const [accountType, setAccountType] = useState<AccountType>(defaultAccountType);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<FormField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /** Account created but the supplier draft could not be kept: tell the user before leaving this page. */
  const [draftLostNotice, setDraftLostNotice] = useState<string | null>(null);

  const update = (field: FormField) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validate(form, accountType);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await register({
        fullName: form.fullName.trim(),
        email: form.email,
        password: form.password,
        phone: form.phone.trim() || undefined
      });
    } catch (err) {
      setFormError(authErrorMessage(err, 'register'));
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    if (accountType === 'supplier') {
      // POST /api/supplier-profile cần token, mà token chỉ có sau khi xác minh email + đăng nhập:
      // giữ bản nháp trên trình duyệt, Kênh Người Bán tự gửi hồ sơ ở lần đăng nhập đầu tiên.
      const saved = supplierDraftStorage.save({
        email: form.email, companyName: form.companyName.trim(), taxCode: form.taxCode.trim(), autoSubmit: true
      });
      if (!saved) {
        setDraftLostNotice('Tài khoản đã được tạo, nhưng trình duyệt không lưu được thông tin nhà cung cấp. '
          + `Sau khi xác minh email và đăng nhập, hãy vào Kênh Người Bán và nhập lại: ${form.companyName.trim()} — MST ${form.taxCode.trim()}.`);
        return;
      }
    }
    onSuccess('customer');
  };

  const handleGoogleIdToken = async (idToken: string) => {
    if (submitting) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await loginWithGoogle(idToken);
      onGoogleLogin();
    } catch (err) {
      setFormError(authErrorMessage(err, 'google'));
    } finally {
      setSubmitting(false);
    }
  };

  if (draftLostNotice) {
    return (
      <AuthLayout title="Tạo tài khoản" subtitle="Đăng ký miễn phí để mua hàng hoặc mở gian hàng trên sàn.">
        <div className="mss-stack">
          <div className="mss-alert mss-alert--warning" role="alert">{draftLostNotice}</div>
          <button type="button" className="mss-button mss-button--primary mss-button--full" onClick={() => onSuccess('customer')}>
            Tiếp tục
          </button>
        </div>
      </AuthLayout>
    );
  }

  const field = (name: FormField, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="mss-field">
      {label}
      <input className="mss-input" value={form[name]} onChange={update(name)} aria-invalid={!!errors[name]} {...props} />
      {errors[name] && <span className="mss-field-error">{errors[name]}</span>}
    </label>
  );

  return (
    <AuthLayout title="Tạo tài khoản" subtitle="Đăng ký miễn phí để mua hàng hoặc mở gian hàng trên sàn.">
      <form onSubmit={handleSubmit} className="mss-stack" noValidate>
        {formError && <div className="mss-alert mss-alert--danger" role="alert">{formError}</div>}

        <fieldset>
          <legend className="mss-label mb-2">Bạn là</legend>
          <div className="grid grid-cols-2 gap-3">
            {([
              { id: 'customer', label: 'Khách hàng', hint: 'Mua bánh, đặt hộp quà', icon: User },
              { id: 'supplier', label: 'Nhà cung cấp', hint: 'Mở gian hàng bán bánh', icon: Building2 }
            ] as const).map(({ id, label, hint, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setAccountType(id)}
                aria-pressed={accountType === id}
                className={`text-left p-3 rounded-xl border transition ${
                  accountType === id ? 'border-primary-700 bg-primary-50 ring-1 ring-primary-700' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center gap-2 font-bold text-sm text-gray-900">
                  <Icon className="w-4 h-4 text-primary-700" /> {label}
                </span>
                <span className="block text-xs text-gray-500 mt-0.5">{hint}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {field('fullName', 'Họ và tên', { autoComplete: 'name', placeholder: 'Nguyễn Văn A' })}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field('email', 'Email', { type: 'email', autoComplete: 'email', placeholder: 'ban@email.com' })}
          {field('phone', 'Số điện thoại (không bắt buộc)', { type: 'tel', autoComplete: 'tel' })}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field('password', 'Mật khẩu', { type: 'password', autoComplete: 'new-password' })}
          {field('confirmPassword', 'Nhập lại mật khẩu', { type: 'password', autoComplete: 'new-password' })}
        </div>

        {accountType === 'supplier' && (
          <div className="mss-stack p-4 rounded-xl bg-accent-50/70 border border-accent-200">
            <p className="text-xs text-accent-900">
              Hồ sơ nhà cung cấp sẽ được quản trị viên xét duyệt. Sau khi được duyệt, bạn có thể tạo gian hàng và đăng bán sản phẩm.
            </p>
            <p className="text-xs text-accent-900">
              Thông tin dưới đây được lưu trên trình duyệt này và tự động gửi xét duyệt khi bạn xác minh email, đăng nhập
              và mở <b>Kênh Người Bán</b> lần đầu.
            </p>
            {field('companyName', 'Tên công ty / xưởng bánh', { autoComplete: 'organization' })}
            {field('taxCode', 'Mã số thuế')}
          </div>
        )}

        <button type="submit" className="mss-button mss-button--primary mss-button--full" disabled={submitting}>
          <UserPlus className="w-4 h-4" />
          {submitting ? 'Đang tạo tài khoản…' : 'Đăng ký'}
        </button>

        <GoogleSignInButton
          onIdToken={handleGoogleIdToken}
          text="signup_with"
          hint={accountType === 'supplier'
            ? 'Đăng ký bằng Google tạo tài khoản khách hàng; sau đó mở Kênh Người Bán để gửi hồ sơ nhà cung cấp.'
            : undefined}
        />

        <p className="text-sm text-gray-600 text-center">
          Đã có tài khoản?{' '}
          <button type="button" onClick={onSwitchToLogin} className="font-bold text-primary-700 hover:underline">
            Đăng nhập
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}
