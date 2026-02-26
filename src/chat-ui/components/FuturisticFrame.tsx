import React from "react";
import type { BaseProps } from "../types";

type Props = BaseProps & { label: React.ReactNode };

export function FuturisticFrame({ label, className = "" }: Props) {
  return (
    <div
      className={[
        "relative isolate inline-flex max-w-full items-center justify-center overflow-hidden",
        "rounded-full px-8 py-3",
        "text-white/85",
        // "bg-[linear-gradient(140deg,rgba(30,78,198,0.5)_0%,rgba(20,57,156,0.46)_46%,rgba(13,41,121,0.55)_100%)]",
        "bg-black/30",
        "backdrop-blur-xl",
        // "shadow-[inset_0_1px_0_rgba(196,225,255,0.3),inset_0_-1px_16px_rgba(10,34,110,0.34),0_10px_30px_rgba(2,14,58,0.36)]",
        className,
      ].join(" ")}
    >
      <span className="relative z-10 body-lg text-center text-3xl leading-none md:text-4xl font-medium tracking-wide text-[#EAF2FF] drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]">
        {label}
      </span>
      {/* <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(100%_70%_at_50%_-10%,rgba(223,240,255,0.3)_0%,rgba(223,240,255,0)_58%)] opacity-90" /> */}
      {/* <span className="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(180deg,rgba(188,222,255,0.2)_0%,rgba(108,170,255,0.08)_40%,rgba(18,62,170,0.16)_100%)] opacity-80" /> */}
    </div>
  );
}
