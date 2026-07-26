"use client";

import { LANGUAGE_OPTIONS } from "@/lib/book-language";
import { SOURCE_LANGUAGE } from "@/lib/book-generation/constants";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldLegend, FieldSet } from "@/components/ui/field";
import { cn } from "@/lib/utils";

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
    <FieldSet disabled={disabled}>
      <FieldLegend variant="label">Languages</FieldLegend>
      <ul className="flex flex-col gap-2">
        {SELECTABLE_LANGUAGES.map((option) => {
          const isPrimary = option.value === SOURCE_LANGUAGE;
          const checked = isPrimary || additionalSelected.includes(option.value);
          return (
            <li key={option.value}>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border p-2 text-sm transition-colors",
                  checked ? "bg-muted" : "bg-background",
                  disabled ? "cursor-not-allowed opacity-60" : "hover:bg-muted/70",
                )}
              >
                <Checkbox
                  checked={checked}
                  disabled={disabled || isPrimary}
                  onCheckedChange={() => toggleLanguage(option.value)}
                />
                <span className="flex flex-1 items-center justify-between gap-2">
                  <span className="font-medium">{option.label}</span>
                  {isPrimary ? (
                    <Badge variant="secondary">Primary source</Badge>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </FieldSet>
  );
}
