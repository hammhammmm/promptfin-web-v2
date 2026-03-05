"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal, ModalContent } from "@heroui/react";
import { Delete, X } from "lucide-react";
import { AccountNavbar, AccountOption } from "@/src/chat-ui/components/AccountNavbar";
import { StarsBackground } from "@/src/chat-ui/effects/StarsBackground";
import { InputArea } from "@/src/chat-ui/components/InputArea";
import {
  BillPaymentAction,
  BillPaymentRow,
  BillPaymentTableWidget,
} from "@/src/chat-ui/components/widgets/BillPaymentTableWidget";
import {
  InsufficientFundsActionKey,
  InsufficientFundsWidget,
} from "@/src/chat-ui/components/widgets/InsufficientFundsWidget";
import { LoanProfileTableWidget } from "@/src/chat-ui/components/widgets/LoanProfileTableWidget";
import {
  LoanOfferActionKey,
  LoanOfferSummaryWidget,
} from "@/src/chat-ui/components/widgets/LoanOfferSummaryWidget";
import {
  LoanNextStepActionKey,
  LoanNextStepWidget,
} from "@/src/chat-ui/components/widgets/LoanNextStepWidget";
import {
  CarInstallmentPaidActionKey,
  CarInstallmentPaidWidget,
} from "@/src/chat-ui/components/widgets/CarInstallmentPaidWidget";

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
];

const OPENING_MESSAGE = [
  "**วันนี้เป็นวันที่ 4 ของเดือนครับ**",
  "ปกติวันนี้จะมีรายการที่ต้องชำระ เช่น",
  "- **ค่าไฟ**",
  "- **ค่าน้ำ**",
  "- **ค่างวดรถ**",
  "- **Netflix**",
  "ต้องการให้ผมช่วยจัดการรายการไหนก่อนครับ",
].join("\n");

const INITIAL_ROWS: BillPaymentRow[] = [
  {
    id: "electricity",
    index: 1,
    title: "💡 ค่าไฟฟ้า (การไฟฟ้านครหลวง)",
    amountText: "1,850.00 บาท",
    status: "ยังไม่จ่าย",
  },
  {
    id: "water",
    index: 2,
    title: "💧 ค่าน้ำประปา",
    amountText: "320.00 บาท",
    status: "ยังไม่จ่าย",
  },
  {
    id: "car",
    index: 3,
    title: "🚗 ค่างวดรถ (ลีสซิ่งกสิกร)",
    amountText: "8,500.00 บาท",
    status: "ยังไม่จ่าย",
  },
  {
    id: "netflix",
    index: 4,
    title: "🎬 Netflix",
    amountText: "419.00 บาท",
    status: "ยังไม่จ่าย",
  },
];

const ACTIONS: BillPaymentAction[] = [
  { key: "electricity", label: "ค่าไฟฟ้า", style: "secondary" },
  { key: "water", label: "ค่าน้ำประปา", style: "secondary" },
  { key: "car", label: "จ่ายค่างวดรถ", style: "secondary" },
  { key: "netflix", label: "Netflix", style: "secondary" },
  { key: "all", label: "จ่ายทั้งหมด", style: "primary" },
];
const CAR_SHORTFALL_MESSAGE = [
  "**ผมตรวจสอบยอดเงินให้แล้วครับ**",
  "ตอนนี้ในบัญชีมี **5,200 บาท**",
  "ค่างวดรถ **8,500 บาท**",
  "ยังขาดอีก **3,300 บาท**",
  "ต้องการให้ผมช่วยดำเนินการอย่างไรดีครับ",
].join("\n");
const LOAN_INTRO_MESSAGE = [
  "โอเคครับ! 😊 ปิงเช็คข้อมูลให้แล้วนะครับ เจนมีเงินเดือนเข้าบัญชีกรุงไทยสม่ำเสมอเลย ปิงเลยอยากแนะนำ \"สินเชื่อกรุงไทยเปย์เดะ\" ครับ เหมาะกับพนักงานประจำมากครับ",
  "ข้อมูลเบื้องต้นของคุณเจนครับ:",
].join("\n");
const LOAN_POST_WIDGET_MESSAGE = "คุณเจนจะกู้เท่าไหร่ดีครับ?";
const LOAN_10K_USER_MESSAGE = "เอา 10,000 ก็พอค่ะ แค่ให้พอจ่ายค่างวดรถ";
const LOAN_10K_SUMMARY_MESSAGE = "โอเคค่ะ~ ขอสรุปให้ดูก่อนนะครับ 👇";
const LOAN_APPROVED_MESSAGE = [
  "อนุมัติสินเชื่อเรียบร้อย! 🎉",
  "เงิน 10,000 บาท โอนเข้าบัญชีของคุณเจนแล้วครับ",
  "ยอดคงเหลือปัจจุบัน: 15,200.00 บาท",
].join("\n");

