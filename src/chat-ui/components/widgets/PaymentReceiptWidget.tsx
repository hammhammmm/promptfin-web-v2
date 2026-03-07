import React from "react";
import { Check, XCircle } from "lucide-react";
import {
  formatDestinationIdentifier,
  looksLikeThaiMobile,
  normalizeDestinationBankLabel,
  resolveInstitutionIconKey,
  TransferActionButtons,
  TransferAmountBlock,
  TransferConnector,
  TransferDivider,
  TransferGlassCard,
  TransferPartyRow,
} from "./TransferShared";
import { exportWidgetAsPng } from "./widgetCanvasExport";

type ToolAction = {
  action: "tool";
  name: string;
  args?: Record<string, unknown>;
};

type CloseAction = { action: "close" };
type CancelAction = { action: "cancel"; prepared_id?: string };
type ConfirmAction = { action: "confirm_transfer"; prepared_id: string };
type EditAction = { action: "edit"; prepared_id: string };

export type ReceiptActionConfig =
  | ToolAction
  | CloseAction
  | CancelAction
  | ConfirmAction
  | EditAction;

export interface ReceiptAction {
  label: string;
  type: "button";
  style: "primary" | "secondary";
  onClick: ReceiptActionConfig;
}

export interface PaymentReceiptProps {
  status: "success" | "error" | string;
  txn_id: string;
  balance: number;
  summary: string;
  sourceAccountName?: string;
  sourceAccountNo?: string;
  destinationLabel?: string;
  destinationAccount?: string;
  destinationSubline?: string;
  destinationBank?: string;
  amount?: number;
  currency?: string;
  actions?: ReceiptAction[];
  disabled?: boolean;
  onAction?: (config: ReceiptActionConfig) => void;
}

