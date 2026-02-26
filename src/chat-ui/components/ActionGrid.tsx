import React from "react";
import { MOCK_ACTIONS } from "../data/actions";
import { ActionCard } from "./ActionCard";

type ActionGridProps = {
  onActionClick?: (title: string, subtitle?: string) => void;
  disabled?: boolean;
  isVisible?: boolean;
};

export function ActionGrid({
  onActionClick,
  disabled,
  isVisible = true,
}: ActionGridProps) {
  return (
    <div className="px-6 grid grid-cols-2 gap-4">
      {MOCK_ACTIONS.slice(0, 2).map((action, index) => (
        <div
          key={action.id}
          className={`transition-all duration-500 ease-out ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2 pointer-events-none"
          }`}
          style={{ transitionDelay: `${index * 140}ms` }}
        >
          <ActionCard
            title={action.title}
            subtitle={action.subtitle}
            onClick={() => onActionClick?.(action.title, action.subtitle)}
            disabled={disabled}
          />
        </div>
      ))}
    </div>
  );
}
