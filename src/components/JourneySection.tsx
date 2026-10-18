import { useState, useEffect, useRef } from "react";

/* ─── helpers ─── */
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerpN = (a: number, b: number, t: number) => a + (b - a) * t;
const segN = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

function usePinnedProgress(ref: React.RefObject<HTMLElement | null>) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;

    const calc = () => {
      // Use window.scrollY directly — avoids the overflow-x:hidden body bug
      // that makes getComputedStyle report body as a scroll container,
      // which breaks both sticky positioning and progress tracking.
      const vh = window.innerHeight;
      const top = el.getBoundingClientRect().top + window.scrollY; // offsetTop equiv
      const total = el.offsetHeight - vh;
      if (total <= 0) { setP(0); return; }
      const scrolled = window.scrollY - top;
      setP(Math.max(0, Math.min(1, scrolled / total)));
    };

    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(calc); };
    calc();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      cancelAnimationFrame(raf);
    };
  }, [ref]);
  return p;
}

function useRevealJ(ref: React.RefObject<HTMLElement | null>) {
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion:reduce)").matches) { setVis(true); return; }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); io.disconnect(); } },
      { threshold: 0.18 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return vis;
}

/* ─── CyclingWord ─── */
const CW_CSS = `
@keyframes cw-in  { from { opacity:0; transform:translateY(-14px); filter:blur(7px); } to { opacity:1; transform:none; filter:blur(0); } }
@keyframes cw-out { from { opacity:1; transform:none; filter:blur(0); } to { opacity:0; transform:translateY(14px); filter:blur(7px); } }
.cw-root { display:inline-block; position:relative; vertical-align:baseline; }
.cw-word { display:inline-block; white-space:nowrap; }
.cw-word.cw-enter { animation: cw-in  .38s cubic-bezier(.2,.8,.2,1) both; }
.cw-word.cw-exit  { position:absolute; top:0; left:0; animation: cw-out .3s cubic-bezier(.4,0,1,1) both; }
@media (prefers-reduced-motion:reduce) { .cw-word.cw-enter, .cw-word.cw-exit { animation:none; } .cw-word.cw-exit { display:none; } }
`;
let cwInj = false;
function ensureCW() {
  if (cwInj || typeof document === "undefined") return;
  cwInj = true;
  if (document.getElementById("ccCW")) return;
  const s = document.createElement("style");
  s.id = "ccCW";
  s.textContent = CW_CSS;
  document.head.prepend(s);
}

function CyclingWord({ words, interval = 2600, className = "" }: { words: string[]; interval?: number; className?: string }) {
  ensureCW();
  const [idx, setIdx] = useState(0);
  const [prev, setPrev] = useState<{ word: string; gen: number } | null>(null);
  const [width, setWidth] = useState<string>("auto");
  const measureRef = useRef<HTMLSpanElement>(null);
  const genRef = useRef(0);

  useEffect(() => {
    if (!measureRef.current) return;
    const w = (measureRef.current.children[0] as HTMLElement)?.getBoundingClientRect().width;
    if (w) setWidth(w + "px");
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setIdx((i) => {
        const next = (i + 1) % words.length;
        setPrev({ word: words[i], gen: ++genRef.current });
        const w = (measureRef.current?.children[next] as HTMLElement)?.getBoundingClientRect().width;
        if (w) setWidth(w + "px");
        return next;
      });
    }, interval);
    return () => clearInterval(id);
  }, [words, interval]);

  return (
    <>
      <span ref={measureRef} aria-hidden style={{ position: "absolute", visibility: "hidden", pointerEvents: "none" }}>
        {words.map((w, i) => <span key={i} className={className}>{w}</span>)}
      </span>
      <span
        className="cw-root"
        style={{ width, transition: "width .32s cubic-bezier(.34,1.36,.64,1)", display: "inline-block", position: "relative" }}
      >
        {prev && <span key={"x" + prev.gen} className={`cw-word cw-exit ${className}`}>{prev.word}</span>}
        <span key={"e" + idx} className={`cw-word cw-enter ${className}`}>{words[idx]}</span>
      </span>
    </>
  );
}

