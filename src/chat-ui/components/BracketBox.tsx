import React from "react";
import type { BaseProps } from "../types";
import { CornerAccents } from "./CornerAccents";

export function BracketBox({ children, className = "" }: BaseProps) {
  return (
    <div className={["relative border-1 border-white/10 rounded-full bg-white/[0.012] backdrop-blur-md", className].join(" ")}>
      {/* <CornerAccents size="h-2 w-2" opacity="border-white/40" /> */}
      {children}
    </div>
  );
}
