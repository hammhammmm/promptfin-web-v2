import React from "react";
import {
  TransferActionButtons,
  TransferDivider,
  TransferGlassCard,
} from "./TransferShared";

const SUMMARY_ROWS = [
  { label: "วงเงินกู้", value: "10,000 บาท" },
  { label: "ดอกเบี้ย", value: "MRR+7% (MRR = 6.845%ต่อปี ณ 2 มี.ค. 69)" },
  { label: "ระยะเวลาผ่อน", value: "12 เดือน" },
  { label: "ค่างวด/เดือน", value: "~896 บาท" },
  { label: "ดอกเบี้ยรวม", value: "~752 บาท" },
  { label: "จ่ายทั้งหมด", value: "~10,752 บาท" },
  { label: "ค่าอากรแสตมป์", value: "5 บาท" },
];

export type LoanOfferActionKey = "confirm_loan" | "cancel_loan";

interface Props {
  disabled?: boolean;
  onAction?: (action: LoanOfferActionKey) => void;
}

export function LoanOfferSummaryWidget({ disabled, onAction }: Props) {
  return (
    <div className="flex flex-col gap-3 w-full min-w-[300px] mt-4">
      <TransferGlassCard>
        <div className="space-y-1">
          <p className="text-white text-lg font-bold leading-tight">สรุปรายละเอียดสินเชื่อครับ</p>
        </div>

        <TransferDivider />

        <div className="hidden md:block overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[520px] text-left text-sm text-white/85">
            <thead className="bg-white/5">
              <tr>
                <th className="px-3 py-2.5 font-semibold">รายละเอียด</th>
                <th className="px-3 py-2.5 font-semibold">ข้อมูล</th>
              </tr>
            </thead>
            <tbody>
              {SUMMARY_ROWS.map((row) => (
                <tr key={row.label} className="border-t border-white/10">
                  <td className="px-3 py-3">{row.label}</td>
                  <td className="px-3 py-3">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-2.5">
          {SUMMARY_ROWS.map((row) => (
            <div
              key={row.label}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
            >
              <p className="text-white/70 text-xs">{row.label}</p>
              <p className="mt-1 text-white text-sm">{row.value}</p>
            </div>
          ))}
        </div>

        <TransferDivider />
        <p className="text-white/90 text-sm leading-relaxed">
          เนื่องจากคุณเจนมีประวัติเงินเดือนเข้าบัญชีสม่ำเสมอ ระบบสามารถ
          {" "}
          <strong>อนุมัติอัตโนมัติ</strong>
          {" "}
          ได้เลยครับ ✅
        </p>

        {onAction ? (
          <>
            <TransferDivider />
            <TransferActionButtons
              actions={[
                {
                  key: "confirm_loan",
                  label: "ยืนยันการขอสินเชื่อ",
                  style: "primary",
                  disabled,
                  onClick: () => onAction("confirm_loan"),
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
          </>
        ) : null}
      </TransferGlassCard>
    </div>
  );
}
