import React, { useState } from 'react';
import { Building2, User, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AuthLayout, { authErrorMessage, EMAIL_PATTERN } from './AuthLayout';

type AccountType = 'customer' | 'supplier';

interface RegisterProps {
  /** Called once the account exists and the user is logged in; supplier accounts go to the seller center. */
  onSuccess: (accountType: AccountType) => void;
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
  if (form.phone && !/^[0-9+\s.-]{8,30}$/.test(form.phone.trim())) errors.phone = 'Số điện thoại không hợp lệ.';
  if (form.password.length < 6 || form.password.length > 100) errors.password = 'Mật khẩu cần từ 6 đến 100 ký tự.';
  if (form.confirmPassword !== form.password) errors.confirmPassword = 'Mật khẩu nhập lại không khớp.';
  if (accountType === 'supplier') {
    if (!form.companyName.trim()) errors.companyName = 'Vui lòng nhập tên công ty / xưởng bánh.';
    if (!form.taxCode.trim()) errors.taxCode = 'Vui lòng nhập mã số thuế.';
    else if (form.taxCode.trim().length > 100) errors.taxCode = 'Mã số thuế tối đa 100 ký tự.';
  }
  return errors;
}

export default function Register({ onSuccess, onSwitchToLogin, defaultAccountType = 'customer' }: RegisterProps) {
  const { register, submitSupplierProfile } = useAuth();
  const [accountType, setAccountType] = useState<AccountType>(defaultAccountType);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<FormField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    if (accountType === 'supplier') {
      // The account already exists here; if this step fails the seller center lets the user resubmit.
      await submitSupplierProfile({ companyName: form.companyName.trim(), taxCode: form.taxCode.trim() }).catch(() => undefined);
    }
    setSubmitting(false);
    onSuccess(accountType);
  };

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
            {field('companyName', 'Tên công ty / xưởng bánh', { autoComplete: 'organization' })}
            {field('taxCode', 'Mã số thuế')}
          </div>
        )}

        <button type="submit" className="mss-button mss-button--primary mss-button--full" disabled={submitting}>
          <UserPlus className="w-4 h-4" />
          {submitting ? 'Đang tạo tài khoản…' : 'Đăng ký'}
        </button>

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
