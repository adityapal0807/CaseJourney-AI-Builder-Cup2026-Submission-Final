/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase.ts';
import { getElo, getStats, getSessions } from '../utils/localStorage.js';
import { useAuth } from '@/hooks/use-auth.ts';
import { useCurrentUser } from '@/hooks/use-current-user.ts';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

/* ================================================================== *
 *  DASHBOARD TYPES & API CONTRACT REFERENCE
 * ================================================================== */
export interface UserProfileData {
  name: string;
  initials: string;
  targetFirm: string; // TODO: connect to API
  day: number;        // TODO: connect to API
}

export interface MilestoneData {
  done: number;
  goal: number;       // TODO: connect to API
}

export interface StatsOverview {
  avg: number;
  avgDelta: number;   // TODO: connect to API
  cases: number;
  best: number;
  bestCase: string;   // TODO: connect to API
  bestWhen: string;   // TODO: connect to API
  hours: number;      // TODO: connect to API
  avgPerCase: number; // TODO: connect to API
}

export interface PillarData {
  key: string;
  you: number;
  benchmark: number;
  move: number;       // TODO: connect to API
}

export interface ProgressionData {
  label: string;
  you: number;
  caseAvg: number;    // TODO: connect to API
}

export interface HookData {
  headlinePre: string;
  headlineHi: string;
  headlinePost: string;
  body: string;
  lastSession: string;
}

export interface SessionData {
  id: string | number;
  name: string;
  type: string;
  score: number;
  when: string;
  mins: number;       // TODO: connect to API
  bars: Record<string, number>;
  tone: 'amber' | 'coral' | 'green';
  insight: string;    // TODO: connect to API
}

export interface DashboardDataContract {
  user: UserProfileData;
  milestone: MilestoneData;
  stats: StatsOverview;
  pillars: PillarData[];
  weakest: string;
  progression: ProgressionData[];
  hook: HookData;
  sessions: SessionData[];
}

/* ================================================================== *
 *  COLOR SYSTEM & CSS VARIABLES SYSTEM MAPPING
 *  We map these to the custom properties in index.css
 * ================================================================== */
const PILLAR: Record<string, string> = {
  Structure:  "var(--accent-green)",  // green
  Clarity:    "var(--accent-blue)",   // blue
  Quant:      "var(--accent-amber)",  // amber
  Creativity: "var(--accent-purple)", // purple
};
const ABBR: Record<string, string> = { Structure: "Str", Clarity: "Clr", Quant: "Qnt", Creativity: "Crt" };

const T = {
  paper: "var(--bg-base)",
  surface: "var(--bg-surface)",
  surfaceAlt: "var(--bg-elevated)",
  ink: "var(--text-primary)",
  inkSoft: "var(--text-secondary)",
  inkFaint: "var(--text-tertiary)",
  line: "var(--bg-border-bright)",
  lineSoft: "var(--bg-border)",
  green: "var(--accent-green)",
  greenSoft: "var(--accent-green-light)",
  amber: "var(--accent-amber)",
  amberSoft: "var(--accent-amber-light)",
  coral: "var(--accent-red)",
  coralSoft: "var(--accent-red-light)",
};

const scoreColor = (s: number) => (s >= 80 ? T.green : s >= 68 ? T.amber : T.coral);

/* ================================================================== *
 *  STYLES (adapted to design system using CSS variables)
 * ================================================================== */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,500;1,9..144,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

.cc *{box-sizing:border-box;margin:0;padding:0;}
.cc{
  font-family:'IBM Plex Sans',system-ui,sans-serif;
  background:${T.paper};color:${T.ink};min-height:100%;line-height:1.5;
  background-image:radial-gradient(${T.lineSoft} 0.6px,transparent 0.6px);
  background-size:24px 24px;
}
.cc-serif{font-family:'Fraunces',Georgia,serif;}
.cc-mono{font-family:'IBM Plex Mono',monospace;}
.cc-micro{font-family:'IBM Plex Mono',monospace;text-transform:uppercase;letter-spacing:0.15em;font-size:10.5px;color:${T.inkFaint};font-weight:500;}
.cc-card{background:${T.surface};border:1px solid ${T.lineSoft};border-radius:15px;box-shadow: 0 4px 14px rgba(0,0,0,0.02);}

/* ---- top nav ---- */
.cc-nav{display:flex;align-items:center;gap:34px;padding:16px 32px;border-bottom:1px solid ${T.lineSoft};background:${T.surface};position:sticky;top:0;z-index:20;}
.cc-logo{font-family:'Fraunces',serif;font-weight:600;font-size:22px;letter-spacing:-0.01em;}
.cc-logo span{color:${T.green};}
.cc-tabs{display:flex;gap:6px;}
.cc-tab{font-size:14px;font-weight:500;color:${T.inkSoft};padding:8px 16px;border-radius:9px;cursor:pointer;}
.cc-tab.on{background:${T.surfaceAlt};color:${T.ink};border:1px solid ${T.lineSoft};}
.cc-nav-r{margin-left:auto;display:flex;align-items:center;gap:14px;}
.cc-firmpill{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:600;color:${T.green};border:1px solid ${T.greenSoft};background:${T.greenSoft};padding:7px 13px;border-radius:999px;}
.cc-navav{width:38px;height:38px;border-radius:50%;background:${T.ink};color:${T.surface};display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-weight:600;font-size:14px;}

/* ---- shell ---- */
.cc-shell{display:flex;gap:24px;max-width:1280px;margin:0 auto;padding:28px 32px 48px;align-items:flex-start;}
.cc-side{width:256px;flex-shrink:0;position:sticky;top:96px;display:flex;flex-direction:column;gap:16px;}
.cc-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:24px;}

/* ---- sidebar ---- */
.cc-id{padding:20px;}
.cc-avatar{width:44px;height:44px;border-radius:11px;background:${T.ink};color:${T.surface};display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-weight:600;font-size:17px;}
.cc-firm{display:flex;align-items:center;justify-content:space-between;margin-top:16px;padding:9px 12px;border:1px solid ${T.lineSoft};border-radius:10px;background:${T.surfaceAlt};font-size:12px;color:${T.inkSoft};}
.cc-dot{width:7px;height:7px;border-radius:50%;background:${T.green};display:inline-block;margin-right:7px;}

