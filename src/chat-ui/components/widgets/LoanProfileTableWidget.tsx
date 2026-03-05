import React from "react";
import { TransferDivider, TransferGlassCard } from "./TransferShared";

type LoanProfileRow = {
  label: string;
  value: string;
};

const PROFILE_ROWS: LoanProfileRow[] = [
  { label: "เงินเดือน", value: "35,000 บาท/เดือน" },
  { label: "อายุงาน", value: "3 ปี 2 เดือน" },
  { label: "วงเงินกู้สูงสุด", value: "175,000 บาท (5 เท่าของรายได้สุทธิ)" },
];

export function LoanProfileTableWidget() {
  return (
    <div className="flex flex-col gap-3 w-full min-w-[300px] mt-4">
      <TransferGlassCard>
        <div className="hidden md:block overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[560px] text-left text-sm text-white/85">
            <tbody>
              {PROFILE_ROWS.map((row) => (
                <tr key={row.label} className="border-t border-white/10">
                  <td className="px-3 py-3">{row.label}</td>
                  <td className="px-3 py-3">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-2.5">
          {PROFILE_ROWS.map((row) => (
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
        <div className="space-y-1">
          <p className="text-white text-lg font-bold leading-tight">สินเชื่อกรุงไทยเปย์เดะ</p>
          <p className="text-white/75 text-sm">Krungthai Payday</p>
        </div>

        <TransferDivider />
        <div className="space-y-2.5 text-sm text-white/90 leading-relaxed">
          <p>
            ดอกเบี้ย: MRR + 7% ต่อปี
            <br />
             (MRR = 6.845%ต่อปี ณ 2 มี.ค. 69)
          </p>
          <p>ผ่อนได้สูงสุด: 5 ปี</p>
          <p>ลดต้นลดดอก</p>
          <p>ไม่ต้องค้ำ</p>
          <p>ประกันชีวิต: ไม่บังคับ</p>
        </div>
      </TransferGlassCard>
    </div>
  );
}
