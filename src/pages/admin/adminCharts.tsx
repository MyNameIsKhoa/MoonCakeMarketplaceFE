// Lightweight SVG charts for the admin dashboard (no chart dependency).
// Palette: validated categorical slots 1-2 on a white card surface; text never wears series colors.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';

export const SERIES = { blue: '#2a78d6', orange: '#eb6834', gray: '#898781' } as const;
const GRID = '#e2e8f0';
const BASELINE = '#cbd5e1';

export type KeyCount = { key: string; count: number };
export type Series = { key: string; label: string; color: string; values: number[] };

export const fmtCount = (n: number) => n.toLocaleString('vi-VN');
export const fmtMoney = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
const fmtCompact = (n: number) => new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
/** API dates are UTC calendar days ("2026-11-10"); format without going through Date to avoid zone shifts. */
const fmtDay = (iso: string, withYear = false) => {
  const [y, m, d] = iso.split('-');
  return withYear ? `${d}/${m}/${y}` : `${d}/${m}`;
};

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Round axis maximum and ticks (1/2/2.5/5 x 10^k); whole steps for counts. */
function niceTicks(max: number, integer: boolean) {
  if (max <= 0) return { top: 1, ticks: [0] };
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  let step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) ?? raw;
  if (integer) step = Math.max(1, Math.ceil(step));
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let t = 0; t <= top + step / 2; t += step) ticks.push(t);
  return { top, ticks };
}

