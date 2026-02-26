import React from "react";
import { Icons } from "./Icons";

export function IOSStatusBar() {
  const bars = [2, 3, 4, 5];

  return (
    <div className="flex items-center justify-between px-6 pt-6 text-white/90 select-none">
      <div className="text-2xl font-semibold tracking-tight">9:41</div>

      <div className="flex items-center gap-2">
        {/* signal */}
        <div className="flex items-end gap-[2px]">
          {bars.map((h) => (
            <span
              key={h}
              className="w-[3px] rounded-sm bg-white/85"
              style={{ height: `${h * 4}px` }}
            />
          ))}
        </div>

        <Icons.Wifi />

        {/* battery */}
        <div className="relative h-5 w-11 rounded-md border border-white/60">
          <div className="absolute right-[-4px] top-1/2 h-2.5 w-1 -translate-y-1/2 rounded-sm bg-white/60" />
          <div className="h-full w-[70%] rounded-md bg-white/70" />
        </div>
      </div>
    </div>
  );
}
