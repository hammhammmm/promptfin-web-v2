import React from "react";
import Image from "next/image";

export type TransferActionButtonStyle = "primary" | "secondary";

const INSTITUTION_ICON_MATCHERS: Array<{
  key: string;
  keywords: string[];
}> = [
  { key: "ais", keywords: ["AIS"] },
  { key: "true", keywords: ["TRUE"] },
  { key: "dtac", keywords: ["DTAC"] },
  { key: "pp", keywords: ["PROMPTPAY", "PROMPT PAY"] },
  { key: "bbl", keywords: ["BBL", "BANGKOK BANK", "กรุงเทพ"] },
  { key: "kbank", keywords: ["KBANK", "K-BANK", "KASIKORN", "กสิกร"] },
  { key: "ktb", keywords: ["KTB", "KRUNGTHAI", "กรุงไทย"] },
  {
    key: "scb",
    keywords: ["SCB", "SIAM COMMERCIAL", "ไทยพาณิชย์"],
  },
  { key: "ktc", keywords: ["KTC", "KRUNGTHAI CARD", "กรุงไทยคาร์ด"] },
  { key: "uob", keywords: ["UOB", "UNITED OVERSEAS", "ยูโอบี"] },
];

export function resolveInstitutionIconKey(input: string): string | undefined {
  const normalized = input.trim().toUpperCase();
  if (!normalized || normalized === "-") return undefined;

  const matcher = INSTITUTION_ICON_MATCHERS.find(({ keywords }) =>
    keywords.some((keyword) => normalized.includes(keyword))
  );

  return matcher?.key;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function looksLikeThaiMobile(value: string): boolean {
  const digits = digitsOnly(value);
  return /^(06|08|09)\d{8}$/.test(digits);
}

export function formatThaiMobile(value: string): string {
  const digits = digitsOnly(value);
  if (!looksLikeThaiMobile(digits)) return value.trim();
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function looksLikeThaiSavingsAccount(value: string): boolean {
  const digits = digitsOnly(value);
  return /^\d{10}$/.test(digits);
}

export function formatThaiSavingsAccount(value: string): string {
  const digits = digitsOnly(value);
  if (!looksLikeThaiSavingsAccount(digits)) return value.trim();
  return `${digits.slice(0, 3)}-${digits.slice(3, 4)}-${digits.slice(4, 9)}-${digits.slice(9)}`;
}

export function formatDestinationIdentifier(
  value: string,
  options?: { preferPhone?: boolean },
): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-") return "-";
  if (trimmed.includes("*")) return trimmed;

  if (options?.preferPhone && looksLikeThaiMobile(trimmed)) {
    return formatThaiMobile(trimmed);
  }
  if (looksLikeThaiMobile(trimmed)) {
    return formatThaiMobile(trimmed);
  }
  if (looksLikeThaiSavingsAccount(trimmed)) {
    return formatThaiSavingsAccount(trimmed);
  }
  return trimmed;
}

export function formatMoneyAmount(value: number, locale = "th-TH"): string {
  const amount = Number.isFinite(value) ? value : 0;
  const hasFraction = Math.abs(amount % 1) > Number.EPSILON;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export interface TransferActionButton {
  key: string;
  label: string;
  style: TransferActionButtonStyle;
  disabled?: boolean;
  onClick: () => void;
}

interface TransferGlassCardProps {
  children: React.ReactNode;
}

interface TransferPartyRowProps {
  label: string;
  title: string;
  subtitle: string;
  iconSrc?: string;
  iconAlt?: string;
  iconFallbackText?: string;
  iconObjectClassName?: string;
}

interface TransferAmountBlockProps {
  amount: number;
  currency: string;
  note: string;
}

interface TransferActionButtonsProps {
  actions: ReadonlyArray<TransferActionButton>;
}

export function TransferGlassCard({ children }: TransferGlassCardProps) {
  return (
    <div className="relative w-full">
      <span className="pointer-events-none absolute -inset-3 rounded-[30px] bg-[radial-gradient(135%_90%_at_100%_100%,rgba(108,171,255,0.63)_0%,rgba(108,171,255,0)_88%)] blur-[18px]" />
      <span className="pointer-events-none absolute -inset-3 rounded-[30px] bg-[radial-gradient(108%_78%_at_0%_0%,rgba(152,205,255,0.51)_0%,rgba(152,205,255,0)_84%)] blur-[18px]" />
      <span className="pointer-events-none absolute -inset-px rounded-[24px] border border-[#85BCFF]/30" />
      <div className="relative w-full overflow-hidden rounded-[22px] border border-[#6EA4FF]/45 bg-[linear-gradient(145deg,rgba(16,49,138,0.44)_0%,rgba(8,26,88,0.58)_46%,rgba(4,16,58,0.74)_100%)] p-4 shadow-[inset_0_1px_0_rgba(190,224,255,0.25),inset_0_-1px_24px_rgba(6,23,74,0.5),0_18px_36px_rgba(3,10,38,0.5)] backdrop-blur-xl sm:p-5">
        <span className="pointer-events-none absolute inset-0 rounded-[22px] bg-[radial-gradient(130%_85%_at_100%_100%,rgba(122,176,255,0.24)_0%,rgba(122,176,255,0)_54%)]" />
        <span className="pointer-events-none absolute inset-0 rounded-[22px] bg-[radial-gradient(100%_60%_at_50%_-8%,rgba(208,231,255,0.16)_0%,rgba(208,231,255,0)_58%)]" />
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}

export function TransferPartyRow({
  label,
  title,
  subtitle,
  iconSrc,
  iconAlt = "",
  iconFallbackText,
  iconObjectClassName = "object-contain",
}: TransferPartyRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-12 h-12 rounded-full bg-white text-[#12366D] font-bold text-sm flex items-center justify-center shrink-0 border border-white/15 shadow-[0_4px_14px_rgba(5,18,67,0.35)] overflow-hidden">
        {iconSrc ? (
          <Image
            src={iconSrc}
            alt={iconAlt}
            width={32}
            height={32}
            className={iconObjectClassName}
          />
        ) : (
          <span className="text-[#1A3E85] text-xs font-semibold">
            {iconFallbackText}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-white/72 text-sm">
          {label}{" "}
          <span className="text-white text-md font-semibold leading-none">
            {title}
          </span>
        </p>
        <p className="text-white/58 text-xs mt-1 break-all">{subtitle}</p>
      </div>
    </div>
  );
}

export function TransferConnector() {
  return (
    <div className="ml-6 my-1.5 flex h-9 items-center">
      <div className="relative h-full border-l border-dashed border-[#fff] border-1">
        <span className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 text-[#9CD5FF] text-xs">
          ↓
        </span>
      </div>
    </div>
  );
}

export function TransferDivider() {
  return (
    <div className="h-px bg-[linear-gradient(90deg,transparent,rgba(177,213,255,0.25),transparent)] my-4" />
  );
}

export function TransferAmountBlock({
  amount,
  currency,
  note,
}: TransferAmountBlockProps) {
  const noteLines = note
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div>
      <p className="text-white/72 text-sm mb-2">จำนวนเงิน</p>
      <div className="inline-flex items-center gap-2 rounded-sm border border-[#6EA4FF]/35 bg-[linear-gradient(180deg,rgba(56,103,216,0.45)_0%,rgba(24,56,141,0.5)_100%)] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(196,225,255,0.22)]">
        <span className="text-white font-semibold text-2xl leading-none tracking-tight">
          {formatMoneyAmount(amount)}
        </span>
        <span className="text-white/84 text-sm">{currency}</span>
      </div>
      <div className="mt-2.5 flex flex-col uppercase">
        {(noteLines.length > 0 ? noteLines : [note]).map((line, index) => (
          <p key={`${line}-${index}`} className="text-white/65 text-xs py-1">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

export function TransferActionButtons({ actions }: TransferActionButtonsProps) {
  return (
    <div className="flex flex-col gap-3">
      {actions.map((action) => (
        <button
          key={action.key}
          disabled={action.disabled}
          onClick={action.onClick}
          className={`relative isolate w-full overflow-hidden rounded-full border py-4 text-sm font-bold transition-all ${
            action.disabled
              ? "opacity-50 cursor-not-allowed"
              : "active:scale-[0.995]"
          } ${
            action.style === "primary"
              ? "border-1 border-[#4D8BFF]/35 bg-[linear-gradient(180deg,rgba(37,95,221,0.52)_0%,rgba(20,59,165,0.52)_100%)] text-white bg-[#071B41] text-[#58A0FF] hover:text-[#6BAEFF]"
              : "border-[#3A63B3]/3 bg-black/30 text-white/88 hover:text-white"
          }`}
        >
          <span className="relative z-10">{action.label}</span>
        </button>
      ))}
    </div>
  );
}
