"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CommitStrategy, useScribe } from "@elevenlabs/react";
import { Mic, Square, X } from "lucide-react";

type Props = {
  isOpen: boolean;
  initialText: string;
  onClose: () => void;
  onApply: (text: string) => void;
};

export function VoiceInputModal({ isOpen, initialText, onClose, onApply }: Props) {
  const [isSupported, setIsSupported] = React.useState<boolean>(false);
  const [isPreparing, setIsPreparing] = React.useState<boolean>(false);
  const [transcript, setTranscript] = React.useState<string>("");
  const [errorMessage, setErrorMessage] = React.useState<string>("");
  const {
    isConnected,
    isTranscribing,
    partialTranscript,
    committedTranscripts,
    error,
    connect,
    disconnect,
    clearTranscripts,
  } = useScribe({
    autoConnect: false,
    modelId: "scribe_v2_realtime",
    languageCode: "th",
    commitStrategy: CommitStrategy.VAD,
    microphone: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
    },
    onAuthError: ({ error: msg }) => setErrorMessage(`Auth error: ${msg}`),
    onInputError: ({ error: msg }) => setErrorMessage(`Input error: ${msg}`),
    onRateLimitedError: ({ error: msg }) => setErrorMessage(`Rate limited: ${msg}`),
    onQuotaExceededError: ({ error: msg }) => setErrorMessage(`Quota exceeded: ${msg}`),
    onTranscriberError: ({ error: msg }) => setErrorMessage(`Transcriber error: ${msg}`),
    onUnacceptedTermsError: ({ error: msg }) => setErrorMessage(`Terms error: ${msg}`),
  });

  React.useEffect(() => {
    const canRecord =
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      typeof navigator.mediaDevices?.getUserMedia === "function";
    setIsSupported(canRecord);
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    setTranscript(initialText);
    setErrorMessage("");
  }, [initialText, isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  React.useEffect(() => {
    if (!isOpen) {
      disconnect();
      setIsPreparing(false);
    }
  }, [disconnect, isOpen]);

  React.useEffect(() => {
    if (!error) return;
    setErrorMessage(error);
  }, [error]);

  React.useEffect(() => {
    const committedText = committedTranscripts.map((item) => item.text.trim()).join(" ").trim();
    const combinedText = [committedText, partialTranscript.trim()].filter(Boolean).join(" ").trim();
    if (combinedText) {
      setTranscript(combinedText);
    }
  }, [committedTranscripts, partialTranscript]);

  const startListening = React.useCallback(async () => {
    if (!isSupported || isPreparing) return;
    let token = "";
    let modelId = "scribe_v2_realtime";
    try {
      setErrorMessage("");
      setIsPreparing(true);
      clearTranscripts();

      const tokenResp = await fetch("/api/v1/transcribe/token", {
        method: "GET",
        cache: "no-store",
      });
      const tokenData: unknown = await tokenResp.json().catch(() => null);
      if (!tokenResp.ok || typeof tokenData !== "object" || tokenData === null) {
        throw new Error("ไม่สามารถสร้าง token สำหรับ realtime transcription ได้");
      }

      token =
        typeof (tokenData as { token?: unknown }).token === "string"
          ? (tokenData as { token: string }).token
          : "";
      modelId =
        typeof (tokenData as { modelId?: unknown }).modelId === "string"
          ? (tokenData as { modelId: string }).modelId
          : "scribe_v2_realtime";
      const languageCode =
        typeof (tokenData as { languageCode?: unknown }).languageCode === "string"
          ? (tokenData as { languageCode: string }).languageCode
          : "";

      if (!token) throw new Error("ไม่ได้รับ realtime token");

      await connect({
        token,
        modelId,
        languageCode: languageCode || "th",
        commitStrategy: CommitStrategy.VAD,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
    } catch {
      try {
        // Fallback to auto language detection if explicit Thai config fails.
        await connect({
          token,
          modelId,
          commitStrategy: CommitStrategy.VAD,
          microphone: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        });
      } catch {
        setErrorMessage("เชื่อมต่อระบบถอดเสียงแบบ realtime ไม่สำเร็จ");
      }
    } finally {
      setIsPreparing(false);
    }
  }, [clearTranscripts, connect, isPreparing, isSupported]);

  const stopListening = React.useCallback(() => {
    disconnect();
  }, [disconnect]);

  const canApply = transcript.trim().length > 0 && !isPreparing;
  const isListening = isConnected || isTranscribing;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
          className="fixed inset-0 z-[120] bg-[#020814]/90 backdrop-blur-md"
          aria-modal="true"
          role="dialog"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 16 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex h-full w-full flex-col px-6 pb-8 pt-6 text-white"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/70">Voice to Text</p>
              <button
                type="button"
                onClick={onClose}
                className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/5 text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label="close voice modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 flex flex-1 flex-col items-center justify-center">
              <div className="relative grid place-items-center">
                {isListening && (
                  <>
                    <span className="absolute h-40 w-40 rounded-full bg-cyan-400/20 animate-ping" />
                    <span className="absolute h-56 w-56 rounded-full border border-cyan-300/20" />
                  </>
                )}
                <button
                  type="button"
                  onClick={() => (isListening ? stopListening() : startListening())}
                  disabled={!isSupported || isPreparing}
                  className={`relative grid h-24 w-24 place-items-center rounded-full transition ${
                    isSupported && !isPreparing
                      ? "bg-cyan-400/20 text-cyan-100 hover:bg-cyan-300/30"
                      : "cursor-not-allowed bg-white/10 text-white/40"
                  }`}
                  aria-label={isListening ? "stop recording" : "start recording"}
                >
                  {isListening ? <Square size={26} fill="currentColor" /> : <Mic size={30} />}
                </button>
              </div>

              <p className="mt-8 text-sm text-white/70">
                {isPreparing
                  ? "กำลังเชื่อมต่อ..."
                  : isListening
                    ? "กำลังฟังอยู่..."
                    : "แตะเพื่อเริ่มพูด"}
              </p>

              <div className="mt-6 w-full max-w-2xl rounded-2xl border border-white/15 bg-white/5 p-4">
                <p className="min-h-24 whitespace-pre-wrap break-words text-base text-white/90">
                  {transcript || "ข้อความที่ถอดเสียงจะปรากฏตรงนี้"}
                </p>
              </div>

              {errorMessage && <p className="mt-4 text-sm text-red-300">{errorMessage}</p>}
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="h-12 flex-1 rounded-xl border border-white/20 bg-white/5 text-white/85 transition hover:bg-white/10"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!canApply) return;
                  disconnect();
                  onApply(transcript.trim());
                }}
                disabled={!canApply}
                className={`h-12 flex-1 rounded-xl font-medium transition ${
                  canApply
                    ? "bg-cyan-300 text-[#0A2247] hover:bg-cyan-200"
                    : "cursor-not-allowed bg-white/15 text-white/40"
                }`}
              >
                ใช้ข้อความนี้
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
