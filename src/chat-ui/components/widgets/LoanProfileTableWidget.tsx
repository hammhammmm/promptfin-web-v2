import React from "react";
import { TransferDivider, TransferGlassCard } from "./TransferShared";

type LoanProfileRow = {
  label: string;
  value: string;
};

const PROFILE_ROWS: LoanProfileRow[] = [
  { label: "ชื่อ", value: "เจน มงคล" },
  { label: "อาชีพ", value: "พนักงานบริษัท" },
  { label: "เงินเดือน", value: "35,000 บาท/เดือน" },
  { label: "อายุงาน", value: "3 ปี 2 เดือน" },
  { label: "เงินเดือนเข้าบัญชีนี้", value: "สม่ำเสมอ 24 เดือนล่าสุด" },
];

export function LoanProfileTableWidget() {
  return (
    <div className="flex flex-col gap-3 w-full min-w-[300px] mt-4">
      <TransferGlassCard>
        <div className="space-y-1">
          <p className="text-white text-lg font-bold leading-tight">ข้อมูลเบื้องต้นสำหรับประเมินสินเชื่อ</p>
        </div>

        <TransferDivider />

        <div className="hidden md:block overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[560px] text-left text-sm text-white/85">
            <thead className="bg-white/5">
              <tr>
                <th className="px-3 py-2.5 font-semibold">ข้อมูล</th>
                <th className="px-3 py-2.5 font-semibold">รายละเอียด</th>
              </tr>
            </thead>
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
      </TransferGlassCard>
    </div>
  );
}
