import { cn } from "@/lib/utils";

export const PropelLiteLogo = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("text-primary", className)}
    {...props}
  >
    <path d="M3 3v18h18V3H3z" fill="hsl(var(--primary))" stroke="none" />
    <path d="M9 9v6l6-3-6-3z" fill="hsl(var(--primary-foreground))" />
    <path d="M9 9v6l6-3-6-3z" stroke="hsl(var(--primary-foreground))" strokeWidth="1.5" />
  </svg>
);