function randomThinkingDelayMs(min = 3000, max = 5000): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

type Profile = {
  id?: string;
  accountId: string;
  accountNo: string;
  accountName: string;
};

type ProfileApiResponse = {
  status: string;
  data: Profile;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  widget?:
    | "bill_table"
    | "insufficient_funds"
    | "loan_profile"
    | "loan_offer_summary"
    | "loan_next_step"
    | "car_payment_success";
};

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

async function fetchProfile(accountId: string): Promise<ProfileApiResponse> {
  const response = await fetch(
    `/api/v1/profile?accountId=${encodeURIComponent(accountId)}`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch profile");
  }

  const data: unknown = await response.json().catch(() => null);
  if (!isRecord(data) || !isRecord(data["data"])) {
    throw new Error("Invalid profile response");
  }

  return data as ProfileApiResponse;
}

function buildRowsAfterPay(rows: ReadonlyArray<BillPaymentRow>, actionKey: string): BillPaymentRow[] {
  if (actionKey === "all") {
    return rows.map((row) => ({ ...row, status: "จ่ายแล้ว" }));
  }
  return rows.map((row) =>
    row.id === actionKey ? { ...row, status: "จ่ายแล้ว" } : row,
  );
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, index) => {
      if (/^\*\*[^*]+\*\*$/.test(part)) {
        return (
          <strong key={`${part}-${index}`} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
    });
}

