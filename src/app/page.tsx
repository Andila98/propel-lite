
"use client";

import { AuthRedirector } from "@/components/auth-redirector";

/**
 * This is the root page of the application.
 * Its sole responsibility is to act as a loading gateway while the AuthProvider
 * initializes, determines the user's authentication state, and performs the
 * initial redirect. It does not contain any redirect logic itself.
 * 
 * The AuthRedirector component contains the loading UI and handles the redirect
 * logic based on the state from useAuth.
 */
export default function HomePage() {
  return <AuthRedirector />;
}
