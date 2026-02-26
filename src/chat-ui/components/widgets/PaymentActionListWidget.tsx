import React from "react";
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

export function PaymentActionListWidget({
  items,
  sourceAccountName,
  sourceAccountNo,
  disabled,
  onAction,
}: Props) {
  return (
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
  );
}
