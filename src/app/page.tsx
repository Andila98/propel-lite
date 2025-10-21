
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    // Redirect all users to the dashboard.
    router.replace('/dashboard');
  }, [router]);

  return null; // Render nothing, redirect is handling it.
}
