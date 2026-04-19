import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "hi", "te", "ta", "kn", "ml"],
  defaultLocale: "en",
  localePrefix: "as-needed",   // /en/* omitted — other locales prefixed
});
