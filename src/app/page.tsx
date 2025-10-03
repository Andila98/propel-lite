
"use client";

import { AuthRedirector } from "@/components/auth-redirector";

/**
 * This is the root page of the application.
 * Its sole responsibility is to render the AuthRedirector, which handles
 * the initial loading UI and subsequent redirection based on auth state.
 */
export default function HomePage() {
  return <AuthRedirector />;
}
