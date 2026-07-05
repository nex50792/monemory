"use client";

import VoiceRecorder from "@/components/VoiceRecorder";
import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/chat/history", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const list: Array<{ role: string; content: string }> = await res.json();
        if (cancelled) return;
        const filtered: Msg[] = list
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }));
        setMessages(filtered);
      } catch {
        // 履歴取得失敗はUIをブロックしない
      } finally {
        if (!cancelled) setHistoryLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const clearHistory = async () => {
    if (!confirm("会話履歴を削除しますか?この操作は取り消せません。")) return;
    try {
      const res = await fetch("/api/chat/history", { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMessages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "履歴削除に失敗しました");
    }
  };

  const send = async (text: string) => {
    const query = text.trim();
    if (!query || busy) return;
    setError(null);
    setBusy(true);
    setMessages((prev) => [...prev, { role: "user", content: query }]);
    setInput("");
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    scrollToBottom();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      let streamError: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const raw of events) {
          const line = raw.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]" || payload === "[ERROR]") continue;
          try {
            const parsed = JSON.parse(payload);
            if (typeof parsed.message === "string" && parsed.code) {
              streamError = parsed.message;
              continue;
            }
            const delta = typeof parsed.delta === "string" ? parsed.delta : "";
            if (!delta) continue;
            accumulated += delta;
            setMessages((prev) => {
              const next = prev.slice();
              next[next.length - 1] = { role: "assistant", content: accumulated };
              return next;
            });
            scrollToBottom();
          } catch {
            // ignore malformed data lines
          }
        }
      }

      if (streamError) {
        throw new Error(streamError);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 flex flex-col h-[calc(100dvh-6rem)]">
      <header className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">AI 家計コンパニオン</h1>
          <p className="text-sm text-gray-600">
            過去の記録を元に質問に答えます (例: 先月の食費は? / ランチの傾向は?)
          </p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearHistory}
            className="text-xs text-gray-500 hover:text-red-600 underline"
          >
            履歴を削除
          </button>
        )}
      </header>

      <section
        aria-label="会話履歴"
        className="flex-1 overflow-y-auto space-y-3 p-2 bg-gray-50 rounded"
      >
        {!historyLoaded && (
          <p className="text-sm text-gray-500">履歴を読み込み中...</p>
        )}
        {historyLoaded && messages.length === 0 && (
          <p className="text-sm text-gray-500">
            質問を入力してください。過去記録から関連情報を検索して回答します。
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 rounded whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-white border text-gray-900"
              }`}
            >
              {m.content || (busy && i === messages.length - 1 ? "…" : "")}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </section>

      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <form
        className="mt-3 flex gap-2 items-start"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <div className="flex-1 flex flex-col gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="質問を入力…(音声も可)"
            className="w-full px-3 py-2 border rounded"
            disabled={busy}
          />
          <VoiceRecorder
            onTranscript={(t) => setInput((prev) => (prev ? `${prev} ${t}` : t))}
            label="音声で入力"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="px-4 py-2 rounded bg-indigo-600 text-white disabled:bg-gray-300"
        >
          送信
        </button>
      </form>
    </div>
  );
}
