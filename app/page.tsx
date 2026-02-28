"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HeaderSection } from "@/src/chat-ui/components/HeaderSection";
import { ActionGrid } from "@/src/chat-ui/components/ActionGrid";
import { ActionScrollList } from "@/src/chat-ui/components/ActionScrollList";
import { InputArea } from "@/src/chat-ui/components/InputArea";
import { StarsBackground } from "@/src/chat-ui/effects/StarsBackground";
import { AccountNavbar, AccountOption } from "@/src/chat-ui/components/AccountNavbar";
import { ChatOutput, UIAction, useChat } from "@/src/chat-ui/hooks/useChat";
import { PROFILE_CONFIG } from "@/src/chat-ui/config/profile";
import {
  ConfirmationAction,
  PaymentConfirmationWidget,
} from "@/src/chat-ui/components/widgets/PaymentConfirmationWidget";
import {
  PaymentReceiptWidget,
  ReceiptAction,
  ReceiptActionConfig,
} from "@/src/chat-ui/components/widgets/PaymentReceiptWidget";
import { PaymentCancelledWidget } from "@/src/chat-ui/components/widgets/PaymentCancelledWidget";
import { PaymentActionListWidget } from "@/src/chat-ui/components/widgets/PaymentActionListWidget";
import { SplashScreen } from "@/src/chat-ui/components/SplashScreen";
import { formatDestinationIdentifier } from "@/src/chat-ui/components/widgets/TransferShared";

const STREAMING_CONFIG = {
  minLengthToAnimate: 24,
  longTextThreshold: 420,
  shortTextTargetSteps: 28,
  longTextTargetSteps: 40,
  initialDelayMs: 80,
  totalDurationMs: 1400,
  minStepDelayMs: 14,
  maxStepDelayMs: 36,
  speedMultiplier: 0.8, // >1 เร็วขึ้น, <1 ช้าลง
} as const;
const CONFIRM_WIDGET_EXIT_MS = 280;
const STREAM_CURSOR_TOKEN = "__STREAM_CURSOR__";
const SPLASH_DURATION_MS = 1700;
const POST_WIDGET_FOLLOWUP_MESSAGE = "มีอะไรให้ผมช่วยดูแลเพิ่มเติมไหมครับ";
const PROMPT_INJECTION_PATTERNS: ReadonlyArray<RegExp> = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions?/i,
  /reveal\s+(the\s+)?(system|developer)\s+prompt/i,
  /\b(system|developer)\s+prompt\b/i,
  /act\s+as\s+(a\s+)?(system|admin|root|developer)/i,
  /bypass\s+(all\s+)?(guardrails|rules|safety)/i,
  /jailbreak/i,
];

