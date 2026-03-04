import React from "react";
import { TransferActionButtons, TransferDivider, TransferGlassCard } from "./TransferShared";

export type InsufficientFundsActionKey =
  | "transfer_other_account"
  | "personal_loan"
  | "cancel";

interface Props {
  disabled?: boolean;
  onAction: (key: InsufficientFundsActionKey) => void;
}

export function InsufficientFundsWidget({ disabled, onAction }: Props) {
  return (
    <div className="flex flex-col gap-3 w-full min-w-[300px] mt-4">
      <TransferGlassCard>
        <div className="space-y-1">
          <p className="text-white text-lg font-bold leading-tight">
            โอนจากบัญชีอื่น หรือดูตัวเลือกสินเชื่อให้
          </p>
        </div>

        <TransferDivider />

        <TransferActionButtons
          actions={[
            {
              key: "transfer_other_account",
              label: "โอนเงินจากบัญชีอื่น",
              style: "primary",
              disabled,
              onClick: () => onAction("transfer_other_account"),
            },
            {
              key: "personal_loan",
              label: "ขอสินเชื่อส่วนบุคคล",
              style: "primary",
              disabled,
              onClick: () => onAction("personal_loan"),
            },
            {
              key: "cancel",
              label: "ยกเลิก",
              style: "secondary",
              disabled,
              onClick: () => onAction("cancel"),
            },
          ]}
        />
      </TransferGlassCard>
    </div>
  );
}
