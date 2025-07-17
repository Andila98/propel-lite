
import { PropelLiteLogo } from "@/components/icons/logo";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 items-center justify-center border-b px-4 md:px-6">
        <div className="flex items-center gap-2 font-semibold">
          <PropelLiteLogo className="h-8 w-8" />
          <span className="text-xl">Propel Lite Onboarding</span>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
