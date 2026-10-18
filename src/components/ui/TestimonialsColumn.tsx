import React from "react";
import { motion } from "framer-motion";

export interface Testimonial {
  text: string;
  image?: string;
  initials?: string;
  name: string;
  role: string;
  firm?: string;
}

export const TestimonialsColumn = (props: {
  className?: string;
  testimonials: Testimonial[];
  duration?: number;
}) => {
  return (
    <div className={props.className} style={{ overflow: "hidden" }}>
      <motion.div
        animate={{ translateY: "-50%" }}
        transition={{
          duration: props.duration || 10,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        style={{ display: "flex", flexDirection: "column", gap: "16px", paddingBottom: "16px" }}
      >
        {[...new Array(2).fill(0)].map((_, index) => (
          <React.Fragment key={index}>
            {props.testimonials.map(({ text, image, initials, name, role, firm }, i) => (
              <div
                key={i}
                style={{
                  padding: "24px",
                  borderRadius: "12px",
                  border: "0.5px solid var(--rule)",
                  background: "var(--paper)",
                  boxShadow: "0 4px 24px -8px rgba(15,15,13,0.12)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  width: "100%",
                }}
              >
                {/* Quote */}
                <p style={{
                  fontFamily: "'Libre Baskerville', Georgia, serif",
                  fontStyle: "italic",
                  fontSize: "14px",
                  color: "var(--ink)",
                  lineHeight: 1.7,
                  margin: 0,
                }}>
                  {text}
                </p>

                {/* Author */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {image ? (
                    <img
                      src={image}
                      alt={name}
                      width={32}
                      height={32}
                      style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "var(--paper-3)",
                      border: "0.5px solid var(--rule)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: "10px",
                      color: "var(--ink-3)",
                      flexShrink: 0,
                    }}>
                      {initials}
                    </div>
                  )}
                  <div>
                    <div style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: "11px",
                      fontWeight: 500,
                      color: "var(--ink)",
                      letterSpacing: "0.04em",
                    }}>{name}</div>
                    <div style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: "10px",
                      color: "var(--ink-4)",
                    }}>{role}</div>
                    {firm && (
                      <span style={{
                        display: "inline-block",
                        marginTop: "4px",
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: "9px",
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        padding: "2px 8px",
                        borderRadius: "20px",
                        background: "var(--accent-light)",
                        color: "var(--accent)",
                      }}>{firm}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
};
