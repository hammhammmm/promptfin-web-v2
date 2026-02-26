import { NextRequest, NextResponse } from "next/server";

const PROFILE_COOKIE_KEY = "pf_profile_cache";
const ONE_DAY_SECONDS = 60 * 60 * 24;

type ProfileCacheData = {
  accountId: string;
  accountNo: string;
  accountName: string;
};

type ProfileCachePayload = {
  status: "success";
  data: ProfileCacheData;
};

function getAccountId(req: NextRequest): string {
  const queryAccountId = req.nextUrl.searchParams.get("accountId");
  if (queryAccountId) return queryAccountId;

  return process.env.PROFILE_ACCOUNT_ID ?? process.env.NEXT_PUBLIC_PROFILE_ACCOUNT_ID ?? "A0001";
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function extractProfileCachePayload(data: unknown): ProfileCachePayload | null {
  if (!isRecord(data) || data["status"] !== "success" || !isRecord(data["data"])) {
    return null;
  }

  const source = data["data"];
  const accountId = typeof source["accountId"] === "string" ? source["accountId"] : "";
  const accountNo = typeof source["accountNo"] === "string" ? source["accountNo"] : "";
  const accountName = typeof source["accountName"] === "string" ? source["accountName"] : "";

  if (!accountId || !accountNo || !accountName) return null;

  return {
    status: "success",
    data: {
      accountId,
      accountNo,
      accountName,
    },
  };
}

export const GET = async (req: NextRequest) => {
  const accountId = getAccountId(req);
  const cookieProfile = req.cookies.get(PROFILE_COOKIE_KEY)?.value;
  if (cookieProfile) {
    try {
      const parsed: unknown = JSON.parse(cookieProfile);
      const cached = extractProfileCachePayload(parsed);
      if (cached && cached.data.accountId === accountId) {
        return NextResponse.json(parsed, { status: 200 });
      }
    } catch {
      // Ignore invalid cookie and fallback to fetch from upstream.
    }
  }

  const baseUrl =
    process.env.BANKING_API_URL ??
    "https://banking-api-46469170160.asia-southeast1.run.app";

  try {
    const response = await fetch(
      `${baseUrl}/profile?accountId=${encodeURIComponent(accountId)}`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          "x-account-id": accountId,
        },
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          err_code: "PF_9101",
          err_message: "Failed to fetch profile",
          accountId,
        },
        { status: response.status },
      );
    }

    const data: unknown = await response.json().catch(() => null);

    if (!data) {
      return NextResponse.json(
        {
          err_code: "PF_9102",
          err_message: "Invalid profile response",
          accountId,
        },
        { status: 502 },
      );
    }

    const cachePayload = extractProfileCachePayload(data);
    const res = NextResponse.json(cachePayload ?? data, { status: 200 });
    res.cookies.set({
      name: PROFILE_COOKIE_KEY,
      value: JSON.stringify(cachePayload ?? data),
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: ONE_DAY_SECONDS,
    });

    return res;
  } catch {
    return NextResponse.json(
      {
        err_code: "PF_9103",
        err_message: "Profile service unavailable",
        accountId,
      },
      { status: 502 },
    );
  }
};
