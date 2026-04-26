export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    // Protect everything except auth pages, the registration API, and Next internals
    "/((?!api/auth|api/register|login|register|_next/static|_next/image|favicon.ico).*)",
  ],
};
