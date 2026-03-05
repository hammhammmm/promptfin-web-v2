import React from "react";
import { TransferActionButtons, TransferDivider, TransferGlassCard } from "./TransferShared";

export type FreelanceLoanSummaryActionKey = "upload_docs" | "later";

const SUMMARY_ROWS = [
  ["วงเงินกู้", "10,000 บาท"],
  ["ดอกเบี้ย", "21% ต่อปี (คงที่)"],
  ["ระยะผ่อน", "12 เดือน"],
  ["ค่างวด/เดือน", "~932 บาท (เท่ากันทุกเดือน)"],
  ["ดอกเบี้ยรวม", "~1,174 บาท"],
  ["จ่ายทั้งหมด", "~11,174 บาท"],
  ["ค่าอากรแสตมป์", "5 บาท"],
] as const;

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
              {SUMMARY_ROWS.map(([label, value]) => (
                <tr key={label} className="border-t border-white/10">
                  <td className="px-3 py-3">{label}</td>
                  <td className="px-3 py-3">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-2.5">
          {SUMMARY_ROWS.map(([label, value]) => (
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
        <div className="text-white/90 text-sm leading-relaxed space-y-2">
          <p>
            ถ้าคุณเจนโอเคกับเงื่อนไขนี้ เดี๋ยวเราไปขั้นตอนเตรียมเอกสารเพื่อยื่นกู้กันนะครับ 📄✨
          </p>
          <p>ตอนนี้ปิงตรวจให้แล้ว เห็นว่า</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>✅ บัตรประชาชน</li>
            <li>✅ หน้าสมุดบัญชีกรุงไทย</li>
          </ul>
          <p>อัปโหลดเข้าระบบเรียบร้อยแล้วครับ 🎉</p>
          <p>เหลืออีกอย่างเดียวครับ</p>
          <p className="font-semibold">เอกสารที่ยังต้องอัปโหลดเพิ่ม</p>
          <p>📌 รายการเดินบัญชี 6 เดือนล่าสุด (ใช้ยืนยันรายได้จากงานฟรีแลนซ์)</p>
        </div>

        <TransferDivider />
        <TransferActionButtons
          actions={[
            {
              key: "upload_docs",
              label: "อัพโหลดเอกสาร",
              style: "primary",
              disabled,
              onClick: () => onAction("upload_docs"),
            },
            {
              key: "later",
              label: "ไว้ทีหลัง",
              style: "secondary",
              disabled,
              onClick: () => onAction("later"),
            },
          ]}
        />
      </TransferGlassCard>
    </div>
  );
}
