import React from "react";
import { Modal, ModalContent } from "@heroui/react";
import { Delete, X } from "lucide-react";
import {
  formatDestinationIdentifier,
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

type ToolConfirm = {
  action: "tool";
  name: "confirm_transfer";
  args: { prepared_id: string };
};

type Cancel = { action: "cancel"; prepared_id?: string };
type ConfirmDirect = { action: "confirm_transfer"; prepared_id: string };
type Edit = { action: "edit"; prepared_id: string };
type Close = { action: "close" };

export type ActionConfig = ToolConfirm | Cancel | ConfirmDirect | Edit | Close;

export interface ConfirmationAction {
  label: string;
  type: "button";
  style: "primary" | "secondary";
  onClick: ActionConfig;
}

interface Props {
  sourceAccountName?: string;
  sourceAccountNo?: string;
  target?: string;
  beneficiaryName?: string;
  destinationAccount?: string;
  destinationBank?: string;
  amount: number;
  currency?: string;
  autoOpenPin?: boolean;
  actions: ConfirmationAction[];
  disabled?: boolean;
  onAction: (config: ActionConfig) => void;
}

export function PaymentConfirmationWidget({
  sourceAccountName,
  sourceAccountNo,
  target,
  beneficiaryName,
  destinationAccount,
  destinationBank,
  amount,
  currency,
  autoOpenPin,
  actions,
  disabled,
  onAction,
}: Props) {
  const ACTION_DELAY_MS = 500;
  const PIN_COMPLETE_RENDER_DELAY_MS = 120;
  const PIN_RESET_COOLDOWN_MS = 1000;
  const [isPinModalOpen, setIsPinModalOpen] = React.useState(false);
  const [pin, setPin] = React.useState("");
  const [pinError, setPinError] = React.useState<string | null>(null);
  const [isPinInputLocked, setIsPinInputLocked] = React.useState(false);
  const [pendingConfirmAction, setPendingConfirmAction] =
    React.useState<ActionConfig | null>(null);
  const [isDownloadingSlip, setIsDownloadingSlip] = React.useState(false);
  const slipCardRef = React.useRef<HTMLDivElement>(null);
  const pendingSubmitTimeoutRef = React.useRef<number | null>(null);
  const pinInputLockTimeoutRef = React.useRef<number | null>(null);
  const hasAutoOpenedPinRef = React.useRef(false);

  const clearPendingSubmitTimeout = React.useCallback(() => {
    if (pendingSubmitTimeoutRef.current !== null) {
      window.clearTimeout(pendingSubmitTimeoutRef.current);
      pendingSubmitTimeoutRef.current = null;
    }
  }, []);

  const clearPinInputLockTimeout = React.useCallback(() => {
    if (pinInputLockTimeoutRef.current !== null) {
      window.clearTimeout(pinInputLockTimeoutRef.current);
      pinInputLockTimeoutRef.current = null;
    }
  }, []);

  function isConfirmAction(config: ActionConfig): boolean {
    if (config.action === "confirm_transfer") return true;
    return config.action === "tool" && config.name === "confirm_transfer";
  }

  const resetPinState = () => {
    clearPendingSubmitTimeout();
    clearPinInputLockTimeout();
    setIsPinInputLocked(false);
    setPin("");
    setPinError(null);
    setPendingConfirmAction(null);
  };

  const lockPinInputAfterReset = React.useCallback(() => {
    clearPinInputLockTimeout();
    setIsPinInputLocked(true);
    pinInputLockTimeoutRef.current = window.setTimeout(() => {
      setIsPinInputLocked(false);
      pinInputLockTimeoutRef.current = null;
    }, PIN_RESET_COOLDOWN_MS);
  }, [clearPinInputLockTimeout]);

  React.useEffect(() => {
    return () => {
      clearPendingSubmitTimeout();
      clearPinInputLockTimeout();
    };
  }, [clearPendingSubmitTimeout, clearPinInputLockTimeout]);

  const openPinModal = (config: ActionConfig) => {
    setPendingConfirmAction(config);
    setPin("");
    setPinError(null);
    setIsPinModalOpen(true);
  };

  React.useEffect(() => {
    if (!autoOpenPin || hasAutoOpenedPinRef.current || isPinModalOpen) return;
    const confirmAction = actions.find((action) => isConfirmAction(action.onClick));
    if (!confirmAction) return;

    hasAutoOpenedPinRef.current = true;
    openPinModal(confirmAction.onClick);
  }, [actions, autoOpenPin, isPinModalOpen]);

  const closePinModal = () => {
    setIsPinModalOpen(false);
    resetPinState();
  };

  function getDisplayActionLabel(label: string): string {
    const normalized = label.trim().toLowerCase();
    if (normalized === "close" || normalized === "ปิด") {
      return "บันทึกสลิป";
    }
    return label;
  }

  function isSaveSlipAction(config: ActionConfig): boolean {
    return config.action === "close";
  }

  async function downloadSlipImage() {
    if (!slipCardRef.current) return;

    setIsDownloadingSlip(true);
    try {
      const slipPart = displayDestinationAccount || Date.now().toString();
      await exportWidgetAsPng(slipCardRef.current, {
        fileName: `confirmation-${slipPart}.png`,
      });
    } catch (error) {
      console.error("Failed to save confirmation slip", error);
    } finally {
      setIsDownloadingSlip(false);
    }
  }

  const submitPinConfirm = (pinValue = pin) => {
    clearPendingSubmitTimeout();

    if (pinValue.length !== 6) {
      setPinError("กรุณากรอก PIN 6 หลัก");
      return;
    }

    if (pinValue !== "000000") {
      setPinError("PIN ไม่ถูกต้อง");
      setPin("");
      lockPinInputAfterReset();
      return;
    }

    if (!pendingConfirmAction) return;
    const confirmedAction = pendingConfirmAction;
    setIsPinModalOpen(false);
    resetPinState();
    window.setTimeout(() => {
      onAction(confirmedAction);
    }, ACTION_DELAY_MS);
  };

  const appendPinDigit = (digit: string) => {
    if (isPinInputLocked) return;
    if (!/^\d$/.test(digit)) return;
    if (pin.length >= 6) return;

    const nextPin = `${pin}${digit}`;
    setPin(nextPin);
    if (pinError) setPinError(null);

    if (nextPin.length === 6) {
      clearPendingSubmitTimeout();
      pendingSubmitTimeoutRef.current = window.setTimeout(() => {
        pendingSubmitTimeoutRef.current = null;
        submitPinConfirm(nextPin);
      }, PIN_COMPLETE_RENDER_DELAY_MS);
    }
  };

  const removeLastPinDigit = () => {
    if (isPinInputLocked) return;
    if (!pin.length) return;
    clearPendingSubmitTimeout();
    setPin((prev) => prev.slice(0, -1));
    if (pinError) setPinError(null);
  };

  const handleActionClick = (config: ActionConfig) => {
    if (isSaveSlipAction(config)) {
      void downloadSlipImage();
      return;
    }
    if (isConfirmAction(config)) {
      openPinModal(config);
      return;
    }
    onAction(config);
  };

  const normalizeDisplayValue = (value?: string) => {
    const trimmed = value?.trim() || "";
    return trimmed === "-" ? "" : trimmed;
  };

  const displayBeneficiary =
    normalizeDisplayValue(beneficiaryName) || normalizeDisplayValue(target) || "-";
  const rawDestinationAccount =
    normalizeDisplayValue(destinationAccount) || "-";
  const displayDestinationBank = normalizeDestinationBankLabel(destinationBank) || "-";
  const displayCurrency = currency || "บาท";
  const displaySourceAccountName = sourceAccountName?.trim() || displayBeneficiary;
  const displaySourceAccountNo = sourceAccountNo?.trim() || "-";
  const normalizedDestinationBank = displayDestinationBank.trim().toUpperCase();
  const isTelcoTopUp =
    normalizedDestinationBank === "AIS" ||
    normalizedDestinationBank === "TRUE" ||
    normalizedDestinationBank === "DTAC";
  const displayDestinationAccount = formatDestinationIdentifier(rawDestinationAccount, {
    preferPhone: isTelcoTopUp,
  });
  const telcoLabel = isTelcoTopUp ? normalizedDestinationBank : "";
  const destinationIconKey = resolveInstitutionIconKey(normalizedDestinationBank);
  const destinationIconSrc = destinationIconKey
    ? `/icons/${destinationIconKey}.png`
    : undefined;
  const destinationTitle = isTelcoTopUp
    ? `เติมเงิน ${telcoLabel}`
    : displayBeneficiary !== "-"
      ? displayBeneficiary
      : displayDestinationAccount;
  const destinationSubline = isTelcoTopUp
    ? displayDestinationAccount
    : `${displayDestinationAccount}${displayDestinationBank === "-" ? "" : ` · ${displayDestinationBank}`}`;

  function maskAccountNo(accountNo: string): string {
    const cleaned = accountNo.replace(/\s+/g, "");
    if (!cleaned || cleaned === "-") return "-";
    if (cleaned.length <= 4) return cleaned;
    const last4 = cleaned.slice(-4);
    return `${"*".repeat(cleaned.length - 4)}${last4}`;
  }

  return (
    <div className="flex flex-col gap-3 w-full min-w-[300px] mt-4">
      <div ref={slipCardRef}>
        <TransferGlassCard>
          <TransferPartyRow
            label="จาก"
            title={displaySourceAccountName}
            subtitle={`${maskAccountNo(displaySourceAccountNo)} · KTB`}
            iconSrc="/icons/ktb.png"
            iconAlt="KTB"
            iconObjectClassName="w-full h-full object-cover"
          />
          <TransferConnector />
          <TransferPartyRow
            label="ไปยัง"
            title={destinationTitle}
            subtitle={destinationSubline}
            iconSrc={destinationIconSrc}
            iconAlt={normalizedDestinationBank}
            iconFallbackText={!destinationIconSrc ? displayDestinationBank.slice(0, 4).toUpperCase() : undefined}
            iconObjectClassName="w-full h-full object-cover"
          />
          <TransferDivider />
          <TransferAmountBlock
            amount={amount}
            currency={displayCurrency}
            note="ไม่มีค่าธรรมเนียม"
          />
          <TransferDivider />
          <TransferActionButtons
            actions={actions.map((action, index) => ({
              key: `${index}-${action.label}`,
              label: getDisplayActionLabel(action.label),
              style: action.style,
              disabled: disabled || isDownloadingSlip,
              onClick: () => handleActionClick(action.onClick),
            }))}
          />
        </TransferGlassCard>
      </div>

      <Modal
        isOpen={isPinModalOpen}
        hideCloseButton
        isDismissable={false}
        isKeyboardDismissDisabled
        motionProps={{
          variants: {
            enter: {
              y: 0,
              transition: { duration: 0.28, ease: "easeOut" },
            },
            exit: {
              y: "100%",
              transition: { duration: 0.24, ease: "easeIn" },
            },
          },
        }}
        onOpenChange={(open) => {
          setIsPinModalOpen(open);
          if (!open) resetPinState();
        }}
      >
        <ModalContent className="m-0 max-w-none w-screen h-[100dvh] rounded-none bg-white text-[#00A9F4]">
          {() => (
            <div className="h-full flex flex-col px-7 pb-7 pt-12 sm:px-10 sm:pt-14">
              <div className="flex items-start justify-between">
                <div className="leading-none">
                  <p className="text-[24px] font-bold tracking-tight">
                    Krungthai
                  </p>
                  <p className="text-[58px] font-extrabold -mt-1 leading-none tracking-tight">
                    NEXT
                  </p>
                </div>
                <button
                  aria-label="ปิด"
                  className="text-[#71839C] text-base font-semibold"
                  onClick={closePinModal}
                >
                  <X size={24} />
                </button>
              </div>

              <p className="text-[#6F8097] text-xl font-semibold mt-8 tracking-tight text-center">
                ใส่รหัส PIN เพื่อยืนยันตัวตน
              </p>

              <div className="mt-12 flex items-center gap-4 justify-center">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-5 h-5 rounded-full border-2 ${
                      idx < pin.length
                        ? "bg-[#00A9F4] border-[#00A9F4]"
                        : "bg-white border-[#00B7FF]"
                    }`}
                  />
                ))}
              </div>

              {pinError ? (
                <p className="mt-12 text-center text-red-500 text-base font-medium text-md mb-6">
                  {pinError}
                </p>
              ) : null}

              <div className="mt-auto grid grid-cols-3 gap-y-8 gap-x-6 max-w-[420px] w-full self-center pb-1">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    disabled={isPinInputLocked}
                    className="text-[#00A9F4] text-2xl font-semibold leading-none py-2 active:opacity-70"
                    onClick={() => appendPinDigit(digit)}
                  >
                    {digit}
                  </button>
                ))}

                <div />
                <button
                  type="button"
                  disabled={isPinInputLocked}
                  className="text-[#00A9F4] text-2xl font-semibold leading-none py-2 active:opacity-70"
                  onClick={() => appendPinDigit("0")}
                >
                  0
                </button>
                <button
                  type="button"
                  disabled={isPinInputLocked}
                  className="flex items-center justify-center text-[#00A9F4] py-2 active:opacity-70"
                  onClick={removeLastPinDigit}
                >
                  <Delete size={32} strokeWidth={2.2} />
                </button>
              </div>
            </div>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
