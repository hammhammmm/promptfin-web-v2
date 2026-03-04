import React from "react";
import { TransferActionButtons, TransferDivider, TransferGlassCard } from "./TransferShared";

export type LoanNextStepActionKey = "pay_now" | "pay_later";

interface Props {
  disabled?: boolean;
  onAction: (action: LoanNextStepActionKey) => void;
}

export function LoanNextStepWidget({ disabled, onAction }: Props) {
  return (
    <div className="flex flex-col gap-3 w-full min-w-[300px] mt-4">
      <TransferGlassCard>
        <p className="text-white text-lg font-bold leading-relaxed">
          คุณเจนต้องการดำเนินการจ่ายค่างวดรถ 8,500 บาท ต่อเลยไหมครับ?
        </p>

        <TransferDivider />

        <TransferActionButtons
          actions={[
            {
              key: "pay_now",
              label: "จ่ายเลย",
              style: "primary",
              disabled,
              onClick: () => onAction("pay_now"),
            },
            {
              key: "pay_later",
              label: "ไว้ทีหลัง",
              style: "secondary",
              disabled,
              onClick: () => onAction("pay_later"),
            },
          ]}
        />
      </TransferGlassCard>
    </div>
  );
}
