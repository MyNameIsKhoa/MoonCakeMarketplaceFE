import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { ArrowUpRight, Loader2, MessageCircle, Send, Sparkles, X } from 'lucide-react';

interface Source { id: string; title: string; url: string }
interface Message { role: 'user' | 'assistant'; text: string; sources?: Source[] }
interface Props { open: boolean; enabled: boolean; onOpen: () => void; onClose: () => void; onNavigate: (url: string) => void }

export default function AIChatWidget({ open, enabled, onOpen, onClose, onNavigate }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const labelId = useId();
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (!open) { request.current?.abort(); setBusy(false); return; }
    input.current?.focus();
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { onClose(); launcher.current?.focus(); } };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open, onClose]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'nearest' }); }, [messages, busy]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || busy || message.length > 1000) return;
    const history = messages.slice(-6).map(({ role, text }) => ({ role, text: text.slice(0, 1000) }));
    setMessages(previous => [...previous, { role: 'user', text: message }]);
    setDraft(''); setError(''); setBusy(true);
    const controller = new AbortController(); request.current = controller;
    try {
      const response = await fetch('/api/gemini/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }), signal: controller.signal });
      const reply = await response.json();
      if (!response.ok) throw new Error(reply.error || 'Chưa kết nối được trợ lý. Vui lòng thử lại.');
      if (typeof reply.answer !== 'string' || !Array.isArray(reply.sources)) throw new Error('Phản hồi chưa hợp lệ. Vui lòng thử lại.');
      if (!controller.signal.aborted) setMessages(previous => [...previous, { role: 'assistant', text: reply.answer, sources: reply.sources }]);
    } catch (failure) {
      if (!controller.signal.aborted) { setError(failure instanceof Error ? failure.message : 'Chưa kết nối được trợ lý.'); setDraft(message); }
    } finally { if (request.current === controller) { request.current = null; setBusy(false); } }
  };

  if (!enabled) return null;
  return <div className="fixed bottom-5 left-5 z-[80] max-w-[calc(100vw-2.5rem)]">
    {open ? <section role="dialog" aria-labelledby={titleId}
      className="flex h-[min(580px,80dvh)] w-[380px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-2xl">
      <header className="flex items-center gap-3 bg-primary-900 px-4 py-3 text-white">
        <Sparkles className="h-5 w-5" /><div className="min-w-0 flex-1"><h2 id={titleId} className="font-semibold">Trợ lý Mooncake</h2>
          <p className="text-xs text-primary-100">Sản phẩm và hướng dẫn sử dụng sàn</p></div>
        <button type="button" aria-label="Đóng trợ lý" className="rounded-lg p-2 hover:bg-white/15" onClick={() => { onClose(); launcher.current?.focus(); }}><X className="h-5 w-5" /></button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto bg-amber-50/40 p-4" role="log" aria-live="polite" aria-label="Trao đổi với trợ lý">
        {!messages.length && <div className="space-y-3 text-sm text-gray-700"><p>Mình có thể tìm bánh, gian hàng, ưu đãi và giải thích cách đặt hàng trên sàn.</p>
          {['Gợi ý sản phẩm bánh trung thu', 'Thanh toán tiền cọc RFQ như thế nào?', 'Tôi muốn yêu cầu hoàn tiền'].map(question =>
            <button key={question} type="button" className="block w-full rounded-xl border border-amber-200 bg-white p-3 text-left hover:border-primary-600" onClick={() => { setDraft(question); input.current?.focus(); }}>{question}</button>)}
        </div>}
        {messages.map((message, index) => <div key={index} className={`mb-3 rounded-xl p-3 text-sm ${message.role === 'user' ? 'ml-8 bg-primary-800 text-white' : 'mr-3 border border-amber-100 bg-white text-gray-800'}`}>
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
          {!!message.sources?.length && <div className="mt-3 flex flex-col gap-1 border-t border-gray-100 pt-2">
            {message.sources.map(source => <button key={source.id} type="button" className="flex items-center gap-1 text-left text-xs font-medium text-primary-700 hover:underline"
              onClick={() => { if (/^\/(products\/\d+|stores\/\d+|orders|profile|cart|b2b)$/.test(source.url)) { onNavigate(source.url); onClose(); } }}>
              <ArrowUpRight className="h-3 w-3 shrink-0" /> {source.title}
            </button>)}
          </div>}
        </div>)}
        {busy && <p role="status" className="flex items-center gap-2 text-sm text-gray-600"><Loader2 className="h-4 w-4 animate-spin" /> Đang kiểm tra thông tin…</p>}
        <div ref={bottom} />
      </div>
      <form onSubmit={submit} className="border-t border-amber-100 bg-white p-3">
        {error && <p role="alert" className="mb-2 text-xs text-red-700">{error}</p>}
        <label htmlFor={labelId} className="sr-only">Câu hỏi cho trợ lý</label>
        <div className="flex items-end gap-2"><textarea ref={input} id={labelId} rows={2} maxLength={1000} value={draft}
          onChange={event => setDraft(event.target.value)} placeholder="Hỏi về bánh hoặc cách mua hàng…"
          className="mss-input min-h-0 flex-1 resize-none text-sm" onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); }
          }} />
          <button type="submit" aria-label="Gửi câu hỏi" disabled={busy || !draft.trim()} className="mss-button mss-button--primary p-3"><Send className="h-4 w-4" /></button></div>
        <p className="mt-2 text-[11px] text-gray-500">Giá và tồn kho được kiểm tra lại khi thanh toán.</p>
      </form>
    </section> : <button type="button" ref={launcher} onClick={onOpen} aria-expanded={open} aria-label="Mở trợ lý Mooncake"
      className="flex items-center gap-2 rounded-full bg-primary-800 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-primary-900">
      <MessageCircle className="h-5 w-5" /> Trợ lý AI
    </button>}
  </div>;
}
