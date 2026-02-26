import React from "react";

type Props = {
  size?: string;
  opacity?: string;
};

export function CornerAccents({
  size = "h-2 w-2",
  opacity = "border-white/50",
}: Props) {
  return (
    <>
      <span className={`pointer-events-none absolute left-0 top-0 ${size} border-l border-t ${opacity}`} />
      <span className={`pointer-events-none absolute left-0 bottom-0 ${size} border-l border-b ${opacity}`} />
      <span className={`pointer-events-none absolute right-0 top-0 ${size} border-r border-t ${opacity}`} />
      <span className={`pointer-events-none absolute right-0 bottom-0 ${size} border-r border-b ${opacity}`} />
    </>
  );
}
