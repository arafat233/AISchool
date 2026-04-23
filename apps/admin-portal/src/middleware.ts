import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Pass-through middleware — i18n routing removed (no [locale] folder structure)
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico|css|js)).*)",
  ],
};
