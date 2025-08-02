"use client";

import type { Transition } from "motion";
import { motion, useAnimationControls } from "framer-motion";

interface ChevronFirstProps extends React.SVGAttributes<SVGSVGElement> {
  width?: number;
  height?: number;
  strokeWidth?: number;
}

const defaultTransition: Transition = {
  type: "spring",
  stiffness: 250,
  damping: 25,
};

const AnimatedBackIcon = ({
  width = 24,
  height = 24,
  strokeWidth = 1.5,
  ...props
}: ChevronFirstProps) => {
  const controls = useAnimationControls();

  return (
    <div
      style={{
        cursor: "pointer",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onMouseEnter={() => controls.start("animate")}
      onMouseLeave={() => controls.start("normal")}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        viewBox="0 0 24 24"
        fill="none"
        width={width}
        height={height}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <motion.path
          variants={{
            normal: { translateX: "0%" },
            animate: { translateX: "-20%" },
          }}
          transition={defaultTransition}
          animate={controls}
          initial="normal"
          d="m15 18-6-6 6-6"
        />
        <motion.path
          variants={{
            normal: { opacity: 0, translateX: "-100%" },
            animate: { opacity: 1, translateX: "0%" },
          }}
          transition={defaultTransition}
          animate={controls}
          initial="normal"
          d="M7 12h10"
        />
      </svg>
    </div>
  );
};

export { AnimatedBackIcon };
