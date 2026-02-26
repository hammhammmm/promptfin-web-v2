"use client";

import React from "react";
import { BracketBox } from "./BracketBox";
import { Icons } from "./Icons";
import { SendHorizontal, Square } from "lucide-react";

type Props = {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  onCancel?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
};

export function InputArea({
  value,
  onChange,
  onSend,
  onCancel,
  disabled,
  isLoading,
}: Props) {
  const hasValue = value.trim().length > 0;
  const inputDisabled = Boolean(disabled) || Boolean(isLoading);
  const isCancelEnabled = Boolean(isLoading) && typeof onCancel === "function";

  return (
    <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-2 z-50 px-4">
      <div className="w-full ">
        <div className="flex items-center gap-3">
          <BracketBox className="flex-1 ">
            <div className="flex items-center gap-3 px-4 py-3">
              <input
                value={value}
                onChange={(e) => onChange(e.currentTarget.value)}
                disabled={inputDisabled}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && hasValue && !inputDisabled) {
                    onSend();
                  }
                }}
                placeholder="จะให้ช่วยอะไรบอกมาได้เลย..."
                className={`flex-1 bg-transparent text-white/80 placeholder:text-white/35 outline-none min-w-0 text-lg ${inputDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                aria-label="message"
              />
              <button
                type="button"
                disabled={!isCancelEnabled && inputDisabled}
                className={`h-10 w-10 shrink-0 relative flex items-center justify-center transition ${
                  isCancelEnabled
                    ? "text-white/80 hover:text-white"
                    : inputDisabled
                      ? "opacity-50 cursor-not-allowed"
                      : "text-white/70 hover:text-white"
                }`}
                aria-label={isCancelEnabled ? "cancel request" : hasValue ? "send" : "voice input"}
                onClick={() => {
                  if (isCancelEnabled) {
                    onCancel();
                    return;
                  }
                  if (!inputDisabled && hasValue) onSend();
                }}
              >
                {isCancelEnabled && <Square size={20} fill="currentColor" />}
                <div
                  className={`absolute inset-0 grid place-items-center transition-all duration-300 ease-in-out ${
                    isCancelEnabled
                      ? "opacity-0 scale-50 rotate-90"
                      : hasValue
                        ? "opacity-0 scale-50 rotate-90"
                        : "opacity-100 scale-100 rotate-0"
                  }`}
                >
                  <Icons.Mic />
                </div>
                <div
                  className={`absolute inset-0 grid place-items-center transition-all duration-300 ease-in-out ${
                    isCancelEnabled
                      ? "opacity-0 scale-50 -rotate-90"
                      : hasValue
                        ? "opacity-100 scale-100 rotate-0"
                        : "opacity-0 scale-50 -rotate-90"
                  }`}
                >
                  <SendHorizontal size={24} />
                </div>
              </button>
            </div>
          </BracketBox>

          {/* <BracketBox className="rounded-xl">
            <button
              type="button"
              className="h-[52px] w-[52px] grid place-items-center text-white/70 hover:text-white transition"
              aria-label="add attachment"
            >
              <Icons.Plus />
            </button>
          </BracketBox> */}
        </div>
      </div>
    </div>
  );
}
