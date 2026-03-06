"use client";

import React from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp } from "lucide-react";

export type AccountOption = {
  id: string;
  name: string;
  subtitle?: string;
  initials: string;
  avatarImageSrc?: string;
  avatarClassName?: string;
};

type Props = {
  logoText?: string;
  onLogoClick?: () => void;
  accounts: AccountOption[];
  selectedAccountId: string;
  onSelectAccount: (accountId: string) => void;
};

const DEFAULT_AVATAR_CLASS =
  "bg-gradient-to-br from-[#A9D7FF] via-[#87AFFF] to-[#516FDF]";

function toMaskedAccountSubtitle(value?: string): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return value;
  const last4 = digits.slice(-4);
  return `XXX-X-XX${last4.slice(0, 3)}-${last4.slice(3)}`;
}

function AccountAvatar({ account }: { account: AccountOption }) {
  return (
    <div
      className={`relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full text-sm font-semibold text-white ${account.avatarClassName ?? DEFAULT_AVATAR_CLASS}`}
    >
      {account.avatarImageSrc ? (
        <Image
          src={account.avatarImageSrc}
          alt={account.name}
          fill
          sizes="44px"
          className="object-cover"
        />
      ) : (
        account.initials
      )}
    </div>
  );
}

export function AccountNavbar({
  logoText,
  onLogoClick,
  accounts,
  selectedAccountId,
  onSelectAccount,
}: Props) {
  const [isOpen, setIsOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  const selectedAccount = React.useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) ?? accounts[0],
    [accounts, selectedAccountId],
  );

  React.useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setIsOpen(false);
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, []);

  if (!selectedAccount) return null;

  return (
    <header className="flex items-center justify-between">
      <button
        type="button"
        onClick={onLogoClick}
        className="pt-1"
        aria-label="กลับหน้าแรกและเริ่มเซสชันใหม่"
      >
        <Image
          src="/ping_logo.png"
          alt={logoText ?? "Ping logo"}
          width={96}
          height={36}
          priority
          className="h-9 w-auto object-contain"
        />
      </button>

      <div className="flex items-center gap-3">
        <div ref={rootRef} className="relative">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="group min-w-[210px] rounded-full border border-white/20 bg-transparent from-[#102565]/90 via-[#18357D]/90 to-[#2C5DD2]/85 px-4 py-2.5 text-left backdrop-blur-md shadow-[0_12px_35px_rgba(8,16,50,0.15)] transition hover:border-white/35"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-label="เลือกบัญชี"
          >
            <div className="flex items-center gap-3">
              <AccountAvatar account={selectedAccount} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-md leading-none text-white/90 font-medium sm:text-2xl">
                  {selectedAccount.name}
                </p>
                <p className="truncate text-xs text-white/70">
                  {toMaskedAccountSubtitle(selectedAccount.subtitle)}
                </p>
              </div>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-white/85" />
              ) : (
                <ChevronDown className="h-5 w-5 text-white/85" />
              )}
            </div>
          </button>

          <div
            className={`absolute right-0 z-[100] mt-3 w-[320px] origin-top-right rounded-3xl border border-white/18 bg-gradient-to-b from-[#132D74]/95 via-[#10255E]/95 to-[#0A1A4B]/95 p-3 backdrop-blur-md shadow-[0_24px_45px_rgba(6,10,34,0.55)] transition-all duration-200 ${
              isOpen
                ? "pointer-events-auto translate-y-0 opacity-100"
                : "pointer-events-none -translate-y-2 opacity-0"
            }`}
            role="listbox"
            aria-label="บัญชีทั้งหมด"
          >
            {accounts.map((account) => {
              const isActive = account.id === selectedAccountId;
              return (
                <button
                  key={account.id}
                  type="button"
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                    isActive
                      ? "bg-white/16"
                      : "bg-transparent hover:bg-white/10"
                  }`}
                  onClick={() => {
                    onSelectAccount(account.id);
                    setIsOpen(false);
                  }}
                  role="option"
                  aria-selected={isActive}
                >
                  <AccountAvatar account={account} />
                  <div className="min-w-0">
                    <p className="truncate text-lg leading-none text-white/90 font-medium ">
                      {account.name}
                    </p>
                    <p className="truncate text-md text-white/70">{toMaskedAccountSubtitle(account.subtitle) ?? ""}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
