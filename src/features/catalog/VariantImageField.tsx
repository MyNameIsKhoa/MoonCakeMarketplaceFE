import { useEffect, useId, useRef, useState } from 'react';
import { errorMessage } from '../../services/api/http';
import { uploadProductImage } from './productImageUpload';

interface Props {
  productId?: number | null;
  value: string;
  onChange: (url: string) => void;
  onUploadingChange: (uploading: boolean) => void;
  error?: string;
  disabled?: boolean;
}

export default function VariantImageField({ productId, value, onChange, onUploadingChange, error, disabled }: Props) {
  const id = useId();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [localPreview, setLocalPreview] = useState('');
  const [previewFailed, setPreviewFailed] = useState(false);
  const request = useRef<AbortController | null>(null);
  const preview = localPreview || value.trim();

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => () => { if (localPreview) URL.revokeObjectURL(localPreview); }, [localPreview]);
  useEffect(() => { setPreviewFailed(false); }, [preview]);

  const upload = async (file: File) => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setUploadError('');
    setLocalPreview(URL.createObjectURL(file));
    setUploading(true);
    onUploadingChange(true);
    try {
      const image = await uploadProductImage(productId, file, controller.signal);
      if (!controller.signal.aborted) onChange(image.url);
    } catch (err) {
      if (!controller.signal.aborted) setUploadError(errorMessage(err));
    } finally {
      if (!controller.signal.aborted) {
        setLocalPreview('');
        setUploading(false);
        onUploadingChange(false);
      }
      request.current = null;
    }
  };

  return (
    <div className="mss-field md:col-span-2">
      <label className="mss-label" htmlFor={`${id}-file`}>Tải ảnh biến thể</label>
      <input
        id={`${id}-file`}
        type="file"
        accept="image/jpeg,image/png"
        className="mss-input"
        disabled={disabled || uploading || !productId}
        aria-describedby={`${id}-help`}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void upload(file);
        }}
      />
      <p id={`${id}-help`} className="text-xs text-gray-500 m-0">
        {productId
          ? 'JPEG/PNG, tối đa 5 MiB, mỗi chiều tối đa 4096 px và tổng 16 triệu điểm ảnh. Hoặc nhập đường dẫn bên dưới.'
          : 'Tạo sản phẩm trước, sau đó thêm biến thể và tải ảnh.'}
      </p>
      {uploading && <p role="status" className="text-sm text-gray-600 m-0">Đang tải và xử lý ảnh…</p>}
      {uploadError && <p role="alert" className="mss-field-error m-0">{uploadError}</p>}
      <label className="mss-label" htmlFor={`${id}-url`}>Đường dẫn ảnh</label>
      <div className="flex items-center gap-3">
        {preview && !previewFailed && /^(https?:\/\/|\/|blob:)\S+$/i.test(preview) && (
          <img src={preview} alt="Xem trước ảnh biến thể" className="w-20 h-20 rounded-lg object-cover shrink-0"
            onError={() => setPreviewFailed(true)} />
        )}
        <input
          id={`${id}-url`}
          className="mss-input"
          maxLength={500}
          placeholder="https://… hoặc /images/…"
          value={value}
          disabled={disabled || uploading}
          onChange={(event) => { setUploadError(''); onChange(event.target.value); }}
        />
      </div>
      {previewFailed && <p className="mss-field-error m-0">Không xem được ảnh từ đường dẫn này.</p>}
      {error && <p role="alert" className="mss-field-error m-0">{error}</p>}
    </div>
  );
}
