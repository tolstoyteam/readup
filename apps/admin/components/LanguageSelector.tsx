"use client";

import { LANGUAGE_OPTIONS } from "@/lib/book-language";
import { SOURCE_LANGUAGE } from "@/lib/book-generation/constants";

const SELECTABLE_LANGUAGES = LANGUAGE_OPTIONS.filter(
  (option) => option.value !== "other",
);

type Props = {
  selected: string[];
  onChange: (languages: string[]) => void;
  disabled?: boolean;
};

export function LanguageSelector({ selected, onChange, disabled }: Props) {
  const additionalSelected = selected.filter((code) => code !== SOURCE_LANGUAGE);

  function toggleLanguage(code: string) {
    if (code === SOURCE_LANGUAGE || disabled) return;
    const next = additionalSelected.includes(code)
      ? additionalSelected.filter((value) => value !== code)
      : [...additionalSelected, code];
    onChange([SOURCE_LANGUAGE, ...next]);
  }

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-text-tertiary">
        Languages
      </legend>
      <ul className="space-y-2">
        {SELECTABLE_LANGUAGES.map((option) => {
          const isPrimary = option.value === SOURCE_LANGUAGE;
          const checked = isPrimary || additionalSelected.includes(option.value);
          return (
            <li key={option.value}>
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-input border px-3 py-2.5 text-sm transition-colors ${
                  checked
                    ? "border-brand/40 bg-brand/5 text-foreground"
                    : "border-elevated bg-surface text-foreground"
                } ${disabled ? "cursor-not-allowed opacity-60" : "hover:border-brand/30"}`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-elevated text-brand focus:ring-brand/30"
                  checked={checked}
                  disabled={disabled || isPrimary}
                  onChange={() => toggleLanguage(option.value)}
                />
                <span className="flex flex-1 items-center justify-between gap-2">
                  <span className="font-medium">{option.label}</span>
                  {isPrimary ? (
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand">
                      Primary · Source
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
