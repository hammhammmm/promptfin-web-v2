import { useQuery } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { PROFILE_CONFIG } from "@/src/chat-ui/config/profile";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type UIAction =
  | { action: "confirm_transfer"; prepared_id: string }
  | { action: "cancel"; prepared_id: string }
  | { action: "edit"; prepared_id: string }
  | { action: "adjust_limit"; prepared_id: string }
  | { action: "skip_adjust_limit"; prepared_id: string };

export type ChatMeta = {
  next: string;
  stop_tool_calls: boolean;
  prepared_id: string;
};

export type ChatOutput = {
  reply_text: string | null;
  ui: Record<string, unknown> | null;
  meta: ChatMeta;
};

export type Profile = {
  id?: string;
  accountId: string;
  accountNo: string;
  accountName: string;
  birthDt?: string;
  mobileNo?: string;
  sex?: string;
  income?: string;
  salaryEmployeeFlag?: boolean;
  createdAt?: string;
};

type ProfileApiResponse = {
  status: string;
  data: Profile;
};

type UseChatOptions = { accountId?: string };

const DEMO_PREPARED_ID = "demo-adjust-limit-60000";
const DEMO_REPLY_TEXT = [
  "ได้เลยครับ",
  "แต่ยอด **60,000 บาท** เกินวงเงินโอนต่อวันที่ตั้งไว้ที่ **50,000 บาท**",
  "ต้องการให้ผมปรับวงเงินเป็น **100,000 บาท** แล้วทำรายการต่อเลยไหมครับ",
].join("\n");

function createSessionId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeMeta(preparedId = ""): ChatMeta {
  return {
    next: "reply_to_user",
    stop_tool_calls: true,
    prepared_id: preparedId,
  };
}

function makeAdjustWidget() {
  return {
    type: "adjust_limit",
    props: {
      prepared_id: DEMO_PREPARED_ID,
      message: "ปรับวงเงินจาก 50,000 บาท เป็น 100,000 บาทหรือไม่?",
    },
    actions: [
      {
        label: "ปรับวงเงินเลย",
        type: "button",
        style: "primary",
        onClick: {
          action: "adjust_limit",
          prepared_id: DEMO_PREPARED_ID,
        },
      },
      {
        label: "ไม่ต้อง",
        type: "button",
        style: "secondary",
        onClick: {
          action: "skip_adjust_limit",
          prepared_id: DEMO_PREPARED_ID,
        },
      },
    ],
  } as Record<string, unknown>;
}

function makePostAdjustConfirmationUi(): Record<string, unknown> {
  return {
    type: "payment_confirmation",
    props: {
      amount: 60000,
      currency: "บาท",
      target: "แม่",
      beneficiaryName: "แม่",
      destinationAccount: "0800000000",
      destinationBank: "KTB",
    },
    actions: [
      {
        label: "ยืนยันรายการ",
        type: "button",
        style: "primary",
        onClick: {
          action: "confirm_transfer",
          prepared_id: DEMO_PREPARED_ID,
        },
      },
      {
        label: "ยกเลิก",
        type: "button",
        style: "secondary",
        onClick: {
          action: "cancel",
          prepared_id: DEMO_PREPARED_ID,
        },
      },
    ],
  };
}

