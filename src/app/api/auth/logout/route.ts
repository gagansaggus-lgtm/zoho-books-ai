import { NextResponse } from "next/server";
import { getSessionCookieConfig } from "@/lib/auth";

export async function POST() {
  const cookieConfig = getSessionCookieConfig();

  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully",
  });

  // Clear the session cookie
  response.cookies.set(cookieConfig.name, "", {
    maxAge: 0,
    httpOnly: cookieConfig.httpOnly,
    secure: cookieConfig.secure,
    sameSite: cookieConfig.sameSite,
    path: cookieConfig.path,
  });

  return response;
}