/** Column path with a rounded data end and a square baseline end. */
function columnPath(x: number, y: number, w: number, h: number, rounded: boolean) {
  const r = rounded ? Math.min(4, w / 2, h) : 0;
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

const M = { top: 12, right: 20, bottom: 26, left: 52 };
const HEIGHT = 220;

/**
 * Daily time series. 'area' draws one series as a 2px line over a 10% wash;
 * 'columns' stacks the series bottom-up with a 2px surface gap between segments.
 * Hover / arrow keys move a crosshair whose tooltip lists every series at that day.
 */
export function TimeChart({ label, dates, series, kind, format, integer = true }: {
  label: string; dates: string[]; series: Series[]; kind: 'area' | 'columns';
  format: (n: number) => string; integer?: boolean;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hovered, setActive] = useState<number | null>(null);
  const n = dates.length;
  // A range switch can shorten the data while a day is still hovered.
  const active = hovered !== null && hovered < n ? hovered : null;
  const totals = dates.map((_, i) => series.reduce((sum, s) => sum + s.values[i], 0));
  const { top, ticks } = niceTicks(Math.max(0, ...totals), integer);
  const plotW = Math.max(0, width - M.left - M.right);
  const plotH = HEIGHT - M.top - M.bottom;
  const y = (v: number) => M.top + plotH - (v / top) * plotH;
  const band = n ? plotW / n : 0;
  const xAt = (i: number) => kind === 'columns' ? M.left + band * i + band / 2 : M.left + (n > 1 ? (plotW * i) / (n - 1) : plotW / 2);
  const indexAt = (px: number) => {
    const raw = kind === 'columns' ? Math.floor((px - M.left) / band) : Math.round(((px - M.left) / plotW) * (n - 1));
    return Math.min(n - 1, Math.max(0, raw));
  };
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotW / 64))));

  const onPointer = (e: PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
    setActive(indexAt(e.clientX - box.left));
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    setActive(i => {
      const at = i ?? n - 1;
      if (e.key === 'Home') return 0;
      if (e.key === 'End') return n - 1;
      return Math.min(n - 1, Math.max(0, at + (e.key === 'ArrowLeft' ? -1 : 1)));
    });
  };

  let marks: ReactNode = null;
  if (width > 0 && n > 0 && kind === 'columns') {
    const barW = Math.max(1, Math.min(24, band - 2));
    marks = dates.map((date, i) => {
      const x = xAt(i) - barW / 2;
      let topSeries = -1;
      series.forEach((s, si) => { if (s.values[i] > 0) topSeries = si; });
      let base = 0;
      return <g key={date}>{series.map((s, si) => {
        const v = s.values[i];
        if (v <= 0) return null;
        const y0 = y(base), y1 = y(base + v);
        const gap = base > 0 ? 2 : 0;
        base += v;
        const h = Math.max(0, y0 - y1 - gap);
        return h > 0 ? <path key={s.key} d={columnPath(x, y1, barW, h, si === topSeries)} fill={s.color} /> : null;
      })}</g>;
    });
  } else if (width > 0 && n > 0) {
    const s = series[0];
    const pts = s.values.map((v, i) => `${xAt(i).toFixed(1)},${y(v).toFixed(1)}`);
    const last = n - 1;
    marks = <>
      <path d={`M${pts.join('L')}L${xAt(last)},${y(0)}L${xAt(0)},${y(0)}Z`} fill={s.color} fillOpacity={0.1} />
      <path d={`M${pts.join('L')}`} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={xAt(last)} cy={y(s.values[last])} r={4} fill={s.color} stroke="#fff" strokeWidth={2} />
    </>;
  }

  // Tooltip sits beside the hovered day (flipping past the middle) so it never covers that day's marks.
  const tipX = active === null ? 0 : xAt(active);
  const tipGap = (kind === 'columns' ? band / 2 : 0) + 10;
  const tipFlip = tipX > width / 2;
  return <div>
    {series.length > 1 && <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 mb-2" aria-label="Chú giải">
      {series.map(s => <li key={s.key} className="flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />{s.label}</li>)}
    </ul>}
    <div ref={ref} className="relative outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-lg" style={{ height: HEIGHT }}
      tabIndex={0} role="group" aria-label={`${label}. Dùng phím mũi tên để xem từng ngày.`}
      onKeyDown={onKey} onFocus={() => setActive(a => a ?? n - 1)} onBlur={() => setActive(null)}>
      {width > 0 && <svg width={width} height={HEIGHT} aria-hidden="true" className="block select-none">
        {ticks.map(t => <g key={t}>
          <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? BASELINE : GRID} strokeWidth={1} shapeRendering="crispEdges" />
          <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="#64748b" style={{ fontVariantNumeric: 'tabular-nums' }}>{integer ? fmtCount(t) : fmtCompact(t)}</text>
        </g>)}
        {dates.map((date, i) => (n - 1 - i) % labelEvery === 0 &&
          <text key={date} x={xAt(i)} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill="#64748b" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtDay(date)}</text>)}
        {active !== null && kind === 'columns' && <rect x={M.left + band * active} y={M.top} width={band} height={plotH} fill="#f1f5f9" />}
        {marks}
        {active !== null && kind === 'area' && <>
          <line x1={xAt(active)} x2={xAt(active)} y1={M.top} y2={M.top + plotH} stroke="#94a3b8" strokeWidth={1} shapeRendering="crispEdges" />
          <circle cx={xAt(active)} cy={y(series[0].values[active])} r={4} fill={series[0].color} stroke="#fff" strokeWidth={2} />
        </>}
        <rect x={M.left} y={M.top} width={plotW} height={plotH} fill="transparent"
          onPointerMove={onPointer} onPointerDown={onPointer} onPointerLeave={() => setActive(null)} />
      </svg>}
      {active !== null && width > 0 && <div role="status" className="pointer-events-none absolute top-0 z-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md whitespace-nowrap"
        style={{ left: tipFlip ? tipX - tipGap : tipX + tipGap, transform: tipFlip ? 'translateX(-100%)' : undefined }}>
        <p className="text-slate-500 text-xs mb-1">{fmtDay(dates[active], true)}</p>
        {series.map(s => <p key={s.key} className="flex items-center gap-2">
          <span className="inline-block w-3 h-0.5 rounded" style={{ background: s.color }} />
          <strong className="text-slate-900">{format(s.values[active])}</strong>
          {series.length > 1 && <span className="text-slate-500">{s.label}</span>}
        </p>)}
        {series.length > 1 && <p className="text-slate-500 text-xs mt-1">Tổng: {format(totals[active])}</p>}
      </div>}
    </div>
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer text-slate-500 hover:text-slate-700">Xem bảng số liệu</summary>
      <div className="mt-2 max-h-60 overflow-auto rounded-lg border border-slate-100">
        <table className="w-full text-left" style={{ fontVariantNumeric: 'tabular-nums' }}>
          <thead className="bg-slate-50 text-slate-600 sticky top-0"><tr><th className="px-3 py-2 font-medium">Ngày (UTC)</th>{series.map(s => <th key={s.key} className="px-3 py-2 font-medium text-right">{s.label}</th>)}</tr></thead>
          <tbody>{dates.map((date, i) => <tr key={date} className="border-t border-slate-100"><td className="px-3 py-1.5">{fmtDay(date, true)}</td>{series.map(s => <td key={s.key} className="px-3 py-1.5 text-right">{format(s.values[i])}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </details>
  </div>;
}

/** Horizontal bars, one series (slot 1), value and share at each bar tip. Rows follow the status map's lifecycle order. */
export function BarList({ rows, order, labelOf }: { rows: KeyCount[]; order: string[]; labelOf: (key: string) => string }) {
  if (rows.length === 0) return <p className="text-slate-500 text-sm">Chưa có dữ liệu.</p>;
  const rank = (key: string) => { const i = order.indexOf(key); return i < 0 ? order.length : i; };
  const sorted = [...rows].sort((a, b) => rank(a.key) - rank(b.key) || b.count - a.count);
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const max = Math.max(...rows.map(r => r.count), 1);
  // Narrow cards stack the label over its bar; from 28rem of card width they share a row.
  return <ul className="@container space-y-2.5">
    {sorted.map(r => <li key={r.key} className="grid gap-1 @md:grid-cols-[minmax(0,11rem)_1fr] @md:items-center @md:gap-3 text-sm">
      <span className="text-slate-600 truncate" title={labelOf(r.key)}>{labelOf(r.key)}</span>
      <span className="flex items-center gap-2 min-w-0">
        <span className="h-3 rounded-r shrink-0" style={{ width: `calc((100% - 5.5rem) * ${r.count / max})`, minWidth: r.count > 0 ? 2 : 0, background: SERIES.blue }} />
        <span className="text-slate-900 font-medium whitespace-nowrap" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtCount(r.count)}<span className="text-slate-400 font-normal"> · {Math.round((r.count / total) * 100)}%</span></span>
      </span>
    </li>)}
  </ul>;
}

/** One whole split into parts (<= 4): 28px blocks, share printed inside when it fits; legend carries names and counts. */
export function SegmentedBar({ parts }: { parts: { key: string; label: string; color: string; count: number }[] }) {
  const total = parts.reduce((sum, p) => sum + p.count, 0);
  if (total === 0) return <p className="text-slate-500 text-sm">Chưa có dữ liệu.</p>;
  const share = (count: number) => Math.round((count / total) * 100);
  return <div>
    <div className="flex gap-0.5 h-7" role="img" aria-label={parts.map(p => `${p.label}: ${fmtCount(p.count)} (${share(p.count)}%)`).join(', ')}>
      {parts.filter(p => p.count > 0).map(p => <div key={p.key} title={`${p.label}: ${fmtCount(p.count)} (${share(p.count)}%)`}
        className="rounded flex items-center px-2 text-xs font-medium text-white" style={{ flexGrow: p.count, flexBasis: 0, background: p.color }}>
        {p.count / total >= 0.18 ? `${share(p.count)}%` : ''}
      </div>)}
    </div>
    <ul className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-sm text-slate-600">
      {parts.map(p => <li key={p.key} className="flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} />{p.label}<strong className="text-slate-900 font-medium">{fmtCount(p.count)}</strong></li>)}
    </ul>
  </div>;
}
