export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    // Protect everything except auth pages and Next internals
    "/((?!api/auth|login|register|_next/static|_next/image|favicon.ico).*)",
  ],
};
