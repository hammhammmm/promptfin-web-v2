"use client";

import React from "react";

type StarData = {
  id: string;
  style: React.CSSProperties;
};

export function StarsBackground() {
  const stars = React.useMemo<StarData[]>(() => {
    return Array.from({ length: 40 }).map((_, i) => {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const size = Math.random() < 0.12 ? 2 : 1;

      // brightness tuned (your latest)
      const baseOpacity = (0.5 + Math.random() * 0.35) * 0.8;

      const willTwinkle = Math.random() < 0.65;
      const twinkleOpacity = willTwinkle
        ? Math.min(0.45, baseOpacity + (0.35 + Math.random() * 0.25) * 0.3)
        : baseOpacity;

      const twinkleDuration = willTwinkle ? 1.8 + Math.random() * 3.8 : 999;
      const driftDuration = 5 + Math.random() * 12;

      return {
        id: `star-${i}`,
        style: {
          left: `${x}%`,
          top: `${y}%`,
          width: `${size}px`,
          height: `${size}px`,
          // CSS vars
          ["--dx" as never]: `${(Math.random() - 0.5) * 40}px`,
          ["--dy" as never]: `${(Math.random() - 0.5) * 40}px`,
          ["--o1" as never]: baseOpacity,
          ["--o2" as never]: twinkleOpacity,
          animationName: "star-drift, star-twinkle",
          animationDuration: `${driftDuration}s, ${twinkleDuration}s`,
          animationDelay: `${-(Math.random() * driftDuration)}s, ${-(Math.random() * 6)}s`,
          animationIterationCount: "infinite",
          animationTimingFunction: "ease-in-out",
        },
      };
    });
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes star-drift {
          0%, 100% { transform: translate3d(0,0,0); }
          50% { transform: translate3d(var(--dx), var(--dy), 0); }
        }
        @keyframes star-twinkle {
          0%, 100% { opacity: var(--o1); }
          50% { opacity: var(--o2); }
        }
      `}</style>

      {stars.map((s) => (
        <span key={s.id} className="absolute rounded-full bg-white" style={s.style} />
      ))}
    </div>
  );
}
