import React from "react";
import { TransferActionButtons, TransferDivider, TransferGlassCard } from "./TransferShared";

export type FreelanceLoanProfileActionKey = "has_docs" | "no_docs";

interface Props {
  disabled?: boolean;
  onAction: (action: FreelanceLoanProfileActionKey) => void;
}

const ROWS = [
  { label: "ชื่อ", value: "เจน มงคล" },
  { label: "อาชีพ", value: "ฟรีแลนซ์ / อาชีพอิสระ" },
  { label: "รายได้เฉลี่ย (6 เดือนล่าสุด)", value: "~28,000 บาท/เดือน" },
  { label: "ความสม่ำเสมอของรายได้", value: "ปานกลาง (มีเดือนที่สูง-ต่ำผันผวน)" },
];

export function FreelanceLoanProfileWidget({ disabled, onAction }: Props) {
  return (
    <div className="flex flex-col gap-3 w-full min-w-[300px] mt-4">
      <TransferGlassCard>
        <p className="text-white text-lg font-bold leading-tight">ข้อมูลเบื้องต้นสำหรับประเมินสินเชื่อ</p>

        <TransferDivider />

        <div className="hidden md:block overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[640px] text-left text-sm text-white/85">
            <thead className="bg-white/5">
              <tr>
                <th className="px-3 py-2.5 font-semibold">ข้อมูล</th>
                <th className="px-3 py-2.5 font-semibold">รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label} className="border-t border-white/10">
                  <td className="px-3 py-3">{row.label}</td>
                  <td className="px-3 py-3">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-2.5">
          {ROWS.map((row) => (
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
          เนื่องจากไม่มีสลิปเงินเดือน ดิฉันต้องขอข้อมูลเพิ่มเติมเพื่อประเมินครับ:
        </p>
        <p className="text-white/90 text-sm leading-relaxed">เอกสารที่ต้องใช้:</p>
        <ul className="list-disc pl-6 space-y-1 text-white/85 text-sm">
          <li>✅ บัตรประชาชน (ยืนยันตัวตนผ่านแอปได้)</li>
          <li>📄 หนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ) หรือ</li>
          <li>📄 เอกสารการเสียภาษี (ภ.พ.30) ย้อนหลัง 6 เดือน</li>
          <li>📄 Statement ย้อนหลัง 6 เดือน (ดึงจากระบบได้เลย)</li>
        </ul>
        <p className="text-white/90 text-sm leading-relaxed">คุณเจนมีเอกสารเหล่านี้ไหมครับ?</p>

        <TransferDivider />
        <TransferActionButtons
          actions={[
            {
              key: "has_docs",
              label: "มี ส่งเอกสารเลย",
              style: "primary",
              disabled,
              onClick: () => onAction("has_docs"),
            },
            {
              key: "no_docs",
              label: "ไม่มีเอกสาร",
              style: "secondary",
              disabled,
              onClick: () => onAction("no_docs"),
            },
          ]}
        />
      </TransferGlassCard>
    </div>
  );
}
