import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET ?? "inkflow-local-dev-secret-change-me",
  });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    "/consultations/:path*",
    "/social-inbox/:path*",
    "/people/:path*",
    "/appointments/:path*",
    "/clients/:path*",
    "/design-approvals/:path*",
    "/deposits/:path*",
    "/consent-forms/:path*",
    "/aftercare/:path*",
  ],
};