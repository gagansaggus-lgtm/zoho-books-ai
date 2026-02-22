import { NextRequest, NextResponse } from "next/server";
import {
  validateCredentials,
  createSessionToken,
  isAuthEnabled,
  getSessionCookieConfig,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // If auth is not enabled, just succeed
    if (!isAuthEnabled()) {
      return NextResponse.json({ success: true, message: "Auth not enabled" });
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    if (!validateCredentials(username, password)) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Create session token
    const token = createSessionToken(username);
    const cookieConfig = getSessionCookieConfig();

    // Set session cookie
    const response = NextResponse.json({
      success: true,
      message: "Logged in successfully",
    });

    response.cookies.set(cookieConfig.name, token, {
      maxAge: cookieConfig.maxAge,
      httpOnly: cookieConfig.httpOnly,
      secure: cookieConfig.secure,
      sameSite: cookieConfig.sameSite,
      path: cookieConfig.path,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