function hasPromptInjectionSignals(text: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

function shouldKeepMessage(message: Message): boolean {
  if (message.role !== "user") return true;
  return !hasPromptInjectionSignals(message.content);
}

function mapChatErrorToToastMessage(rawError: string): string {
  const error = rawError.toLowerCase();

  if (error.includes("message exceeds") || error.includes("too long")) {
    return "ข้อความยาวเกินกำหนด กรุณาย่อข้อความแล้วลองใหม่";
  }
  if (error.includes("messages[] exceeds limit")) {
    return "จำนวนข้อความมากเกินไป กรุณาเริ่มคำขอใหม่";
  }
  if (error.includes("potential prompt injection")) {
    return "คำขอนี้ไม่สามารถประมวลผลได้ กรุณาปรับข้อความแล้วลองอีกครั้ง";
  }
  if (error.includes("unsupported role") || error.includes("invalid message object")) {
    return "รูปแบบข้อความไม่ถูกต้อง กรุณาลองใหม่";
  }
  if (error.includes("missing messages") || error.includes("must not be empty")) {
    return "กรุณากรอกข้อความก่อนส่ง";
  }
  if (error.includes("server error") || error.includes("missing next_public_chat_url")) {
    return "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง";
  }

  return "ไม่สามารถดำเนินการได้ กรุณาลองใหม่อีกครั้ง";
}

const ACCOUNT_PRESETS: AccountOption[] = [
  {
    id: "A0001",
    name: "บัญชี 01",
    subtitle: "A0001",
    initials: "01",
    avatarImageSrc: "/images/a01.png",
    avatarClassName: "bg-gradient-to-br from-[#FFD8A8] via-[#F7AC69] to-[#CD6E41]",
  },
  {
    id: "A0002",
    name: "บัญชี 02",
    subtitle: "A0002",
    initials: "02",
    avatarImageSrc: "/images/a02.png",
    avatarClassName: "bg-gradient-to-br from-[#D7C8FF] via-[#AFA0FF] to-[#6B6DDC]",
  },
  // {
  //   id: "A0003",
  //   name: "บัญชี 03",
  //   subtitle: "A0003",
  //   initials: "03",
  //   avatarClassName: "bg-gradient-to-br from-[#C6F4F4] via-[#7ED0D6] to-[#4183B8]",
  // },
];

type WidgetButtonStyle = "primary" | "secondary";
type WidgetButton = {
  label: string;
  type: "button";
  style: WidgetButtonStyle;
  onClick: Record<string, unknown>;
};

type PaymentConfirmationUI = {
  type: "payment_confirmation";
  props: {
    amount: number;
    target?: string;
    beneficiaryName?: string;
    destinationAccount?: string;
    destinationBank?: string;
    currency?: string;
    uuid?: string;
  };
  actions?: ReadonlyArray<WidgetButton>;
};

type PaymentReceiptUI = {
  type: "payment_receipt";
  props: {
    status: string;
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
  };
  actions?: ReadonlyArray<WidgetButton>;
};

type PaymentActionListUIItem = {
  type?: string;
  props?: Record<string, unknown>;
  actions?: ReadonlyArray<WidgetButton>;
  widget?: Record<string, unknown>;
  label?: string;
  [key: string]: unknown;
};

type PaymentActionListUI = {
  type: "list";
  props: { items: ReadonlyArray<PaymentActionListUIItem> };
  actions?: ReadonlyArray<WidgetButton>;
};

type UIWidget =
  | PaymentConfirmationUI
  | PaymentReceiptUI
  | PaymentActionListUI
  | (Record<string, unknown> & { type?: unknown });

interface Message {
  role: "user" | "assistant";
  content: string; // ✅ make it always string
  timestamp?: string;
  ui?: UIWidget | null;
  meta?: ChatOutput["meta"];
}

type ReceiptDisplayContext = {
  sourceAccountName?: string;
  sourceAccountNo?: string;
  destinationLabel?: string;
  destinationSubline?: string;
  destinationAccount?: string;
  destinationBank?: string;
  amount?: number;
  currency?: string;
};

interface AssistantMessageBodyProps {
  index: number;
  message: Message;
  profile: { accountName?: string; accountNo?: string } | null | undefined;
  isLoading: boolean;
  isConfirmWidgetExiting: boolean;
  onConfirmWidgetAction: (idx: number, msg: Message, config: unknown) => void;
  resolveReceiptDisplayContext: (preparedId: string) => ReceiptDisplayContext | null;
  onStreamingStateChange: (idx: number, isStreaming: boolean) => void;
  onStreamingProgress: () => void;
}

type MarkdownBlock =
  | { type: "h1"; text: string }
  | { type: "h3"; text: string }
  | { type: "ol"; items: string[]; start: number }
  | { type: "ul"; items: string[] }
  | { type: "p"; text: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizeMarkdownText(input: string): string {
  const normalized = input.replace(/\r\n/g, "\n").replace(/\\n/g, "\n");
  const withHeadingMarkdown = normalized
    .replace(/<h1>\s*([\s\S]*?)\s*<\/h1>/gi, (_, text: string) => `\n# ${text.trim()}\n`)
    .replace(/<h3>\s*([\s\S]*?)\s*<\/h3>/gi, (_, text: string) => `\n### ${text.trim()}\n`);

  // Some upstream replies flatten bullet points into one line: "... </h3> * a * b * c"
  // Split each "* " into its own line so list parsing is stable.
  return withHeadingMarkdown.replace(
    /(^|[^\n*])\s\*\s+(?=\S)/g,
    (_, prefix: string) => `${prefix}\n* `,
  );
}

function parseMarkdownBlocks(input: string): MarkdownBlock[] {
  const lines = normalizeMarkdownText(input).split("\n");
  const blocks: MarkdownBlock[] = [];

  let paragraphLines: string[] = [];
  let listItems: string[] = [];
  let listType: "ol" | "ul" | null = null;
  let listStart = 1;

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    const text = paragraphLines.join(" ").trim();
    if (text) blocks.push({ type: "p", text });
    paragraphLines = [];
  };

  const flushList = () => {
    if (listItems.length === 0) return;
    if (listType === "ol") {
      blocks.push({ type: "ol", items: [...listItems], start: listStart });
    } else {
      blocks.push({ type: "ul", items: [...listItems] });
    }
    listItems = [];
    listType = null;
    listStart = 1;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (/^#\s+/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push({ type: "h1", text: line.replace(/^#\s+/, "").trim() });
      continue;
    }

    if (/^###\s+/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push({ type: "h3", text: line.replace(/^###\s+/, "").trim() });
      continue;
    }

    const listMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      if (listType && listType !== "ol") flushList();
      if (!listType) listStart = Number(listMatch[1]);
      listType = "ol";
      listItems.push(listMatch[2].trim());
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      if (listType && listType !== "ul") flushList();
      listType = "ul";
      listItems.push(bulletMatch[1].trim());
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const linkButtonClassName =
    "inline-flex items-center rounded-full border border-white/25 px-2.5 py-0.5 text-sm font-medium text-white/90 hover:text-white hover:border-white/40 transition-colors";
  const plainUrlPattern = /^https?:\/\/\S+$/i;
  const extractUrlParts = (raw: string) => {
    const trailing = raw.match(/[),.!?:;]+$/)?.[0] ?? "";
    const href = trailing ? raw.slice(0, -trailing.length) : raw;
    return { href, trailing };
  };
  const renderLinkChip = (key: string, rawHref: string) => {
    const { href, trailing } = extractUrlParts(rawHref);
    if (!plainUrlPattern.test(href)) {
      return <React.Fragment key={key}>{rawHref}</React.Fragment>;
    }
    return (
      <React.Fragment key={key}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkButtonClassName}
        >
          ดูลิงก์
        </a>
        {trailing}
      </React.Fragment>
    );
  };

  return text
    .split(/(\*\*<u>[\s\S]+?<\/u>\*\*|\*\*[^*]+\*\*|<u>[\s\S]+?<\/u>|\[[^\]]+\]\((?:[^()\s]+)\)|https?:\/\/\S+)/g)
    .filter(Boolean)
    .map((part, idx) => {
      const boldUnderlineMatch = part.match(/^\*\*<u>([\s\S]+)<\/u>\*\*$/i);
      if (boldUnderlineMatch) {
        const innerText = boldUnderlineMatch[1].trim();
        return (
          <strong key={`${part}-${idx}`} className="font-semibold text-white">
            <u className="underline underline-offset-2 decoration-white/70">{innerText}</u>
          </strong>
        );
      }

      if (/^\*\*[^*]+\*\*$/.test(part)) {
        const boldText = part.slice(2, -2).trim();
        if (plainUrlPattern.test(boldText)) {
          return renderLinkChip(`${part}-${idx}`, boldText);
        }
        return (
          <strong key={`${part}-${idx}`} className="font-semibold text-white">
            {boldText}
          </strong>
        );
      }

      const underlineMatch = part.match(/^<u>([\s\S]+)<\/u>$/i);
      if (underlineMatch) {
        const underlineText = underlineMatch[1].trim();
        return (
          <strong key={`${part}-${idx}`} className="font-semibold text-white">
            <u className="underline underline-offset-2 decoration-white/70">{underlineText}</u>
          </strong>
        );
      }

      const linkMatch = part.match(/^\[[^\]]+\]\(([^()\s]+)\)$/);
      if (linkMatch) {
        return renderLinkChip(`${part}-${idx}`, linkMatch[1]);
      }

      if (plainUrlPattern.test(part)) {
        return renderLinkChip(`${part}-${idx}`, part);
      }

      return <React.Fragment key={`${part}-${idx}`}>{part}</React.Fragment>;
    });
}

