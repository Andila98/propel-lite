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


export const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title>Google</title>
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.62 1.9-4.73 1.9-4.27 0-7.75-3.5-7.75-7.75s3.48-7.75 7.75-7.75c2.43 0 3.86.97 4.73 1.85l2.43-2.33C18.49.86 15.82 0 12.48 0 5.88 0 .42 5.24.42 12s5.46 12 12.06 12c3.27 0 5.74-1.12 7.6-3.02 1.92-1.9 2.6-4.78 2.6-7.27 0-.6-.05-1.18-.16-1.72h-9.6z" />
  </svg>
);