.cc-side-blk{padding:18px 20px;}
.cc-bar{height:6px;border-radius:4px;background:${T.lineSoft};overflow:hidden;margin-top:10px;}
.cc-bar>i{display:block;height:100%;background:${T.green};border-radius:4px;}

.cc-focusbox{padding:18px 20px;border:1px solid ${T.amber};background:${T.amberSoft};border-radius:15px;}
.cc-focusbox .big{font-family:'Fraunces',serif;font-size:26px;font-weight:600;color:${T.amber};line-height:1;margin-top:8px;}

/* ---- hook ---- */
.cc-hook{display:flex;gap:24px;align-items:stretch;padding:28px;border-radius:18px;color:#F3EEE4;position:relative;overflow:hidden;
  background:radial-gradient(120% 140% at 85% 10%, #21402F 0%, #1B1A14 55%, #16140F 100%);
  border:1px solid #2C2A20;}
.cc-hook-l{flex:1;display:flex;flex-direction:column;}
.cc-hook-tag{font-family:'IBM Plex Mono',monospace;text-transform:uppercase;letter-spacing:0.16em;font-size:10.5px;color:#9FCBB5;font-weight:500;}
.cc-hook-h{font-family:'Fraunces',serif;font-style:italic;font-size:30px;font-weight:500;margin:12px 0 10px;line-height:1.14;max-width:560px;}
.cc-hook-h b{font-style:normal;font-weight:600;}
.cc-hook-p{font-size:14px;color:#CFC9BB;max-width:480px;}
.cc-hook-cta{margin-top:auto;display:flex;gap:12px;padding-top:22px;}
.cc-btn{display:inline-flex;align-items:center;gap:9px;font-family:'IBM Plex Sans';font-size:14px;font-weight:600;padding:12px 20px;border-radius:11px;cursor:pointer;border:1px solid transparent;transition:transform .14s,filter .14s,background .14s;}
.cc-btn-primary{background:${T.green};color:#fff;}
.cc-btn-primary:hover{filter:brightness(1.09);transform:translateY(-1px);}
.cc-btn-ghost{background:rgba(255,255,255,0.05);color:#EFEAE0;border-color:rgba(255,255,255,0.14);}
.cc-btn-ghost:hover{background:rgba(255,255,255,0.10);}

.cc-hook-r{width:248px;flex-shrink:0;display:flex;flex-direction:column;justify-content:center;}
.cc-hook-cap{font-family:'IBM Plex Mono',monospace;font-size:9.5px;letter-spacing:0.12em;text-transform:uppercase;color:#8C8678;text-align:right;margin-top:10px;}

/* ---- stat cards ---- */
.cc-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.cc-stat{padding:17px 18px;}
.cc-stat.hot{border-color:${T.green};background:${T.greenSoft};}
.cc-stat .num{font-family:'Fraunces',serif;font-size:33px;font-weight:600;line-height:1;margin-top:9px;letter-spacing:-0.01em;}
.cc-stat .num small{font-size:16px;color:${T.inkFaint};font-weight:500;}
.cc-stat .sub{font-size:11.5px;color:${T.inkFaint};margin-top:7px;}
.cc-trend{display:inline-flex;align-items:center;gap:5px;font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:600;color:${T.green};margin-top:8px;}

/* ---- chart panels ---- */
.cc-panels{display:grid;grid-template-columns:1.15fr 1fr;gap:14px;}
.cc-panel{padding:20px 22px 16px;display:flex;flex-direction:column;}
.cc-panel h3{font-family:'Fraunces',serif;font-weight:600;font-size:17px;}
.cc-panel .cap{font-size:11.5px;color:${T.inkFaint};margin:3px 0 6px;}
.cc-legend{display:flex;gap:16px;align-items:center;}
.cc-leg{display:flex;align-items:center;gap:6px;font-size:11px;color:${T.inkSoft};}
.cc-sw{width:14px;height:3px;border-radius:2px;display:inline-block;}

.cc-moves{display:flex;justify-content:space-between;gap:8px;margin-top:8px;border-top:1px solid ${T.lineSoft};padding-top:12px;}
.cc-move{flex:1;text-align:center;}
.cc-move .k{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.08em;color:${T.inkFaint};text-transform:uppercase;}
.cc-move .d{font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;margin-top:3px;}

/* ---- sessions ---- */
.cc-sec-h{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:14px;}
.cc-sec-h h2{font-family:'Fraunces',serif;font-weight:600;font-size:19px;}
.cc-sess-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
.cc-sess{padding:18px;display:flex;flex-direction:column;}
.cc-sess-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;}
.cc-tagrow{display:flex;align-items:center;gap:9px;flex-wrap:wrap;}
.cc-tag{font-family:'IBM Plex Mono',monospace;font-size:9.5px;letter-spacing:0.06em;text-transform:uppercase;color:${T.inkSoft};border:1px solid ${T.lineSoft};background:${T.surfaceAlt};padding:3px 8px;border-radius:6px;}
.cc-when{font-size:11.5px;color:${T.inkFaint};}
.cc-sess-score{font-family:'Fraunces',serif;font-size:34px;font-weight:600;line-height:1;}
.cc-sess-name{font-weight:600;font-size:15px;margin-top:10px;}
.cc-microbars{display:flex;gap:8px;margin:14px 0 12px;}
.cc-mb{flex:1;}
.cc-mb .track{height:30px;border-radius:7px;background:${T.lineSoft};overflow:hidden;display:flex;align-items:flex-end;}
.cc-mb .fill{width:100%;border-radius:7px 7px 0 0;}
.cc-mb .k{font-family:'IBM Plex Mono',monospace;font-size:9px;color:${T.inkFaint};text-align:center;margin-top:4px;text-transform:uppercase;letter-spacing:0.05em;}
.cc-insight{font-size:12.5px;color:${T.inkSoft};border-radius:10px;padding:11px 13px;line-height:1.45;}
.cc-insight.amber{background:${T.amberSoft};border:1px solid ${T.amberSoft};}
.cc-insight.coral{background:${T.coralSoft};border:1px solid ${T.coralSoft};}
.cc-insight.green{background:${T.greenSoft};border:1px solid ${T.greenSoft};}
.cc-sess-actions{display:flex;gap:8px;margin-top:14px;}
.cc-sa{flex:1;font-family:'IBM Plex Sans';font-size:12.5px;font-weight:600;padding:9px 0;border-radius:9px;cursor:pointer;text-align:center;transition:filter .14s,background .14s;}
.cc-sa.dark{background:${T.ink};color:${T.surface};border:none;}
.cc-sa.dark:hover{filter:brightness(1.25);}
.cc-sa.ghost{background:${T.surface};color:${T.ink};border:1px solid ${T.lineSoft};}
.cc-sa.ghost:hover{background:${T.surfaceAlt};}

@media(max-width:980px){
  .cc-shell{flex-direction:column;}
  .cc-side{width:100%;position:static;flex-direction:row;flex-wrap:wrap;}
  .cc-side>*{flex:1;min-width:200px;}
  .cc-stats{grid-template-columns:repeat(2,1fr);}
  .cc-panels{grid-template-columns:1fr;}
  .cc-sess-grid{grid-template-columns:1fr;}
  .cc-hook{flex-direction:column;}
  .cc-hook-r{width:100%;}
}
`;

/* spider axis tick: pillar name, weakest flagged amber */
function PillarTick({ payload, x, y, cx, cy, weakest }: any) {
  const isWeak = payload.value === weakest;
  const dx = x - cx;
  const anchor = Math.abs(dx) < 14 ? "middle" : dx > 0 ? "start" : "end";
  const oy = y - cy < -10 ? -6 : y - cy > 10 ? 14 : 4;
  return (
    <text x={x + Math.sign(dx) * 4} y={y + oy} textAnchor={anchor} fontFamily="'IBM Plex Sans',sans-serif">
      <tspan fontSize="11.5" fontWeight={isWeak ? 600 : 500} fill={isWeak ? "var(--accent-amber)" : T.inkSoft}>
        {payload.value}{isWeak ? " ▾" : ""}
      </tspan>
    </text>
  );
}

function Tip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--text-primary)", color: "var(--bg-surface)", borderRadius: 9, padding: "8px 11px", fontSize: 12 }}>
      <div className="cc-mono" style={{ fontSize: 10, letterSpacing: "0.08em", color: "#9FCBB5", marginBottom: 4 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span style={{ color: "#CFC9BB" }}>{p.name}</span>
          <span className="cc-mono" style={{ fontWeight: 600 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* label only the latest point on the line */
function LatestLabel({ x, y, value, index, total }: any) {
  if (index !== total - 1) return null;
  return (
    <g>
      <rect x={x - 16} y={y - 30} width={32} height={20} rx={5} fill="var(--accent-green)" />
      <text x={x} y={y - 16} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff" fontFamily="IBM Plex Mono">{value}</text>
    </g>
  );
}

export default function HomeScreen({ onSelectCase }: { onSelectCase: (c: unknown) => void }) {
  const { signout } = useAuth();
  const { user } = useCurrentUser();
  const [publishedCases, setPublishedCases] = useState<any[]>([]);

  useEffect(() => {
    async function fetchPublishedCases() {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('status', 'published');
      if (error) {
        console.error('Error loading published cases:', error);
      } else if (data) {
        setPublishedCases(data);
      }
    }
    fetchPublishedCases();
  }, []);


  const DIFFICULTY_LABELS: Record<number, string> = { 1: 'ANALYST', 2: 'ASSOCIATE', 3: 'MANAGER' };
  const INDUSTRY_COLORS: Record<string, string> = {
    'Technology': '#3B82F6', 'Consumer Goods': '#7B6FE8', 'Retail': '#22C55E',
    'Healthcare': '#EF4444', 'Finance': '#F59E0B', 'Energy': '#10B981',
    'Electric Vehicles': '#0EA5E9', 'Manufacturing': '#6366F1',
    'Food & Beverage': '#F97316', 'Aviation': '#0EA5E9',
  };

  const DEFAULT_FALLBACK_CASES = [
    {
      id: 'a0e1c2d3-0001-4000-a000-000000000001',
      name: 'EV Charging Infrastructure in Gurgaon',
      problem_statement: 'You are advising the Chief Minister of Haryana on public fast-charging infrastructure for four-wheeler electric cars (passenger EVs & commercial cabs) in Gurgaon. The CM wants a crisp answer to: (1) How many public 4W EV charging stations are currently operational in Gurgaon? (2) What should Haryana\'s target be for Gurgaon by 2030, and roughly what grid capex is required? Please focus specifically on 4-wheeler cars — walk me through your estimation approach step by step.',
      case_type: 'Guesstimate',
      industry: 'Energy',
      company_style: '.',
      difficulty: 2,
      tags: ['guesstimate', 'ev', 'infrastructure', 'public-policy', 'haryana', 'energy-transition'],
      company_name: 'Govt of Haryana',
      company_sub: "Chief Minister's Office · Energy & Public Infrastructure",
      keep_in_mind: 'Focus strictly on 4W electric cars (personal retail vs commercial cabs). Gurgaon has ~3,500 registered 4W electric cars. At ~1 charger per 10-12 EV cars, demand yields ~280-320 stations. With 12h peak window and 45 min dwell time, supply yields ~300 stations. Target 2,000-2,500 stations by 2030 (~₹800-1,000 Cr capex).',
    },
    {
      id: 'fastfashion',
      name: 'FashionCo EU Market Entry',
      problem_statement: "Your client is a fast-fashion retailer based in Southeast Asia with €800M revenue, looking to enter the German and French markets. They've seen 30% CAGR domestically. Should they enter? If yes, how?",
      case_type: 'Market Entry',
      industry: 'Retail',
      company_style: 'BCG',
      difficulty: 2,
      tags: ['market-entry', 'retail', 'international'],
      company_name: 'FashionCo',
      company_sub: 'Southeast Asian fast-fashion retailer · €800M revenue',
      keep_in_mind: 'Digital-first entry with selective flagships.',
    },
    {
      id: 'nordvik',
      name: 'Nordvik Margin Collapse',
      problem_statement: 'Your client is Nordvik, a Norwegian consumer goods company with revenues of €2.1B. Their operating margin has collapsed from 14% to 9% in 18 months. The CEO needs a diagnosis and turnaround plan by end of Q4. How would you approach this?',
      case_type: 'Profitability',
      industry: 'Consumer Goods',
      company_style: 'Bain',
      difficulty: 3,
      tags: ['profitability', 'turnaround', 'cogs'],
      company_name: 'Nordvik',
      company_sub: 'Norwegian consumer goods leader · €2.1B revenue',
      keep_in_mind: 'COGS inflation driven by supplier concentration.',
    }
  ];

  const sourceCases = (publishedCases && publishedCases.length > 0) ? publishedCases : DEFAULT_FALLBACK_CASES;

  const dbCases = sourceCases.map((c: any) => {
    const caseNameLower = (c.name || c.title || '').toLowerCase();
    const probLower = (c.problem_statement || c.description || '').toLowerCase();
    const tagsArr = Array.isArray(c.tags) ? c.tags : [];
    const isEvCase = caseNameLower.includes('ev') || probLower.includes('ev') || tagsArr.includes('ev') || caseNameLower.includes('gurgaon');
    const isGuesstimate = c.case_type === 'Guesstimate' || tagsArr.includes('guesstimate');

    const companyName = c.company_name || (isEvCase ? 'Govt of Haryana' : (c.name || 'Client').split(' ')[0]);
    const companySub = c.company_sub || (isEvCase ? "Chief Minister's Office · Energy & Public Infrastructure" : `${c.industry || 'Management'} · Strategic Advisory`);
    const problemText = c.problem_statement || c.description || '';

    const suggestedFramework = isEvCase || isGuesstimate
      ? [
          'Demand-Side Fleet Sizing',
          'Supply-Side Station Capacity',
          'Grid & Capex Math',
          'CM Recommendation'
        ]
      : ['Market Attractiveness', 'Competitive Dynamics', 'Entry Strategy'];

    const prepPath = isEvCase || isGuesstimate
      ? [
          { label: 'Guesstimate & Market Sizing spine', done: true },
          { label: 'EV Fleet & Infrastructure math', done: true },
          { label: 'Haryana EV policy review', done: false }
        ]
      : [
          { label: 'Core framework review', done: true },
          { label: 'Industry context briefing', done: true },
          { label: 'Quantitative stress-test', done: false }
        ];

    return {
      id: c.id,
      title: c.name || c.title,
      name: c.name || c.title,
      companyName,
      companySub,
      description: problemText,
      synopsis: problemText.substring(0, 150) + (problemText.length > 150 ? '...' : ''),
      industry: c.industry || (isEvCase ? 'Energy' : 'Technology'),
      industryColor: INDUSTRY_COLORS[c.industry] ?? (isEvCase ? '#10B981' : '#6B34D6'),
      difficulty: DIFFICULTY_LABELS[c.difficulty] ?? 'ASSOCIATE',
      difficultyLabel: (DIFFICULTY_LABELS[c.difficulty] ?? 'Associate'),
      difficultyColor: '#F59E0B',
      duration: '5 min',
      caseType: c.case_type || 'Guesstimate',
      type: c.case_type || 'Guesstimate',
      mode: c.company_style || '.',
      trending: tagsArr.includes('guesstimate') || isEvCase,
      opening: problemText,
      rootCause: c.keep_in_mind ?? '',
      wildcard: null,
      tags: tagsArr,
      suggestedFramework,
      prepPath,
      attempts: 980,
      elo: 1280,
      xpReward: 450,
      isDbCase: true,
      caseRaw: c,
    };
  });

  // Helper function to format timestamp into human readable relative time
  const formatRelativeTime = (timestamp: number) => {
    if (!timestamp) return "some time ago";
    const diffMs = Date.now() - timestamp;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHrs === 0) return "Just now";
      return `${diffHrs}h ago`;
    }
    if (diffDays === 1) return "yesterday";
    return `${diffDays} days ago`;
  };

  // ---------------- DATA LAYER ADAPTER ----------------
  const completedSessions = getSessions().filter((s: any) => s.completed);

  // User Profile
  const profileName = user?.name || user?.email?.split('@')[0] || "Consultant";
  const initials = profileName
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || "CC";

  const targetFirm = "."; // TODO: connect to API
  const prepDay = 12;            // TODO: connect to API

  // Milestones
  const milestoneDone = completedSessions.length;
  const milestoneGoal = 10;      // TODO: connect to API
  const milePct = Math.round((milestoneDone / milestoneGoal) * 100);

  // Performance Overview Metrics
  const avgScore = completedSessions.length > 0
    ? Math.round((completedSessions.reduce((acc: number, s: any) => acc + (s.finalScore || 0), 0) / completedSessions.length) * 10)
    : 71;

  const avgDelta = 6;            // TODO: connect to API

  const bestSession = completedSessions.length > 0
    ? completedSessions.reduce((max: any, curr: any) => (curr.finalScore || 0) > (max.finalScore || 0) ? curr : max, completedSessions[0])
    : null;
  const bestScoreVal = bestSession ? Math.round((bestSession.finalScore || 0) * 10) : 82;
  const bestCaseMatch = bestSession ? publishedCases.find((c: any) => c.id === bestSession.caseId) : null;
  const bestCaseName = bestCaseMatch ? bestCaseMatch.name : (bestSession ? "Practice Case" : "RetailCo");
  const bestWhenVal = bestSession ? formatRelativeTime(bestSession.timestamp) : "2 days ago";

  const practiceHours = completedSessions.length > 0
    ? parseFloat((completedSessions.length * 0.4).toFixed(1)) // Approx 24m per case
    : 3.4;

  const avgPerCase = 51;         // TODO: connect to API

  // Four Pillars Scores Calculations (database mapping)
  const getDimAverage = (dimKey: string, defaultVal: number) => {
    if (completedSessions.length === 0) return defaultVal;
    const vals = completedSessions.map((s: any) => s.scores?.[dimKey]).filter((v: any) => v != null && v > 0);
    return vals.length > 0
      ? Math.round((vals.reduce((a: number, b: number) => a + b, 0) / vals.length) * 10)
      : defaultVal;
  };

  const pillars = [
    { key: "Structure", you: getDimAverage('structure', 84), benchmark: 76, move: 8 },  // TODO: move: connect to API
    { key: "Clarity", you: getDimAverage('communication', 72), benchmark: 69, move: 3 }, // TODO: move: connect to API
    { key: "Quant", you: getDimAverage('quantitative', 55), benchmark: 68, move: -2 },   // TODO: move: connect to API
    { key: "Creativity", you: getDimAverage('creativity', 70), benchmark: 65, move: 5 }, // TODO: move: connect to API
  ];

  // Weakest pillar calculation
  const weakestPillarObj = pillars.reduce((worst: any, curr: any) => {
    const currGap = curr.you - curr.benchmark;
    const worstGap = worst.you - worst.benchmark;
    return currGap < worstGap ? curr : worst;
  }, pillars[0]);

  const weakest = weakestPillarObj.key;
  const gapValue = weakestPillarObj.benchmark - weakestPillarObj.you;

  // Progression Line Chart data (user score vs . standard for recent cases)
  const progression = completedSessions.length > 0
    ? completedSessions.slice(-6).map((s: any, idx: number) => {
        const youScore = Math.round((s.finalScore || 0) * 10);
        return {
          label: `Case ${idx + 1}`,
          you: youScore,
          caseAvg: Math.round(((s.finalScore || 7.0) * 10) + (Math.sin(idx) * 4)) // TODO: caseAvg: connect to API
        };
      })
    : [
        { label: "Case 1", you: 58, caseAvg: 66 },
        { label: "Case 2", you: 64, caseAvg: 67 },
        { label: "Case 3", you: 72, caseAvg: 68 },
        { label: "Case 4", you: 82, caseAvg: 70 },
      ];

  // Dynamic Headline generation based on weakest pillar gap size
  const headlinePre = `Your ${weakest} score is `;
  const headlineHi = gapValue > 0 ? `${gapValue} points below` : `${Math.abs(gapValue)} points above`;
  const headlinePost = ` the ${targetFirm} benchmark.`;
  const dynamicBodyText = `You've done ${completedSessions.length || 4} cases. Structure is strong at ${pillars.find(p => p.key === "Structure")?.you || 84}. The widest gap is in ${weakest.toLowerCase()} reasoning — let's close it with a targeted practice session.`;

  const lastSessionObj = completedSessions[completedSessions.length - 1];
  const lastSessionMatch = lastSessionObj ? publishedCases.find((c: any) => c.id === lastSessionObj.caseId) : null;
  const lastSessionName = lastSessionMatch ? lastSessionMatch.name.toUpperCase() : (lastSessionObj ? "PRACTICE" : "RETAILCO");

  // Dynamic Case Recommendation
  let recommendedDbCase = null;
  if (publishedCases.length > 0) {
    if (weakest === "Quant") {
      recommendedDbCase = publishedCases.find((c: any) => c.case_type === "Guesstimate" || c.tags?.includes("guesstimate"));
    } else if (weakest === "Structure") {
      recommendedDbCase = publishedCases.find((c: any) => c.case_type === "Profitability" || c.case_type === "P&L");
    } else if (weakest === "Creativity") {
      recommendedDbCase = publishedCases.find((c: any) => c.case_type === "Market Entry");
    }
    if (!recommendedDbCase) {
      recommendedDbCase = publishedCases[0];
    }
  }

  // Handle CTA button clicks
  const handleRecommendedClick = () => {
    if (recommendedDbCase) {
      const mapped = dbCases.find(c => c.id === recommendedDbCase.id);
      if (mapped) onSelectCase(mapped);
    } else if (dbCases.length > 0) {
      onSelectCase(dbCases[0]);
    }
  };

  // Recent Sessions (max 3)
  const sessions = completedSessions.length > 0
    ? completedSessions.slice(-3).reverse().map((s: any) => {
        const caseMatch = publishedCases.find((c: any) => c.id === s.caseId);
        const name = caseMatch ? caseMatch.name : "Practice Case";
        const type = caseMatch ? caseMatch.case_type : "P&L";
        const score = Math.round((s.finalScore || 0) * 10);
        const when = formatRelativeTime(s.timestamp);
        const mins = 28; // TODO: connect to API
        const bars = {
          Structure: Math.round((s.scores?.structure || 0) * 10),
          Clarity: Math.round((s.scores?.communication || 0) * 10),
          Quant: Math.round((s.scores?.quantitative || 0) * 10),
          Creativity: Math.round((s.scores?.creativity || 0) * 10),
        };
        const worstP = Object.entries(s.scores || {}).reduce((worst: [string, any], curr: [string, any]) => curr[1] < worst[1] ? curr : worst, ["structure", 10])[0];
        const worstLabel = worstP === 'structure' ? 'Structure' : worstP === 'communication' ? 'Clarity' : worstP === 'quantitative' ? 'Quant' : 'Creativity';
        const toneVal = score >= 80 ? "green" : score >= 68 ? "amber" : "coral";
        const insight = `Solid framework construction. The primary area for refinement lies within the ${worstLabel} category.`; // TODO: connect to API

        return {
          id: s.caseId || Math.random(),
          name,
          type,
          score,
          when,
          mins,
          bars,
          tone: toneVal as 'green' | 'amber' | 'coral',
          insight,
          caseRaw: caseMatch
        };
      })
    : [
        {
          id: 1, name: "RetailCo Profitability", type: "P&L", score: 82,
          when: "2 days ago", mins: 28,
          bars: { Structure: 86, Clarity: 78, Quant: 70, Creativity: 80 },
          tone: "amber" as const,
          insight: "Strong Revenue branch. Missed External Context — a branch that costs 12 pts on average.",
        },
        {
          id: 2, name: "FashionCo Market Entry", type: "Market Entry", score: 74,
          when: "4 days ago", mins: 34,
          bars: { Structure: 80, Clarity: 72, Quant: 60, Creativity: 68 },
          tone: "amber" as const,
          insight: "Framework was MECE. Competitive Dynamics pillar was underdeveloped — only 2 of 4 sub-branches explored.",
        },
        {
          id: 3, name: "Airport Coffee Guesstimate", type: "Guesstimate", score: 65,
          when: "6 days ago", mins: 22,
          bars: { Structure: 70, Clarity: 66, Quant: 52, Creativity: 64 },
          tone: "coral" as const,
          insight: "Good estimation chain. Missed the staff-purchase layer — adds ~15% to the final estimate. Top scorers always include a secondary demand source.",
        },
      ];

  // Mind map illustration dynamically rendering based on the user's last session type
  const renderMindMapHero = () => {
    const isGuesstimate = lastSessionName.includes("GUESSTIMATE") || lastSessionName.includes("AIRPORT");
    if (isGuesstimate) {
      return (
        <svg viewBox="0 0 248 190" width="100%">
          <path d="M52 95 C 100 95, 110 50, 158 50" fill="none" stroke="#4F8E76" strokeWidth="1.8" />
          <path d="M52 95 C 100 95, 110 100, 158 100" fill="none" stroke="#4F8E76" strokeWidth="1.8" />
          <path d="M52 95 C 100 95, 110 148, 158 148" fill="none" stroke={T.coral} strokeWidth="1.8" strokeDasharray="5 4" />
          
          <rect x="6" y="78" width="92" height="34" rx="9" fill="rgba(21,122,91,0.22)" stroke="#3FA982" strokeWidth="1.4" />
          <text x="52" y="93" textAnchor="middle" fontSize="11" fontWeight="600" fill="#CFF0E2" fontFamily="IBM Plex Sans">Market Sizing</text>
          <text x="52" y="105" textAnchor="middle" fontSize="8" fill="#8FC9B2" fontFamily="IBM Plex Mono">Demand Model</text>

          <rect x="158" y="34" width="84" height="32" rx="8" fill="rgba(21,122,91,0.16)" stroke="#3FA982" strokeWidth="1.3" />
          <circle cx="170" cy="50" r="3" fill="#3FA982" />
          <text x="182" y="47" fontSize="10" fontWeight="600" fill="#D7F0E6" fontFamily="IBM Plex Sans">Direct</text>
          <text x="182" y="59" fontSize="8" fill="#8FC9B2" fontFamily="IBM Plex Mono">85 pts</text>

          <rect x="158" y="84" width="84" height="32" rx="8" fill="rgba(255,255,255,0.05)" stroke="#6E6A5C" strokeWidth="1.3" />
          <circle cx="170" cy="100" r="3" fill={T.amber} />
          <text x="182" y="97" fontSize="10" fontWeight="600" fill="#E3DDCF" fontFamily="IBM Plex Sans">Secondary</text>
          <text x="182" y="109" fontSize="8" fill="#A59E8E" fontFamily="IBM Plex Mono">partial</text>

          <rect x="158" y="132" width="84" height="32" rx="8" fill={T.coralSoft} stroke={T.coral} strokeWidth="1.3" strokeDasharray="5 3" />
          <text x="200" y="148" textAnchor="middle" fontSize="10" fontWeight="600" fill="#E8A593" fontFamily="IBM Plex Sans">Staff-layer</text>
          <text x="200" y="159" textAnchor="middle" fontSize="7.5" fill="#CE8674" fontFamily="IBM Plex Mono">missed</text>
        </svg>
      );
    }
    
    // Default Profitability/P&L illustration
    return (
      <svg viewBox="0 0 248 190" width="100%">
        <path d="M52 95 C 100 95, 110 50, 158 50" fill="none" stroke="#4F8E76" strokeWidth="1.8" />
        <path d="M52 95 C 100 95, 110 100, 158 100" fill="none" stroke="#4F8E76" strokeWidth="1.8" />
        <path d="M52 95 C 100 95, 110 148, 158 148" fill="none" stroke={T.coral} strokeWidth="1.8" strokeDasharray="5 4" />
        {/* root */}
        <rect x="6" y="78" width="92" height="34" rx="9" fill="rgba(21,122,91,0.22)" stroke="#3FA982" strokeWidth="1.4" />
        <text x="52" y="93" textAnchor="middle" fontSize="11" fontWeight="600" fill="#CFF0E2" fontFamily="IBM Plex Sans">Profitability</text>
        <text x="52" y="105" textAnchor="middle" fontSize="8" fill="#8FC9B2" fontFamily="IBM Plex Mono">Revenue − Cost</text>
        {/* revenue */}
        <rect x="158" y="34" width="84" height="32" rx="8" fill="rgba(21,122,91,0.16)" stroke="#3FA982" strokeWidth="1.3" />
        <circle cx="170" cy="50" r="3" fill="#3FA982" />
        <text x="182" y="47" fontSize="10" fontWeight="600" fill="#D7F0E6" fontFamily="IBM Plex Sans">Revenue</text>
        <text x="182" y="59" fontSize="8" fill="#8FC9B2" fontFamily="IBM Plex Mono">82 pts</text>
        {/* cost */}
        <rect x="158" y="84" width="84" height="32" rx="8" fill="rgba(255,255,255,0.05)" stroke="#6E6A5C" strokeWidth="1.3" />
        <circle cx="170" cy="100" r="3" fill={T.amber} />
        <text x="182" y="97" fontSize="10" fontWeight="600" fill="#E3DDCF" fontFamily="IBM Plex Sans">Cost</text>
        <text x="182" y="109" fontSize="8" fill="#A59E8E" fontFamily="IBM Plex Mono">partial</text>
        {/* external */}
        <rect x="158" y="132" width="84" height="32" rx="8" fill={T.coralSoft} stroke={T.coral} strokeWidth="1.3" strokeDasharray="5 3" />
        <text x="200" y="148" textAnchor="middle" fontSize="10" fontWeight="600" fill="#E8A593" fontFamily="IBM Plex Sans">External</text>
        <text x="200" y="159" textAnchor="middle" fontSize="7.5" fill="#CE8674" fontFamily="IBM Plex Mono">not explored</text>
      </svg>
    );
  };

  return (
    <div className="cc">
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* ---------------- TOP NAV ---------------- */}
      <nav className="cc-nav">
        <div className="cc-logo">Case<span>Journey</span></div>
        <div className="cc-tabs">
          <div className="cc-tab on">Dashboard</div>
          <div className="cc-tab" onClick={() => {
            const el = document.getElementById('cases-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}>Cases</div>
          <div className="cc-tab" onClick={() => {
            const el = document.getElementById('cases-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}>Practice</div>
        </div>
        <div className="cc-nav-r">
          <div className="cc-firmpill">
            <span className="cc-dot" />
            {targetFirm}
          </div>
          <div className="cc-navav">{initials}</div>
          <button
            onClick={() => signout()}
            style={{ display: 'flex', alignItems: 'center', padding: '8px', borderRadius: '50%', background: 'transparent', cursor: 'pointer', color: 'var(--text-tertiary)' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </nav>

      <div className="cc-shell">
        {/* ---------------- SIDEBAR ---------------- */}
        <aside className="cc-side">
          <div className="cc-card cc-id">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="cc-avatar">{initials}</div>
              <div>
                <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: 17 }}>{profileName}</div>
                <div className="cc-micro" style={{ marginTop: 2 }}>Day {prepDay} of prep</div>
              </div>
            </div>
            <div className="cc-firm">
              <span><span className="cc-dot" />Targeting</span>
              <strong style={{ color: T.ink, fontWeight: 600 }}>{targetFirm}</strong>
            </div>
          </div>

          <div className="cc-card cc-side-blk">
            <div className="cc-micro">Case milestone</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 10 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{milestoneDone} of {milestoneGoal} cases</span>
              <span className="cc-mono" style={{ fontSize: 13, fontWeight: 600, color: T.green }}>{milestoneDone}/{milestoneGoal}</span>
            </div>
            <div className="cc-bar"><i style={{ width: `${milePct}%` }} /></div>
            <div style={{ fontSize: 11.5, color: T.inkFaint, marginTop: 9 }}>{milestoneGoal - milestoneDone} cases to next milestone</div>
          </div>

          {/* focus area focusbox */}
          <div className="cc-focusbox">
            <div className="cc-micro" style={{ color: T.amber }}>Your one focus</div>
            <div className="big">{weakest}</div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 600, color: T.amber, marginTop: 4 }}>
              {gapValue > 0 ? `−${gapValue}` : `+${Math.abs(gapValue)}`} vs {targetFirm}
            </div>
            <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 8, lineHeight: 1.45 }}>
              Your widest benchmark gap. The recommended case targets it directly.
            </div>
          </div>
        </aside>

        {/* ---------------- MAIN ---------------- */}
        <main className="cc-main">

          {/* ZONE 1 — hook with mind-map snapshot */}
          <section className="cc-hook">
            <div className="cc-hook-l">
              <div className="cc-hook-tag">Your next move</div>
              <h1 className="cc-hook-h">
                {headlinePre}<b>{headlineHi}</b>{headlinePost}
              </h1>
              <p className="cc-hook-p">{dynamicBodyText}</p>
              <div className="cc-hook-cta">
                <button className="cc-btn cc-btn-primary" onClick={handleRecommendedClick}>
                  Start recommended case <span style={{ fontSize: 16 }}>→</span>
                </button>
                <button className="cc-btn cc-btn-ghost" onClick={() => {
                  const el = document.getElementById('cases-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}>Browse all cases</button>
              </div>
            </div>

            {/* hero illustration — last session's mind map */}
            <div className="cc-hook-r">
              {renderMindMapHero()}
              <div className="cc-hook-cap">Your last session · {lastSessionName}</div>
            </div>
          </section>

          {/* ZONE 2 — performance overview */}
          <div>
            <div className="cc-micro" style={{ marginBottom: 12 }}>Performance overview</div>
            <section className="cc-stats">
              <div className="cc-card cc-stat hot">
                <div className="cc-micro">Average score</div>
                <div className="num" style={{ color: scoreColor(avgScore) }}>{avgScore}</div>
                <div className="cc-trend">↑ +{avgDelta} this week</div>
              </div>
              <div className="cc-card cc-stat">
                <div className="cc-micro">Cases completed</div>
                <div className="num">{milestoneDone}</div>
                <div className="sub">{milestoneGoal - milestoneDone} to next milestone</div>
              </div>
              <div className="cc-card cc-stat">
                <div className="cc-micro">Personal best</div>
                <div className="num" style={{ color: T.green }}>{bestScoreVal}</div>
                <div className="sub">{bestCaseName} · {bestWhenVal}</div>
              </div>
              <div className="cc-card cc-stat">
                <div className="cc-micro">Practice time</div>
                <div className="num">{practiceHours}<small> h</small></div>
                <div className="sub">{avgPerCase} min avg per case</div>
              </div>
            </section>
          </div>

          {/* ZONE 3 — progression + spider charts */}
          <section className="cc-panels">
            {/* line chart */}
            <div className="cc-card cc-panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3>Score progression</h3>
                  <div className="cap">Your score vs. the average for each case</div>
                </div>
                <div className="cc-legend">
                  <span className="cc-leg"><span className="cc-sw" style={{ background: T.green }} /> You</span>
                  <span className="cc-leg"><span className="cc-sw" style={{ background: T.inkFaint }} /> Case avg</span>
                </div>
              </div>
              <div style={{ flex: 1, minHeight: 230, marginTop: 8 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={progression} margin={{ top: 18, right: 22, left: -14, bottom: 4 }}>
                    <defs>
                      <linearGradient id="youFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent-green)" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="var(--accent-green)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={T.lineSoft} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: T.inkFaint, fontFamily: "IBM Plex Mono" }} axisLine={{ stroke: T.lineSoft }} tickLine={false} />
                    <YAxis domain={[40, 100]} ticks={[40, 60, 80, 100]} tick={{ fontSize: 11, fill: T.inkFaint, fontFamily: "IBM Plex Mono" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<Tip />} />
                    <Line name="Case avg" type="monotone" dataKey="caseAvg" stroke={T.inkFaint} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                    <Area name="You" type="monotone" dataKey="you" stroke="var(--accent-green)" strokeWidth={2.6} fill="url(#youFill)"
                      dot={{ r: 3.5, fill: "var(--accent-green)", strokeWidth: 0 }} activeDot={{ r: 5 }}
                      label={(p: any) => <LatestLabel {...p} total={progression.length} />} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* spider radar chart */}
            <div className="cc-card cc-panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3>Your four pillars</h3>
                  <div className="cap">You vs. {targetFirm} benchmark</div>
                </div>
                <div className="cc-legend">
                  <span className="cc-leg"><span className="cc-sw" style={{ background: T.green }} /> You</span>
                  <span className="cc-leg"><span className="cc-sw" style={{ borderTop: `2px dashed ${T.inkFaint}`, background: "transparent", height: 0 }} /> Bench</span>
                </div>
              </div>
              <div style={{ flex: 1, minHeight: 196, marginTop: 4 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={pillars} outerRadius="70%" margin={{ top: 6, bottom: 6 }}>
                    <PolarGrid stroke={T.lineSoft} />
                    <PolarAngleAxis dataKey="key" tick={(p) => <PillarTick {...p} weakest={weakest} />} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name={`${targetFirm} avg`} dataKey="benchmark" stroke={T.inkFaint} strokeDasharray="4 4" strokeWidth={1.5} fill="none" />
                    <Radar name="You" dataKey="you" stroke="var(--accent-green)" strokeWidth={2.2} fill="var(--accent-green)" fillOpacity={0.15} />
                    <Tooltip content={<Tip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              {/* movement deltas */}
              <div className="cc-moves">
                {pillars.map((p) => (
                  <div className="cc-move" key={p.key}>
                    <div className="k">{ABBR[p.key]}</div>
                    <div className="d" style={{ color: p.move >= 0 ? T.green : T.coral }}>
                      {p.move >= 0 ? "+" : ""}{p.move}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ZONE 4 — recent sessions */}
          <section>
            <div className="cc-sec-h">
              <h2>Recent sessions</h2>
              <span className="cc-micro">last 3</span>
            </div>
            <div className="cc-sess-grid">
              {sessions.map((s: any, idx: number) => (
                <div key={idx} className="cc-card cc-sess">
                  <div className="cc-sess-top">
                    <div>
                      <div className="cc-tagrow">
                        <span className="cc-tag">{s.type}</span>
                        <span className="cc-when">{s.when} · {s.mins} min</span>
                      </div>
                      <div className="cc-sess-name">{s.name}</div>
                    </div>
                    <div className="cc-sess-score" style={{ color: scoreColor(s.score) }}>{s.score}</div>
                  </div>

                  <div className="cc-microbars">
                    {Object.entries(s.bars).map(([k, v]) => (
                      <div className="cc-mb" key={k}>
                        <div className="track"><div className="fill" style={{ height: `${v}%`, background: PILLAR[k] }} /></div>
                        <div className="k">{ABBR[k]}</div>
                      </div>
                    ))}
                  </div>

                  <div className={`cc-insight ${s.tone}`}>{s.insight}</div>

                  <div className="cc-sess-actions">
                    <button className="cc-sa dark" onClick={() => s.caseRaw && onSelectCase(dbCases.find(c => c.id === s.caseRaw.id) || s.caseRaw)}>Review mind map</button>
                    <button className="cc-sa ghost" onClick={() => s.caseRaw && onSelectCase(dbCases.find(c => c.id === s.caseRaw.id) || s.caseRaw)}>Retry →</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ZONE 5 — Choose Your Case Section */}
          <section id="cases-section" style={{ marginTop: "12px" }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Choose Your Case</h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{dbCases.length} cases</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {dbCases.map((c: any) => {
                const diffColor = c.difficulty === 'ANALYST' ? T.green : c.difficulty === 'ASSOCIATE' ? T.amber : T.coral;
                const diffBg = c.difficulty === 'ANALYST' ? T.greenSoft : c.difficulty === 'ASSOCIATE' ? T.amberSoft : T.coralSoft;
                return (
                  <motion.div
                    key={c.id}
                    onClick={() => onSelectCase(c)}
                    whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className="cc-card"
                    style={{
                      position: 'relative',
                      padding: '18px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    {c.trending && (
                      <div style={{
                        position: 'absolute', top: '10px', right: '10px',
                        background: 'var(--accent-purple-light)', borderRadius: '4px',
                        padding: '2px 7px', fontSize: '9px', fontWeight: 600,
                        color: 'var(--accent-purple)', letterSpacing: '0.04em',
                        display: 'flex', alignItems: 'center', gap: '3px',
                      }}>
                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-purple)', display: 'inline-block' }} />
                        Trending
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="mono" style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: '4px', background: `${c.industryColor}10`, color: c.industryColor }}>{c.industry}</span>
                      <span className="mono" style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.04em', padding: '2px 7px', borderRadius: '4px', color: diffColor, background: diffBg }}>{c.difficulty}</span>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '5px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.015em', lineHeight: 1.3 }}>{c.title}</h3>
                      </div>
                      <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{c.synopsis}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', paddingTop: '8px', borderTop: `1px solid ${T.lineSoft}` }}>
                      {[c.duration, c.type, c.mode].map((chip: string) => (
                        <span key={chip} className="mono" style={{ fontSize: '9px', color: 'var(--text-tertiary)', background: 'var(--bg-elevated)', borderRadius: '4px', padding: '2px 7px' }}>{chip}</span>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}
