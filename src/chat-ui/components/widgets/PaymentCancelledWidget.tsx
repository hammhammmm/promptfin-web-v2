import React from "react";
import { XCircle } from "lucide-react";
import { TransferDivider, TransferGlassCard } from "./TransferShared";

export interface PaymentCancelledProps {
  prepared_id: string;
  message: string;
}

export function PaymentCancelledWidget({
  prepared_id,
  message,
}: PaymentCancelledProps) {
  function maskId(value: string): string {
    const cleaned = value.trim();
    if (!cleaned || cleaned === "-") return "-";
    if (cleaned.length <= 4) return cleaned;
    if (cleaned.length <= 8) {
      return `${cleaned.slice(0, 2)}${"*".repeat(cleaned.length - 4)}${cleaned.slice(-2)}`;
    }
    return `${cleaned.slice(0, 4)}${"*".repeat(cleaned.length - 8)}${cleaned.slice(-4)}`;
  }

  const trimmedMessage = message?.trim() || "คำสั่งโอนถูกยกเลิกแล้ว";
  const hasPreparedId = typeof prepared_id === "string" && prepared_id.trim() !== "";

  return (
    <div className="flex flex-col gap-3 w-full min-w-[300px] mt-4">
      <TransferGlassCard>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center p-2 bg-[#7A1F2A] text-[#FFC8CF]">
            <XCircle size={22} />
          </div>
          <p className="text-white text-lg font-bold leading-tight">ยกเลิกรายการแล้ว</p>
        </div>

        <TransferDivider />

        <div className="space-y-2">
          <p className="text-white/70 text-sm uppercase">สถานะรายการ</p>
          <p className="text-white text-base leading-relaxed">{trimmedMessage}</p>
        </div>

        {/* {hasPreparedId ? (
          <>
            <TransferDivider />
            <div className="flex items-center justify-between gap-3">
              <p className="text-white/65 text-xs uppercase">Prepared ID</p>
              <p className="text-white/90 text-sm font-medium break-all text-right">
                {maskId(prepared_id)}
              </p>
            </div>
          </>
        ) : null} */}
      </TransferGlassCard>
    </div>
  );
}
