import React from "react";
import { TransferActionButtons, TransferDivider, TransferGlassCard } from "./TransferShared";

export type FreelanceLoanSubmittedActionKey =
  | "pay_other"
  | "check_loan_status"
  | "done";

interface Props {
  disabled?: boolean;
  onAction: (action: FreelanceLoanSubmittedActionKey) => void;
}

export function FreelanceLoanSubmittedWidget({ disabled, onAction }: Props) {
  return (
    <div className="flex flex-col gap-3 w-full min-w-[300px] mt-4">
      <TransferGlassCard>
        <p className="text-white text-lg font-bold leading-tight">
          ยื่นคำขอสินเชื่อเรียบร้อยแล้วครับ! 📨
        </p>

        <TransferDivider />

        <div className="hidden md:block overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[620px] text-left text-sm text-white/85">
            <thead className="bg-white/5">
              <tr>
                <th className="px-3 py-2.5 font-semibold">หัวข้อ</th>
                <th className="px-3 py-2.5 font-semibold">รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["เลขที่คำขอ", "LN20260304-0892"],
                ["วงเงิน", "10,000 บาท"],
                ["สถานะ", "⏳ รอพิจารณา"],
                ["แจ้งผลภายใน", "5 มี.ค. 2569"],
                ["แจ้งผลผ่าน", "แอป + SMS"],
              ].map(([label, value]) => (
                <tr key={label} className="border-t border-white/10">
                  <td className="px-3 py-3">{label}</td>
                  <td className="px-3 py-3">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-2.5">
          {[
            ["เลขที่คำขอ", "LN20260304-0892"],
            ["วงเงิน", "10,000 บาท"],
            ["สถานะ", "⏳ รอพิจารณา"],
            ["แจ้งผลภายใน", "5 มี.ค. 2569"],
            ["แจ้งผลผ่าน", "แอป + SMS"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
            >
              <p className="text-white/70 text-xs">{label}</p>
              <p className="mt-1 text-white text-sm">{value}</p>
            </div>
          ))}
        </div>

        <TransferDivider />
        <p className="text-white/90 text-sm leading-relaxed">
          ระหว่างรอผลอนุมัติ คุณเจนต้องการทำรายการอื่นไหมครับ?
        </p>

        <TransferDivider />
        <TransferActionButtons
          actions={[
            {
              key: "pay_other",
              label: "จ่ายรายการอื่น",
              style: "primary",
              disabled,
              onClick: () => onAction("pay_other"),
            },
            {
              key: "check_loan_status",
              label: "ตรวจสอบสถานะสินเชื่อ",
              style: "secondary",
              disabled,
              onClick: () => onAction("check_loan_status"),
            },
            {
              key: "done",
              label: "ไว้ทีหลัง",
              style: "secondary",
              disabled,
              onClick: () => onAction("done"),
            },
          ]}
        />
      </TransferGlassCard>
    </div>
  );
}
