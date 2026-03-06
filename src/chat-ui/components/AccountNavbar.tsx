"use client";

import React from "react";
import Image from "next/image";

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

export function AccountNavbar(props: Props) {
  const { logoText, onLogoClick, accounts, selectedAccountId } = props;
  const selectedAccount = React.useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) ?? accounts[0],
    [accounts, selectedAccountId],
  );

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
        <div
          className="min-w-[210px] rounded-full border border-white/20 bg-transparent from-[#102565]/90 via-[#18357D]/90 to-[#2C5DD2]/85 px-4 py-2.5 text-left backdrop-blur-md shadow-[0_12px_35px_rgba(8,16,50,0.15)]"
          aria-label="บัญชีที่เลือก"
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
          </div>
        </div>
      </div>
    </header>
  );
}
