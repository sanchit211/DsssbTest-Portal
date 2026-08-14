import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-exam-key-998877";

// Edge-compatible JWT verification using Web Crypto API
async function verifyJWTIEdge(token: string, secret: string): Promise<any> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // helper to decode base64url
    const base64UrlDecode = (str: string) => {
      let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
      while (base64.length % 4) base64 += "=";
      return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    };

    const sigBytes = base64UrlDecode(signatureB64);
    const dataBytes = encoder.encode(`${headerB64}.${payloadB64}`);
    const isValid = await crypto.subtle.verify("HMAC", key, sigBytes, dataBytes);

    if (!isValid) return null;

    // Decode payload
    const payloadStr = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(payloadStr);
  } catch (error) {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("token")?.value;
  let user = null;

  if (token) {
    user = await verifyJWTIEdge(token, JWT_SECRET);
  }

  // Protect Admin Routes
  if (pathname.startsWith("/admin")) {
    if (!user || user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Protect Candidate Routes
  if (pathname.startsWith("/candidate")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (user.role !== "CANDIDATE" && user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Redirect authenticated users away from Login/Register pages
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    if (user) {
      if (user.role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      } else {
        return NextResponse.redirect(new URL("/candidate/dashboard", request.url));
      }
    }
  }

  // Root redirect
  if (pathname === "/") {
    if (user) {
      if (user.role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      } else {
        return NextResponse.redirect(new URL("/candidate/dashboard", request.url));
      }
    } else {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/candidate/:path*",
    "/login",
    "/register",
  ],
};
