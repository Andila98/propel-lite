"use client";

import { motion, useAnimationControls, type Variants } from "framer-motion";

const pathVariants: Variants = {
  normal: {
    opacity: 1,
    scaleY: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 10,
    },
  },
  animate: {
    opacity: [0.5, 1, 0.5],
    scaleY: [0.6, 1, 0.6],
    transition: {
      repeat: Infinity,
      repeatType: "mirror",
      duration: 1.5,
      ease: "easeInOut",
    },
  },
};

interface DashboardProps extends React.SVGAttributes<SVGSVGElement> {
  width?: number;
  height?: number;
  strokeWidth?: number;
}

const AnimatedDashboardIcon = ({
  width = 24,
  height = 24,
  strokeWidth = 1.5,
  ...props
}: DashboardProps) => {
  const controls = useAnimationControls();

  return (
    <div
      onMouseEnter={() => controls.start("animate")}
      onMouseLeave={() => controls.start("normal")}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <motion.rect
          x="3"
          y="3"
          width="7"
          height="9"
          rx="1"
          ry="1"
          variants={pathVariants}
          animate={controls}
          initial="normal"
          style={{ transitionDelay: '0s' }}
        />
        <motion.rect
          x="14"
          y="3"
          width="7"
          height="5"
          rx="1"
          ry="1"
          variants={pathVariants}
          animate={controls}
          initial="normal"
           style={{ transitionDelay: '0.2s' }}
        />
        <motion.rect
          x="14"
          y="12"
          width="7"
          height="9"
          rx="1"
          ry="1"
          variants={pathVariants}
          animate={controls}
          initial="normal"
           style={{ transitionDelay: '0.4s' }}
        />
        <motion.rect
          x="3"
          y="16"
          width="7"
          height="5"
          rx="1"
          ry="1"
          variants={pathVariants}
          animate={controls}
          initial="normal"
           style={{ transitionDelay: '0.6s' }}
        />
      </svg>
    </div>
  );
};

export { AnimatedDashboardIcon };
