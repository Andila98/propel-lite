import { AuthRedirector } from "@/components/auth-redirector";

/**
 * This is the root page of the application.
 * It is now a Server Component, with client-side logic moved to AuthRedirector.
 */
export default function HomePage() {
  return <AuthRedirector />;
}