function MarkdownMessage({ content }: { content: string }) {
  const normalized = React.useMemo(() => normalizeMarkdownText(content), [content]);
  const hasStreamCursor = normalized.endsWith(STREAM_CURSOR_TOKEN);
  const contentWithoutCursor = hasStreamCursor
    ? normalized.slice(0, -STREAM_CURSOR_TOKEN.length)
    : normalized;
  const renderStreamCursor = () => (
    <span className="inline-block w-px h-[1.05em] ml-1 bg-white/60 rounded-sm animate-pulse align-middle" />
  );
  const looksLikeMarkdown = React.useMemo(
    () =>
      /(^|\n)\s*#\s+/.test(contentWithoutCursor) ||
      /(^|\n)\s*###\s+/.test(contentWithoutCursor) ||
      /(^|\n)\s*\d+\.\s+/.test(contentWithoutCursor) ||
      /(^|\n)\s*[-*]\s+/.test(contentWithoutCursor) ||
      /<h1>[\s\S]*?<\/h1>/i.test(contentWithoutCursor) ||
      /<h3>[\s\S]*?<\/h3>/i.test(contentWithoutCursor) ||
      /\*\*[^*]+\*\*/.test(contentWithoutCursor),
    [contentWithoutCursor],
  );
  const blocks = React.useMemo(
    () => parseMarkdownBlocks(contentWithoutCursor),
    [contentWithoutCursor],
  );

  if (!looksLikeMarkdown) {
    return (
      <p className="whitespace-pre-wrap text-white/90 text-[16px]">
        {renderInlineMarkdown(contentWithoutCursor)}
        {hasStreamCursor && renderStreamCursor()}
      </p>
    );
  }

  return (
    <div className="w-full space-y-6 text-white/85 text-[16px] leading-relaxed">
      {blocks.map((block, index) => {
        const isLastBlock = index === blocks.length - 1;
        if (block.type === "h1") {
          return (
            <h1
              key={`h1-${index}`}
              className="body-xl-bold text-white"
            >
              {renderInlineMarkdown(block.text)}
              {hasStreamCursor && isLastBlock && renderStreamCursor()}
            </h1>
          );
        }

        if (block.type === "h3") {
          return (
            <h3
              key={`h3-${index}`}
              className="body-md"
            >
              [ {renderInlineMarkdown(block.text)} ]
              {hasStreamCursor && isLastBlock && renderStreamCursor()}
            </h3>
          );
        }

        if (block.type === "ol") {
          return (
            <ol
              key={`ol-${index}`}
              start={block.start}
              className="my-2 list-decimal pl-8 space-y-6 marker:text-white/70 text-md"
            >
              {block.items.map((item, itemIndex) => (
                <li
                  key={`li-${itemIndex}`}
                  className="text-md leading-relaxed text-white/80"
                >
                  {renderInlineMarkdown(item)}
                  {hasStreamCursor &&
                    isLastBlock &&
                    itemIndex === block.items.length - 1 &&
                    renderStreamCursor()}
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === "ul") {
          return (
            <ul
              key={`ul-${index}`}
              className="my-1 list-disc pl-10 space-y-3 marker:text-white/70 text-md break-words [overflow-wrap:anywhere]"
            >
              {block.items.map((item, itemIndex) => (
                <li
                  key={`uli-${itemIndex}`}
                  className="text-md leading-relaxed text-white/80 break-words [overflow-wrap:anywhere]"
                >
                  {renderInlineMarkdown(item)}
                  {hasStreamCursor &&
                    isLastBlock &&
                    itemIndex === block.items.length - 1 &&
                    renderStreamCursor()}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p
            key={`p-${index}`}
            className="text-[16px] leading-relaxed text-white/80"
          >
            {renderInlineMarkdown(block.text)}
            {hasStreamCursor && isLastBlock && renderStreamCursor()}
          </p>
        );
      })}
    </div>
  );
}

type PaymentCancelledUI = {
  type: "payment_cancelled";
  props: { prepared_id: string; message: string };
  actions?: ReadonlyArray<Record<string, unknown>>;
};

function isPaymentCancelledUI(v: unknown): v is PaymentCancelledUI {
  if (!isRecord(v) || v["type"] !== "payment_cancelled") return false;
  const props = v["props"];
  if (!isRecord(props)) return false;
  return (
    typeof props["prepared_id"] === "string" &&
    typeof props["message"] === "string"
  );
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

function getListItemWidgetRecord(
  item: PaymentActionListUIItem,
): {
  type: string;
  props: Record<string, unknown>;
  actions: ReadonlyArray<WidgetButton>;
} | null {
  if (typeof item.type === "string" && isRecord(item.props)) {
    return {
      type: item.type,
      props: item.props,
      actions: Array.isArray(item.actions) ? item.actions : [],
    };
  }

  if (isRecord(item.widget) && typeof item.widget["type"] === "string") {
    const widgetProps = isRecord(item.widget["props"]) ? item.widget["props"] : {};
    const label =
      typeof item.label === "string" && item.label.trim()
        ? item.label.trim()
        : undefined;
    const props =
      label && typeof widgetProps["label"] !== "string"
        ? { ...widgetProps, label }
        : widgetProps;
    const widgetActions = Array.isArray(item.widget["actions"])
      ? item.widget["actions"].filter(isWidgetButton)
      : [];
    const outerActions = Array.isArray(item.actions)
      ? item.actions.filter(isWidgetButton)
      : [];

    return {
      type: item.widget["type"],
      props,
      actions: widgetActions.length > 0 ? widgetActions : outerActions,
    };
  }

  return null;
}

function hasWidgetActionButtons(ui: unknown): boolean {
  if (!isRecord(ui)) return false;
  if (ui["type"] === "payment_receipt" || ui["type"] === "payment_cancelled") {
    return false;
  }
  if (ui["type"] === "list") {
    const props = ui["props"];
    if (!isRecord(props) || !Array.isArray(props["items"])) return false;
    return props["items"].some((item) => {
      if (!isRecord(item)) return false;
      const widget = getListItemWidgetRecord(item as PaymentActionListUIItem);
      return (widget?.actions ?? []).some(isWidgetButton);
    });
  }
  const actions = ui["actions"];
  return Array.isArray(actions) && actions.some(isWidgetButton);
}

function isPaymentConfirmationUI(v: unknown): v is PaymentConfirmationUI {
  if (!isRecord(v) || v["type"] !== "payment_confirmation") return false;
  const props = v["props"];
  if (!isRecord(props)) return false;
  if (typeof props["amount"] !== "number") return false;
  if (typeof props["target"] !== "undefined" && typeof props["target"] !== "string") return false;
  if (typeof props["beneficiaryName"] !== "undefined" && typeof props["beneficiaryName"] !== "string") return false;
  if (typeof props["destinationAccount"] !== "undefined" && typeof props["destinationAccount"] !== "string") return false;
  if (typeof props["destinationBank"] !== "undefined" && typeof props["destinationBank"] !== "string") return false;
  if (typeof props["currency"] !== "undefined" && typeof props["currency"] !== "string") return false;
  if (typeof props["uuid"] !== "undefined" && typeof props["uuid"] !== "string") return false;

  const actions = v["actions"];
  if (typeof actions === "undefined") return true;
  return Array.isArray(actions) && actions.every(isWidgetButton);
}

function isPaymentReceiptUI(v: unknown): v is PaymentReceiptUI {
  if (!isRecord(v) || v["type"] !== "payment_receipt") return false;
  const props = v["props"];
  if (!isRecord(props)) return false;
  if (typeof props["status"] !== "string") return false;
  if (typeof props["txn_id"] !== "string") return false;
  if (typeof props["balance"] !== "number") return false;
  if (typeof props["summary"] !== "string") return false;

  const actions = v["actions"];
  if (typeof actions === "undefined") return true;
  return Array.isArray(actions) && actions.every(isWidgetButton);
}

function isPaymentActionListUIItem(v: unknown): v is PaymentActionListUIItem {
  if (!isRecord(v)) return false;
  return getListItemWidgetRecord(v as PaymentActionListUIItem) !== null;
}

function isPaymentActionListUI(v: unknown): v is PaymentActionListUI {
  if (!isRecord(v) || v["type"] !== "list") return false;
  const props = v["props"];
  if (!isRecord(props) || !Array.isArray(props["items"])) return false;
  return props["items"].every(isPaymentActionListUIItem);
}

function extractPreparedIdFromActionConfig(config: unknown): string {
  if (!isRecord(config)) return "";

  if (
    config["action"] === "tool" &&
    config["name"] === "confirm_transfer" &&
    isRecord(config["args"])
  ) {
    const pid = config["args"]["prepared_id"];
    return typeof pid === "string" ? pid : "";
  }

  const pid = config["prepared_id"];
  return typeof pid === "string" ? pid : "";
}

function removePreparedItemFromListUi(
  ui: UIWidget | null | undefined,
  preparedId: string,
): {
  updatedUi: UIWidget | null | undefined;
  removed: boolean;
  remainingCount: number;
} {
  if (!ui || !isPaymentActionListUI(ui)) {
    return { updatedUi: ui, removed: false, remainingCount: 0 };
  }

  const nextItems = ui.props.items.filter((item) => {
    const widget = getListItemWidgetRecord(item);
    const actions = widget?.actions ?? [];
    const match = actions.some(
      (action) => extractPreparedIdFromActionConfig(action.onClick) === preparedId,
    );
    return !match;
  });

  if (nextItems.length === ui.props.items.length) {
    return {
      updatedUi: ui,
      removed: false,
      remainingCount: ui.props.items.length,
    };
  }

  if (nextItems.length === 0) {
    return { updatedUi: null, removed: true, remainingCount: 0 };
  }

  return {
    updatedUi: {
      ...ui,
      props: {
        ...ui.props,
        items: nextItems,
      },
    },
    removed: true,
    remainingCount: nextItems.length,
  };
}

function buildReceiptDisplayContextFromConfirmation(
  props: PaymentConfirmationUI["props"],
  sourceAccountName?: string,
  sourceAccountNo?: string,
): ReceiptDisplayContext {
  const beneficiary = props.beneficiaryName?.trim() || props.target?.trim() || "";
  const destinationAccountRaw = props.destinationAccount?.trim() || "";
  const destinationBank = props.destinationBank?.trim() || "";
  const normalizedDestinationBank = destinationBank.toUpperCase();
  const isTelcoTopUp =
    normalizedDestinationBank === "AIS" ||
    normalizedDestinationBank === "TRUE" ||
    normalizedDestinationBank === "DTAC";
  const destinationAccount = formatDestinationIdentifier(destinationAccountRaw, {
    preferPhone: isTelcoTopUp,
  });
  const destinationLabel = isTelcoTopUp
    ? `เติมเงิน ${normalizedDestinationBank}`
    : beneficiary;
  const destinationSubline = isTelcoTopUp
    ? destinationAccount
    : [destinationAccount, destinationBank].filter(Boolean).join(" · ");

  return {
    sourceAccountName: sourceAccountName?.trim() || undefined,
    sourceAccountNo: sourceAccountNo?.trim() || undefined,
    destinationLabel: destinationLabel || undefined,
    destinationSubline: destinationSubline || undefined,
    destinationAccount: destinationAccount || undefined,
    destinationBank: destinationBank || undefined,
    amount: props.amount,
    currency: props.currency || "บาท",
  };
}

function extractReceiptDisplayContextFromUi(
  ui: UIWidget | null | undefined,
  preparedId: string,
  sourceAccountName?: string,
  sourceAccountNo?: string,
): ReceiptDisplayContext | null {
  if (!preparedId || !ui) return null;

  if (isPaymentConfirmationUI(ui)) {
    return buildReceiptDisplayContextFromConfirmation(
      ui.props,
      sourceAccountName,
      sourceAccountNo,
    );
  }

  if (!isPaymentActionListUI(ui)) return null;

  for (const item of ui.props.items) {
    const widget = getListItemWidgetRecord(item);
    if (!widget || widget.type !== "payment_confirmation") continue;
    const actions = widget.actions;
    const matches = actions.some(
      (action) => extractPreparedIdFromActionConfig(action.onClick) === preparedId,
    );
    if (!matches) continue;

    const props = widget.props;
    const amount = typeof props["amount"] === "number" ? props["amount"] : 0;
    const confirmationProps: PaymentConfirmationUI["props"] = {
      amount,
      target: typeof props["target"] === "string" ? props["target"] : undefined,
      beneficiaryName:
        typeof props["beneficiaryName"] === "string"
          ? props["beneficiaryName"]
          : undefined,
      destinationAccount:
        typeof props["destinationAccount"] === "string"
          ? props["destinationAccount"]
          : undefined,
      destinationBank:
        typeof props["destinationBank"] === "string"
          ? props["destinationBank"]
          : undefined,
      currency: typeof props["currency"] === "string" ? props["currency"] : "บาท",
    };

    return buildReceiptDisplayContextFromConfirmation(
      confirmationProps,
      sourceAccountName,
      sourceAccountNo,
    );
  }

  return null;
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPrefersReducedMotion(mediaQuery.matches);

    sync();
    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  return prefersReducedMotion;
}

function shouldAnimateAssistantText(content: string, prefersReducedMotion: boolean) {
  if (prefersReducedMotion) return false;
  const normalizedContent = content.replace(/\r\n/g, "\n");
  if (normalizedContent.length === 0) return false;
  return normalizedContent.length > STREAMING_CONFIG.minLengthToAnimate;
}

function AssistantMessageBody({
  index,
  message,
  profile,
  isLoading,
  isConfirmWidgetExiting,
  onConfirmWidgetAction,
  resolveReceiptDisplayContext,
  onStreamingStateChange,
  onStreamingProgress,
}: AssistantMessageBodyProps) {
  const ui = message.ui ?? null;
  const prefersReducedMotion = usePrefersReducedMotion();
  const [displayContent, setDisplayContent] = React.useState(() => {
    const initial = message.content ?? "";
    return shouldAnimateAssistantText(initial, prefersReducedMotion)
      ? ""
      : initial.replace(/\r\n/g, "\n");
  });
  const [isTextComplete, setIsTextComplete] = React.useState(() => {
    const initial = message.content ?? "";
    return !shouldAnimateAssistantText(initial, prefersReducedMotion);
  });
  const [isWidgetVisible, setIsWidgetVisible] = React.useState(false);

  React.useEffect(() => {
    const content = message.content ?? "";
    const normalizedContent = content.replace(/\r\n/g, "\n");

    if (!shouldAnimateAssistantText(normalizedContent, prefersReducedMotion)) {
      setDisplayContent(normalizedContent);
      setIsTextComplete(true);
      return;
    }

    setDisplayContent("");
    setIsTextComplete(false);

    const total = normalizedContent.length;
    const chunkSize =
      total > STREAMING_CONFIG.longTextThreshold
        ? Math.ceil(total / STREAMING_CONFIG.longTextTargetSteps)
        : Math.ceil(total / STREAMING_CONFIG.shortTextTargetSteps);
    const totalSteps = Math.max(1, Math.ceil(total / chunkSize));
    const rawStepDelay = Math.floor(
      STREAMING_CONFIG.totalDurationMs / totalSteps,
    );
    const clampedStepDelay = Math.max(
      STREAMING_CONFIG.minStepDelayMs,
      Math.min(STREAMING_CONFIG.maxStepDelayMs, rawStepDelay),
    );
    const stepDelay = Math.max(
      1,
      Math.round(clampedStepDelay / STREAMING_CONFIG.speedMultiplier),
    );
    let cursor = 0;
    let timerId: number | null = null;

    const tick = () => {
      cursor = Math.min(total, cursor + chunkSize);
      setDisplayContent(normalizedContent.slice(0, cursor));

      if (cursor >= total) {
        setIsTextComplete(true);
        return;
      }

      timerId = window.setTimeout(tick, stepDelay);
    };

    timerId = window.setTimeout(tick, STREAMING_CONFIG.initialDelayMs);

    return () => {
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [message.content, prefersReducedMotion]);

  React.useEffect(() => {
    onStreamingStateChange(index, !isTextComplete);
    if (!isTextComplete) onStreamingProgress();
    return () => onStreamingStateChange(index, false);
  }, [
    index,
    isTextComplete,
    onStreamingProgress,
    onStreamingStateChange,
  ]);

  React.useEffect(() => {
    if (!isTextComplete) onStreamingProgress();
  }, [displayContent, isTextComplete, onStreamingProgress]);

  React.useEffect(() => {
    if (!ui) {
      setIsWidgetVisible(false);
      return;
    }

    if (!isTextComplete) {
      setIsWidgetVisible(false);
      return;
    }

    if (prefersReducedMotion) {
      setIsWidgetVisible(true);
      return;
    }

    const timerId = window.setTimeout(() => setIsWidgetVisible(true), 620);
    return () => window.clearTimeout(timerId);
  }, [ui, isTextComplete, prefersReducedMotion]);

  const canRenderWidgets = Boolean(ui) && isTextComplete;
  const widgetRevealClass = prefersReducedMotion
    ? "mt-4"
    : isWidgetVisible
      ? "mt-4 opacity-100 translate-y-0"
      : "mt-4 opacity-0 translate-y-3 pointer-events-none";

  return (
    <>
      <MarkdownMessage
        content={
          isTextComplete
            ? displayContent
            : `${displayContent}${STREAM_CURSOR_TOKEN}`
        }
      />

      {canRenderWidgets && isPaymentConfirmationUI(ui) && (
        <div
          className={`transition-all duration-500 ease-out will-change-transform will-change-opacity ${
            isConfirmWidgetExiting
              ? "mt-4 opacity-0 translate-y-6 pointer-events-none"
              : widgetRevealClass
          }`}
        >
          <PaymentConfirmationWidget
            sourceAccountName={profile?.accountName}
            sourceAccountNo={profile?.accountNo}
            target={ui.props.target}
            beneficiaryName={ui.props.beneficiaryName}
            destinationAccount={ui.props.destinationAccount}
            destinationBank={ui.props.destinationBank}
            amount={ui.props.amount}
            currency={ui.props.currency}
            actions={(ui.actions ?? []) as ConfirmationAction[]}
            disabled={isLoading || !isWidgetVisible || isConfirmWidgetExiting}
            onAction={(config) => onConfirmWidgetAction(index, message, config)}
          />
        </div>
      )}

      {canRenderWidgets && isPaymentReceiptUI(ui) && (
        <div
          className={`transition-all duration-500 ease-out will-change-transform will-change-opacity ${widgetRevealClass}`}
        >
          {(() => {
            const preparedId = message.meta?.prepared_id?.trim() || "";
            const context = resolveReceiptDisplayContext(preparedId);
            return (
          <PaymentReceiptWidget
            status={ui.props.status}
            txn_id={ui.props.txn_id}
            balance={ui.props.balance}
            summary={ui.props.summary}
            sourceAccountName={
              ui.props.sourceAccountName ?? context?.sourceAccountName ?? profile?.accountName
            }
            sourceAccountNo={
              ui.props.sourceAccountNo ?? context?.sourceAccountNo ?? profile?.accountNo
            }
            destinationLabel={ui.props.destinationLabel ?? context?.destinationLabel}
            destinationAccount={ui.props.destinationAccount ?? context?.destinationAccount}
            destinationSubline={ui.props.destinationSubline ?? context?.destinationSubline}
            destinationBank={ui.props.destinationBank ?? context?.destinationBank}
            amount={ui.props.amount ?? context?.amount}
            currency={ui.props.currency ?? context?.currency}
            actions={(ui.actions ?? []) as ReceiptAction[]}
            onAction={(config: ReceiptActionConfig) => {
              if (isRecord(config) && config["action"] === "close") {
                // no-op
              }
            }}
          />
            );
          })()}
        </div>
      )}

      {canRenderWidgets && isPaymentCancelledUI(ui) && (
        <div
          className={`transition-all duration-500 ease-out will-change-transform will-change-opacity ${widgetRevealClass}`}
        >
          <PaymentCancelledWidget
            prepared_id={ui.props.prepared_id}
            message={ui.props.message}
          />
        </div>
      )}

      {canRenderWidgets && isPaymentActionListUI(ui) && (
        <div
          className={`transition-all duration-500 ease-out will-change-transform will-change-opacity ${widgetRevealClass}`}
        >
          <PaymentActionListWidget
            items={ui.props.items as ReadonlyArray<Record<string, unknown>>}
            sourceAccountName={profile?.accountName}
            sourceAccountNo={profile?.accountNo}
            disabled={isLoading || !isWidgetVisible || isConfirmWidgetExiting}
            onAction={(config) => onConfirmWidgetAction(index, message, config)}
          />
        </div>
      )}
    </>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [inputText, setInputText] = React.useState<string>("");
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isFocused, setIsFocused] = React.useState<boolean>(false);
  const [selectedAccountId, setSelectedAccountId] = React.useState<string>(
    PROFILE_CONFIG.accountId,
  );
  const {
    sendMessage,
    sendUIAction,
    cancelRequest,
    resetSession,
    isLoading,
    error,
    profile,
  } = useChat({ accountId: selectedAccountId });
  const [mounted, setMounted] = React.useState<boolean>(false);
  const [showSplash, setShowSplash] = React.useState<boolean>(true);
  const [viewportHeight, setViewportHeight] = React.useState<number | null>(
    null,
  );
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const streamScrollRafRef = React.useRef<number | null>(null);
  const streamingAssistantIndexesRef = React.useRef<Set<number>>(new Set());
  const receiptDisplayContextByPreparedIdRef = React.useRef<
    Record<string, ReceiptDisplayContext>
  >({});
  const [streamingAssistants, setStreamingAssistants] = React.useState(0);
  const [confirmWidgetExitingIndexes, setConfirmWidgetExitingIndexes] =
    React.useState<number[]>([]);
  const [landingActionStage, setLandingActionStage] = React.useState<0 | 1 | 2>(
    0,
  );
  const [isGreetingLiftReady, setIsGreetingLiftReady] =
    React.useState<boolean>(false);
  const previousAccountIdRef = React.useRef<string>(selectedAccountId);
  const lastToastErrorRef = React.useRef<string | null>(null);

  const resetChatState = React.useCallback(() => {
    setInputText("");
    setMessages([]);
    setConfirmWidgetExitingIndexes([]);
    setLandingActionStage(0);
    setIsGreetingLiftReady(false);
    setStreamingAssistants(0);
    setIsFocused(false);
    streamingAssistantIndexesRef.current = new Set();
    receiptDisplayContextByPreparedIdRef.current = {};
  }, []);

  const accountOptions = React.useMemo(() => {
    const includeSelected = ACCOUNT_PRESETS.some((item) => item.id === selectedAccountId);
    const options = includeSelected
      ? [...ACCOUNT_PRESETS]
      : [
          ...ACCOUNT_PRESETS,
          {
            id: selectedAccountId,
            name: `บัญชี ${selectedAccountId}`,
            subtitle: selectedAccountId,
            initials: selectedAccountId.slice(-2).padStart(2, "0"),
            avatarClassName: "bg-gradient-to-br from-[#A9D7FF] via-[#87AFFF] to-[#516FDF]",
          },
        ];

    if (!profile?.accountId || !profile?.accountName) return options;

    return options.map((item) =>
      item.id === profile.accountId
        ? {
            ...item,
            name: profile.accountName,
            subtitle: profile.accountNo || item.subtitle,
          }
        : item,
    );
  }, [profile, selectedAccountId]);

  React.useEffect(() => {
    if (previousAccountIdRef.current === selectedAccountId) return;
    previousAccountIdRef.current = selectedAccountId;

    cancelRequest();
    resetSession();
    resetChatState();
  }, [cancelRequest, resetChatState, resetSession, selectedAccountId]);

  React.useEffect(() => {
    if (!error) {
      lastToastErrorRef.current = null;
      return;
    }
    if (lastToastErrorRef.current === error) return;

    lastToastErrorRef.current = error;
    toast.error(mapChatErrorToToastMessage(error));
  }, [error]);

  const handleLogoClick = React.useCallback(() => {
    cancelRequest();
    resetSession();
    resetChatState();
    router.push("/");
  }, [cancelRequest, resetChatState, resetSession, router]);

  const traceQuery = useQuery({
    queryKey: ["trace-latest"],
    queryFn: async () => {
      const resp = await fetch("/api/v1/trace", { cache: "no-store" });
      if (!resp.ok) throw new Error("Failed to fetch latest trace");
      return (await resp.json()) as { sessionId: string | null; message: string | null };
    },
    enabled: isLoading,
    refetchInterval: 1500,
    refetchIntervalInBackground: true,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const nowTime = () =>
    new Date().toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const shouldAppendPostWidgetFollowup = React.useCallback(
    (ui: UIWidget | null | undefined) => isPaymentReceiptUI(ui) || isPaymentCancelledUI(ui),
    [],
  );

  const appendPostWidgetFollowup = React.useCallback(() => {
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: POST_WIDGET_FOLLOWUP_MESSAGE,
      },
    ]);
  }, []);

  const appendAssistant = (res: ChatOutput) => {
    const responseUi = (res.ui as UIWidget | null) ?? null;
    setMessages((prev) => {
      const nextMessages: Message[] = [
        ...prev,
        {
          role: "assistant",
          content: res.reply_text ?? "", // ✅ never null
          ui: responseUi,
          meta: res.meta,
        },
      ];
      if (shouldAppendPostWidgetFollowup(responseUi)) {
        nextMessages.push({
          role: "assistant",
          content: POST_WIDGET_FOLLOWUP_MESSAGE,
        });
      }
      return nextMessages;
    });
  };

  React.useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.height = "100%";

    const handleResize = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
        window.scrollTo(0, 0);
      }
    };

    if (typeof window !== "undefined" && window.visualViewport) {
      setViewportHeight(window.visualViewport.height);
      window.visualViewport.addEventListener("resize", handleResize);
    }

    return () => {
      window.visualViewport?.removeEventListener("resize", handleResize);
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.height = "";
    };
  }, []);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowSplash(false);
    }, SPLASH_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    const preventGesture = (event: Event) => {
      event.preventDefault();
    };
    const preventPinchTouch = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };
    const preventCtrlWheelZoom = (event: WheelEvent) => {
      if (event.ctrlKey) {
        event.preventDefault();
      }
    };

    document.addEventListener("gesturestart", preventGesture, {
      passive: false,
    });
    document.addEventListener("gesturechange", preventGesture, {
      passive: false,
    });
    document.addEventListener("gestureend", preventGesture, {
      passive: false,
    });
    document.addEventListener("touchmove", preventPinchTouch, {
      passive: false,
    });
    document.addEventListener("wheel", preventCtrlWheelZoom, {
      passive: false,
    });

    return () => {
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      document.removeEventListener("gestureend", preventGesture);
      document.removeEventListener("touchmove", preventPinchTouch);
      document.removeEventListener("wheel", preventCtrlWheelZoom);
    };
  }, []);

  React.useEffect(() => {
    if (messages.length > 0 || isLoading) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const requestStreamingScroll = React.useCallback(() => {
    if (streamScrollRafRef.current !== null) return;
    streamScrollRafRef.current = window.requestAnimationFrame(() => {
      streamScrollRafRef.current = null;
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  React.useEffect(() => {
    return () => {
      if (streamScrollRafRef.current !== null) {
        window.cancelAnimationFrame(streamScrollRafRef.current);
      }
    };
  }, []);

  const handleStreamingStateChange = React.useCallback(
    (idx: number, isStreaming: boolean) => {
      const next = new Set(streamingAssistantIndexesRef.current);
      if (isStreaming) next.add(idx);
      else next.delete(idx);
      streamingAssistantIndexesRef.current = next;
      setStreamingAssistants(next.size);
    },
    [],
  );

  const handleStreamingProgress = React.useCallback(() => {
    if (streamingAssistantIndexesRef.current.size === 0) return;
    requestStreamingScroll();
  }, [requestStreamingScroll]);

  const resolveReceiptDisplayContext = React.useCallback(
    (preparedId: string) => {
      if (!preparedId) return null;
      return receiptDisplayContextByPreparedIdRef.current[preparedId] ?? null;
    },
    [],
  );

  React.useEffect(() => {
    if (streamingAssistants > 0) requestStreamingScroll();
  }, [requestStreamingScroll, streamingAssistants]);

  const isActive = isFocused || inputText !== "";
  const hasMessages = messages.length > 0;
  const hasAssistantWidget = React.useMemo(
    () => messages.some((msg) => msg.role === "assistant" && Boolean(msg.ui)),
    [messages],
  );
  let isInputLockedByWidgetAction = false;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg.role !== "assistant") continue;
    // Lock only when the latest assistant message still has actionable widget buttons.
    // Older history widgets must not block new user input.
    isInputLockedByWidgetAction = hasWidgetActionButtons(msg.ui);
    break;
  }
  const greetingName = React.useMemo(() => {
    const rawName = profile?.accountName?.trim();
    if (!rawName) return null;

    const normalized = rawName.replace(/^คุณ\s+/u, "").trim();
    const firstName = normalized.split(/\s+/u)[0];
    return firstName || null;
  }, [profile?.accountName]);
  const shouldShowGreeting = !showSplash && Boolean(greetingName);

  React.useEffect(() => {
    const isLandingMode = !hasMessages && !isActive;
    if (!isLandingMode) {
      setIsGreetingLiftReady(true);
      return;
    }

    if (!shouldShowGreeting) {
      setIsGreetingLiftReady(false);
      return;
    }

    setIsGreetingLiftReady(false);
    const timer = window.setTimeout(() => {
      setIsGreetingLiftReady(true);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [hasMessages, isActive, shouldShowGreeting]);

  React.useEffect(() => {
    const isLandingMode = !hasMessages && !isActive;
    if (!isLandingMode) {
      setLandingActionStage(2);
      return;
    }

    if (!shouldShowGreeting || !isGreetingLiftReady) {
      setLandingActionStage(0);
      return;
    }

    setLandingActionStage(0);
    const gridTimer = window.setTimeout(() => {
      setLandingActionStage(1);
    }, 520);
    const scrollTimer = window.setTimeout(() => {
      setLandingActionStage(2);
    }, 760);

    return () => {
      window.clearTimeout(gridTimer);
      window.clearTimeout(scrollTimer);
    };
  }, [hasMessages, isActive, isGreetingLiftReady, shouldShowGreeting]);

  const showActionGrid = landingActionStage >= 1 && !isActive;
  const showActionScroll = landingActionStage >= 2 && !isActive;
  const isStartupGreetingMode = !hasMessages && !shouldShowGreeting;
  const shouldCenterLandingGreeting =
    isActive || isStartupGreetingMode || !isGreetingLiftReady;

  function extractPreparedId(msg: Message, config: unknown): string {
    if (msg.meta?.prepared_id) return msg.meta.prepared_id;

    if (isRecord(config)) {
      const action = config["action"];
      if (
        action === "tool" &&
        config["name"] === "confirm_transfer" &&
        isRecord(config["args"])
      ) {
        const pid = config["args"]["prepared_id"];
        return typeof pid === "string" ? pid : "";
      }

      const pid = config["prepared_id"];
      if (typeof pid === "string") return pid;
    }

    return "";
  }

  function replaceMessageAt(idx: number, patch: Partial<Message>) {
    setMessages((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)),
    );
  }

  function sleep(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  const handleConfirmWidgetAction = async (
    idx: number,
    msg: Message,
    config: unknown,
  ) => {
    const originalMessage = msg;
    const prepared_id = extractPreparedId(msg, config);
    if (!prepared_id) {
      console.warn("Missing prepared_id");
      return;
    }

    const receiptDisplayContext = extractReceiptDisplayContextFromUi(
      msg.ui,
      prepared_id,
      profile?.accountName,
      profile?.accountNo,
    );
    if (receiptDisplayContext) {
      receiptDisplayContextByPreparedIdRef.current[prepared_id] =
        receiptDisplayContext;
    }

    let uiAction: UIAction | null = null;
    let pendingText = "กำลังดำเนินการ...";

    if (isRecord(config)) {
      if (
        config["action"] === "tool" &&
        config["name"] === "confirm_transfer"
      ) {
        uiAction = { action: "confirm_transfer", prepared_id };
        pendingText = "กำลังทำรายการโอน...";
      } else if (
        config["action"] === "cancel" ||
        config["action"] === "cancel_transfer"
      ) {
        uiAction = { action: "cancel", prepared_id };
        pendingText = "กำลังยกเลิกรายการ...";
      } else if (config["action"] === "edit") {
        uiAction = { action: "edit", prepared_id };
        pendingText = "กำลังเปิดการแก้ไข...";
      } else if (config["action"] === "confirm_transfer") {
        uiAction = { action: "confirm_transfer", prepared_id };
        pendingText = "กำลังทำรายการโอน...";
      }
    }

    if (!uiAction) return;

    const listRemoval = removePreparedItemFromListUi(msg.ui, prepared_id);
    const isListFlow = listRemoval.removed;
    const shouldSlideOutDown =
      uiAction.action === "confirm_transfer" && !isListFlow;

    if (shouldSlideOutDown) {
      setConfirmWidgetExitingIndexes((prev) =>
        prev.includes(idx) ? prev : [...prev, idx],
      );
      await sleep(CONFIRM_WIDGET_EXIT_MS);
    }

    if (isListFlow) {
      replaceMessageAt(idx, {
        content: originalMessage.content,
        ui: (listRemoval.updatedUi as UIWidget | null) ?? null,
      });
    } else {
      replaceMessageAt(idx, { ui: null, content: pendingText });
    }

    const res = await sendUIAction(uiAction);

    if (!res) {
      if (isListFlow) {
        replaceMessageAt(idx, {
          content: originalMessage.content,
          ui: originalMessage.ui ?? null,
          meta: originalMessage.meta,
        });
      } else {
        replaceMessageAt(idx, {
          ui: null,
          content: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
        });
      }
      if (shouldSlideOutDown) {
        setConfirmWidgetExitingIndexes((prev) => prev.filter((i) => i !== idx));
      }
      return;
    }

    let responseUi = (res.ui as UIWidget | null) ?? null;
    if (responseUi && isPaymentReceiptUI(responseUi) && receiptDisplayContext) {
      responseUi = {
        ...responseUi,
        props: {
          ...responseUi.props,
          ...receiptDisplayContext,
        },
      };
    }
    if (isListFlow) {
      if (isPaymentActionListUI(responseUi)) {
        replaceMessageAt(idx, {
          content: res.reply_text ?? originalMessage.content,
          ui: responseUi,
          meta: res.meta,
        });
      } else {
        if (listRemoval.remainingCount === 0) {
          replaceMessageAt(idx, {
            content: originalMessage.content,
            ui: null,
            meta: originalMessage.meta,
          });
        }
        appendAssistant({
          ...res,
          ui: (responseUi as Record<string, unknown> | null) ?? null,
        });
      }
    } else {
      replaceMessageAt(idx, {
        content: res.reply_text ?? "",
        ui: responseUi,
        meta: res.meta,
      });
      if (shouldAppendPostWidgetFollowup(responseUi)) {
        appendPostWidgetFollowup();
      }
    }
    if (shouldSlideOutDown) {
      setConfirmWidgetExitingIndexes((prev) => prev.filter((i) => i !== idx));
    }
  };

  const handleSend = async (text?: string) => {
    if (isLoading || isInputLockedByWidgetAction) return;

    const messageText = typeof text === "string" ? text : inputText;
    const trimmedText = messageText.trim();
    if (!trimmedText) return;

    const sanitizedHistoryMessages = messages.filter(shouldKeepMessage);
    if (sanitizedHistoryMessages.length !== messages.length) {
      setMessages(sanitizedHistoryMessages);
    }

    if (hasPromptInjectionSignals(trimmedText)) {
      toast.error("คำขอนี้ไม่สามารถประมวลผลได้ กรุณาปรับข้อความแล้วลองอีกครั้ง");
      if (typeof text !== "string") setInputText("");
      return;
    }

    const timeString = nowTime();

    const newMessage: Message = {
      role: "user",
      content: trimmedText,
      timestamp: timeString,
    };
    const newMessages = [...sanitizedHistoryMessages, newMessage];
    setMessages(newMessages);

    if (typeof text !== "string") setInputText("");

    const requestMessages = newMessages
      .filter((m) => m.role === "user" || m.content.trim().length > 0)
      .map((m) => ({ role: m.role, content: m.content }));

    const response = await sendMessage(
      requestMessages,
    );

    if (response) appendAssistant(response);
  };

  const handleQuickActionSend = async (title: string, subtitle?: string) => {
    if (isLoading || isInputLockedByWidgetAction) return;
    const textToSend = `${title}${subtitle ?? ""}`.trim();
    if (!textToSend) return;
    setInputText(textToSend);
    await handleSend(textToSend);
    setInputText("");
  };

  return (
    <div
      className={`fixed inset-0 w-full bg-[#050713] flex justify-center font-sans antialiased overflow-hidden ${
        isFocused ? "touch-none" : ""
      }`}
      style={{ height: viewportHeight ? `${viewportHeight}px` : "100%" }}
    >
      <div className="relative w-full h-full overflow-hidden flex flex-col pt-4">
        <div
          className={`absolute inset-0 bg-[radial-gradient(900px_700px_at_85%_15%,rgba(66,120,255,0.75),transparent_60%),radial-gradient(700px_700px_at_20%_35%,rgba(20,30,80,0.8),transparent_55%),linear-gradient(180deg,#02030a,#06081a_60%,#030411)] transition-opacity duration-1000 ease-in-out ${
            isActive ? "opacity-0" : "opacity-100"
          }`}
        />

        {mounted && <StarsBackground />}
        <SplashScreen visible={showSplash} />

        <div className="relative z-10 flex-1 flex flex-col min-h-0">
          <div className="px-4 sm:px-6 pb-2">
            <AccountNavbar
              logoText="Ping"
              onLogoClick={handleLogoClick}
              accounts={accountOptions}
              selectedAccountId={selectedAccountId}
              onSelectAccount={setSelectedAccountId}
            />
          </div>
          <main
            className={`flex-1 w-full pb-32 flex flex-col ${
              isFocused && !hasAssistantWidget
                ? "overflow-hidden"
                : "overflow-y-auto overscroll-contain hide-scrollbar"
            }`}
          >
            {hasMessages ? (
              <div className="flex-1 flex flex-col px-4 space-y-4 pt-4">
                <div className="flex-1" />

                {messages.map((msg, index) => {
                  return (
                    <div
                      key={index}
                      className={`flex flex-col ${
                        msg.role === "user"
                          ? "self-end items-end  max-w-[85%]"
                          : "self-start items-start w-full"
                      }`}
                    >
                      <div
                        className={` rounded-xl text-white  ${
                          msg.role === "user"
                            ? "bg-white/20 rounded-tr-md border border-white/20 border-2 px-4 py-2"
                            : "bg-white/0 rounded-none border-0 w-full"
                        }`}
                      >
                        {msg.role === "assistant" ? (
                          <AssistantMessageBody
                            index={index}
                            message={msg}
                            profile={profile}
                            isLoading={isLoading}
                            isConfirmWidgetExiting={confirmWidgetExitingIndexes.includes(
                              index,
                            )}
                            onConfirmWidgetAction={handleConfirmWidgetAction}
                            resolveReceiptDisplayContext={resolveReceiptDisplayContext}
                            onStreamingStateChange={handleStreamingStateChange}
                            onStreamingProgress={handleStreamingProgress}
                          />
                        ) : (
                          msg.content
                        )}
                      </div>

                      {msg.role === "user" && msg.timestamp && (
                        <div className="text-[10px] text-white/70 mt-1">
                          [ {msg.timestamp} ]
                        </div>
                      )}
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="self-start items-start flex flex-col max-w-[85%] gap-2">
                    <span className="trace-gradient-flow text-sm font-semibold tracking-wide bg-gradient-to-r from-[#9AB9FF] via-[#6E93F3] to-[#2E58C8] bg-clip-text text-transparent italic">
                      {traceQuery.data?.message || "Thinking"}
                    </span>
                    <div className="p-4 rounded-2xl text-white bg-white/10 rounded-tl-sm flex items-center gap-3">
                      <div className="flex space-x-1">
                        <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            ) : (
              <>
                <div
                  className={`transition-[flex-grow] duration-500 ease-in-out ${
                    shouldCenterLandingGreeting ? "flex-grow" : "flex-grow-0 h-0"
                  }`}
                />

                <div
                  className={`flex flex-col space-y-8 items-center shrink-0 transition-all duration-500 ease-in-out ${
                    shouldCenterLandingGreeting ? "mt-12" : "mt-24"
                  }`}
                >
                  {shouldShowGreeting ? <HeaderSection displayName={greetingName} /> : null}
                  <div
                    className={`h-px w-4/5 bg-white/8 transition-opacity duration-300 ${
                      !isActive ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </div>

                <div
                  className={`transition-[max-height,margin-top] duration-500 ease-in-out overflow-hidden ${
                    !shouldCenterLandingGreeting
                      ? "max-h-[500px] mt-8"
                      : "max-h-0 mt-0"
                  }`}
                  style={shouldCenterLandingGreeting ? { transitionDelay: "120ms" } : undefined}
                >
                  <div className="space-y-4">
                    <div
                      className={`transition-all duration-500 ease-out ${
                        showActionGrid
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-1.5"
                      }`}
                    >
                      <ActionGrid
                        onActionClick={handleQuickActionSend}
                        disabled={isLoading || isInputLockedByWidgetAction}
                        isVisible={showActionGrid}
                      />
                    </div>
                    <div
                      className={`relative transition-all duration-500 ease-out ${
                        showActionScroll
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-1.5"
                      }`}
                    >
                      <ActionScrollList
                        onActionClick={handleQuickActionSend}
                        disabled={isLoading || isInputLockedByWidgetAction}
                      />
                      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 sm:w-16 bg-gradient-to-r from-[#040A23] via-[#040A23]/75 to-transparent" />
                      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 sm:w-16 bg-gradient-to-l from-[#040A23] via-[#040A23]/75 to-transparent" />
                    </div>
                  </div>
                  <div className="flex flex-col items-center mt-4">
                    <div className="h-px w-4/5 bg-white/8" />
                  </div>
                </div>

                <div
                  className={`transition-[flex-grow] duration-500 ease-in-out ${
                    shouldCenterLandingGreeting ? "flex-grow" : "flex-grow-0 h-0"
                  }`}
                />
              </>
            )}
          </main>

          <div
            className="w-full"
            onFocus={() => {
              setIsFocused(true);
              setTimeout(() => {
                window.scrollTo(0, 0);
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              }, 200);
            }}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setIsFocused(false);
              }
            }}
          >
            <InputArea
              value={inputText}
              onChange={setInputText}
              onSend={handleSend}
              onCancel={cancelRequest}
              disabled={isInputLockedByWidgetAction}
              isLoading={isLoading}
            />
          </div>
        </div>
        <style jsx>{`
          .trace-gradient-flow {
            background-size: 220% 100%;
            animation: trace-gradient-shift 2.4s ease-in-out infinite;
          }

          @keyframes trace-gradient-shift {
            0%,
            100% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .trace-gradient-flow {
              animation: none;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
