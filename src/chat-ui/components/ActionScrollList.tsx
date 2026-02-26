"use client";

import React from "react";
import { MOCK_ACTIONS } from "../data/actions";
import { useMouseDragScroll } from "../hooks/useMouseDragScroll";
import { ActionCard } from "./ActionCard";

type ActionScrollListProps = {
  onActionClick?: (title: string, subtitle?: string) => void;
  disabled?: boolean;
};

export function ActionScrollList({
  onActionClick,
  disabled,
}: ActionScrollListProps) {
  const { ref: scrollRef, isDragging } = useMouseDragScroll();
  const groupRef = React.useRef<HTMLDivElement>(null);
  const items = MOCK_ACTIONS.filter((action) => action.id !== "1" && action.id !== "2");

  React.useEffect(() => {
    const slider = scrollRef.current;
    const group = groupRef.current;
    if (!slider || !group) return;

    let frameId = 0;
    let loopWidth = 0;
    let canAnimate = false;
    let virtualScrollLeft = slider.scrollLeft;
    let lastTs: number | null = null;

    const recalc = () => {
      loopWidth = group.scrollWidth;
      canAnimate = loopWidth > 0 && slider.scrollWidth - slider.clientWidth > 1;
      virtualScrollLeft = slider.scrollLeft;
      if (loopWidth > 0 && slider.scrollLeft >= loopWidth) {
        virtualScrollLeft = slider.scrollLeft % loopWidth;
        slider.scrollLeft = virtualScrollLeft;
      }
    };
    recalc();

    const resizeObserver = new ResizeObserver(() => {
      recalc();
    });
    resizeObserver.observe(group);
    resizeObserver.observe(slider);

    const step = (ts: number) => {
      if (lastTs === null) {
        lastTs = ts;
      }
      const dtMs = Math.min(ts - lastTs, 34);
      lastTs = ts;

      if (!disabled && !isDragging && canAnimate && loopWidth > 0) {
        const pxPerSecond = Math.max(loopWidth / 88, 22);
        virtualScrollLeft += (pxPerSecond * dtMs) / 1000;

        if (virtualScrollLeft >= loopWidth) {
          virtualScrollLeft -= loopWidth;
        }
        slider.scrollLeft = virtualScrollLeft;
      } else {
        virtualScrollLeft = slider.scrollLeft;
      }

      frameId = window.requestAnimationFrame(step);
    };

    frameId = window.requestAnimationFrame(step);
    return () => {
      resizeObserver.disconnect();
      window.cancelAnimationFrame(frameId);
    };
  }, [disabled, isDragging, scrollRef]);

  return (
    <div className="relative -mx-6 overflow-hidden">
      <div
        ref={scrollRef}
        className={`flex gap-0 overflow-x-auto pb-6 hide-scrollbar cursor-grab touch-pan-y select-none ${
          disabled ? "pointer-events-none" : ""
        }`}
        style={{ WebkitOverflowScrolling: "auto" }}
      >
        {[0, 1].map((copy) => (
          <div
            key={copy}
            ref={copy === 0 ? groupRef : undefined}
            className="flex shrink-0 gap-3 pr-3"
          >
            {items.map((action) => (
              <div key={`${copy}-${action.id}`} className="shrink-0 w-[220px] h-[150px]">
                <ActionCard
                  title={action.title}
                  subtitle={action.subtitle}
                  onClick={() => onActionClick?.(action.title, action.subtitle)}
                  disabled={disabled}
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Right Edge Fade */}
      <div className="pointer-events-none absolute right-0 top-0 h-full w-14 bg-gradient-to-l from-[#050713] to-transparent z-10" />
    </div>
  );
}