/* ─── CaseScreen (Step 1) ─── */
function CaseScreen() {
  const bars = [
    { k: "Structure", v: 80, c: "#1D9E75" },
    { k: "Clarity", v: 80, c: "#1D9E75" },
    { k: "Quant", v: 0, c: "#BA7517", pending: true },
    { k: "Creativity", v: 70, c: "#6a4ba0" },
  ];
  const stages = [
    { k: "Demand-side estimation", s: "active" },
    { k: "Supply-side validation", s: "pending" },
    { k: "Cross-check & benchmark", s: "pending" },
    { k: "Recommendation to CM", s: "pending" },
  ];
  return (
    <div className="cs-screen">
      <div className="cs-top">
        <span className="cs-dot" />
        <span className="cs-case">EV Charging Infrastructure · Gurgaon</span>
        <span className="cs-chip">GUESSTIMATE</span>
        <span className="cs-live">● LIVE</span>
        <span className="cs-timer">03:27</span>
      </div>
      <div className="cs-body">
        <div className="cs-left">
          <div className="cs-who">
            <div className="cs-av">AP</div>
            <div>
              <div className="cs-name">Alex Park</div>
              <div className="cs-role">Senior Partner AI · .</div>
            </div>
          </div>
          <div className="cs-qlabel">Interview quality</div>
          {bars.map((b) => (
            <div key={b.k} className="cs-bar">
              <span className="cs-bar-k">{b.k}</span>
              <span className="cs-bar-bg">
                <span className="cs-bar-fill" style={{ width: (b.pending ? 0 : b.v) + "%", background: b.c }} />
              </span>
              <span className="cs-bar-v">{b.pending ? "—" : b.v}</span>
            </div>
          ))}
        </div>
        <div className="cs-right">
          <div className="cs-board-head">Guesstimate framework</div>
          <div className="cs-stages">
            {stages.map((st) => (
              <div key={st.k} className={"cs-stage cs-" + st.s}>
                <span className="cs-stage-status">{st.s === "active" ? "● active" : "○ pending"}</span>
                <span className="cs-stage-k">{st.k}</span>
              </div>
            ))}
          </div>
          <div className="cs-focus">
            <div className="cs-focus-label">Current focus · Alex just asked</div>
            <div className="cs-focus-q">
              Commit to your demand-side spine — walk me through the numbers to estimate
              Gurgaon's EV fleet and public-charger need.
            </div>
            <div className="cs-focus-chips">
              <span>💡 Population → ownership → EV penetration</span>
              <span>💡 Segment 2W vs 4W</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── DiffBeat (pinned scroll section) ─── */
const DIFF_STEPS = [
  { n: "01", k: "Take a case", d: "A senior-partner AI runs the case live , it presses your logic and scores all four pillars as you talk." },
  { n: "02", k: "See your path", d: "The moment you finish, your full reasoning becomes a tree , strong branches, shallow ones, and the questions you never asked." },
  { n: "03", k: "See the difference", d: "Overlay the top scorer's path. The one branch you skipped lights up , the move that would have cracked the case." },
  { n: "04", k: "Know what's next", d: "You leave with one specific thing to drill , not a vague \"improve structure.\" That's the whole loop." },
];

interface NodeProps {
  x: number;
  y: number;
  w: number;
  tag: string;
  title: string;
  status: string;
  missed?: boolean;
  reward?: boolean;
  t?: number;
  missedIn: number;
  dimOthers: number;
  pulse: number;
}

function SvgNode({ x, y, w, tag, title, status, missed, reward, t = 1, missedIn, dimOthers, pulse }: NodeProps) {
  const col = missed ? "#D85A30" : (reward || status === "strong") ? "#1D9E75" : "#BA7517";
  const appear = missed ? missedIn : t;
  const dim = (missed || reward) ? 1 : lerpN(1, 0.12, dimOthers);
  const op = appear * dim;
  const focus = missed || reward;
  return (
    <g style={{ opacity: op, transition: "opacity .08s linear" }}>
      {focus && (
        <rect
          x={x - 7} y={y - 7} width={w + 14} height={68} rx="14"
          fill="none"
          stroke={missed ? "#D85A30" : "#1a6b4a"}
          strokeWidth="1"
          opacity={(missed ? 0.22 + pulse * 0.2 : 0.4) * appear}
        />
      )}
      <rect
        x={x} y={y} width={w} height={54} rx="9"
        fill={missed ? `rgba(192,73,42,${0.1 + pulse * 0.12})` : reward ? "rgba(26,107,74,0.18)" : "rgba(245,244,239,0.05)"}
        stroke={missed ? `rgba(192,73,42,${0.55 + pulse * 0.45})` : reward ? "#1D9E75" : col}
        strokeWidth={missed ? 2 : reward ? 1.5 : 0.9}
        strokeDasharray={missed ? "4 3" : "0"}
      />
      <text x={x + 14} y={y + 18} fontFamily="'IBM Plex Mono',monospace" fontSize="8"
        fill={reward ? "rgba(143,211,179,0.75)" : missed ? "rgba(232,132,106,0.7)" : "rgba(245,244,239,0.4)"}
        letterSpacing=".06em">
        {tag}
      </text>
      <text x={x + 14} y={y + 38} fontFamily="'DM Sans',sans-serif"
        fontSize={focus ? 15 : 13.5} fontWeight={focus ? 600 : 500}
        fill={missed ? `rgba(238,150,124,${0.8 + pulse * 0.2})` : reward ? "#a8e0c4" : "rgba(245,244,239,0.88)"}>
        {title}
      </text>
      <circle cx={x + w - 14} cy={y + 16} r="3.5" fill={col} opacity={op} />
    </g>
  );
}

interface EdgeProps {
  d: string;
  col: string;
  t: number;
  dash?: string;
  dimOthers: number;
}

function SvgEdge({ d, col, t, dash, dimOthers }: EdgeProps) {
  return (
    <path
      d={d} fill="none" stroke={col} strokeWidth="2" pathLength="1"
      strokeDasharray={dash || "1"}
      strokeDashoffset={1 - t}
      opacity={dash ? t : t * lerpN(1, 0.14, dimOthers)}
      style={{ transition: "stroke-dashoffset .08s linear, opacity .08s linear" }}
    />
  );
}

function DiffBeat() {
  const ref = useRef<HTMLElement>(null);
  const p = usePinnedProgress(ref);

  const caseOut = segN(p, 0.22, 0.30);
  const treeIn = segN(p, 0.25, 0.35);
  const treeBuild = segN(p, 0.30, 0.48);
  const missedIn = segN(p, 0.52, 0.62);
  const dimOthers = segN(p, 0.55, 0.66);
  const lineT = segN(p, 0.64, 0.76);
  const resultIn = segN(p, 0.80, 0.92);

  const caseOp = clamp01(1 - caseOut);
  const treeOp = clamp01(treeIn);
  const stepIdx = p < 0.24 ? 0 : p < 0.50 ? 1 : p < 0.78 ? 2 : 3;
  const pulse = missedIn > 0.5 ? 0.4 + 0.6 * Math.abs(Math.sin(p * 16)) : 0;

  return (
    <section className="diff-section" ref={ref as React.RefObject<HTMLElement>} style={{ height: "500vh" }}>
      <div className="diff-top-fade" aria-hidden />
      <div className="diff-stage">

        {/* LEFT: step tracker */}
        <div className="diff-copy">
          <div className="diff-kicker">The whole loop · one live case</div>
          <h2 className="diff-h2">
            You sized the demand. You never asked{" "}
            <em>how many EVs share one charger.</em>
          </h2>

          <ol className="diff-steps">
            {DIFF_STEPS.map((s, i) => (
              <li key={i} className={"dstep" + (i === stepIdx ? " on" : i < stepIdx ? " done" : "")}>
                <span className="dstep-rail"><span className="dstep-dot" /></span>
                <div className="dstep-body">
                  <div className="dstep-head">
                    <span className="dstep-n">{s.n}</span>
                    <span className="dstep-k">{s.k}</span>
                  </div>
                  <div className="dstep-d">{s.d}</div>
                </div>
              </li>
            ))}
          </ol>

          <div
            className="diff-result"
            style={{ opacity: resultIn, transform: `translateY(${lerpN(16, 0, resultIn)}px)` }}
          >
            <span className="dr-mark" />
            <div className="dr-label">
              Your whole estimate hinged on one branch you skipped:{" "}
              <strong>how many EVs share a charger.</strong> Top scorers caught it :
              a public fast charger serves <strong>~30 cars a day,</strong> cutting the build 10×.
            </div>
          </div>
        </div>

        {/* RIGHT: morphing canvas */}
        <div className="diff-canvas">
          <div className="diff-canvas-card">
            <div className="dc-stage">

              {/* Step 1 — live case screen */}
              <div
                className="dc-layer"
                style={{ opacity: caseOp, pointerEvents: caseOp < 0.1 ? "none" : "auto" }}
              >
                <CaseScreen />
              </div>

              {/* Steps 2–4 — reasoning tree */}
              <div
                className="dc-layer"
                style={{ opacity: treeOp, pointerEvents: treeOp < 0.5 ? "none" : "auto" }}
              >
                <div className="dc-header">
                  <div>
                    <div className="dc-session">YOUR REASONING</div>
                    <div className="dc-case-title">EV chargers · Gurgaon 2030</div>
                  </div>
                  <div className="dc-tabs">
                    <button className={lineT < 0.3 ? "on" : ""}>My path</button>
                    <button className={lineT >= 0.3 ? "on" : ""} style={{ transition: "all .3s" }}>
                      Top scorer
                    </button>
                  </div>
                </div>

                <svg
                  viewBox="0 0 620 340"
                  style={{ width: "100%", height: "auto", display: "block" }}
                  aria-label="Your reasoning tree vs the top-scorer path"
                >
                  {/* Your path edges */}
                  <SvgEdge d="M152,170 C196,170 196,83 232,83" col="#1D9E75" t={treeBuild} dimOthers={dimOthers} />
                  <SvgEdge d="M152,170 C196,170 196,257 232,257" col="#BA7517" t={treeBuild} dimOthers={dimOthers} />
                  <SvgEdge d="M378,83 C418,83 418,43 452,43" col="#1D9E75" t={segN(p, 0.38, 0.48)} dimOthers={dimOthers} />
                  <SvgEdge d="M378,83 C418,83 418,111 452,111" col="#BA7517" t={segN(p, 0.38, 0.48)} dimOthers={dimOthers} />
                  <SvgEdge d="M378,257 C418,257 418,267 452,267" col="#BA7517" t={segN(p, 0.40, 0.50)} dimOthers={dimOthers} />

                  {/* Missed branch (dashed red) */}
                  <SvgEdge d="M152,170 L232,170" col="#D85A30" t={missedIn} dash="5 4" dimOthers={dimOthers} />
                  {/* Divergence line (dashed green) */}
                  <SvgEdge d="M378,170 L452,170" col="#1a6b4a" t={lineT} dash="6 5" dimOthers={dimOthers} />

                  {/* Nodes — your path */}
                  <SvgNode x={8} y={143} w={144} tag="CASE PROMPT" title="Charger need" status="strong" t={segN(p, 0.28, 0.36)} missedIn={missedIn} dimOthers={dimOthers} pulse={pulse} />
                  <SvgNode x={232} y={56} w={146} tag="DEMAND SIDE" title="EV demand" status="strong" t={treeBuild} missedIn={missedIn} dimOthers={dimOthers} pulse={pulse} />
                  <SvgNode x={232} y={230} w={146} tag="SUPPLY SIDE" title="Grid & civil" status="partial" t={treeBuild} missedIn={missedIn} dimOthers={dimOthers} pulse={pulse} />
                  <SvgNode x={452} y={16} w={160} tag="SEGMENT" title="2W vs 4W" status="strong" t={segN(p, 0.38, 0.48)} missedIn={missedIn} dimOthers={dimOthers} pulse={pulse} />
                  <SvgNode x={452} y={84} w={160} tag="ADJUST" title="Home-charging" status="partial" t={segN(p, 0.38, 0.48)} missedIn={missedIn} dimOthers={dimOthers} pulse={pulse} />
                  <SvgNode x={452} y={240} w={160} tag="COST" title="Grid upgrade" status="partial" t={segN(p, 0.40, 0.50)} missedIn={missedIn} dimOthers={dimOthers} pulse={pulse} />

                  {/* Missed node (red) */}
                  <SvgNode x={232} y={143} w={146} tag="UTILIZATION" title="Chargers per EV" status="missed" missed missedIn={missedIn} dimOthers={dimOthers} pulse={pulse} />
                  {/* Top scorer insight (green) */}
                  <SvgNode x={452} y={143} w={160} tag="INSIGHT" title="Shared chargers" status="strong" reward t={lineT} missedIn={missedIn} dimOthers={dimOthers} pulse={pulse} />

                  {lineT > 0.4 && (
                    <text
                      x={532} y={216} textAnchor="middle"
                      fontFamily="'IBM Plex Mono',monospace" fontSize="8.5"
                      fill="#8fd3b3" opacity={(lineT - 0.4) * 1.6}
                      letterSpacing=".04em"
                    >
                      1 fast charger ≈ 30 cars/day
                    </text>
                  )}
                </svg>

                <div className="dc-legend">
                  <span><i style={{ background: "#1D9E75" }} />explored well</span>
                  <span><i style={{ background: "#BA7517" }} />shallow</span>
                  <span><i style={{ background: "#D85A30" }} />never asked</span>
                  <span style={{ marginLeft: "auto", color: "#8fd3b3", opacity: lineT > 0.5 ? 1 : 0, transition: "opacity .4s" }}>
                    ── top scorer path
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── JourneySection (exported) ─── */
export default function JourneySection() {
  const hRef = useRef<HTMLDivElement>(null);
  const hVis = useRevealJ(hRef as React.RefObject<HTMLElement | null>);
  const cycleWords = ["rewire", "sharpen", "rebuild", "diagnose"];

  return (
    <>
      <style>{`
        /* JOURNEY HEADER */
        .cc-landing .journey-header{padding:100px 56px 80px;border-top:.5px solid var(--rule);text-align:center;}
        .cc-landing .jh-eyebrow{font-family:var(--mono);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);margin-bottom:18px;display:inline-flex;align-items:center;gap:10px;}
        .cc-landing .jh-eyebrow::before,.cc-landing .jh-eyebrow::after{content:'';width:26px;height:0.5px;background:var(--accent);}
        .cc-landing .jh-h2{font-family:var(--serif);font-size:clamp(30px,4vw,48px);font-weight:700;line-height:1.1;letter-spacing:-.02em;margin-bottom:18px;max-width:760px;margin-left:auto;margin-right:auto;min-height:4.5em;}
        .cc-landing .jh-h2 em{font-style:italic;color:var(--accent);}
        .cc-landing .jh-cycle{color:var(--accent);font-style:italic;}
        .cc-landing .jh-sub{font-size:16px;color:var(--ink-2);line-height:1.72;max-width:520px;margin:0 auto;}

        /* PINNED DIFF SECTION */
        .cc-landing .diff-section{position:relative;background:var(--ink);}
        .cc-landing .diff-top-fade{position:absolute;top:0;left:0;right:0;height:120px;z-index:2;pointer-events:none;background:linear-gradient(to bottom,var(--paper),transparent);}
        .cc-landing .diff-stage{position:sticky;top:0;height:100vh;display:grid;grid-template-columns:.92fr 1.4fr;align-items:center;background:var(--ink);z-index:1;}

        /* LEFT copy */
        .cc-landing .diff-copy{padding:0 40px 0 56px;display:flex;flex-direction:column;justify-content:center;}
        .cc-landing .diff-kicker{font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.16em;color:rgba(143,211,179,.75);margin-bottom:16px;}
        .cc-landing .diff-h2{font-family:var(--serif);font-size:clamp(22px,2.4vw,32px);font-weight:700;color:var(--paper);line-height:1.18;letter-spacing:-.01em;margin-bottom:28px;}
        .cc-landing .diff-h2 em{font-style:italic;color:#8fd3b3;}

        /* Step tracker */
        .cc-landing .diff-steps{list-style:none;margin:0;padding:0;}
        .cc-landing .dstep{display:flex;gap:16px;padding-bottom:18px;opacity:.36;transition:opacity .45s ease;}
        .cc-landing .dstep.on{opacity:1;}
        .cc-landing .dstep.done{opacity:.58;}
        .cc-landing .dstep:last-child{padding-bottom:0;}
        .cc-landing .dstep-rail{position:relative;display:flex;flex-direction:column;align-items:center;padding-top:5px;}
        .cc-landing .dstep-dot{width:11px;height:11px;border-radius:50%;border:1.5px solid rgba(245,244,239,.3);background:transparent;transition:all .4s ease;flex-shrink:0;}
        .cc-landing .dstep.on  .dstep-dot{border-color:#8fd3b3;background:#8fd3b3;box-shadow:0 0 0 5px rgba(143,211,179,.15);}
        .cc-landing .dstep.done .dstep-dot{border-color:rgba(143,211,179,.6);background:rgba(143,211,179,.6);}
        .cc-landing .dstep:not(:last-child) .dstep-rail::after{content:'';position:absolute;top:18px;bottom:-18px;width:1.5px;background:rgba(245,244,239,.12);}
        .cc-landing .dstep.done .dstep-rail::after{background:rgba(143,211,179,.4);}
        .cc-landing .dstep-head{display:flex;align-items:baseline;gap:10px;margin-bottom:4px;}
        .cc-landing .dstep-n{font-family:var(--mono);font-size:10px;color:rgba(143,211,179,.7);letter-spacing:.08em;}
        .cc-landing .dstep-k{font-family:var(--serif);font-size:17px;font-weight:700;color:var(--paper);}
        .cc-landing .dstep-d{font-size:13px;color:rgba(245,244,239,.46);line-height:1.58;max-width:340px;transition:color .4s;}
        .cc-landing .dstep.on .dstep-d{color:rgba(245,244,239,.68);}

        /* Result chip */
        .cc-landing .diff-result{margin-top:28px;display:flex;gap:14px;align-items:flex-start;background:rgba(26,107,74,.1);border:.5px solid rgba(143,211,179,.26);border-radius:14px;padding:18px 20px;}
        .cc-landing .dr-mark{width:8px;height:8px;border-radius:50%;background:#8fd3b3;margin-top:6px;flex-shrink:0;box-shadow:0 0 0 4px rgba(143,211,179,.16);}
        .cc-landing .dr-label{font-size:13px;color:rgba(245,244,239,.62);line-height:1.6;}
        .cc-landing .dr-label strong{color:#a8e0c4;font-weight:500;}

        /* RIGHT canvas */
        .cc-landing .diff-canvas{display:flex;align-items:center;justify-content:center;padding:40px 48px 40px 32px;}
        .cc-landing .diff-canvas-card{width:100%;max-width:660px;background:rgba(245,244,239,.025);border:.5px solid rgba(245,244,239,.1);border-radius:18px;padding:24px;box-shadow:0 50px 100px -60px rgba(0,0,0,.9);}
        .cc-landing .dc-stage{position:relative;min-height:440px;display:flex;align-items:center;}
        .cc-landing .dc-layer{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;transition:opacity .12s linear;}
        .cc-landing .dc-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;}
        .cc-landing .dc-session{font-family:var(--mono);font-size:9px;letter-spacing:.14em;color:rgba(143,211,179,.6);margin-bottom:5px;text-transform:uppercase;}
        .cc-landing .dc-case-title{font-family:var(--serif);font-size:16px;font-weight:700;color:rgba(245,244,239,.92);}
        .cc-landing .dc-tabs{display:flex;gap:4px;background:rgba(245,244,239,.06);border:.5px solid rgba(245,244,239,.1);border-radius:7px;padding:3px;}
        .cc-landing .dc-tabs button{font-family:var(--mono);font-size:10px;padding:5px 12px;border:none;background:transparent;color:rgba(245,244,239,.4);border-radius:5px;cursor:pointer;transition:all .25s;}
        .cc-landing .dc-tabs button.on{background:rgba(245,244,239,.12);color:rgba(245,244,239,.92);}
        .cc-landing .dc-legend{display:flex;align-items:center;gap:14px;padding-top:14px;border-top:.5px solid rgba(245,244,239,.08);margin-top:6px;}
        .cc-landing .dc-legend span{font-family:var(--mono);font-size:9.5px;color:rgba(245,244,239,.4);display:flex;align-items:center;gap:5px;}
        .cc-landing .dc-legend i{width:6px;height:6px;border-radius:50%;display:inline-block;}

        /* Live case screen (step 1) */
        .cc-landing .cs-screen{display:flex;flex-direction:column;width:100%;}
        .cc-landing .cs-top{display:flex;align-items:center;gap:9px;padding-bottom:12px;margin-bottom:14px;border-bottom:.5px solid rgba(245,244,239,.1);font-family:var(--mono);font-size:11px;color:rgba(245,244,239,.75);}
        .cc-landing .cs-dot{width:6px;height:6px;border-radius:50%;background:#8fd3b3;flex-shrink:0;}
        .cc-landing .cs-case{font-weight:500;color:rgba(245,244,239,.92);}
        .cc-landing .cs-chip{font-size:8.5px;letter-spacing:.06em;padding:2px 7px;border-radius:3px;background:rgba(106,75,160,.22);color:#b69de0;}
        .cc-landing .cs-live{margin-left:auto;font-size:8.5px;letter-spacing:.08em;color:#e8846a;}
        .cc-landing .cs-timer{color:rgba(245,244,239,.6);font-variant-numeric:tabular-nums;}
        .cc-landing .cs-body{display:grid;grid-template-columns:.85fr 1.15fr;gap:20px;}
        .cc-landing .cs-who{display:flex;align-items:center;gap:9px;margin-bottom:16px;}
        .cc-landing .cs-av{width:28px;height:28px;border-radius:50%;background:rgba(245,244,239,.12);color:rgba(245,244,239,.9);font-family:var(--mono);font-size:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .cc-landing .cs-name{font-family:var(--serif);font-weight:700;font-size:13px;color:rgba(245,244,239,.92);}
        .cc-landing .cs-role{font-family:var(--mono);font-size:8.5px;color:rgba(245,244,239,.45);}
        .cc-landing .cs-qlabel{font-family:var(--mono);font-size:8.5px;text-transform:uppercase;letter-spacing:.1em;color:rgba(245,244,239,.4);margin-bottom:12px;}
        .cc-landing .cs-bar{display:flex;align-items:center;gap:8px;margin-bottom:10px;}
        .cc-landing .cs-bar-k{font-family:var(--mono);font-size:9px;color:rgba(245,244,239,.5);width:60px;flex-shrink:0;}
        .cc-landing .cs-bar-bg{flex:1;height:3px;background:rgba(245,244,239,.1);border-radius:2px;overflow:hidden;}
        .cc-landing .cs-bar-fill{display:block;height:3px;border-radius:2px;}
        .cc-landing .cs-bar-v{font-family:var(--mono);font-size:9px;color:rgba(245,244,239,.6);width:16px;text-align:right;}
        .cc-landing .cs-board-head{font-family:var(--serif);font-weight:700;font-size:12px;color:rgba(245,244,239,.92);background:rgba(245,244,239,.06);border:.5px solid rgba(245,244,239,.1);border-radius:6px;padding:7px 11px;margin-bottom:8px;}
        .cc-landing .cs-stages{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px;}
        .cc-landing .cs-stage{border:.5px solid rgba(245,244,239,.1);border-radius:6px;padding:8px 10px;display:flex;flex-direction:column;gap:4px;}
        .cc-landing .cs-stage.cs-active{border-color:rgba(143,211,179,.35);background:rgba(26,107,74,.12);}
        .cc-landing .cs-stage-status{font-family:var(--mono);font-size:7.5px;letter-spacing:.08em;color:rgba(245,244,239,.4);}
        .cc-landing .cs-active .cs-stage-status{color:#8fd3b3;}
        .cc-landing .cs-stage-k{font-size:11px;font-weight:500;color:rgba(245,244,239,.85);line-height:1.25;}
        .cc-landing .cs-focus{border:1px solid rgba(143,211,179,.3);border-radius:8px;padding:11px 13px;background:rgba(26,107,74,.08);}
        .cc-landing .cs-focus-label{font-family:var(--mono);font-size:8px;letter-spacing:.08em;text-transform:uppercase;color:#8fd3b3;margin-bottom:6px;}
        .cc-landing .cs-focus-q{font-family:var(--serif);font-style:italic;font-size:12.5px;color:rgba(245,244,239,.85);line-height:1.45;margin-bottom:9px;}
        .cc-landing .cs-focus-chips{display:flex;flex-direction:column;gap:5px;}
        .cc-landing .cs-focus-chips span{font-family:var(--mono);font-size:9px;color:rgba(245,244,239,.6);background:rgba(245,244,239,.05);border:.5px solid rgba(245,244,239,.1);border-radius:5px;padding:5px 9px;}

        /* MOBILE */
        @media (max-width:960px) {
          .cc-landing .journey-header{padding:72px 24px 56px;}
          .cc-landing .diff-section{height:auto !important;}
          .cc-landing .diff-top-fade{display:none;}
          .cc-landing .diff-stage{position:relative !important;grid-template-columns:1fr;height:auto;}
          .cc-landing .diff-copy{padding:48px 24px 36px;}
          .cc-landing .dstep{opacity:1 !important;}
          .cc-landing .diff-canvas{padding:8px 20px 48px;}
          .cc-landing .dc-stage{min-height:0;display:block;}
          .cc-landing .dc-layer{position:relative;inset:auto;opacity:1 !important;pointer-events:auto !important;}
          .cc-landing .dc-layer:not(:last-child){margin-bottom:28px;padding-bottom:28px;border-bottom:.5px solid rgba(245,244,239,.1);}
          .cc-landing .cs-body{grid-template-columns:1fr;gap:14px;}
          .cc-landing .cs-stages{grid-template-columns:1fr 1fr;}
        }
      `}</style>

      {/* Section header with cycling word */}
      <section className="journey-header" id="loop">
        <div
          ref={hRef}
          style={{
            opacity: hVis ? 1 : 0,
            transform: hVis ? "none" : "translateY(28px)",
            transition: "opacity .75s cubic-bezier(.2,.7,.2,1), transform .75s cubic-bezier(.2,.7,.2,1)",
          }}
        >
          <div className="jh-eyebrow">How it works</div>
          <h2 className="jh-h2">
            A feedback loop tight enough to actually{" "}
            <em>
              <CyclingWord words={cycleWords} interval={2400} className="jh-cycle" />
            </em>{" "}
            your reasoning.
          </h2>
          <p className="jh-sub">
            Most prep hands you a number after you fail. CaseJourney hands you the difference
            the exact node where your path left the optimal one.
          </p>
        </div>
      </section>

      {/* Pinned diff section */}
      <DiffBeat />
    </>
  );
}
