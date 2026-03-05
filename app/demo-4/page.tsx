"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal, ModalContent } from "@heroui/react";
import { Delete, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HeaderSection } from "@/src/chat-ui/components/HeaderSection";
import { ActionGrid } from "@/src/chat-ui/components/ActionGrid";
import { ActionScrollList } from "@/src/chat-ui/components/ActionScrollList";
import { InputArea } from "@/src/chat-ui/components/InputArea";
import { VoiceInputModal } from "@/src/chat-ui/components/VoiceInputModal";
import { StarsBackground } from "@/src/chat-ui/effects/StarsBackground";
import { AccountNavbar, AccountOption } from "@/src/chat-ui/components/AccountNavbar";
import { ChatOutput, UIAction, useChatDemo } from "@/src/chat-ui/hooks/useChatDemo";
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
import { AdjustLimitAction, AdjustLimitWidget } from "@/src/chat-ui/components/widgets/AdjustLimitWidget";
import {
  LoanOfferActionKey,
  LoanOfferSummaryWidget,
} from "@/src/chat-ui/components/widgets/LoanOfferSummaryWidget";
import {
  LoanNextStepActionKey,
  LoanNextStepWidget,
} from "@/src/chat-ui/components/widgets/LoanNextStepWidget";
import { LoanProfileTableWidget } from "@/src/chat-ui/components/widgets/LoanProfileTableWidget";
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
const POST_WIDGET_FOLLOWUP_MESSAGE = "คุณเจนครับอยากให้ผมช่วยอะไรอีกไหมครับ";
const TTS_ENABLED_STORAGE_KEY = "pf_tts_enabled";
const DEMO4_BULK_PREPARED_ID = "demo4-bulk-payment-500-300-2000";
const DEMO4_ADJUST_LIMIT_PREPARED_ID = "demo4-adjust-limit-100000";
const DEMO4_BULK_PHRASE_SIGNATURE = [
  "โอนเงินให้แม่",
  "500",
  "เติมเงิน",
  "ais",
  "ลูก",
  "300",
  "จ่ายค่าไฟ",
  "2000",
];
const LOAN_PAYDAY_INTRO_MESSAGE = [
  "ปิงเช็คข้อมูลให้แล้วครับ สินเชื่อที่เหมาะตอนนี้คือ **กรุงไทยเปย์เดะ**",
  "เดี๋ยวผมสรุปรายละเอียดให้ดูก่อนนะครับ",
].join("\n");
const LOAN_APPROVED_MESSAGE = [
  "อนุมัติสินเชื่อเรียบร้อย! 🎉",
  "เงิน 10,000 บาท โอนเข้าบัญชีของคุณเจนแล้วครับ",
  "ยอดคงเหลือปัจจุบัน: 15,200.00 บาท",
].join("\n");
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

function isDemo4BulkPaymentPrompt(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  const numberNormalized = normalized.replace(/,/g, "");
  const hasStandaloneNumber = (num: string) =>
    new RegExp(`(^|\\D)${num}(\\D|$)`).test(numberNormalized);

  if (
    hasStandaloneNumber("500") &&
    hasStandaloneNumber("300") &&
    hasStandaloneNumber("2000")
  ) {
    return true;
  }
  if (
    normalized.includes(
      "โอนเงินให้แม่ 500 เติมเงิน ais ให้ลูก 300 จ่ายค่าไฟ 2000",
    )
  ) {
    return true;
  }
  return DEMO4_BULK_PHRASE_SIGNATURE.every((token) => normalized.includes(token));
}

function isDemo4LoanPrompt(text: string): boolean {
  const compact = text
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^0-9a-zก-๙]/g, "");
  const hasLoanWord =
    compact.includes("กู้เงิน") ||
    compact.includes("ขอสินเชื่อ") ||
    compact.includes("กู้");
  const hasAmount = compact.includes("10000") || compact.includes("10,000");
  const hasTerm = compact.includes("1ปี") || compact.includes("12เดือน");
  return hasLoanWord && hasAmount && hasTerm;
}

function isDemo4AdjustLimitPrompt(text: string): boolean {
  const compact = text
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^0-9a-zก-๙]/g, "");
  const hasAdjustWord =
    compact.includes("ปรับวงเงิน") ||
    compact.includes("เพิ่มวงเงิน") ||
    compact.includes("วงเงิน");
  const hasTargetAmount = compact.includes("100000");
  return hasAdjustWord && hasTargetAmount;
}

