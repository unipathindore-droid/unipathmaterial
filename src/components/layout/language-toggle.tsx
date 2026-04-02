"use client";

import { Languages } from "lucide-react";

import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";

export function LanguageToggle() {
  const { language, setLanguage, translate } = useLanguage();

  return (
    <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <Languages className="h-4 w-4 text-slate-500" />
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {translate("language.label")}
      </span>
      <div className="inline-flex rounded-xl bg-slate-100 p-1">
        {(["en", "hi"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setLanguage(option)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              language === option
                ? "bg-slate-950 text-white"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            {option === "en" ? translate("language.english") : translate("language.hindi")}
          </button>
        ))}
      </div>
    </div>
  );
}
