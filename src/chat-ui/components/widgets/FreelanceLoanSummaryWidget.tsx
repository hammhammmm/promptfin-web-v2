import React from "react";
import { TransferActionButtons, TransferDivider, TransferGlassCard } from "./TransferShared";

export type FreelanceLoanSummaryActionKey = "confirm_request";

interface Props {
  disabled?: boolean;
  onAction: (action: FreelanceLoanSummaryActionKey) => void;
}

export function FreelanceLoanSummaryWidget({ disabled, onAction }: Props) {
  return (
    <div className="flex flex-col gap-3 w-full min-w-[300px] mt-4">
      <TransferGlassCard>
        <p className="text-white text-lg font-bold leading-tight">สรุปรายละเอียดสินเชื่อครับ:</p>

        <TransferDivider />

        <div className="hidden md:block overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[620px] text-left text-sm text-white/85">
            <thead className="bg-white/5">
              <tr>
                <th className="px-3 py-2.5 font-semibold">รายละเอียด</th>
                <th className="px-3 py-2.5 font-semibold">ข้อมูล</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["วงเงินกู้", "10,000 บาท"],
                ["ดอกเบี้ย", "20% ต่อปี"],
                ["ระยะเวลาผ่อน", "12 เดือน"],
                ["ผ่อนต่อเดือน", "~926 บาท"],
                ["ยอดรวมชำระ", "~11,112 บาท"],
                ["คนค้ำ", "ไม่ต้อง (วงเงินไม่เกิน 20,000)"],
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
            ["วงเงินกู้", "10,000 บาท"],
            ["ดอกเบี้ย", "20% ต่อปี"],
            ["ระยะเวลาผ่อน", "12 เดือน"],
            ["ผ่อนต่อเดือน", "~926 บาท"],
            ["ยอดรวมชำระ", "~11,112 บาท"],
            ["คนค้ำ", "ไม่ต้อง (วงเงินไม่เกิน 20,000)"],
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
          เนื่องจากเป็นอาชีพอิสระ จะต้องรอผลอนุมัติภายใน 1 วันทำการครับ
          <br />
          ระบบจะแจ้งผลผ่านแอปและ SMS นะครับ
        </p>

        <TransferDivider />
        <TransferActionButtons
          actions={[
            {
              key: "confirm_request",
              label: "ยืนยันการขอสินเชื่อ",
              style: "primary",
              disabled,
              onClick: () => onAction("confirm_request"),
            },
               {
                  key: "cancel_loan",
                  label: "ยกเลิก",
                  style: "secondary",
                  disabled,
                  onClick: () => onAction("cancel_loan"),
                },
          ]}
        />
      </TransferGlassCard>
    </div>
  );
}
