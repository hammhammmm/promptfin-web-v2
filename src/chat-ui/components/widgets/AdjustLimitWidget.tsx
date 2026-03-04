import React from "react";
import {
  TransferActionButtons,
  TransferDivider,
  TransferGlassCard,
} from "./TransferShared";

type WidgetButtonStyle = "primary" | "secondary";

export type AdjustLimitAction = {
  label: string;
  type: "button";
  style: WidgetButtonStyle;
  onClick: Record<string, unknown>;
};

interface Props {
  message: string;
  actions: ReadonlyArray<AdjustLimitAction>;
  disabled?: boolean;
  onAction: (config: Record<string, unknown>) => void;
}

export function AdjustLimitWidget({ message, actions, disabled, onAction }: Props) {
  const transferActions = actions.map((action, index) => ({
    key: `${action.label}-${index}`,
    label: action.label,
    style: action.style,
    disabled,
    onClick: () => onAction(action.onClick),
  }));

  return (
    <div className="flex flex-col gap-3 w-full min-w-[300px] mt-4">
      <TransferGlassCard>
        <div className="space-y-2">
          <p className="text-white text-lg font-bold leading-tight">ปรับวงเงินโอน</p>
          <p className="text-white/80 text-sm leading-relaxed">{message}</p>
        </div>

        <TransferDivider />
        <TransferActionButtons actions={transferActions} />
      </TransferGlassCard>
    </div>
  );
}
