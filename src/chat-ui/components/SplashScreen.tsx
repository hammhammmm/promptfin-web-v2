"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

type SplashScreenProps = {
  visible: boolean;
};

const CURVE_PATHS = [
  "M-260 270 C 130 80, 470 120, 1260 -120",
  "M-240 640 C 130 500, 560 520, 1260 320",
  "M-320 930 C 90 740, 560 700, 1260 640",
];

export function SplashScreen({ visible }: SplashScreenProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-[120] overflow-hidden"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(8px)", scale: 1.02 }}
          transition={{ duration: 0.7, ease: [0.2, 0.85, 0.3, 1] }}
        >
          <Image
            src="/splash_bg.png"
            alt=""
            fill
            priority
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-[linear-gradient(164deg,rgba(1,3,11,0.34)_0%,rgba(2,7,23,0.38)_36%,rgba(3,16,55,0.22)_72%,rgba(10,32,63,0.2)_100%)]" />
          <div className="absolute inset-0 opacity-45 bg-[radial-gradient(1100px_780px_at_84%_14%,rgba(118,150,188,0.26),transparent_58%),radial-gradient(860px_820px_at_74%_84%,rgba(8,42,120,0.32),transparent_64%)]" />
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(820px_920px_at_10%_20%,rgba(10,31,95,0.38),transparent_66%)]" />

          <motion.div
            className="absolute -left-[40%] -top-[22%] h-[78vh] w-[160vw] rounded-[100%] border border-[#4A8DFF]/5 bg-[radial-gradient(58%_58%_at_52%_42%,rgba(18,62,170,0.06),rgba(3,8,26,0.015))] shadow-[inset_0_-50px_130px_rgba(19,69,182,0.05),0_0_14px_rgba(78,145,255,0.06),0_0_50px_rgba(68,132,255,0.04)] blur-[0.4px]"
            animate={{ x: [0, 14, -8, 0], y: [0, -8, 6, 0] }}
            transition={{ duration: 8.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          >
            <div className="pointer-events-none absolute inset-[-2px] rounded-[100%] border border-[#79B4FF]/8 blur-[8px]" />
            <div className="pointer-events-none absolute inset-[-10px] rounded-[100%] border border-[#4E95FF]/5 blur-[18px]" />
          </motion.div>

          <motion.div
            className="absolute -left-[36%] bottom-[-18%] h-[56vh] w-[178vw] rounded-[100%] border border-[#4A91FF]/5 bg-[radial-gradient(66%_68%_at_48%_40%,rgba(14,66,196,0.06),rgba(4,11,34,0.015))] shadow-[inset_0_18px_90px_rgba(23,88,229,0.05),0_0_14px_rgba(86,149,255,0.06),0_0_50px_rgba(70,135,255,0.04)] blur-[0.35px]"
            animate={{ x: [0, -16, 10, 0], y: [0, 10, -6, 0] }}
            transition={{ duration: 9.1, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          >
            <div className="pointer-events-none absolute inset-[-2px] rounded-[100%] border border-[#86BCFF]/7 blur-[8px]" />
            <div className="pointer-events-none absolute inset-[-10px] rounded-[100%] border border-[#4E95FF]/5 blur-[18px]" />
          </motion.div>

          <motion.div
            className="absolute -right-[36%] top-[36%] h-[48vh] w-[120vw] rotate-[-11deg] rounded-[100%] border border-[#3B73D3]/4 bg-[radial-gradient(58%_62%_at_48%_48%,rgba(15,54,143,0.045),rgba(4,9,28,0.01))] shadow-[0_0_48px_rgba(50,110,230,0.04)]"
            animate={{ x: [0, 10, -6, 0], y: [0, -6, 4, 0] }}
            transition={{ duration: 10.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          >
            <div className="pointer-events-none absolute inset-[-6px] rounded-[100%] border border-[#5A98FF]/4 blur-[14px]" />
          </motion.div>

          <motion.svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 1000 1000"
            fill="none"
            animate={{ x: [0, -18, 10, 0], y: [0, 6, -4, 0] }}
            transition={{ duration: 9, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          >
            {CURVE_PATHS.map((d, index) => (
              <motion.path
                key={d}
                d={d}
                stroke="url(#lineGradient)"
                strokeOpacity={0.78 - index * 0.16}
                strokeWidth={index === 1 ? 2.6 : 2}
                initial={{ pathLength: 0, opacity: 0.25 }}
                animate={{ pathLength: [0, 1, 1], opacity: [0.18, 0.88, 0.42] }}
                transition={{
                  duration: 2.8,
                  delay: index * 0.26,
                  times: [0, 0.72, 1],
                  repeat: Number.POSITIVE_INFINITY,
                  repeatDelay: 0.55,
                  ease: "easeInOut",
                }}
              />
            ))}
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1000" y2="1000">
                <stop offset="0%" stopColor="#1B4AAC" />
                <stop offset="45%" stopColor="#2D8DFF" />
                <stop offset="100%" stopColor="#205BC8" />
              </linearGradient>
            </defs>
          </motion.svg>

          <div className="absolute inset-0 flex items-center justify-center px-8">
            <motion.div
              className="relative"
              initial={{ opacity: 0, y: 14, scale: 0.94, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.95, delay: 0.52, ease: [0.18, 0.9, 0.32, 1] }}
            >
              <motion.div
                className="absolute inset-[-16px] -z-10 rounded-[28px] bg-[radial-gradient(circle,rgba(58,122,255,0.54)_0%,rgba(44,98,227,0.2)_56%,transparent_92%)] blur-xl"
                animate={{ opacity: [0.22, 0.52, 0.22], scale: [0.98, 1.035, 0.98] }}
                transition={{ duration: 2.1, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              />
              <Image
                src="/ping_logo.png"
                alt="Ping"
                width={420}
                height={140}
                priority
                className="h-auto w-[220px] sm:w-[280px] md:w-[340px]"
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