export function PaymentReceiptWidget({
  status,
  txn_id,
  balance,
  summary,
  sourceAccountName,
  sourceAccountNo,
  destinationLabel,
  destinationAccount,
  destinationSubline,
  destinationBank,
  amount,
  currency,
  actions = [],
  disabled = false,
  onAction,
}: PaymentReceiptProps) {
  function parseReceiptSummary(text: string): {
    txnId?: string;
    remainingBalance?: number;
  } {
    const txnMatch = text.match(/txn[_\s-]*id\s*:\s*([^\s)]+)/i);
    const balanceMatch = text.match(/คงเหลือ\s*([0-9,\s.]+)\s*บาท/i);
    const parsedBalance = balanceMatch?.[1]
      ? Number(balanceMatch[1].replace(/[,\s]/g, ""))
      : undefined;

    return {
      txnId: txnMatch?.[1]?.trim(),
      remainingBalance:
        typeof parsedBalance === "number" && Number.isFinite(parsedBalance)
          ? parsedBalance
          : undefined,
    };
  }

  const isSuccess = status === "success";
  const [clicked, setClicked] = React.useState(false);
  const [isDownloadingSlip, setIsDownloadingSlip] = React.useState(false);
  const receiptCardRef = React.useRef<HTMLDivElement>(null);

  const safeTxn = typeof txn_id === "string" ? txn_id.trim() : "";
  const safeBalance =
    typeof balance === "number" && Number.isFinite(balance) ? balance : 0;
  const safeAmount =
    typeof amount === "number" && Number.isFinite(amount) ? amount : safeBalance;

  const visibleActions = React.useMemo(() => {
    if (isSuccess) return actions;
    return actions.filter((action) => !isSaveSlipAction(action.onClick));
  }, [actions, isSuccess]);
  const canRenderActions =
    visibleActions.length > 0 && typeof onAction === "function";
  const isDisabled = disabled || clicked;
  const displayCurrency = currency?.trim() || "บาท";
  const trimmedSummary = summary?.trim() || "";
  const parsedSummary = parseReceiptSummary(trimmedSummary);
  const summaryTxnId = parsedSummary.txnId || safeTxn;
  const randomTxnPrefix = React.useMemo(() => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `txn-${Math.random().toString(36).slice(2, 10)}`;
  }, []);
  const compositeTxnId = summaryTxnId
    ? `${randomTxnPrefix}${summaryTxnId}`
    : randomTxnPrefix;
  const displayTxnId = compositeTxnId.replace(/-/g, "").slice(-16);
  const summaryBalance =
    parsedSummary.remainingBalance ??
    (Number.isFinite(safeBalance) ? safeBalance : undefined);
  const transactionDateTimeText = React.useMemo(() => {
    const now = new Date();
    const datePart = new Intl.DateTimeFormat("th-TH", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Bangkok",
    }).format(now);
    const timePart = new Intl.DateTimeFormat("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Bangkok",
    }).format(now);
    return `${datePart} ${timePart} น.`;
  }, []);
  const successNoteParts = [
    `วันที่ทำรายการ: ${transactionDateTimeText}`,
    displayTxnId ? `เลขที่รายการ: ${displayTxnId}` : "",
    typeof summaryBalance === "number"
      ? `คงเหลือ ${summaryBalance.toLocaleString("th-TH")} บาท`
      : "",
  ].filter(Boolean);
  const successNote = successNoteParts.join("\n");

  const sourceName = sourceAccountName?.trim() || "บัญชีต้นทาง";
  const sourceNo = sourceAccountNo?.trim() || "X 1234";
  const destBank = normalizeDestinationBankLabel(destinationBank) || "AIS";
  const destTitle = destinationLabel?.trim() || trimmedSummary || "เติมเงินสำเร็จ";
  const normalizedDestBank = destBank.toUpperCase();
  const isTelcoTopUp =
    normalizedDestBank === "AIS" ||
    normalizedDestBank === "TRUE" ||
    normalizedDestBank === "DTAC";
  const formattedDestinationAccount = formatDestinationIdentifier(
    destinationAccount?.trim() || "",
    { preferPhone: isTelcoTopUp },
  );
  const formattedDestinationSubline = destinationSubline?.trim()
    ? destinationSubline.trim()
    : formattedDestinationAccount;
  const destinationRef = formattedDestinationSubline || safeTxn || "-";
  const destinationIconKey = resolveInstitutionIconKey(normalizedDestBank);
  const destinationIconSrc = destinationIconKey
    ? `/icons/${destinationIconKey}.png`
    : undefined;

  function maskAccountNo(accountNo: string): string {
    const cleaned = accountNo.replace(/\s+/g, "");
    if (!cleaned || cleaned === "-") return "-";
    if (looksLikeThaiMobile(cleaned)) {
      return formatDestinationIdentifier(cleaned, { preferPhone: true });
    }
    if (cleaned.length <= 4) return cleaned;
    return `X ${cleaned.slice(-4)}`;
  }

  function getDisplayActionLabel(label: string): string {
    const normalized = label.trim().toLowerCase();
    if (normalized === "close" || normalized === "ปิด") {
      return "บันทึกสลิป";
    }
    return label;
  }

  function isSaveSlipAction(config: ReceiptActionConfig): boolean {
    return config.action === "close";
  }

  async function downloadReceiptImage() {
    if (!receiptCardRef.current) return;

    setIsDownloadingSlip(true);
    try {
      const txnPart = displayTxnId || safeTxn || Date.now().toString();
      await exportWidgetAsPng(receiptCardRef.current, {
        fileName: `receipt-${txnPart}.png`,
      });
    } catch (error) {
      console.error("Failed to save receipt slip", error);
    } finally {
      setIsDownloadingSlip(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 w-full min-w-[300px] mt-4 w-full">
      <div ref={receiptCardRef}>
        <TransferGlassCard>
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center p-2 ${
              isSuccess
                ? "bg-[#1E57C9] text-[#BBD4FF]"
                : "bg-[#7A1F2A] text-[#FFC8CF]"
            }`}
          >
            {isSuccess ? <Check size={24} /> : <XCircle size={22} />}
          </div>
          <p className="text-white text-lg font-bold leading-tight">
            {isSuccess ? ("ทำรายการสำเร็จ") : "ทำรายการไม่สำเร็จ"}
          </p>
        </div>
        <TransferDivider />
        <TransferPartyRow
          label="จาก"
          title={sourceName}
          subtitle={`${maskAccountNo(sourceNo)} · KTB`}
          iconSrc="/icons/ktb.png"
          iconAlt="KTB"
          iconObjectClassName="w-full h-full object-cover"
        />
        <TransferConnector />
        <TransferPartyRow
          label="ไปยัง"
          title={destTitle}
          subtitle={destinationRef}
          iconSrc={destinationIconSrc}
          iconAlt={normalizedDestBank}
          iconFallbackText={!destinationIconSrc ? normalizedDestBank.slice(0, 4) : undefined}
          iconObjectClassName="w-full h-full object-cover"
        />
        <TransferDivider />
        <TransferAmountBlock
          amount={safeAmount}
          currency={displayCurrency}
          note={
            isSuccess
              ? successNote || trimmedSummary || "ทำรายการสำเร็จ"
              : safeTxn
              ? `รหัสรายการ ${summary}`
              : "โปรดลองอีกครั้ง"
          }
        />

        {canRenderActions && (
          <>
            <TransferDivider />
            <TransferActionButtons
              actions={visibleActions.map((action, index) => ({
                key: `${index}-${action.label}`,
                label: getDisplayActionLabel(action.label),
                style: action.style,
                disabled: isDisabled || isDownloadingSlip,
                onClick: async () => {
                  if (isSaveSlipAction(action.onClick)) {
                    await downloadReceiptImage();
                    return;
                  }
                  setClicked(true);
                  onAction(action.onClick);
                },
              }))}
            />
          </>
        )}
        </TransferGlassCard>
      </div>
    </div>
  );
}
