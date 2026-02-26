import React from "react";
import type { ActionItem } from "../types";
import Image from "next/image";

type Props = Omit<ActionItem, "id"> & {
  onClick?: () => void;
  disabled?: boolean;
};

export function ActionCard({ title, subtitle, onClick, disabled }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "group relative isolate w-full h-full text-left overflow-hidden",
        "rounded-[16px] border border-[#63A7FF]/45",
        "bg-[linear-gradient(140deg,rgba(9,34,106,0.56)_0%,rgba(5,19,72,0.4)_50%,rgba(3,13,46,0.52)_100%)]",
        "backdrop-blur-xl",
        "shadow-[inset_0_1px_0_rgba(187,224,255,0.28),inset_0_-1px_16px_rgba(9,38,126,0.35),0_12px_36px_rgba(0,11,45,0.45)]",
        "px-5 py-5",
        "transition duration-200 hover:border-[#86BEFF]/60 hover:shadow-[inset_0_1px_0_rgba(214,237,255,0.36),inset_0_-1px_18px_rgba(12,52,159,0.42),0_14px_40px_rgba(0,15,62,0.5)] active:scale-[0.99]",
        "disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100",
        "select-none flex flex-col",
      ].join(" ")}
    >
      <div className="relative z-10 flex items-start gap-3 flex-1 flex-col">
        <div className="mt-0.5 h-11 w-11 shrink-0 rounded-[16px] bg-white/[0.12] border border-[#9CCCFF]/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] grid place-items-center">
          <Image src="/icons/transfer.svg" width={20} height={20} alt="" />
        </div>

        <div className="min-w-0">
          <div className="body-md text-md font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]">
            {title}
          </div>
          <div className="body-sm text-sm text-white/60 whitespace-pre-wrap">{subtitle}</div>
        </div>
      </div>

      {/* <div className="pointer-events-none absolute inset-0 rounded-[16px] bg-[radial-gradient(120%_80%_at_8%_0%,rgba(193,227,255,0.22)_0%,rgba(193,227,255,0)_48%)] opacity-90 transition duration-200 group-hover:opacity-100" /> */}
      {/* <div className="pointer-events-none absolute inset-0 rounded-[16px] bg-[linear-gradient(180deg,rgba(186,224,255,0.18)_0%,rgba(95,163,255,0.06)_36%,rgba(13,50,140,0.08)_100%)] opacity-70" /> */}
    </button>
  );
}
