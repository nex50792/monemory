"use client";

import { useRef, useState } from "react";

type Props = {
  onTranscript?: (transcript: string) => void;
  className?: string;
  label?: string;
};

export default function VoiceRecorder({ onTranscript, className, label = "音声で入力" }: Props) {
  const [status, setStatus] = useState<"idle" | "recording" | "uploading">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const start = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: mime });
        chunksRef.current = [];
        setStatus("uploading");
        try {
          const form = new FormData();
          form.append(
            "audio",
            blob,
            mime === "audio/webm" ? "voice.webm" : "voice.mp4",
          );
          const res = await fetch("/api/voice", { method: "POST", body: form });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error ?? `HTTP ${res.status}`);
          }
          const result: { transcript: string } = await res.json();
          onTranscript?.(result.transcript);
        } catch (err) {
          setErrorMessage(
            err instanceof Error ? err.message : "音声の処理に失敗しました",
          );
        } finally {
          setStatus("idle");
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setStatus("recording");
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "マイクへのアクセスが許可されていません",
      );
      setStatus("idle");
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
  };

  return (
    <div className={className}>
      {status === "idle" && (
        <button
          type="button"
          onClick={start}
          aria-label={label}
          className="inline-flex items-center gap-2 px-3 py-2 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        >
          <span aria-hidden>🎤</span>
          <span className="text-sm">{label}</span>
        </button>
      )}
      {status === "recording" && (
        <button
          type="button"
          onClick={stop}
          className="inline-flex items-center gap-2 px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 animate-pulse"
        >
          <span aria-hidden>■</span>
          <span className="text-sm">録音停止</span>
        </button>
      )}
      {status === "uploading" && (
        <span className="text-sm text-gray-600">認識中...</span>
      )}
      {errorMessage && (
        <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
      )}
    </div>
  );
}
