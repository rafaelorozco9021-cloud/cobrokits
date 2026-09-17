'use client';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

function TooltipPortal({ tip, rect }) {
  if (!tip || !rect || typeof document === 'undefined') return null;
  const top = rect.bottom + 8;
  let left = rect.left + rect.width / 2 - 112; // 224/2
  // clamp to viewport
  if (left < 8) left = 8;
  if (left + 224 > window.innerWidth - 8) left = window.innerWidth - 224 - 8;
  return createPortal(
    <div
      style={{ position: 'fixed', top, left, width: 224, zIndex: 9999 }}
      className="p-2.5 rounded-lg bg-slate-900 text-white text-[11px] leading-snug font-normal shadow-xl border border-slate-700 whitespace-normal pointer-events-none"
    >
      <span
        style={{ position: 'absolute', top: -6, left: rect.left + rect.width / 2 - left - 6, width: 12, height: 12, background: '#0f172a', transform: 'rotate(45deg)', borderLeft: '1px solid #334155', borderTop: '1px solid #334155' }}
      />
      <span className="relative block">{tip}</span>
    </div>,
    document.body
  );
}

export default function ThWithTooltip({ children, tip, className = '' }) {
  const [show, setShow] = useState(false);
  const [rect, setRect] = useState(null);
  const ref = useRef(null);
  useEffect(() => {
    if (!show || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setRect(r);
    const onScroll = () => setShow(false);
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [show]);
  return (
    <>
      <th
        ref={ref}
        title={tip || undefined}
        onMouseEnter={() => tip && setShow(true)}
        onMouseLeave={() => setShow(false)}
        className={`px-1 py-2 ${className}`}
      >
        <span className="inline-flex items-center justify-center gap-1">
          {children}
          {tip && (
            <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-white/20 text-white text-[8px] font-black cursor-help border border-white/30">?</span>
          )}
        </span>
      </th>
      {show && <TooltipPortal tip={tip} rect={rect} />}
    </>
  );
}

// Variants for different header backgrounds
export function ThWithTooltipLight({ children, tip, className = '' }) {
  const [show, setShow] = useState(false);
  const [rect, setRect] = useState(null);
  const ref = useRef(null);
  useEffect(() => {
    if (!show || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setRect(r);
    const onScroll = () => setShow(false);
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [show]);
  return (
    <>
      <th
        ref={ref}
        title={tip || undefined}
        onMouseEnter={() => tip && setShow(true)}
        onMouseLeave={() => setShow(false)}
        className={`px-2 py-2.5 ${className}`}
      >
        <span className="inline-flex items-center justify-center gap-1">
          {children}
          {tip && (
            <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[#2563eb]/10 text-[#2563eb] text-[8px] font-black cursor-help border border-[#2563eb]/20">?</span>
          )}
        </span>
      </th>
      {show && <TooltipPortal tip={tip} rect={rect} />}
    </>
  );
}
