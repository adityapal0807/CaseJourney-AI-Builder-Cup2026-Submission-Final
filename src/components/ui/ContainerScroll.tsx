"use client";
import React, { useRef } from "react";
import {
  useScroll, useTransform, useSpring,
  motion
} from "framer-motion";

export const ContainerScroll = ({
  titleComponent,
  children,
}: {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });

  // Smooth spring physics on the raw scroll value
  const smooth = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 20,
    restDelta: 0.001,
  });

  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // --- Text transforms (the "hook") ---
  // Moves up and shrinks as you scroll
  const textY       = useTransform(smooth, [0, 1], ["0%", "-55%"]);
  const textScale   = useTransform(smooth, [0, 1], [1, 0.72]);
  const textOpacity = useTransform(smooth, [0, 0.55], [1, 0]);

  // --- Screen (card) transforms ---
  // Starts rotated away below, unfolds upward into focus
  const cardRotateX = useTransform(smooth, [0, 1], [22, 0]);
  const cardScale   = useTransform(smooth, [0, 1], isMobile ? [0.75, 0.95] : [0.88, 1.0]);
  const cardY       = useTransform(smooth, [0, 1], ["12%", "0%"]);
  const cardOpacity = useTransform(smooth, [0, 0.15], [0, 1]);

  return (
    <div
      className="relative h-[200vh] md:h-[240vh]"
      ref={containerRef}
    >
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Ambient glow that grows with scroll */}
        <motion.div
          style={{ opacity: useTransform(smooth, [0, 1], [0.4, 0.85]) }}
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className="h-[600px] w-[600px] rounded-full bg-purple-500/10 blur-3xl" />
        </motion.div>

        {/* HOOK TEXT — leads the eye, then steps aside */}
        <motion.div
          style={{ y: textY, scale: textScale, opacity: textOpacity }}
          className="absolute z-10 w-full max-w-3xl px-6 text-center"
        >
          {titleComponent}
        </motion.div>

        {/* SCREEN — the payoff that rises into focus */}
        <motion.div
          style={{
            rotateX: cardRotateX,
            scale: cardScale,
            y: cardY,
            opacity: cardOpacity,
            transformPerspective: 1000,
            transformOrigin: "center bottom",
          }}
          className="absolute bottom-0 w-full max-w-5xl px-4 md:px-6"
        >
          <div
            className="
              mx-auto rounded-[24px] border border-white/10
              bg-[#1a1a2e] p-2 md:p-3
              shadow-[0_40px_80px_rgba(0,0,0,0.6),0_0_0_1px_rgba(0,0,0,0.5)]
            "
          >
            <div className="h-[360px] md:h-[480px] w-full overflow-hidden rounded-[16px] bg-gray-950">
              {children}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