function makeSuccessReceiptUi(): Record<string, unknown> {
  return {
    type: "payment_receipt",
    props: {
      status: "success",
      txn_id: "TXN20260304-143201",
      balance: 140000,
      summary: "โอนเงิน 60,000 บาท ให้คุณแม่สำเร็จ",
      destinationLabel: "คุณแม่",
      destinationAccount: "0800000000",
      destinationSubline: "080-000-0000",
      destinationBank: "KTB",
      amount: 60000,
      currency: "บาท",
    },
    actions: [
      {
        label: "บันทึกสลิป",
        type: "button",
        style: "primary",
        onClick: { action: "close" },
      },
      {
        label: "แชร์สลิป",
        type: "button",
        style: "secondary",
        onClick: { action: "edit", prepared_id: DEMO_PREPARED_ID },
      },
    ],
  };
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

function randomDelayMs(min = 3000, max = 5000): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function sleepWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const id = window.setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const onAbort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };

    const cleanup = () => {
      window.clearTimeout(id);
      signal?.removeEventListener("abort", onAbort);
    };

    if (signal) {
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

function getMockResponse(userText: string): ChatOutput {
  const normalized = userText.trim().toLowerCase();
  const shouldShowAdjustWidget =
    normalized.includes("โอนเงินให้แม่") &&
    (normalized.includes("60000") || normalized.includes("60,000"));

  if (shouldShowAdjustWidget) {
    return {
      reply_text: DEMO_REPLY_TEXT,
      ui: makeAdjustWidget(),
      meta: makeMeta(DEMO_PREPARED_ID),
    };
  }

  return {
    reply_text: "รับทราบครับ (โหมดเดโม) ตอนนี้ใช้ข้อมูลจำลอง ไม่ได้เรียก API จริง",
    ui: null,
    meta: makeMeta(),
  };
}

export function useChatDemo(options?: UseChatOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string>(createSessionId());
  const accountId = options?.accountId ?? PROFILE_CONFIG.accountId;

  const profileQuery = useQuery({
    queryKey: ["profile", accountId],
    queryFn: () => fetchProfile(accountId),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  const cancelRequest = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const resetSession = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    sessionIdRef.current = createSessionId();
    setIsLoading(false);
    setError(null);
  }, []);

  const sendMessage = async (messages: ChatMessage[]): Promise<ChatOutput | null> => {
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setError(null);
    const userMessage = [...messages].reverse().find((m) => m.role === "user");

    try {
      await sleepWithAbort(randomDelayMs(), controller.signal);
      return getMockResponse(userMessage?.content ?? "");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return null;
      }
      setError("An error occurred");
      return null;
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setIsLoading(false);
    }
  };

  const sendMessageStream = async (
    messages: ChatMessage[],
    onDelta: (deltaText: string) => void,
    _onTtsReady?: (audioUrl: string) => void,
  ): Promise<ChatOutput | null> => {
    void _onTtsReady;
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setError(null);

    try {
      const userMessage = [...messages].reverse().find((m) => m.role === "user");
      const response = getMockResponse(userMessage?.content ?? "");
      const text = response.reply_text ?? "";
      const chunks = text.split("\n");

      await sleepWithAbort(randomDelayMs(), controller.signal);

      for (let i = 0; i < chunks.length; i += 1) {
        if (controller.signal.aborted) return null;
        await new Promise((resolve) => window.setTimeout(resolve, 140));
        const suffix = i < chunks.length - 1 ? "\n" : "";
        onDelta(`${chunks[i]}${suffix}`);
      }

      return response;
    } catch {
      if (controller.signal.aborted) return null;
      setError("An error occurred");
      return null;
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setIsLoading(false);
    }
  };

  const sendUIAction = async (uiAction: UIAction): Promise<ChatOutput | null> => {
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setError(null);

    try {
      await sleepWithAbort(randomDelayMs(), controller.signal);

      if (uiAction.action === "adjust_limit") {
        return {
          reply_text: [
            "**เรียบร้อยครับ**",
            "ตอนนี้วงเงินโอนต่อวันเป็น **100,000 บาท** แล้ว",
            "ผมจะดำเนินการโอน **60,000 บาท** ให้แม่ต่อเลยนะครับ",
          ].join("\n"),
          ui: makePostAdjustConfirmationUi(),
          meta: makeMeta(uiAction.prepared_id),
        };
      }

      if (uiAction.action === "skip_adjust_limit") {
        return {
          reply_text: "ได้ครับ ผมจะยังไม่ปรับวงเงิน หากต้องการปรับเมื่อไหร่บอกผมได้เลย",
          ui: null,
          meta: makeMeta(uiAction.prepared_id),
        };
      }

      if (uiAction.action === "confirm_transfer") {
        return {
          reply_text: [
            "**โอนเงินสำเร็จแล้วครับ**",
            "**60,000 บาท** ถูกโอนเข้าบัญชีคุณแม่เรียบร้อย",
            "เลขอ้างอิง: **TXN20260304-143201**",
            "ต้องการบันทึกหรือแชร์สลิปไหมครับ",
          ].join("\n"),
          ui: makeSuccessReceiptUi(),
          meta: makeMeta(uiAction.prepared_id),
        };
      }

      return {
        reply_text: "รับทราบครับ (โหมดเดโม)",
        ui: null,
        meta: makeMeta(uiAction.prepared_id),
      };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return null;
      }
      setError("An error occurred");
      return null;
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setIsLoading(false);
    }
  };

  return {
    sendMessage,
    sendMessageStream,
    sendUIAction,
    cancelRequest,
    resetSession,
    isLoading,
    error,
    profile: profileQuery.data?.data ?? null,
    profileStatus: profileQuery.data?.status ?? null,
    isProfileLoading: profileQuery.isLoading,
    profileError:
      profileQuery.error instanceof Error ? profileQuery.error.message : null,
    refetchProfile: profileQuery.refetch,
  };
}
