
import { cn } from "@/lib/utils";

export const PropelLiteLogo = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 1000 1000"
    className={cn(className)}
    {...props}
  >
    <defs>
      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feOffset result="offOut" in="SourceGraphic" dx="0" dy="15" />
        <feGaussianBlur result="blurOut" in="offOut" stdDeviation="15" />
        <feBlend in="SourceGraphic" in2="blurOut" mode="normal" />
      </filter>
      <linearGradient id="metallicGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{stopColor: 'rgb(240,240,240)', stopOpacity: 1}} />
        <stop offset="50%" style={{stopColor: 'rgb(150,150,150)', stopOpacity: 1}} />
        <stop offset="100%" style={{stopColor: 'rgb(220,220,220)', stopOpacity: 1}} />
      </linearGradient>
    </defs>
    <g filter="url(#shadow)">
      <path d="M 450 670 L 300 200 L 360 200 L 480 670 Z" fill="#2d2d2d" />
      <path d="M 550 670 L 690 200 L 630 200 L 520 670 Z" fill="#2d2d2d" />
      <path d="M 390 440 L 590 440 L 580 470 L 380 470 Z" fill="url(#metallicGradient)" />
      <path d="M 520 200 L 550 200 L 500 400 L 470 400 Z" fill="#3d3d3d" />
      <path d="M 370 240 L 450 490 L 460 500 L 400 240 Z" fill="#b0b0b0" />
      <path d="M 530 500 L 590 250 L 540 250 L 500 500 Z" fill="#b0b0b0" />
    </g>
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

export const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title>GitHub</title>
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);
