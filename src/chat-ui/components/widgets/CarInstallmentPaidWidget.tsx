import React from "react";
import { TransferActionButtons, TransferDivider, TransferGlassCard } from "./TransferShared";

export type CarInstallmentPaidActionKey = "pay_other" | "done";

interface Props {
  disabled?: boolean;
  onAction: (action: CarInstallmentPaidActionKey) => void;
}

export function CarInstallmentPaidWidget({ disabled, onAction }: Props) {
  return (
    <div className="flex flex-col gap-3 w-full min-w-[300px] mt-4">
      <TransferGlassCard>
        <div className="space-y-1">
          <p className="text-white text-lg font-bold leading-tight">จ่ายค่างวดรถสำเร็จ! ✅</p>
        </div>

        <TransferDivider />

        <div className="hidden md:block overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[620px] text-left text-sm text-white/85">
            <thead className="bg-white/5">
              <tr>
                <th className="px-3 py-2.5 font-semibold">รายการ</th>
                <th className="px-3 py-2.5 font-semibold">ข้อมูล</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-white/10">
                <td className="px-3 py-3">รายการ</td>
                <td className="px-3 py-3">ค่างวดรถ — ลีสซิ่งกสิกร</td>
              </tr>
              <tr className="border-t border-white/10">
                <td className="px-3 py-3">จำนวน</td>
                <td className="px-3 py-3">8,500.00 บาท</td>
              </tr>
              <tr className="border-t border-white/10">
                <td className="px-3 py-3">วันที่</td>
                <td className="px-3 py-3">4 มี.ค. 2569 เวลา: 14:38</td>
              </tr>
              <tr className="border-t border-white/10">
                <td className="px-3 py-3">เลขอ้างอิง</td>
                <td className="px-3 py-3">PAY20260304-143802</td>
              </tr>
              <tr className="border-t border-white/10">
                <td className="px-3 py-3">ยอดคงเหลือ</td>
                <td className="px-3 py-3">6,700.00 บาท</td>
              </tr>
              <tr className="border-t border-white/10">
                <td className="px-3 py-3">สถานะ</td>
                <td className="px-3 py-3">✅ สำเร็จ</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-2.5">
          {[
            ["รายการ", "ค่างวดรถ — ลีสซิ่งกสิกร"],
            ["จำนวน", "8,500.00 บาท"],
            ["วันที่", "4 มี.ค. 2569 เวลา: 14:38"],
            ["เลขอ้างอิง", "PAY20260304-143802"],
            ["ยอดคงเหลือ", "6,700.00 บาท"],
            ["สถานะ", "✅ สำเร็จ"],
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
        <p className="text-white/90 text-sm leading-relaxed">ยังมีรายการที่ยังไม่จ่ายอีกนะครับ:</p>
        <ul className="list-disc pl-6 space-y-1 text-white/85 text-sm">
          <li>💡 ค่าไฟฟ้า 1,850 บาท</li>
          <li>💧 ค่าน้ำประปา 320 บาท</li>
          <li>🎬 Netflix 419 บาท</li>
        </ul>

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
