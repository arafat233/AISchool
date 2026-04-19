"use client";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";

const LANGUAGES = [
  { code: "en", label: "English",    native: "English"    },
  { code: "hi", label: "Hindi",      native: "हिंदी"       },
  { code: "te", label: "Telugu",     native: "తెలుగు"     },
  { code: "ta", label: "Tamil",      native: "தமிழ்"      },
  { code: "kn", label: "Kannada",    native: "ಕನ್ನಡ"      },
  { code: "ml", label: "Malayalam",  native: "മലയാളം"     },
];

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const switchLocale = async (newLocale: string) => {
    setOpen(false);
    // Strip current locale prefix from path, add new one
    const stripped = pathname.replace(/^\/(en|hi|te|ta|kn|ml)/, "");
    const newPath = newLocale === "en" ? stripped || "/" : `/${newLocale}${stripped || "/"}`;
    router.replace(newPath);
    // Persist preference
    await fetch("/api/user/language", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: newLocale }),
    }).catch(() => {});
  };

  const current = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
        aria-label="Switch language"
      >
        <Globe className="w-4 h-4 text-gray-500" />
        <span>{current.native}</span>
        <svg className={`w-3 h-3 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => switchLocale(lang.code)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                locale === lang.code ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
              }`}
            >
              <span>{lang.native}</span>
              <span className="text-xs text-gray-400">{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
