import React from "react";
import { TransferDivider, TransferGlassCard } from "./TransferShared";

export function FreelanceAssessmentResultWidget() {
  return (
    <div className="flex flex-col gap-3 w-full min-w-[300px] mt-4">
      <TransferGlassCard>
        <p className="text-white text-lg font-bold leading-tight">ผลการประเมินเบื้องต้นครับ:</p>

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
                <td className="px-3 py-3">ประเภท</td>
                <td className="px-3 py-3">💰 สินเชื่อส่วนบุคคล — อาชีพอิสระ</td>
              </tr>
              <tr className="border-t border-white/10">
                <td className="px-3 py-3">วงเงินอนุมัติสูงสุด</td>
                <td className="px-3 py-3">50,000 บาท</td>
              </tr>
              <tr className="border-t border-white/10">
                <td className="px-3 py-3">ดอกเบี้ย</td>
                <td className="px-3 py-3">20% ต่อปี</td>
              </tr>
              <tr className="border-t border-white/10">
                <td className="px-3 py-3">ระยะเวลาผ่อน</td>
                <td className="px-3 py-3">12-36 เดือน</td>
              </tr>
              <tr className="border-t border-white/10">
                <td className="px-3 py-3">ผ่อนขั้นต่ำ</td>
                <td className="px-3 py-3">~1,806 บาท/เดือน (36 ด.)</td>
              </tr>
              <tr className="border-t border-white/10">
                <td className="px-3 py-3">เงื่อนไขเพิ่มเติม</td>
                <td className="px-3 py-3">อาจต้องมีคนค้ำประกัน ⚠️</td>
              </tr>
              <tr className="border-t border-white/10">
                <td className="px-3 py-3">ระยะเวลาอนุมัติ</td>
                <td className="px-3 py-3">1-3 วันทำการ</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-2.5">
          {[
            ["ประเภท", "💰 สินเชื่อส่วนบุคคล — อาชีพอิสระ"],
            ["วงเงินอนุมัติสูงสุด", "50,000 บาท"],
            ["ดอกเบี้ย", "20% ต่อปี"],
            ["ระยะเวลาผ่อน", "12-36 เดือน"],
            ["ผ่อนขั้นต่ำ", "~1,806 บาท/เดือน (36 ด.)"],
            ["เงื่อนไขเพิ่มเติม", "อาจต้องมีคนค้ำประกัน ⚠️"],
            ["ระยะเวลาอนุมัติ", "1-3 วันทำการ"],
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
          คุณเจนต้องการกู้จำนวนเท่าไหร่ครับ?
        </p>
      </TransferGlassCard>
    </div>
  );
}
