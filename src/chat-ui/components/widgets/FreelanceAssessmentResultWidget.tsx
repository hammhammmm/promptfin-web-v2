import React from "react";
import { TransferDivider, TransferGlassCard } from "./TransferShared";

const PROFILE_ROWS = [
  ["รายได้เฉลี่ย (6 เดือน)", "~28,000 บาท/เดือน"],
  ["อาชีพ", "ฟรีแลนซ์"],
  ["วงเงินกู้สูงสุด", "42,000 บาท (1.5 เท่าของรายได้สุทธิ)"],
] as const;

const PRODUCT_FEATURES = [
  "ดอกเบี้ย: 21% ต่อปี (อัตราคงที่)",
  "ผ่อนได้สูงสุด: 5 ปี",
  "ลดต้นลดดอก",
  "ไม่ต้องค้ำ",
  "ไม่ต้องมีสลิปเงินเดือน",
  "ประกันชีวิต: ไม่บังคับ",
] as const;

export function FreelanceAssessmentResultWidget() {
  return (
    <div className="flex flex-col gap-3 w-full min-w-[300px] mt-4">
      <TransferGlassCard>
        <TransferDivider />

        <div className="hidden md:block overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[620px] text-left text-sm text-white/85">
            <tbody>
              {PROFILE_ROWS.map(([label, value], index) => (
                <tr key={label} className={index === 0 ? "" : "border-t border-white/10"}>
                  <td className="px-3 py-3">{label}</td>
                  <td className="px-3 py-3">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-2.5">
          {PROFILE_ROWS.map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
            >
              <p className="text-white/70 text-xs">{label}</p>
              <p className="mt-1 text-white text-sm">{value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 space-y-2.5">
          <div>
            <p className="text-white text-base font-semibold leading-tight">สินเชื่อกรุงไทยใจป้ำ</p>
            <p className="text-white/70 text-xs leading-tight">Krungthai Jai Pump</p>
          </div>
          <div className="h-px w-full bg-white/10" />
          <ul className="space-y-1.5 text-white/85 text-sm">
            {PRODUCT_FEATURES.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </div>

        <TransferDivider />

        <p className="text-white/90 text-sm leading-relaxed">
          💡 จุดเด่นเลยนะครับ ดอกเบี้ยใจปั๊มเป็นอัตราคงที่ครับ ค่างวดจะเท่าเดิมทุกเดือนเลย
          ไม่ต้องกังวลว่าจะขึ้นๆ ลงๆ เหมาะกับรายได้ที่ไม่แน่นอนครับ
        </p>
      </TransferGlassCard>
    </div>
  );
}
