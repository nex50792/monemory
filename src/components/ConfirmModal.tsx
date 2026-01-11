"use client";

type Props = {
  open: boolean;
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
};

export default function ConfirmModal({ open, message, onConfirm, onCancel, confirmLabel = 'はい', cancelLabel = 'キャンセル' }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative z-10 w-[min(92vw,480px)] bg-white rounded-md shadow-lg p-4">
        <div className="text-gray-900 text-sm">{message}</div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1 bg-gray-100 rounded">{cancelLabel}</button>
          <button onClick={onConfirm} className="px-3 py-1 bg-red-600 text-white rounded">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