function randomThinkingDelayTransferMs(min = 5000, max = 7000): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomThinkingDelayLoanAndLimitMs(min = 3000, max = 5000): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createDemo4ReceiptListUi(): PaymentActionListUI {
  return {
    type: "list",
    props: {
      items: [
        {
          type: "payment_receipt",
          label: "สลิปรายการที่ 1",
          props: {
            status: "success",
            txn_id: "TXN-DEMO4-001",
            balance: 197500,
            summary: "โอนเงินให้แม่ 500 บาท สำเร็จ",
            destinationLabel: "แม่",
            destinationAccount: "0800000000",
            destinationBank: "SCB",
            amount: 500,
            currency: "บาท",
          },
          actions: [],
        },
        {
          type: "payment_receipt",
          label: "สลิปรายการที่ 2",
          props: {
            status: "success",
            txn_id: "TXN-DEMO4-002",
            balance: 197200,
            summary: "เติมเงิน AIS ให้ลูก 300 บาท สำเร็จ",
            destinationLabel: "เติมเงิน AIS",
            destinationAccount: "0811111111",
            destinationBank: "AIS",
            amount: 300,
            currency: "บาท",
          },
          actions: [],
        },
        {
          type: "payment_receipt",
          label: "สลิปรายการที่ 3",
          props: {
            status: "success",
            txn_id: "TXN-DEMO4-003",
            balance: 195200,
            summary: "จ่ายค่าไฟ 2,000 บาท สำเร็จ",
            destinationLabel: "ค่าไฟฟ้า",
            destinationAccount: "PEA-BILL-2026",
            destinationBank: "PEA",
            amount: 2000,
            currency: "บาท",
          },
          actions: [],
        },
      ],
    },
  };
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
    autoOpenPin?: boolean;
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

type AdjustLimitUI = {
  type: "adjust_limit";
  props: {
    prepared_id: string;
    message: string;
  };
  actions?: ReadonlyArray<WidgetButton>;
};

type LoanProfileUI = { type: "loan_profile" };
type LoanOfferSummaryUI = { type: "loan_offer_summary" };
type LoanNextStepUI = { type: "loan_next_step" };

type UIWidget =
  | PaymentConfirmationUI
  | PaymentReceiptUI
  | PaymentActionListUI
  | AdjustLimitUI
  | LoanProfileUI
  | LoanOfferSummaryUI
  | LoanNextStepUI
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
  onLoanOfferAction: (action: LoanOfferActionKey) => void;
  onLoanNextStepAction: (action: LoanNextStepActionKey) => void;
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

  // Normalize only the specific "heading + flattened bullets" shape.
  // Example: "### หัวข้อ * ข้อ 1 * ข้อ 2" -> keep heading line + split bullets.
  return withHeadingMarkdown
    .split("\n")
    .map((line) => {
      if (!/^###\s+/.test(line)) return line;
      const parts = line.split(/\s+\*\s+/);
      if (parts.length <= 1) return line;
      const [heading, ...items] = parts;
      const cleaned = items.map((item) => item.trim()).filter(Boolean);
      if (cleaned.length === 0) return heading;
      return `${heading}\n* ${cleaned.join("\n* ")}`;
    })
    .join("\n");
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
  if (ui["type"] === "loan_offer_summary" || ui["type"] === "loan_next_step") {
    return true;
  }
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

function isAdjustLimitUI(v: unknown): v is AdjustLimitUI {
  if (!isRecord(v) || v["type"] !== "adjust_limit") return false;
  const props = v["props"];
  if (!isRecord(props)) return false;
  if (typeof props["prepared_id"] !== "string") return false;
  if (typeof props["message"] !== "string") return false;
  const actions = v["actions"];
  if (typeof actions === "undefined") return true;
  return Array.isArray(actions) && actions.every(isWidgetButton);
}

function isLoanProfileUI(v: unknown): v is LoanProfileUI {
  return isRecord(v) && v["type"] === "loan_profile";
}

function isLoanOfferSummaryUI(v: unknown): v is LoanOfferSummaryUI {
  return isRecord(v) && v["type"] === "loan_offer_summary";
}

function isLoanNextStepUI(v: unknown): v is LoanNextStepUI {
  return isRecord(v) && v["type"] === "loan_next_step";
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
  onLoanOfferAction,
  onLoanNextStepAction,
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
            autoOpenPin={ui.props.autoOpenPin === true}
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
          className={`transition-all duration-500 ease-out will-change-transform will-change-opacity ${
            isConfirmWidgetExiting
              ? "mt-4 opacity-0 translate-y-6 pointer-events-none"
              : widgetRevealClass
          }`}
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

      {canRenderWidgets && isAdjustLimitUI(ui) && (
        <div
          className={`transition-all duration-500 ease-out will-change-transform will-change-opacity ${widgetRevealClass}`}
        >
          <AdjustLimitWidget
            message={ui.props.message}
            actions={(ui.actions ?? []) as ReadonlyArray<AdjustLimitAction>}
            disabled={isLoading || !isWidgetVisible || isConfirmWidgetExiting}
            onAction={(config) => onConfirmWidgetAction(index, message, config)}
          />
        </div>
      )}

      {canRenderWidgets && isLoanProfileUI(ui) && (
        <div
          className={`transition-all duration-500 ease-out will-change-transform will-change-opacity ${widgetRevealClass}`}
        >
          <LoanProfileTableWidget />
        </div>
      )}

      {canRenderWidgets && isLoanOfferSummaryUI(ui) && (
        <div
          className={`transition-all duration-500 ease-out will-change-transform will-change-opacity ${widgetRevealClass}`}
        >
          <LoanOfferSummaryWidget
            disabled={isLoading || !isWidgetVisible || isConfirmWidgetExiting}
            onAction={onLoanOfferAction}
          />
        </div>
      )}

      {canRenderWidgets && isLoanNextStepUI(ui) && (
        <div
          className={`transition-all duration-500 ease-out will-change-transform will-change-opacity ${widgetRevealClass}`}
        >
          <LoanNextStepWidget
            disabled={isLoading || !isWidgetVisible || isConfirmWidgetExiting}
            onAction={onLoanNextStepAction}
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
    sendMessageStream,
    sendUIAction,
    cancelRequest,
    resetSession,
    isLoading,
    error,
    profile,
  } = useChatDemo({ accountId: selectedAccountId });
  const [mounted, setMounted] = React.useState<boolean>(false);
  const [showSplash, setShowSplash] = React.useState<boolean>(true);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = React.useState<boolean>(false);
  const [ttsEnabled, setTtsEnabled] = React.useState<boolean>(false);
  const [isLocalThinking, setIsLocalThinking] = React.useState<boolean>(false);
  const [isLoanPinModalOpen, setIsLoanPinModalOpen] = React.useState(false);
  const [loanPin, setLoanPin] = React.useState("");
  const [loanPinError, setLoanPinError] = React.useState<string | null>(null);
  const [isLoanPinInputLocked, setIsLoanPinInputLocked] = React.useState(false);
  const [pinIntent, setPinIntent] = React.useState<"loan_confirm" | null>(null);
  const [viewportHeight, setViewportHeight] = React.useState<number | null>(
    null,
  );
  const chatScrollContainerRef = React.useRef<HTMLElement | null>(null);
  const slowScrollRafRef = React.useRef<number | null>(null);
  const ttsAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const ttsQueueRef = React.useRef<string[]>([]);
  const prefetchedAudioQueueRef = React.useRef<string[]>([]);
  const prefetchedAudioPlayingRef = React.useRef<boolean>(false);
  const ttsIsPlayingRef = React.useRef<boolean>(false);
  const ttsLastSegmentRef = React.useRef<string>("");
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
  const [shouldAutoFollow, setShouldAutoFollow] = React.useState<boolean>(true);
  const previousAccountIdRef = React.useRef<string>(selectedAccountId);
  const lastToastErrorRef = React.useRef<string | null>(null);
  const isBusy = isLoading || isLocalThinking;
  const STREAM_SCROLL_THRESHOLD_PX = 180;
  const STREAM_SCROLL_COMFORT_GAP_PX = 96;

  const cancelSlowScroll = React.useCallback(() => {
    if (slowScrollRafRef.current !== null) {
      window.cancelAnimationFrame(slowScrollRafRef.current);
      slowScrollRafRef.current = null;
    }
  }, []);

  const isNearBottom = React.useCallback(() => {
    const container = chatScrollContainerRef.current;
    if (!container) return true;
    const distanceToBottom =
      container.scrollHeight - container.clientHeight - container.scrollTop;
    return distanceToBottom <= STREAM_SCROLL_THRESHOLD_PX;
  }, [STREAM_SCROLL_THRESHOLD_PX]);

  const scrollToBottom = React.useCallback(
    (slow = false, mode: "bottom" | "comfort" = "bottom") => {
      const container = chatScrollContainerRef.current;
      if (!container) return;

      const targetBottom = Math.max(container.scrollHeight - container.clientHeight, 0);
      const targetTop =
        mode === "comfort"
          ? Math.max(targetBottom - STREAM_SCROLL_COMFORT_GAP_PX, 0)
          : targetBottom;

      if (!slow) {
        cancelSlowScroll();
        container.scrollTo({
          top: targetTop,
          behavior: "smooth",
        });
        return;
      }

      cancelSlowScroll();
      const startTop = container.scrollTop;
      const delta = targetTop - startTop;
      if (delta <= 0) return;

      const startedAt = performance.now();
      const duration = 1200;
      const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);

      const tick = (now: number) => {
        const progress = Math.min((now - startedAt) / duration, 1);
        container.scrollTop = startTop + delta * easeInOut(progress);
        if (progress < 1) {
          slowScrollRafRef.current = window.requestAnimationFrame(tick);
        } else {
          slowScrollRafRef.current = null;
        }
      };

      slowScrollRafRef.current = window.requestAnimationFrame(tick);
    },
    [STREAM_SCROLL_COMFORT_GAP_PX, cancelSlowScroll],
  );

  const resetChatState = React.useCallback(() => {
    setInputText("");
    setMessages([]);
    setConfirmWidgetExitingIndexes([]);
    setLandingActionStage(0);
    setIsGreetingLiftReady(false);
    setShouldAutoFollow(true);
    setStreamingAssistants(0);
    setIsLocalThinking(false);
    setIsLoanPinModalOpen(false);
    setLoanPin("");
    setLoanPinError(null);
    setIsLoanPinInputLocked(false);
    setPinIntent(null);
    setIsFocused(false);
    streamingAssistantIndexesRef.current = new Set();
    receiptDisplayContextByPreparedIdRef.current = {};
  }, []);

  const handleChatScroll = React.useCallback(() => {
    setShouldAutoFollow(isNearBottom());
  }, [isNearBottom]);

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

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(TTS_ENABLED_STORAGE_KEY);
      if (stored === "0") setTtsEnabled(false);
      if (stored === "1") setTtsEnabled(true);
    } catch {
      // Ignore storage errors.
    }
  }, []);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(TTS_ENABLED_STORAGE_KEY, ttsEnabled ? "1" : "0");
    } catch {
      // Ignore storage errors.
    }
  }, [ttsEnabled]);

  const handleLogoClick = React.useCallback(() => {
    cancelRequest();
    resetSession();
    resetChatState();
    router.push("/");
  }, [cancelRequest, resetChatState, resetSession, router]);

  const handleMicClick = React.useCallback(() => {
    setIsVoiceModalOpen(true);
  }, []);

  const traceQuery = useQuery({
    queryKey: ["trace-latest"],
    queryFn: async () => {
      const resp = await fetch("/api/v1/trace", { cache: "no-store" });
      if (!resp.ok) throw new Error("Failed to fetch latest trace");
      return (await resp.json()) as { sessionId: string | null; message: string | null };
    },
    enabled: false,
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

  const playTtsQueue = React.useCallback(async () => {
    if (ttsIsPlayingRef.current) return;
    ttsIsPlayingRef.current = true;

    try {
      while (ttsQueueRef.current.length > 0) {
        const nextText = ttsQueueRef.current.shift();
        if (!nextText) continue;

        const params = new URLSearchParams({ text: nextText });
        const previousText = ttsLastSegmentRef.current.trim();
        const nextContext = (ttsQueueRef.current[0] ?? "").trim();
        if (previousText) {
          params.set("previousText", previousText.slice(-140));
        }
        if (nextContext) {
          params.set("nextText", nextContext.slice(0, 140));
        }
        const audio = new Audio(`/api/v1/tts?${params.toString()}`);
        ttsAudioRef.current = audio;

        await new Promise<void>((resolve) => {
          let settled = false;
          const done = () => {
            if (settled) return;
            settled = true;
            resolve();
          };

          audio.onended = done;
          audio.onerror = done;
          audio.onpause = done;
          audio.play().catch(done);
        });

        ttsLastSegmentRef.current = nextText;
      }
    } finally {
      ttsIsPlayingRef.current = false;
    }
  }, []);

  const enqueueTtsSegment = React.useCallback(
    (text: string) => {
      if (!ttsEnabled) return;
      const normalized = text.trim();
      if (!normalized) return;

      ttsQueueRef.current.push(normalized);
      void playTtsQueue();
    },
    [playTtsQueue, ttsEnabled],
  );

  const stopTtsPlayback = React.useCallback(() => {
    ttsQueueRef.current = [];
    prefetchedAudioQueueRef.current = [];
    prefetchedAudioPlayingRef.current = false;
    ttsIsPlayingRef.current = false;
    ttsLastSegmentRef.current = "";
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current.currentTime = 0;
      ttsAudioRef.current.src = "";
    }
  }, []);

  const speakAssistantText = React.useCallback(
    (text: string) => {
      if (!ttsEnabled) return;
      const normalized = text.trim();
      if (!normalized) return;

      stopTtsPlayback();
      enqueueTtsSegment(normalized);
    },
    [enqueueTtsSegment, stopTtsPlayback, ttsEnabled],
  );

  const playPrefetchedAudioQueue = React.useCallback(async () => {
    if (prefetchedAudioPlayingRef.current) return;
    prefetchedAudioPlayingRef.current = true;
    ttsIsPlayingRef.current = true;

    try {
      while (prefetchedAudioQueueRef.current.length > 0) {
        const nextUrl = prefetchedAudioQueueRef.current.shift();
        if (!nextUrl) continue;
        const audio = new Audio(nextUrl);
        ttsAudioRef.current = audio;

        await new Promise<void>((resolve) => {
          let settled = false;
          const done = () => {
            if (settled) return;
            settled = true;
            resolve();
          };
          audio.onended = done;
          audio.onerror = done;
          audio.onpause = done;
          audio.play().catch(done);
        });
      }
    } finally {
      prefetchedAudioPlayingRef.current = false;
      ttsIsPlayingRef.current = false;
    }
  }, []);

  const enqueuePreloadedTtsUrl = React.useCallback(
    (audioUrl: string) => {
      if (!ttsEnabled) return;
      const url = audioUrl.trim();
      if (!url) return;
      prefetchedAudioQueueRef.current.push(url);
      void playPrefetchedAudioQueue();
    },
    [playPrefetchedAudioQueue, ttsEnabled],
  );

  React.useEffect(() => {
    if (ttsEnabled) return;
    stopTtsPlayback();
  }, [stopTtsPlayback, ttsEnabled]);

  const appendPostWidgetFollowup = React.useCallback(() => {
    void speakAssistantText(POST_WIDGET_FOLLOWUP_MESSAGE);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: POST_WIDGET_FOLLOWUP_MESSAGE,
      },
    ]);
  }, [speakAssistantText]);

  const appendAssistant = (res: ChatOutput) => {
    const responseUi = (res.ui as UIWidget | null) ?? null;
    const assistantText = res.reply_text ?? "";
    void speakAssistantText(assistantText);
    setMessages((prev) => {
      const nextMessages: Message[] = [
        ...prev,
        {
          role: "assistant",
          content: assistantText, // ✅ never null
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

  React.useEffect(() => () => cancelSlowScroll(), [cancelSlowScroll]);

  React.useEffect(() => () => stopTtsPlayback(), [stopTtsPlayback]);

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
    // Auto-scroll is controlled by the shared effect below.
  }, []);

  const resolveReceiptDisplayContext = React.useCallback(
    (preparedId: string) => {
      if (!preparedId) return null;
      return receiptDisplayContextByPreparedIdRef.current[preparedId] ?? null;
    },
    [],
  );

  React.useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const shouldAutoScroll =
      isBusy || streamingAssistants > 0 || lastMessage?.role === "assistant";
    if (!shouldAutoScroll) return;
    if (!shouldAutoFollow) return;

    scrollToBottom(
      streamingAssistants > 0,
      streamingAssistants > 0 ? "comfort" : "bottom",
    );
  }, [isBusy, messages, scrollToBottom, shouldAutoFollow, streamingAssistants]);

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

  function appendAssistantDeltaAt(idx: number, delta: string) {
    if (!delta) return;
    setMessages((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, content: `${m.content}${delta}` } : m)),
    );
  }

  function sleep(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  const resetLoanPinState = React.useCallback(() => {
    setLoanPin("");
    setLoanPinError(null);
    setIsLoanPinInputLocked(false);
  }, []);

  const handleLoanOfferAction = React.useCallback(
    (action: LoanOfferActionKey) => {
      if (isBusy) return;
      if (action === "confirm_loan") {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: "ยืนยันการขอสินเชื่อ", timestamp: nowTime() },
        ]);
        setPinIntent("loan_confirm");
        setIsLoanPinModalOpen(true);
        resetLoanPinState();
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "user", content: "ยกเลิก", timestamp: nowTime() },
        {
          role: "assistant",
          content: "รับทราบครับ ผมจะยกเลิกคำขอสินเชื่อให้ก่อน",
        },
      ]);
    },
    [isBusy, resetLoanPinState],
  );

  const handleLoanNextStepAction = React.useCallback(
    (action: LoanNextStepActionKey) => {
      if (isBusy) return;
      if (action === "pay_now") {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: "จ่ายเลย", timestamp: nowTime() },
          {
            role: "assistant",
            content: "ได้เลยครับ เดี๋ยวผมพาไปขั้นตอนจ่ายค่างวดต่อให้นะครับ",
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "user", content: "ไว้ทีหลัง", timestamp: nowTime() },
        {
          role: "assistant",
          content: "ได้เลยครับ ผมจะพักรายการนี้ไว้ก่อน หากพร้อมเมื่อไหร่บอกผมได้เลย",
        },
      ]);
    },
    [isBusy],
  );

  const appendLoanPinDigit = React.useCallback(
    (digit: string) => {
      if (isLoanPinInputLocked) return;
      if (!/^\d$/.test(digit)) return;
      if (loanPin.length >= 6) return;
      const nextPin = `${loanPin}${digit}`;
      setLoanPin(nextPin);
      if (loanPinError) setLoanPinError(null);
    },
    [isLoanPinInputLocked, loanPin, loanPinError],
  );

  const removeLastLoanPinDigit = React.useCallback(() => {
    if (isLoanPinInputLocked) return;
    setLoanPin((prev) => prev.slice(0, -1));
    if (loanPinError) setLoanPinError(null);
  }, [isLoanPinInputLocked, loanPinError]);

  const submitLoanPin = React.useCallback(async () => {
    if (loanPin.length !== 6) {
      setLoanPinError("กรุณากรอก PIN 6 หลัก");
      return;
    }
    if (loanPin !== "000000") {
      setLoanPinError("PIN ไม่ถูกต้อง");
      setLoanPin("");
      setIsLoanPinInputLocked(true);
      window.setTimeout(() => setIsLoanPinInputLocked(false), 900);
      return;
    }
    setIsLoanPinModalOpen(false);
    resetLoanPinState();
    if (pinIntent === "loan_confirm") {
      setIsLocalThinking(true);
      await sleep(randomThinkingDelayLoanAndLimitMs());
      setIsLocalThinking(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: LOAN_APPROVED_MESSAGE,
          ui: { type: "loan_next_step" },
        },
      ]);
    }
    setPinIntent(null);
  }, [loanPin, pinIntent, resetLoanPinState]);

  React.useEffect(() => {
    if (!isLoanPinModalOpen || loanPin.length !== 6) return;
    const timer = window.setTimeout(() => {
      void submitLoanPin();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [isLoanPinModalOpen, loanPin, submitLoanPin]);

  const handleConfirmWidgetAction = async (
    idx: number,
    msg: Message,
    config: unknown,
  ) => {
    setShouldAutoFollow(true);
    const originalMessage = msg;
    const prepared_id = extractPreparedId(msg, config);
    if (!prepared_id) {
      console.warn("Missing prepared_id");
      return;
    }

    if (prepared_id === DEMO4_BULK_PREPARED_ID && isRecord(config)) {
      const isConfirmAll =
        config["action"] === "confirm_transfer" ||
        (config["action"] === "tool" && config["name"] === "confirm_transfer");
      const isConfirmEach = config["action"] === "confirm_each";

      if (isConfirmAll || isConfirmEach) {
        setConfirmWidgetExitingIndexes((prev) =>
          prev.includes(idx) ? prev : [...prev, idx],
        );
        await sleep(CONFIRM_WIDGET_EXIT_MS);
        replaceMessageAt(idx, {
          ui: null,
          content: isConfirmEach ? "กำลังทำรายการทีละรายการ..." : "กำลังทำรายการทั้งหมด...",
        });
        setIsLocalThinking(true);
        await sleep(randomThinkingDelayTransferMs());
        setIsLocalThinking(false);
        const successMessage = isConfirmEach
          ? "**ทำรายการทีละรายการเรียบร้อยแล้วครับ**"
          : "**ทำรายการทั้งหมดเรียบร้อยแล้วครับ**";
        const receiptUi = createDemo4ReceiptListUi();
        replaceMessageAt(idx, {
          content: successMessage,
          ui: receiptUi,
          meta: {
            next: "reply_to_user",
            stop_tool_calls: true,
            prepared_id: DEMO4_BULK_PREPARED_ID,
          },
        });
        if (successMessage.trim()) {
          void speakAssistantText(successMessage);
        }
        appendPostWidgetFollowup();
        setConfirmWidgetExitingIndexes((prev) => prev.filter((i) => i !== idx));
        return;
      }

      if (
        config["action"] === "cancel" ||
        config["action"] === "cancel_transfer"
      ) {
        replaceMessageAt(idx, {
          ui: null,
          content: "รับทราบครับ ไว้ทีหลังก่อนได้เลย",
        });
        return;
      }
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
      } else if (config["action"] === "adjust_limit") {
        uiAction = { action: "adjust_limit", prepared_id };
        pendingText = "กำลังปรับวงเงิน...";
      } else if (config["action"] === "skip_adjust_limit") {
        uiAction = { action: "skip_adjust_limit", prepared_id };
        pendingText = "รับทราบครับ...";
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
      if (res.reply_text?.trim()) {
        void speakAssistantText(res.reply_text);
      }
      if (shouldAppendPostWidgetFollowup(responseUi)) {
        appendPostWidgetFollowup();
      }
    }
    if (shouldSlideOutDown) {
      setConfirmWidgetExitingIndexes((prev) => prev.filter((i) => i !== idx));
    }
  };

  const handleSend = async (text?: string) => {
    if (isBusy || isInputLockedByWidgetAction) return;

    const messageText = typeof text === "string" ? text : inputText;
    const trimmedText = messageText.trim();
    if (!trimmedText) return;
    setShouldAutoFollow(true);

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
    if (isDemo4AdjustLimitPrompt(trimmedText)) {
      const thinkingAssistantMessage: Message = {
        role: "assistant",
        content: "",
      };
      const stagedMessages = [
        ...sanitizedHistoryMessages,
        newMessage,
        thinkingAssistantMessage,
      ];
      const thinkingAssistantIndex = stagedMessages.length - 1;
      setMessages(stagedMessages);
      if (typeof text !== "string") setInputText("");
      setIsLocalThinking(true);
      await sleep(randomThinkingDelayLoanAndLimitMs());
      setIsLocalThinking(false);

      const adjustReply = [
        "ได้เลยครับ",
        "ต้องการให้ผมปรับวงเงินเป็น **100,000 บาท** เลยไหมครับ",
      ].join("\n");

      replaceMessageAt(thinkingAssistantIndex, {
        content: adjustReply,
        ui: {
          type: "adjust_limit",
          props: {
            prepared_id: DEMO4_ADJUST_LIMIT_PREPARED_ID,
            message: "ปรับวงเงินจาก 50,000 บาท เป็น 100,000 บาทหรือไม่?",
          },
          actions: [
            {
              label: "ปรับวงเงินเลย",
              type: "button",
              style: "primary",
              onClick: {
                action: "adjust_limit",
                prepared_id: DEMO4_ADJUST_LIMIT_PREPARED_ID,
              },
            },
            {
              label: "ไว้ทีหลัง",
              type: "button",
              style: "secondary",
              onClick: {
                action: "skip_adjust_limit",
                prepared_id: DEMO4_ADJUST_LIMIT_PREPARED_ID,
              },
            },
          ],
        },
        meta: {
          next: "reply_to_user",
          stop_tool_calls: true,
          prepared_id: DEMO4_ADJUST_LIMIT_PREPARED_ID,
        },
      });
      return;
    }

    if (isDemo4LoanPrompt(trimmedText)) {
      const thinkingAssistantMessage: Message = {
        role: "assistant",
        content: "",
      };
      const stagedMessages = [
        ...sanitizedHistoryMessages,
        newMessage,
        thinkingAssistantMessage,
      ];
      const thinkingAssistantIndex = stagedMessages.length - 1;
      setMessages(stagedMessages);
      if (typeof text !== "string") setInputText("");
      setIsLocalThinking(true);
      await sleep(randomThinkingDelayLoanAndLimitMs());
      setIsLocalThinking(false);

      void speakAssistantText(LOAN_PAYDAY_INTRO_MESSAGE);
      replaceMessageAt(thinkingAssistantIndex, {
        content: LOAN_PAYDAY_INTRO_MESSAGE,
        ui: { type: "loan_offer_summary" },
        meta: {
          next: "reply_to_user",
          stop_tool_calls: true,
          prepared_id: "",
        },
      });
      return;
    }

    if (isDemo4BulkPaymentPrompt(trimmedText)) {
      const thinkingAssistantMessage: Message = {
        role: "assistant",
        content: "",
      };
      const stagedMessages = [
        ...sanitizedHistoryMessages,
        newMessage,
        thinkingAssistantMessage,
      ];
      const thinkingAssistantIndex = stagedMessages.length - 1;
      setMessages(stagedMessages);
      if (typeof text !== "string") setInputText("");
      setIsLocalThinking(true);
      await sleep(randomThinkingDelayTransferMs());
      setIsLocalThinking(false);

      const bulkConfirmationUi: PaymentActionListUI = {
        type: "list",
        props: {
          items: [
            {
              type: "payment_confirmation",
              label: "รายการที่ 1",
              props: {
                amount: 500,
                currency: "บาท",
                target: "แม่",
                beneficiaryName: "แม่",
                destinationAccount: "0800000000",
                destinationBank: "SCB",
              },
              actions: [],
            },
            {
              type: "payment_confirmation",
              label: "รายการที่ 2",
              props: {
                amount: 300,
                currency: "บาท",
                target: "ลูก",
                beneficiaryName: "เติมเงิน AIS",
                destinationAccount: "0811111111",
                destinationBank: "AIS",
              },
              actions: [],
            },
            {
              type: "payment_confirmation",
              label: "รายการที่ 3",
              props: {
                amount: 2000,
                currency: "บาท",
                target: "การไฟฟ้า",
                beneficiaryName: "ค่าไฟฟ้า",
                destinationAccount: "PEA-BILL-2026",
                destinationBank: "PEA",
              },
              actions: [],
            },
            {
              type: "payment_confirmation",
              label: "ทำรายการทั้งหมด",
              props: {
                compactSummary: true,
                message: "รวม 3 รายการ เป็นเงินทั้งหมด 2,800 บาท",
              },
              actions: [
                {
                  label: "ทำรายการทั้งหมด",
                  type: "button",
                  style: "primary",
                  onClick: {
                    action: "confirm_transfer",
                    prepared_id: DEMO4_BULK_PREPARED_ID,
                  },
                },
                {
                  label: "ทำทีละรายการ",
                  type: "button",
                  style: "primary",
                  onClick: {
                    action: "confirm_each",
                    prepared_id: DEMO4_BULK_PREPARED_ID,
                  },
                },
                {
                  label: "ไว้ทีหลัง",
                  type: "button",
                  style: "secondary",
                  onClick: {
                    action: "cancel",
                    prepared_id: DEMO4_BULK_PREPARED_ID,
                  },
                },
              ],
            },
          ],
        },
      };
      const demoReply = [
        "แยกรายการให้แล้วทั้งหมด 3 รายการ",
        "ด้านล่างเป็นรายการแต่ละธุรกรรม และมี widget สุดท้ายสำหรับทำทั้งหมด",
      ].join("\n");
      void speakAssistantText(demoReply);
      replaceMessageAt(thinkingAssistantIndex, {
        content: demoReply,
        ui: bulkConfirmationUi,
        meta: {
          next: "reply_to_user",
          stop_tool_calls: true,
          prepared_id: DEMO4_BULK_PREPARED_ID,
        },
      });
      return;
    }

    const streamingAssistantMessage: Message = {
      role: "assistant",
      content: "",
    };
    const newMessages = [...sanitizedHistoryMessages, newMessage, streamingAssistantMessage];
    const streamingAssistantIndex = newMessages.length - 1;
    setMessages(newMessages);

    if (typeof text !== "string") setInputText("");

    const requestMessages = newMessages
      .filter((m) => m.role === "user" || m.content.trim().length > 0)
      .map((m) => ({ role: m.role, content: m.content }));

    stopTtsPlayback();
    let prefetchedTtsCount = 0;
    const response = await sendMessageStream(requestMessages, (deltaText) => {
      appendAssistantDeltaAt(streamingAssistantIndex, deltaText);
    }, (audioUrl) => {
      prefetchedTtsCount += 1;
      enqueuePreloadedTtsUrl(audioUrl);
    });

    if (!response) {
      replaceMessageAt(streamingAssistantIndex, {
        content: "ขออภัยครับ ไม่สามารถดำเนินการคำขอนี้ได้ กรุณาลองใหม่อีกครั้ง",
      });
      return;
    }

    const responseUi = (response.ui as UIWidget | null) ?? null;
    replaceMessageAt(streamingAssistantIndex, {
      content: response.reply_text ?? "",
      ui: responseUi,
      meta: response.meta,
    });
    if (response.reply_text?.trim() && prefetchedTtsCount === 0) {
      void speakAssistantText(response.reply_text);
    }
    if (shouldAppendPostWidgetFollowup(responseUi)) {
      appendPostWidgetFollowup();
    }
  };

  const handleQuickActionSend = async (title: string, subtitle?: string) => {
    if (isBusy || isInputLockedByWidgetAction) return;
    const textToSend = `${title}${subtitle ?? ""}`.trim();
    if (!textToSend) return;
    setInputText(textToSend);
    await handleSend(textToSend);
    setInputText("");
  };

  const handleVoiceApply = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setIsVoiceModalOpen(false);
    setInputText(trimmed);
    await handleSend(trimmed);
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
              ttsEnabled={ttsEnabled}
              onToggleTts={setTtsEnabled}
            />
          </div>
          <main
            ref={chatScrollContainerRef}
            onScroll={handleChatScroll}
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
                            isLoading={isBusy}
                            isConfirmWidgetExiting={confirmWidgetExitingIndexes.includes(
                              index,
                            )}
                            onConfirmWidgetAction={handleConfirmWidgetAction}
                            onLoanOfferAction={handleLoanOfferAction}
                            onLoanNextStepAction={handleLoanNextStepAction}
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

                {isBusy && (
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

                <div />
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
                        disabled={isBusy || isInputLockedByWidgetAction}
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
                        disabled={isBusy || isInputLockedByWidgetAction}
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
                setShouldAutoFollow(true);
                setTimeout(() => {
                  window.scrollTo(0, 0);
                  scrollToBottom(false);
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
              onMicClick={handleMicClick}
              onCancel={cancelRequest}
              disabled={isInputLockedByWidgetAction}
              isLoading={isBusy}
            />
          </div>
        </div>
        <VoiceInputModal
          isOpen={isVoiceModalOpen}
          initialText={inputText}
          onClose={() => setIsVoiceModalOpen(false)}
          onApply={handleVoiceApply}
        />
        <Modal
          isOpen={isLoanPinModalOpen}
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
            setIsLoanPinModalOpen(open);
            if (!open) {
              resetLoanPinState();
              setPinIntent(null);
            }
          }}
        >
          <ModalContent className="m-0 max-w-none w-screen h-[100dvh] rounded-none bg-white text-[#00A9F4]">
            {() => (
              <div className="h-full flex flex-col px-7 pb-7 pt-12 sm:px-10 sm:pt-14">
                <div className="flex items-start justify-between">
                  <div className="leading-none">
                    <p className="text-[24px] font-bold tracking-tight">Krungthai</p>
                    <p className="text-[58px] font-extrabold -mt-1 leading-none tracking-tight">
                      NEXT
                    </p>
                  </div>
                  <button
                    aria-label="ปิด"
                    className="text-[#71839C] text-base font-semibold"
                    onClick={() => {
                      setIsLoanPinModalOpen(false);
                      resetLoanPinState();
                      setPinIntent(null);
                    }}
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
                        idx < loanPin.length
                          ? "bg-[#00A9F4] border-[#00A9F4]"
                          : "bg-white border-[#00B7FF]"
                      }`}
                    />
                  ))}
                </div>

                {loanPinError ? (
                  <p className="mt-12 text-center text-red-500 text-base font-medium text-md mb-6">
                    {loanPinError}
                  </p>
                ) : null}

                <div className="mt-auto grid grid-cols-3 gap-y-8 gap-x-6 max-w-[420px] w-full self-center pb-1">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      disabled={isLoanPinInputLocked}
                      className="text-[#00A9F4] text-2xl font-semibold leading-none py-2 active:opacity-70"
                      onClick={() => appendLoanPinDigit(digit)}
                    >
                      {digit}
                    </button>
                  ))}
                  <div />
                  <button
                    type="button"
                    disabled={isLoanPinInputLocked}
                    className="text-[#00A9F4] text-2xl font-semibold leading-none py-2 active:opacity-70"
                    onClick={() => appendLoanPinDigit("0")}
                  >
                    0
                  </button>
                  <button
                    type="button"
                    disabled={isLoanPinInputLocked}
                    className="flex items-center justify-center text-[#00A9F4] py-2 active:opacity-70"
                    onClick={removeLastLoanPinDigit}
                  >
                    <Delete size={32} strokeWidth={2.2} />
                  </button>
                </div>
              </div>
            )}
          </ModalContent>
        </Modal>
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
