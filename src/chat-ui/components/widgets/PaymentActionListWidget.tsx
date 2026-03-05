import React from "react";
import { Modal, ModalContent } from "@heroui/react";
import { Delete, X } from "lucide-react";
import {
  ActionConfig as ConfirmationActionConfig,
  ConfirmationAction,
  PaymentConfirmationWidget,
} from "./PaymentConfirmationWidget";
import {
  PaymentReceiptWidget,
  ReceiptAction,
  ReceiptActionConfig,
} from "./PaymentReceiptWidget";
import { PaymentCancelledWidget } from "./PaymentCancelledWidget";
import {
  TransferActionButtons,
  TransferDivider,
  TransferGlassCard,
} from "./TransferShared";

type WidgetButtonStyle = "primary" | "secondary";
type WidgetButton = {
  label: string;
  type: "button";
  style: WidgetButtonStyle;
  onClick: Record<string, unknown>;
};

export type PaymentActionListConfig =
  | ConfirmationActionConfig
  | ReceiptActionConfig
  | Record<string, unknown>;

type RawListItem = Record<string, unknown>;

interface Props {
  items: ReadonlyArray<RawListItem>;
  sourceAccountName?: string;
  sourceAccountNo?: string;
  disabled?: boolean;
  onAction: (config: PaymentActionListConfig) => void;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isWidgetButton(v: unknown): v is WidgetButton {
  return (
    isRecord(v) &&
    typeof v["label"] === "string" &&
    v["type"] === "button" &&
    (v["style"] === "primary" || v["style"] === "secondary") &&
    isRecord(v["onClick"])
  );
}

function getWidgetFromListItem(item: RawListItem): {
  type: string;
  props: Record<string, unknown>;
  actions: WidgetButton[];
  itemLabel?: string;
} | null {
  const itemLabel =
    typeof item["label"] === "string" && item["label"].trim()
      ? item["label"].trim()
      : undefined;

  if (typeof item["type"] === "string") {
    const props = isRecord(item["props"]) ? item["props"] : {};
    const actions = Array.isArray(item["actions"])
      ? item["actions"].filter(isWidgetButton)
      : [];
    const mergedProps =
      itemLabel && typeof props["label"] !== "string"
        ? { ...props, label: itemLabel }
        : props;

    return {
      type: item["type"],
      props: mergedProps,
      actions,
      itemLabel,
    };
  }

  const widget = isRecord(item["widget"]) ? item["widget"] : null;
  if (!widget || typeof widget["type"] !== "string") return null;

  const widgetProps = isRecord(widget["props"]) ? widget["props"] : {};
  const widgetActions = Array.isArray(widget["actions"])
    ? widget["actions"].filter(isWidgetButton)
    : [];
  const outerActions = Array.isArray(item["actions"])
    ? item["actions"].filter(isWidgetButton)
    : [];
  const mergedProps =
    itemLabel && typeof widgetProps["label"] !== "string"
      ? { ...widgetProps, label: itemLabel }
      : widgetProps;

  return {
    type: widget["type"],
    props: mergedProps,
    actions: widgetActions.length > 0 ? widgetActions : outerActions,
    itemLabel,
  };
}

function renderTopicTitle(title: string) {
  return <p className="text-white/75 text-sm">{title}</p>;
}

function normalizeConfirmationProps(
  rawProps: Record<string, unknown>,
): Record<string, unknown> {
  const props = { ...rawProps };

  const provider =
    typeof props["provider"] === "string" ? props["provider"].trim() : "";
  const mobileNumber =
    typeof props["mobile_number"] === "string"
      ? props["mobile_number"].trim()
      : typeof props["mobile"] === "string"
        ? props["mobile"].trim()
        : "";

  if (!provider || !mobileNumber) return props;

  const providerUpper = provider.toUpperCase();

  if (typeof props["destinationBank"] !== "string" || !props["destinationBank"]) {
    props["destinationBank"] = providerUpper;
  }
  if (
    typeof props["destinationAccount"] !== "string" ||
    !props["destinationAccount"]
  ) {
    props["destinationAccount"] = mobileNumber;
  }
  if (typeof props["target"] !== "string" || !props["target"]) {
    props["target"] = mobileNumber;
  }
  if (typeof props["beneficiaryName"] !== "string" || !props["beneficiaryName"]) {
    props["beneficiaryName"] = `เติมเงิน ${providerUpper}`;
  }

  return props;
}

function isPinRequiredAction(config: unknown): boolean {
  if (!isRecord(config)) return false;
  if (config["action"] === "confirm_transfer") return true;
  if (config["action"] === "confirm_each") return true;
  return config["action"] === "tool" && config["name"] === "confirm_transfer";
}

export function PaymentActionListWidget({
  items,
  sourceAccountName,
  sourceAccountNo,
  disabled,
  onAction,
}: Props) {
  const PIN_COMPLETE_RENDER_DELAY_MS = 120;
  const PIN_RESET_COOLDOWN_MS = 1000;
  const [isPinModalOpen, setIsPinModalOpen] = React.useState(false);
  const [pin, setPin] = React.useState("");
  const [pinError, setPinError] = React.useState<string | null>(null);
  const [isPinInputLocked, setIsPinInputLocked] = React.useState(false);
  const [pendingPinAction, setPendingPinAction] =
    React.useState<PaymentActionListConfig | null>(null);
  const pendingSubmitTimeoutRef = React.useRef<number | null>(null);
  const pinInputLockTimeoutRef = React.useRef<number | null>(null);

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

  const resetPinState = React.useCallback(() => {
    clearPendingSubmitTimeout();
    clearPinInputLockTimeout();
    setPin("");
    setPinError(null);
    setIsPinInputLocked(false);
    setPendingPinAction(null);
  }, [clearPendingSubmitTimeout, clearPinInputLockTimeout]);

  const closePinModal = React.useCallback(() => {
    setIsPinModalOpen(false);
    resetPinState();
  }, [resetPinState]);

  const openPinModal = React.useCallback((config: PaymentActionListConfig) => {
    setPendingPinAction(config);
    resetPinState();
    setPendingPinAction(config);
    setIsPinModalOpen(true);
  }, [resetPinState]);

  const lockPinInputAfterReset = React.useCallback(() => {
    clearPinInputLockTimeout();
    setIsPinInputLocked(true);
    pinInputLockTimeoutRef.current = window.setTimeout(() => {
      setIsPinInputLocked(false);
      pinInputLockTimeoutRef.current = null;
    }, PIN_RESET_COOLDOWN_MS);
  }, [clearPinInputLockTimeout]);

  const handlePinSubmit = React.useCallback((pinValue = pin) => {
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
    const actionToSend = pendingPinAction;
    closePinModal();
    if (actionToSend) onAction(actionToSend);
  }, [clearPendingSubmitTimeout, closePinModal, lockPinInputAfterReset, onAction, pendingPinAction, pin]);

  React.useEffect(() => {
    return () => {
      clearPendingSubmitTimeout();
      clearPinInputLockTimeout();
    };
  }, [clearPendingSubmitTimeout, clearPinInputLockTimeout]);

  const appendPinDigit = React.useCallback((digit: string) => {
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
        handlePinSubmit(nextPin);
      }, PIN_COMPLETE_RENDER_DELAY_MS);
    }
  }, [clearPendingSubmitTimeout, handlePinSubmit, isPinInputLocked, pin, pinError]);

  const removeLastPinDigit = React.useCallback(() => {
    if (isPinInputLocked) return;
    if (!pin.length) return;
    clearPendingSubmitTimeout();
    setPin((prev) => prev.slice(0, -1));
    if (pinError) setPinError(null);
  }, [clearPendingSubmitTimeout, isPinInputLocked, pin.length, pinError]);

  const handleSummaryActionClick = React.useCallback(
    (config: PaymentActionListConfig) => {
      if (disabled) return;
      if (isPinRequiredAction(config)) {
        openPinModal(config);
        return;
      }
      onAction(config);
    },
    [disabled, onAction, openPinModal],
  );

  return (
    <>
      <div className="flex flex-col gap-5 w-full min-w-[250px] mt-4">
        {items.map((item, index) => {
          const widget = getWidgetFromListItem(item);
          const type = widget?.type ?? "";
          const rawProps = widget?.props ?? {};
          const props =
            type === "payment_confirmation"
              ? normalizeConfirmationProps(rawProps)
              : rawProps;
          const actions = widget?.actions ?? [];

          if (type === "payment_confirmation") {
            const isCompactSummary = props["compactSummary"] === true;
            if (isCompactSummary) {
              const topic =
                widget?.itemLabel ??
                ((typeof props["label"] === "string" && props["label"].trim())
                  ? props["label"]
                  : "ทำรายการทั้งหมด");
              const summaryMessage =
                typeof props["message"] === "string" && props["message"].trim()
                  ? props["message"]
                  : "รวมรายการทั้งหมด";
              const transferActions = actions.map((action, actionIndex) => ({
                key: `${action.label}-${actionIndex}`,
                label: action.label,
                style: action.style,
                disabled,
                onClick: () => handleSummaryActionClick(action.onClick),
              }));

              return (
                <div key={`${type}-${index}`} className="space-y-2">
                  {renderTopicTitle(topic)}
                  <div className="flex flex-col gap-3 w-full min-w-[300px] mt-1">
                    <TransferGlassCard>
                      <div className="space-y-2">
                        <p className="text-white text-lg font-bold leading-tight">
                          รวมรายการ
                        </p>
                        <p className="text-white/80 text-sm leading-relaxed">
                          {summaryMessage}
                        </p>
                      </div>
                      <TransferDivider />
                      <TransferActionButtons actions={transferActions} />
                    </TransferGlassCard>
                  </div>
                </div>
              );
            }

            const amount =
              typeof props["amount"] === "number" ? props["amount"] : 0;
            const topic =
              widget?.itemLabel ??
              ((typeof props["label"] === "string" && props["label"].trim())
                ? props["label"]
                : `รายการที่ ${index + 1}`);

            return (
              <div key={`${type}-${index}`} className="space-y-2">
                {renderTopicTitle(topic)}
                <PaymentConfirmationWidget
                  sourceAccountName={sourceAccountName}
                  sourceAccountNo={sourceAccountNo}
                  target={
                    typeof props["target"] === "string"
                      ? props["target"]
                      : undefined
                  }
                  beneficiaryName={
                    typeof props["beneficiaryName"] === "string"
                      ? props["beneficiaryName"]
                      : typeof props["label"] === "string"
                        ? props["label"]
                        : undefined
                  }
                  destinationAccount={
                    typeof props["destinationAccount"] === "string"
                      ? props["destinationAccount"]
                      : undefined
                  }
                  destinationBank={
                    typeof props["destinationBank"] === "string"
                      ? props["destinationBank"]
                      : undefined
                  }
                  amount={amount}
                  currency={
                    typeof props["currency"] === "string"
                      ? props["currency"]
                      : "บาท"
                  }
                  actions={actions as ConfirmationAction[]}
                  disabled={disabled}
                  onAction={(config) => onAction(config)}
                />
              </div>
            );
          }

          if (type === "payment_receipt") {
          const topic =
            widget?.itemLabel ??
            ((typeof props["summary"] === "string" && props["summary"].trim())
              ? props["summary"]
              : `ผลลัพธ์รายการที่ ${index + 1}`);

          return (
            <div key={`${type}-${index}`} className="space-y-2">
              {renderTopicTitle(topic)}
              <PaymentReceiptWidget
                status={typeof props["status"] === "string" ? props["status"] : "success"}
                txn_id={typeof props["txn_id"] === "string" ? props["txn_id"] : ""}
                balance={typeof props["balance"] === "number" ? props["balance"] : 0}
                summary={typeof props["summary"] === "string" ? props["summary"] : ""}
                sourceAccountName={sourceAccountName}
                sourceAccountNo={sourceAccountNo}
                destinationLabel={
                  typeof props["label"] === "string" && props["label"].trim()
                    ? props["label"]
                    : typeof props["beneficiaryName"] === "string"
                      ? props["beneficiaryName"]
                      : undefined
                }
                destinationAccount={
                  typeof props["destinationAccount"] === "string"
                    ? props["destinationAccount"]
                    : typeof props["target"] === "string"
                      ? props["target"]
                      : undefined
                }
                destinationBank={
                  typeof props["destinationBank"] === "string"
                    ? props["destinationBank"]
                    : undefined
                }
                amount={typeof props["amount"] === "number" ? props["amount"] : undefined}
                currency={typeof props["currency"] === "string" ? props["currency"] : "บาท"}
                actions={actions as ReceiptAction[]}
                disabled={disabled}
                onAction={(config) => onAction(config)}
              />
            </div>
          );
        }

          if (type === "payment_cancelled") {
          const topic =
            widget?.itemLabel ??
            ((typeof props["message"] === "string" && props["message"].trim())
              ? props["message"]
              : `รายการที่ ${index + 1} ถูกยกเลิก`);

          return (
            <div key={`${type}-${index}`} className="space-y-2">
              {renderTopicTitle(topic)}
              <PaymentCancelledWidget
                prepared_id={
                  typeof props["prepared_id"] === "string" ? props["prepared_id"] : ""
                }
                message={typeof props["message"] === "string" ? props["message"] : "ยกเลิกรายการแล้ว"}
              />
            </div>
          );
        }

          return (
            <div
              key={`unknown-${index}`}
              className="bg-[#1C1C1E]/40 rounded-xl overflow-hidden border border-white/10 w-full shadow-lg p-4"
            >
              <p className="text-white/70 text-md">ไม่รองรับ widget ประเภท: {type || "unknown"}</p>
            </div>
          );
        })}
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
                  <p className="text-[24px] font-bold tracking-tight">Krungthai</p>
                  <p className="text-[58px] font-extrabold -mt-1 leading-none tracking-tight">NEXT</p>
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
    </>
  );
}