function MarkdownMessage({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];

  const flushBullets = () => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc pl-6 space-y-1 text-white/85">
        {bullets.map((item, idx) => (
          <li key={`${item}-${idx}`}>{renderInlineMarkdown(item)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushBullets();
      return;
    }
    if (trimmed.startsWith("- ")) {
      bullets.push(trimmed.slice(2).trim());
      return;
    }
    flushBullets();
    blocks.push(
      <p key={`p-${index}`} className="text-white/90 text-[16px] leading-relaxed">
        {renderInlineMarkdown(trimmed)}
      </p>,
    );
  });

  flushBullets();
  return <div className="space-y-2">{blocks}</div>;
}

export default function DemoTwoPage() {
  const [mounted, setMounted] = React.useState(false);
  const [selectedAccountId, setSelectedAccountId] = React.useState("A0001");
  const [rows, setRows] = React.useState<BillPaymentRow[]>(INITIAL_ROWS);
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: createMessageId(),
      role: "assistant",
      content: OPENING_MESSAGE,
      widget: "bill_table",
    },
  ]);
  const [inputText, setInputText] = React.useState("");
  const [ttsEnabled, setTtsEnabled] = React.useState(false);
  const [isThinking, setIsThinking] = React.useState(false);
  const [isStreamingReply, setIsStreamingReply] = React.useState(false);
  const [isLoanPinModalOpen, setIsLoanPinModalOpen] = React.useState(false);
  const [loanPin, setLoanPin] = React.useState("");
  const [loanPinError, setLoanPinError] = React.useState<string | null>(null);
  const [isLoanPinInputLocked, setIsLoanPinInputLocked] = React.useState(false);
  const [pinIntent, setPinIntent] = React.useState<"loan_confirm" | "pay_car" | null>(null);
  const pendingReplyTimerRef = React.useRef<number | null>(null);
  const chatScrollContainerRef = React.useRef<HTMLElement | null>(null);
  const slowScrollRafRef = React.useRef<number | null>(null);
  const isLoanStreamingRef = React.useRef(false);
  const hasScrolledToFirstSystemMessageRef = React.useRef(false);

  const cancelSlowScroll = React.useCallback(() => {
    if (slowScrollRafRef.current !== null) {
      window.cancelAnimationFrame(slowScrollRafRef.current);
      slowScrollRafRef.current = null;
    }
  }, []);

  const scrollToBottom = React.useCallback(
    (slow = false) => {
      if (hasScrolledToFirstSystemMessageRef.current) return;
      const container = chatScrollContainerRef.current;
      if (!container) return;

      const firstSystemMessage = container.querySelector<HTMLElement>(
        '[data-chat-system-message="true"]',
      );
      if (!firstSystemMessage) return;

      if (!slow) {
        firstSystemMessage.scrollIntoView({ behavior: "smooth", block: "start" });
        hasScrolledToFirstSystemMessageRef.current = true;
        return;
      }

      cancelSlowScroll();
      const startTop = container.scrollTop;
      const targetTop = firstSystemMessage.offsetTop;
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
          hasScrolledToFirstSystemMessageRef.current = true;
        }
      };

      slowScrollRafRef.current = window.requestAnimationFrame(tick);
    },
    [cancelSlowScroll],
  );

  const sleep = React.useCallback((ms: number) => {
    return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
  }, []);

  const resetLoanPinState = React.useCallback(() => {
    setLoanPin("");
    setLoanPinError(null);
    setIsLoanPinInputLocked(false);
  }, []);

  const updateMessageById = React.useCallback(
    (id: string, patch: Partial<ChatMessage>) => {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    },
    [],
  );

  const appendMessage = React.useCallback(
    (
      role: ChatMessage["role"],
      content: string,
      widget?: ChatMessage["widget"],
    ) => {
      const id = createMessageId();
      setMessages((prev) => [...prev, { id, role, content, widget }]);
      return id;
    },
    [],
  );

  const clearPendingReplyTimer = React.useCallback(() => {
    if (pendingReplyTimerRef.current !== null) {
      window.clearTimeout(pendingReplyTimerRef.current);
      pendingReplyTimerRef.current = null;
    }
  }, []);

  const scheduleAssistantReply = React.useCallback(
    (content: string, widget?: ChatMessage["widget"]) => {
      clearPendingReplyTimer();
      setIsThinking(true);
      pendingReplyTimerRef.current = window.setTimeout(() => {
        appendMessage("assistant", content, widget);
        setIsThinking(false);
        pendingReplyTimerRef.current = null;
      }, randomThinkingDelayMs());
    },
    [appendMessage, clearPendingReplyTimer],
  );

  const showCarInstallmentShortfall = React.useCallback(() => {
    setIsThinking(true);
    scheduleAssistantReply(CAR_SHORTFALL_MESSAGE, "insufficient_funds");
  }, [scheduleAssistantReply]);

  const streamAssistantMessage = React.useCallback(
    async (content: string, widget?: ChatMessage["widget"]) => {
      const id = appendMessage("assistant", "");
      let built = "";
      for (const ch of content) {
        built += ch;
        updateMessageById(id, { content: built });
        scrollToBottom(false);
        await sleep(18);
      }
      if (widget) updateMessageById(id, { widget });
    },
    [appendMessage, scrollToBottom, sleep, updateMessageById],
  );

  const startLoanFlow = React.useCallback(() => {
    clearPendingReplyTimer();
    setIsThinking(true);
    pendingReplyTimerRef.current = window.setTimeout(async () => {
      setIsThinking(false);
      setIsStreamingReply(true);
      isLoanStreamingRef.current = true;
      await streamAssistantMessage(LOAN_INTRO_MESSAGE, "loan_profile");
      scrollToBottom(false);
      await sleep(600);
      await streamAssistantMessage(LOAN_POST_WIDGET_MESSAGE);
      isLoanStreamingRef.current = false;
      setIsStreamingReply(false);
      pendingReplyTimerRef.current = null;
    }, 5000);
  }, [clearPendingReplyTimer, scrollToBottom, sleep, streamAssistantMessage]);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => () => clearPendingReplyTimer(), [clearPendingReplyTimer]);
  React.useEffect(() => () => cancelSlowScroll(), [cancelSlowScroll]);
  React.useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const shouldAutoScroll = isThinking || isStreamingReply || lastMessage?.role === "assistant";
    if (!shouldAutoScroll) return;

    scrollToBottom(isLoanStreamingRef.current);
  }, [isStreamingReply, isThinking, messages, scrollToBottom]);

  const profileQuery = useQuery({
    queryKey: ["profile", selectedAccountId],
    queryFn: () => fetchProfile(selectedAccountId),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  const accountOptions = React.useMemo(() => {
    const profile = profileQuery.data?.data;
    if (!profile) return ACCOUNT_PRESETS;
    return ACCOUNT_PRESETS.map((account) =>
      account.id === selectedAccountId
        ? {
            ...account,
            name: profile.accountName || account.name,
            subtitle: profile.accountNo || account.subtitle,
          }
        : account,
    );
  }, [profileQuery.data?.data, selectedAccountId]);

  const handleAction = React.useCallback((actionKey: string) => {
    if (isThinking || isStreamingReply) return;
    const actionLabel =
      ACTIONS.find((action) => action.key === actionKey)?.label ??
      (actionKey === "all" ? "จ่ายทั้งหมด" : "รายการนี้");
    appendMessage("user", actionLabel);

    if (actionKey === "car") {
      showCarInstallmentShortfall();
      return;
    }

    clearPendingReplyTimer();
    setRows((prev) => buildRowsAfterPay(prev, actionKey));

    if (actionKey === "all") {
      scheduleAssistantReply(
        "ผมจัดการจ่ายทุกรายการให้แล้วครับ\nคุณสามารถตรวจสอบสถานะในตารางได้เลย",
      );
      return;
    }

    scheduleAssistantReply(
      `รับทราบครับ ผมจะเริ่มทำรายการ ${actionLabel} ให้ก่อน\nหากต้องการต่อรายการอื่น กดปุ่มเพิ่มได้เลย`,
    );
  }, [appendMessage, clearPendingReplyTimer, isStreamingReply, isThinking, scheduleAssistantReply, showCarInstallmentShortfall]);

  const handleInsufficientFundsAction = React.useCallback(
    (actionKey: InsufficientFundsActionKey) => {
      if (isThinking || isStreamingReply) return;
      clearPendingReplyTimer();
      appendMessage(
        "user",
        actionKey === "transfer_other_account"
          ? "โอนเงินจากบัญชีอื่น"
          : actionKey === "personal_loan"
            ? "ขอสินเชื่อส่วนบุคคล"
            : "ยกเลิก",
      );
      if (actionKey === "transfer_other_account") {
        scheduleAssistantReply(
          "ได้ครับ ผมจะพาไปขั้นตอนโอนเงินจากบัญชีอื่นเพื่อเติมยอดให้พอจ่ายค่างวดรถ",
        );
      } else if (actionKey === "personal_loan") {
        startLoanFlow();
      } else {
        scheduleAssistantReply("รับทราบครับ ยกเลิกรายการค่างวดรถไว้ก่อน");
      }
    },
    [appendMessage, clearPendingReplyTimer, isStreamingReply, isThinking, scheduleAssistantReply, startLoanFlow],
  );

  const handleLoanOfferAction = React.useCallback(
    (action: LoanOfferActionKey) => {
      if (isThinking || isStreamingReply) return;

      if (action === "confirm_loan") {
        appendMessage("user", "ยืนยันการขอสินเชื่อ");
        setPinIntent("loan_confirm");
        setIsLoanPinModalOpen(true);
        resetLoanPinState();
        return;
      }

      appendMessage("user", "ยกเลิก");
      scheduleAssistantReply("รับทราบครับ ผมจะยกเลิกคำขอสินเชื่อให้ก่อน");
    },
    [appendMessage, isStreamingReply, isThinking, resetLoanPinState, scheduleAssistantReply],
  );

  const handleLoanNextStepAction = React.useCallback(
    (action: LoanNextStepActionKey) => {
      if (isThinking || isStreamingReply) return;
      if (action === "pay_now") {
        appendMessage("user", "จ่ายเลย");
        setPinIntent("pay_car");
        setIsLoanPinModalOpen(true);
        resetLoanPinState();
        return;
      }
      appendMessage("user", "ไว้ทีหลัง");
      scheduleAssistantReply("ได้เลยครับ ผมจะพักรายการนี้ไว้ก่อน หากพร้อมเมื่อไหร่บอกผมได้เลย");
    },
    [appendMessage, isStreamingReply, isThinking, resetLoanPinState, scheduleAssistantReply],
  );

  const handleCarPaymentSuccessAction = React.useCallback(
    (action: CarInstallmentPaidActionKey) => {
      if (isThinking || isStreamingReply) return;
      if (action === "pay_other") {
        appendMessage("user", "จ่ายรายการอื่น");
        scheduleAssistantReply("ได้เลยครับ เลือกรายการถัดไปที่ต้องการชำระได้เลย");
      } else {
        appendMessage("user", "เสร็จแล้วครับ");
        scheduleAssistantReply("รับทราบครับ หากต้องการให้ช่วยเพิ่มเติม แจ้งผมได้ทุกเมื่อครับ");
      }
    },
    [appendMessage, isStreamingReply, isThinking, scheduleAssistantReply],
  );

  const appendLoanPinDigit = React.useCallback((digit: string) => {
    if (isLoanPinInputLocked) return;
    if (!/^\d$/.test(digit)) return;
    if (loanPin.length >= 6) return;
    const nextPin = `${loanPin}${digit}`;
    setLoanPin(nextPin);
    if (loanPinError) setLoanPinError(null);
  }, [isLoanPinInputLocked, loanPin, loanPinError]);

  const removeLastLoanPinDigit = React.useCallback(() => {
    if (isLoanPinInputLocked) return;
    setLoanPin((prev) => prev.slice(0, -1));
    if (loanPinError) setLoanPinError(null);
  }, [isLoanPinInputLocked, loanPinError]);

  const submitLoanPin = React.useCallback(() => {
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
    if (pinIntent === "pay_car") {
      setRows((prev) => prev.map((row) => (row.id === "car" ? { ...row, status: "จ่ายแล้ว" } : row)));
      scheduleAssistantReply("", "car_payment_success");
    } else {
      scheduleAssistantReply(LOAN_APPROVED_MESSAGE, "loan_next_step");
    }
    setPinIntent(null);
  }, [loanPin, pinIntent, resetLoanPinState, scheduleAssistantReply]);

  React.useEffect(() => {
    if (!isLoanPinModalOpen || loanPin.length !== 6) return;
    const timer = window.setTimeout(() => submitLoanPin(), 120);
    return () => window.clearTimeout(timer);
  }, [isLoanPinModalOpen, loanPin, submitLoanPin]);

  const handleSend = React.useCallback(() => {
    if (isThinking || isStreamingReply) return;
    const trimmed = inputText.trim();
    if (!trimmed) return;
    const normalized = trimmed.replace(/\s+/g, "");
    const isLoan10kRequest =
      /ขอ\s*10[,，]?\s*000\s*บาท/.test(trimmed) ||
      normalized.includes("ขอ10000บาท") ||
      /^10[,，]?000$/.test(trimmed.replace(/\s+/g, ""));

    appendMessage("user", isLoan10kRequest ? LOAN_10K_USER_MESSAGE : trimmed);

    if (normalized.includes("จ่ายค่างวดรถ")) {
      showCarInstallmentShortfall();
      setInputText("");
      return;
    }
    if (normalized.includes("ขอสินเชื่อ")) {
      startLoanFlow();
      setInputText("");
      return;
    }
    if (normalized === "จ่ายเลยค่ะ" || normalized === "จ่ายเลย") {
      setPinIntent("pay_car");
      setIsLoanPinModalOpen(true);
      resetLoanPinState();
      setInputText("");
      return;
    }
    if (isLoan10kRequest) {
      clearPendingReplyTimer();
      scheduleAssistantReply(LOAN_10K_SUMMARY_MESSAGE, "loan_offer_summary");
      setInputText("");
      return;
    }

    clearPendingReplyTimer();
    scheduleAssistantReply(`รับข้อความแล้วครับ\n${trimmed}`);
    setInputText("");
  }, [
    appendMessage,
    clearPendingReplyTimer,
    inputText,
    isStreamingReply,
    isThinking,
    scheduleAssistantReply,
    showCarInstallmentShortfall,
    startLoanFlow,
    resetLoanPinState,
  ]);

  return (
    <div className="fixed inset-0 w-full bg-[#050713] flex justify-center font-sans antialiased overflow-hidden">
      <div className="relative w-full h-full overflow-hidden flex flex-col pt-4">
        <div className="absolute inset-0 bg-[radial-gradient(900px_700px_at_85%_15%,rgba(66,120,255,0.75),transparent_60%),radial-gradient(700px_700px_at_20%_35%,rgba(20,30,80,0.8),transparent_55%),linear-gradient(180deg,#02030a,#06081a_60%,#030411)]" />
        {mounted ? <StarsBackground /> : null}

        <div className="relative z-10 flex-1 flex flex-col min-h-0">
          <div className="px-4 sm:px-6 pb-2">
            <AccountNavbar
              logoText="Ping"
              accounts={accountOptions}
              selectedAccountId={selectedAccountId}
              onSelectAccount={setSelectedAccountId}
              ttsEnabled={ttsEnabled}
              onToggleTts={setTtsEnabled}
            />
          </div>

          <main
            ref={chatScrollContainerRef}
            className="flex-1 w-full overflow-y-auto overscroll-contain hide-scrollbar pb-32"
          >
            <div className="flex flex-col px-4 pt-6 pb-8 max-w-5xl mx-auto w-full">
              <div className="self-start items-start w-full">
                <div className="bg-white/0 rounded-none border-0 w-full space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      data-chat-system-message={message.role === "assistant" ? "true" : undefined}
                      className={`${
                        message.role === "user"
                          ? "ml-auto w-fit max-w-[85%] rounded-xl rounded-tr-md border border-white/20 bg-white/20 px-4 py-2 text-white break-words"
                          : "w-full"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <>
                          <MarkdownMessage content={message.content} />
                          {message.widget === "bill_table" ? (
                            <BillPaymentTableWidget
                              rows={rows}
                              actions={ACTIONS}
                              disabled={isThinking || isStreamingReply}
                              onAction={handleAction}
                            />
                          ) : null}
                          {message.widget === "insufficient_funds" ? (
                            <InsufficientFundsWidget
                              disabled={isThinking || isStreamingReply}
                              onAction={handleInsufficientFundsAction}
                            />
                          ) : null}
                          {message.widget === "loan_profile" ? (
                            <LoanProfileTableWidget />
                          ) : null}
                          {message.widget === "loan_offer_summary" ? (
                            <LoanOfferSummaryWidget
                              disabled={isThinking || isStreamingReply}
                              onAction={handleLoanOfferAction}
                            />
                          ) : null}
                          {message.widget === "loan_next_step" ? (
                            <LoanNextStepWidget
                              disabled={isThinking || isStreamingReply}
                              onAction={handleLoanNextStepAction}
                            />
                          ) : null}
                          {message.widget === "car_payment_success" ? (
                            <CarInstallmentPaidWidget
                              disabled={isThinking || isStreamingReply}
                              onAction={handleCarPaymentSuccessAction}
                            />
                          ) : null}
                        </>
                      ) : (
                        <MarkdownMessage content={message.content} />
                      )}
                    </div>
                  ))}
                </div>
                {isThinking ? (
                  <div className="self-start items-start flex flex-col max-w-[85%] gap-2 mt-4">
                    <span className="trace-gradient-flow text-sm font-semibold tracking-wide bg-gradient-to-r from-[#9AB9FF] via-[#6E93F3] to-[#2E58C8] bg-clip-text text-transparent italic">
                      Thinking
                    </span>
                    <div className="p-4 rounded-2xl text-white bg-white/10 rounded-tl-sm flex items-center gap-3">
                      <div className="flex space-x-1">
                        <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </main>

          <InputArea
            value={inputText}
            onChange={setInputText}
            onSend={handleSend}
            disabled={false}
            isLoading={isThinking || isStreamingReply}
          />
        </div>
      </div>
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
  );
}
