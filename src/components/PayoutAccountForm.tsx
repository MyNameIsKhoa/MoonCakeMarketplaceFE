import { useEffect, useState } from 'react';
import { ApiError, payoutAccountApi, type PayoutAccount } from '../services/api';

export default function PayoutAccountForm({ kind }: { kind: PayoutAccount['ownerKind'] }) {
  const [banks, setBanks] = useState<{ bin: string; name: string }[]>([]);
  const [bankBin, setBankBin] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([payoutAccountApi.banks(), payoutAccountApi.mine(kind).catch((e: unknown) => {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    })]).then(([options, account]) => {
      if (!active) return;
      setBanks(options);
      if (account) {
        setBankBin(account.bankBin); setAccountNumber(account.accountNumber);
        setAccountHolder(account.accountHolder); setSaved(true);
      }
    }).catch(() => { if (active) setError('Không tải được tài khoản nhận tiền. Vui lòng thử lại.'); });
    return () => { active = false; };
  }, [kind]);

  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await payoutAccountApi.save(kind, { bankBin, accountNumber: accountNumber.trim(), accountHolder: accountHolder.trim() });
      setSaved(true); setNotice('Đã lưu tài khoản nhận tiền. Các khoản chuyển đã chuẩn bị trước đó vẫn dùng tài khoản đã chốt.');
    } catch (e) {
      setError(e instanceof ApiError && e.status === 400 ? 'Kiểm tra ngân hàng, số tài khoản và tên chủ tài khoản.'
        : 'Không lưu được tài khoản nhận tiền. Vui lòng thử lại.');
    } finally { setBusy(false); }
  }

  return <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
    <div><h3 className="font-bold text-lg">{kind === 'SUPPLIER' ? 'Tài khoản nhận giải ngân của nhà bán' : 'Tài khoản nhận tiền hoàn của người mua'}</h3>
      <p className="text-sm text-gray-600">Sàn chuyển khoản thủ công sau khi đơn đủ điều kiện. Hãy nhập đúng tên chủ tài khoản; hệ thống chưa xác minh tên với ngân hàng.</p></div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {notice && <p role="status" className="text-green-700">{notice}</p>}
    {saved && <p className="text-sm text-green-700">Đã có tài khoản nhận tiền.</p>}
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-medium">Ngân hàng hoặc ví MoMo
        <select required value={bankBin} onChange={e => setBankBin(e.target.value)} className="mss-select w-full mt-1">
          <option value="">Chọn nơi nhận tiền</option>{banks.map(bank => <option key={bank.bin} value={bank.bin}>{bank.name}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium">{bankBin === '971025' ? 'Số điện thoại MoMo' : 'Số tài khoản'}
        <input required inputMode="numeric" pattern={bankBin === '971025' ? '[0-9]{10}' : '[0-9]{6,19}'} maxLength={19}
          value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="mss-input w-full mt-1" />
      </label>
      <label className="block text-sm font-medium sm:col-span-2">Tên chủ tài khoản
        <input required maxLength={100} value={accountHolder} onChange={e => setAccountHolder(e.target.value)}
          className="mss-input w-full mt-1" />
      </label>
      <div className="sm:col-span-2"><button disabled={busy || banks.length === 0} className="mss-button mss-button--primary">
        {busy ? 'Đang lưu…' : 'Lưu tài khoản nhận tiền'}</button></div>
    </form>
  </section>;
}
