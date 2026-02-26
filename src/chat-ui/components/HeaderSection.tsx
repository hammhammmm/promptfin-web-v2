import React from "react";
import { FuturisticFrame } from "./FuturisticFrame";

type HeaderSectionProps = {
  displayName?: string | null;
};

export function HeaderSection({ displayName }: HeaderSectionProps) {
  const normalizedName = displayName?.trim() || "";
  const hasName = normalizedName.length > 0;
  const [showName, setShowName] = React.useState(false);

  React.useEffect(() => {
    if (!hasName) {
      setShowName(false);
      return;
    }

    const rafId = window.requestAnimationFrame(() => setShowName(true));
    return () => window.cancelAnimationFrame(rafId);
  }, [hasName, normalizedName]);

  const greetingLabel = (
    <span className="inline-flex items-center">
      <span>สวัสดีครับ</span>
      <span
        className={`inline-block overflow-hidden whitespace-nowrap transition-all duration-500 ease-out ${
          showName ? "ml-2 max-w-[260px] opacity-100" : "ml-0 max-w-0 opacity-0"
        }`}
      >
        {hasName ? `คุณ ${normalizedName}` : ""}
      </span>
    </span>
  );

  return (
    <div className="px-8 text-center flex flex-col items-center space-y-3">
      <FuturisticFrame label={greetingLabel} />
      <div className="heading-2xl text-2xl font-bold text-white">มีอะไรให้เราช่วยบอกมาได้เลยครับ</div>
      <div className="body-md text-white/48">สามารถพิมพ์หรือบอกกันได้เลยครับ</div>
    </div>
  );
}
