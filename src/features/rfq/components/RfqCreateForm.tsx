import { FormEvent, ReactElement, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ApiError, errorMessage } from '../../../services/api/http';
import { rfqApi } from '../api';
import { isMoney, localDateTimeToIso, todayIsoDate } from '../format';
import type { CreateRfqInput, Rfq } from '../types';

interface RfqCreateFormProps {
  onCreated: (rfq: Rfq) => void;
  onCancel: () => void;
}

type Field = 'title' | 'quantity' | 'budgetAmount' | 'requestedDeliveryDate' | 'expiresAt' | 'deliveryLocation' | 'customizationRequirements' | 'description';
type Values = Record<Field, string>;

const EMPTY: Values = {
  title: '',
  quantity: '',
  budgetAmount: '',
  requestedDeliveryDate: '',
  expiresAt: '',
  deliveryLocation: '',
  customizationRequirements: '',
  description: ''
};

function validate(v: Values): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  if (!v.title.trim()) errors.title = 'Nhập tiêu đề yêu cầu.';
  if (!/^[1-9]\d{0,8}$/.test(v.quantity.trim())) errors.quantity = 'Số lượng là số nguyên lớn hơn 0.';
  if (v.budgetAmount.trim() && !isMoney(v.budgetAmount)) errors.budgetAmount = 'Ngân sách là số, tối đa 2 chữ số thập phân.';
  if (v.requestedDeliveryDate && v.requestedDeliveryDate < todayIsoDate()) errors.requestedDeliveryDate = 'Ngày giao không được ở quá khứ.';
  if (v.expiresAt) {
    const iso = localDateTimeToIso(v.expiresAt);
    if (!iso || new Date(iso).getTime() <= Date.now()) errors.expiresAt = 'Hạn nhận báo giá phải ở tương lai.';
  }
  return errors;
}

export default function RfqCreateForm({ onCreated, onCancel }: RfqCreateFormProps) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const clientErrors = validate(values);
  const errorFor = (field: Field) => serverErrors[field] ?? (touched[field] ? clientErrors[field] : undefined);

  const set = (field: Field) => (event: { target: { value: string } }) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
    setServerErrors((prev) => ({ ...prev, [field]: undefined }));
  };
  const blur = (field: Field) => () => setTouched((prev) => ({ ...prev, [field]: true }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    const errors = validate(values);
    if (Object.keys(errors).length > 0) {
      setTouched(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, true])));
      const first = Object.keys(EMPTY).find((k) => errors[k as Field]);
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    const input: CreateRfqInput = {
      title: values.title.trim(),
      quantity: Number(values.quantity),
      description: values.description.trim() || undefined,
      budgetAmount: values.budgetAmount.trim() || undefined,
      requestedDeliveryDate: values.requestedDeliveryDate || undefined,
      deliveryLocation: values.deliveryLocation.trim() || undefined,
      customizationRequirements: values.customizationRequirements.trim() || undefined,
      expiresAt: localDateTimeToIso(values.expiresAt)
    };
    setSubmitting(true);
    try {
      onCreated(await rfqApi.create(input));
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) setServerErrors(error.fieldErrors as Partial<Record<Field, string>>);
      setFormError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const field = (name: Field, label: string, input: ReactElement, help?: string) => {
    const error = errorFor(name);
    return (
      <div className="mss-field">
        <label className="mss-label" htmlFor={`rfq-${name}`}>
          {label}
        </label>
        {input}
        {help && !error && <p className="m-0 text-sm text-gray-500">{help}</p>}
        {error && (
          <p className="mss-field-error m-0" id={`rfq-${name}-error`} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  };

  const common = (name: Field) => ({
    id: `rfq-${name}`,
    name,
    value: values[name],
    onChange: set(name),
    onBlur: blur(name),
    'aria-invalid': !!errorFor(name),
    'aria-describedby': errorFor(name) ? `rfq-${name}-error` : undefined
  });

  return (
    <form ref={formRef} onSubmit={submit} className="mss-card mss-stack" noValidate aria-labelledby="rfq-create-title">
      <div>
        <h2 id="rfq-create-title" className="mss-section-title">
          Tạo yêu cầu báo giá
        </h2>
        <p className="mss-card-meta">Yêu cầu được công bố ngay để nhà cung cấp gửi báo giá. Địa chỉ và yêu cầu tùy chỉnh chỉ bạn nhìn thấy.</p>
      </div>

      {field('title', 'Tiêu đề *', <input className="mss-input" maxLength={255} {...common('title')} placeholder="VD: 500 hộp bánh trung thu quà tặng đối tác" />)}

      <div className="grid gap-4 md:grid-cols-2">
        {field('quantity', 'Số lượng *', <input className="mss-input" inputMode="numeric" {...common('quantity')} placeholder="500" />)}
        {field(
          'budgetAmount',
          'Ngân sách dự kiến (₫)',
          <input className="mss-input" inputMode="decimal" {...common('budgetAmount')} placeholder="150000000" />,
          'Để trống nếu muốn nhà cung cấp tự đề xuất.'
        )}
        {field('requestedDeliveryDate', 'Ngày cần giao', <input className="mss-input" type="date" min={todayIsoDate()} {...common('requestedDeliveryDate')} />)}
        {field(
          'expiresAt',
          'Hạn nhận báo giá',
          <input className="mss-input" type="datetime-local" {...common('expiresAt')} />,
          'Sau thời điểm này yêu cầu không nhận báo giá mới.'
        )}
      </div>

      {field('deliveryLocation', 'Địa điểm giao (riêng tư)', <input className="mss-input" maxLength={500} {...common('deliveryLocation')} />)}
      {field(
        'customizationRequirements',
        'Yêu cầu tùy chỉnh (riêng tư)',
        <textarea className="mss-textarea" maxLength={20000} {...common('customizationRequirements')} placeholder="In logo, thiệp chúc, hóa đơn VAT…" />
      )}
      {field('description', 'Mô tả công khai', <textarea className="mss-textarea" maxLength={20000} {...common('description')} />)}

      {formError && (
        <p className="mss-alert mss-alert--danger m-0" role="alert">
          {formError}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" className="mss-button mss-button--secondary" onClick={onCancel} disabled={submitting}>
          Hủy
        </button>
        <button type="submit" className="mss-button mss-button--primary" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden />}
          Đăng yêu cầu
        </button>
      </div>
    </form>
  );
}
