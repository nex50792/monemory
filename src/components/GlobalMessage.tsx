"use client";

import { useEffect } from "react";

type Props = {
  message: string | null;
  onClose: () => void;
  duration?: number;
  variant?: "error" | "info";
};

export default function GlobalMessage({ message, onClose, duration = 3000, variant = "error" }: Props) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [message, onClose, duration]);

  if (!message) return null;

  const bg = variant === "error" ? "bg-red-600" : "bg-blue-600";

  return (
    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className={`w-[min(92vw,800px)] ${bg} text-white px-4 py-2 rounded-md shadow-md break-words text-center`}>{message}</div>
    </div>
  );
}
