import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.cookies.has("device-id")) {
    const deviceId = crypto.randomUUID();
    response.cookies.set("device-id", deviceId, {
      httpOnly: false,
      maxAge: 365 * 86400,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: ["/:path*"],
};
