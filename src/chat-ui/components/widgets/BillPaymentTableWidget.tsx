import React from "react";
import { TransferDivider, TransferGlassCard } from "./TransferShared";

type ActionStyle = "primary" | "secondary";

export type BillPaymentRow = {
  id: string;
  index: number;
  title: string;
  amountText: string;
  status: string;
};

export type BillPaymentAction = {
  key: string;
  label: string;
  style: ActionStyle;
};

interface Props {
  rows: ReadonlyArray<BillPaymentRow>;
  actions: ReadonlyArray<BillPaymentAction>;
  disabled?: boolean;
  onAction: (key: string) => void;
}

function actionClassName(style: ActionStyle): string {
  if (style === "primary") {
    return "border-1 border-[#4D8BFF]/35 bg-[linear-gradient(180deg,rgba(37,95,221,0.52)_0%,rgba(20,59,165,0.52)_100%)] bg-[#071B41] text-[#58A0FF] hover:text-[#6BAEFF]";
  }
  return "border-[#3A63B3]/30 bg-black/30 text-white/88 hover:text-white";
}

export function BillPaymentTableWidget({ rows, actions, disabled, onAction }: Props) {
  return (
    <div className="flex flex-col gap-3 w-full min-w-[300px] mt-4">
      <TransferGlassCard>
        <div className="space-y-1">
          <p className="text-white text-lg font-bold leading-tight">รายการที่ต้องชำระ</p>
          <p className="text-white/70 text-sm">เลือกชำระเป็นรายการหรือจ่ายทั้งหมดได้เลย</p>
        </div>

        <TransferDivider />

        <div className="hidden md:block overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-[680px] w-full text-left text-sm text-white/85">
            <thead className="bg-white/5">
              <tr>
                <th className="px-3 py-2.5 font-semibold">#</th>
                <th className="px-3 py-2.5 font-semibold">รายการ</th>
                <th className="px-3 py-2.5 font-semibold">จำนวนเงิน</th>
                <th className="px-3 py-2.5 font-semibold">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-white/10">
                  <td className="px-3 py-3">{row.index}</td>
                  <td className="px-3 py-3">{row.title}</td>
                  <td className="px-3 py-3">{row.amountText}</td>
                  <td className="px-3 py-3">
                    <span className="inline-flex rounded-full border border-white/20 px-2.5 py-0.5 text-xs">
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-2.5">
          {rows.map((row) => (
            <div
              key={row.id}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-3 text-sm">
                <p className="text-white/80">#{row.index}</p>
                <span className="inline-flex rounded-full border border-white/20 px-2 py-0.5 text-[11px] text-white/85">
                  {row.status}
                </span>
              </div>
              <p className="mt-1.5 text-white font-medium">{row.title}</p>
              <p className="mt-1 text-white/80 text-sm">{row.amountText}</p>
            </div>
          ))}
        </div>

        <TransferDivider />

        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              disabled={disabled}
              onClick={() => onAction(action.key)}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition-all ${
                disabled ? "opacity-50 cursor-not-allowed" : "active:scale-[0.995]"
              } ${actionClassName(action.style)}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </TransferGlassCard>
    </div>
  );
}
