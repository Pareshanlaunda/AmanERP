import { cn } from "@/lib/utils";
import {
  PREFERRED_LANGUAGE_SHORT,
  PREFERRED_LANGUAGE_LABELS,
  type PreferredLanguage,
} from "@/lib/types/database";

const LANGUAGE_STYLES: Record<PreferredLanguage, string> = {
  en: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200",
  hi: "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-200",
  mr: "border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-200",
};

/**
 * Compact language badge showing the customer's chat language.
 *
 * Displays a short label (EN / हि / मर) with a tooltip showing the
 * full language name. Helps employees know which language to use
 * when following up with the lead.
 */
export function LanguageBadge({
  language,
  showFull = false,
}: {
  language?: PreferredLanguage | null;
  showFull?: boolean;
}) {
  if (!language) return null;

  const short = PREFERRED_LANGUAGE_SHORT[language];
  const full = PREFERRED_LANGUAGE_LABELS[language];

  return (
    <span
      title={`Customer chatted in ${full}`}
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium leading-tight",
        LANGUAGE_STYLES[language]
      )}
    >
      {showFull ? full : short}
    </span>
  );
}
