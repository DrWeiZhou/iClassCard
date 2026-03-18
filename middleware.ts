import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  const path = request.nextUrl.pathname;

  if (
    path === "/" ||
    path === "/login" ||
    path === "/register" ||
    path === "/student-login"
  ) {
    return NextResponse.next();
  }

  if (!token) {
    if (path.startsWith("/teacher")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (path.startsWith("/student")) {
      return NextResponse.redirect(new URL("/student-login", request.url));
    }
    return NextResponse.next();
  }

  const payload = await verifyToken(token);
  if (!payload) {
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.delete("auth-token");
    return response;
  }

  if (path.startsWith("/teacher") && payload.role !== "teacher") {
    return NextResponse.redirect(new URL("/student/courses", request.url));
  }
  if (path.startsWith("/student") && payload.role !== "student") {
    return NextResponse.redirect(new URL("/teacher/courses", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/teacher/:path*",
    "/student/:path*",
    "/login",
    "/register",
    "/student-login",
  ],
};
