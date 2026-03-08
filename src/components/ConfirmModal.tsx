"use client";

import { useCallback, useEffect, useRef } from "react";

type Props = {
  open: boolean;
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
};

export default function ConfirmModal({ open, message, onConfirm, onCancel, confirmLabel = 'はい', cancelLabel = 'キャンセル' }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
      return;
    }
    if (e.key === 'Tab' && dialogRef.current) {
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [onCancel]);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="確認ダイアログ" ref={dialogRef}>
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative z-10 w-[min(92vw,480px)] bg-white rounded-md shadow-lg p-4">
        <div className="text-gray-900 text-sm">{message}</div>
        <div className="mt-4 flex justify-end gap-2">
          <button ref={cancelRef} onClick={onCancel} className="px-3 py-1 bg-gray-100 rounded">{cancelLabel}</button>
          <button onClick={onConfirm} className="px-3 py-1 bg-red-600 text-white rounded">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
