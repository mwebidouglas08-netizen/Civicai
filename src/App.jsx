import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  AlertTriangle, Droplet, Construction, ShieldAlert, Lightbulb, Trash2, HeartPulse,
  MapPin, Mic, Camera, Send, ChevronRight, Stamp, Users, FileText, Globe, X,
  Loader2, CheckCircle2, Clock, Eye, ArrowUpRight, Search, Copy, Download, RefreshCw
} from "lucide-react";

import { STRINGS, LANG_CODES } from "./i18n.js";
import { CATEGORIES, CATEGORY_KEYS, authorityFor } from "./categories.js";
import { classifyText, summarize } from "./lib/classify.js";
import { generateLetter } from "./lib/letters.js";
import { loadCases, saveCases, findCluster, bumpPressure, resetCases } from "./lib/storage.js";
import { getCurrentPosition, reverseGeocode, coordsToMapXY } from "./lib/geo.js";

/* ---------------------------------------------------------
   CivicAI — "The Stamp, Reclaimed"
   Design tokens:
   - Ink:    #1B2A4A (authority blue)
   - Paper:  #FBF7F0 (warm paper)
   - Signal: #C1432F (urgency red / stamp)
   - Sage:   #6B8F71 (resolved)
   - Ochre:  #D9A441 (pending)
   - Display: 'Source Serif 4', body: 'IBM Plex Sans' (Arabic-capable)
--------------------------------------------------------- */

const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,500&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap');
    :root{
      --ink:#1B2A4A; --paper:#FBF7F0; --signal:#C1432F; --sage:#6B8F71; --ochre:#D9A441;
      --ink-soft:#3a4a72; --line:#dcd4c4; --paper-deep:#f1ead9;
    }
    *{ box-sizing:border-box; }
    html,body,#root{ height:100%; }
    body{ margin:0; }
    .civicai{ font-family:'IBM Plex Sans','IBM Plex Sans Arabic',sans-serif; background:var(--paper); color:var(--ink); min-height:100vh; }
    .civicai .serif{ font-family:'Source Serif 4', Georgia, serif; }
    .civicai[dir="rtl"]{ text-align:right; }
    .civicai ::selection{ background:var(--ochre); color:var(--ink); }
    @keyframes stampIn{ 0%{ transform:scale(2.4) rotate(-18deg); opacity:0; } 60%{ transform:scale(0.9) rotate(-8deg); opacity:1;} 100%{ transform:scale(1) rotate(-8deg); opacity:1;} }
    .stamp-anim{ animation: stampIn 0.6s cubic-bezier(.2,1.4,.4,1) both; }
    @keyframes pulseDot{ 0%,100%{ opacity:1; } 50%{ opacity:.35; } }
    .pulse-dot{ animation: pulseDot 1.6s ease-in-out infinite; }
    @keyframes spin{ to{ transform: rotate(360deg); } }
    .civicai button{ font-family:inherit; cursor:pointer; }
    .civicai input, .civicai textarea, .civicai select{ font-family:inherit; }
    .scrollbar-thin::-webkit-scrollbar{ width:6px; height:6px; }
    .scrollbar-thin::-webkit-scrollbar-thumb{ background:var(--line); border-radius:4px; }
    a{ color: inherit; }
    @media (max-width: 760px){
      .civicai .grid-2{ grid-template-columns: 1fr !important; }
    }
  `}</style>
);

const NEIGHBORHOOD_DEFAULTS = [
  "Downtown", "Riverside District", "North Bridge Area", "Eastside", "Market Quarter",
  "Old Town", "Civic Center", "West End", "Hillside", "Lakeview",
];

const STATUS_ORDER = ["submitted", "acknowledged", "review", "resolved"];
const STATUS_KEYS = { submitted: "status_submitted", acknowledged: "status_acknowledged", review: "status_review", resolved: "status_resolved" };
const DAY = 86400000;

/* ---------------------------------------------------------
   Small UI primitives
--------------------------------------------------------- */
function CaseStamp({ id, label, small }) {
  return (
    <div
      className="stamp-anim"
      style={{
        display: "inline-flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        border: `3px solid var(--signal)`, borderRadius: "50%",
        width: small ? 84 : 132, height: small ? 84 : 132,
        color: "var(--signal)", transform: "rotate(-8deg)",
        padding: small ? 6 : 10, textAlign: "center", flexShrink: 0,
        boxShadow: "inset 0 0 0 2px rgba(193,67,47,0.15)",
      }}
    >
      <span className="serif" style={{ fontWeight: 700, fontSize: small ? 11 : 14, letterSpacing: 1 }}>{label}</span>
      <span style={{ fontSize: small ? 9 : 11, fontWeight: 600, marginTop: 4, wordBreak: "break-all" }}>{id}</span>
    </div>
  );
}

function Pill({ children, color }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600,
      padding: "4px 10px", borderRadius: 999, background: color + "20", color, border: `1px solid ${color}40`
    }}>{children}</span>
  );
}

function PressureBar({ score }) {
  const color = score > 80 ? "var(--signal)" : score > 55 ? "var(--ochre)" : "var(--sage)";
  return (
    <div style={{ width: "100%" }}>
      <div style={{ height: 8, background: "var(--paper-deep)", borderRadius: 999, overflow: "hidden", border: "1px solid var(--line)" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

function Timeline({ status, t, createdAt, escalated, onViewEscalation }) {
  const idx = STATUS_ORDER.indexOf(status);
  const dir = t.dir;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {STATUS_ORDER.map((s, i) => {
        const done = i <= idx;
        const isLast = i === STATUS_ORDER.length - 1;
        return (
          <div key={s} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                background: done ? "var(--ink)" : "var(--paper)", border: `2px solid ${done ? "var(--ink)" : "var(--line)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {done && <CheckCircle2 size={14} color="var(--paper)" />}
              </div>
              {!isLast && <div style={{ width: 2, flex: 1, minHeight: 32, background: i < idx ? "var(--ink)" : "var(--line)" }} />}
            </div>
            <div style={{ paddingBottom: isLast ? 0 : 24 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: done ? "var(--ink)" : "#9a9384" }}>{t[STATUS_KEYS[s]]}</div>
              {i === 0 && <div style={{ fontSize: 12, color: "#9a9384", marginTop: 2 }}>{new Date(createdAt).toLocaleDateString()}</div>}
            </div>
          </div>
        );
      })}
      {escalated && (
        <div onClick={onViewEscalation} style={{ marginTop: 6, padding: 12, background: "var(--signal)" + "12", border: "1px solid var(--signal)40", borderRadius: 10, display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
          <ArrowUpRight size={18} color="var(--signal)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--signal)" }}>{t.escalation_title}</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 3 }}>{t.escalation_sub}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   Main App
--------------------------------------------------------- */
export default function App() {
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem("civicai_lang");
    if (saved && STRINGS[saved]) return saved;
    const browserLang = (navigator.language || "en").slice(0, 2);
    return STRINGS[browserLang] ? browserLang : "en";
  });
  const t = STRINGS[lang];
  const dir = t.dir;

  const [view, setView] = useState("home");
  const [cases, setCases] = useState(() => loadCases());
  const [activeCaseId, setActiveCaseId] = useState(null);
  const [letterModal, setLetterModal] = useState(null);
  const [copyState, setCopyState] = useState(false);

  // form state
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [locality, setLocality] = useState("");
  const [country, setCountry] = useState("");
  const [coords, setCoords] = useState(null); // { lat, lng }
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(false);

  // result + processing
  const [result, setResult] = useState(null);
  const [processingStep, setProcessingStep] = useState(0);
  const fileRef = useRef(null);
  const recognitionRef = useRef(null);

  // dashboard
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => { localStorage.setItem("civicai_lang", lang); }, [lang]);
  useEffect(() => { saveCases(cases); }, [cases]);
  useEffect(() => { document.documentElement.lang = lang; document.documentElement.dir = dir; }, [lang, dir]);

  const PROCESS_STEPS = [t.step_classify, t.step_geo, t.step_route, t.step_letter, t.step_cluster];

  /* ---------- location ---------- */
  async function handleUseLocation() {
    setLocating(true);
    setLocationError(false);
    try {
      const pos = await getCurrentPosition();
      setCoords(pos);
      const geo = await reverseGeocode(pos.lat, pos.lng);
      if (geo) {
        setLocality(geo.locality || "");
        setCountry(geo.country || "");
      }
    } catch {
      setLocationError(true);
    } finally {
      setLocating(false);
    }
  }

  /* ---------- voice (Web Speech API where available) ---------- */
  function toggleRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setRecording((r) => !r);
      return;
    }
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }
    const recog = new SpeechRecognition();
    recog.lang = t.code;
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    recog.onresult = (e) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join(" ");
      setText((prev) => (prev ? prev + " " : "") + transcript);
    };
    recog.onend = () => setRecording(false);
    recog.onerror = () => setRecording(false);
    recognitionRef.current = recog;
    recog.start();
    setRecording(true);
  }

  /* ---------- form lifecycle ---------- */
  function resetForm() {
    setText(""); setPhoto(null); setRecording(false);
  }

  function handleSubmit() {
    if (!text.trim()) return;
    setView("processing");
    setProcessingStep(0);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setProcessingStep(step);
      if (step >= PROCESS_STEPS.length) {
        clearInterval(interval);
        finalizeReport();
      }
    }, 650);
  }

  function finalizeReport() {
    const { category, urgency } = classifyText(text);
    const dateStr = new Date().toLocaleDateString(t.code, { year: "numeric", month: "long", day: "numeric" });
    const localityLabel = [locality, country].filter(Boolean).join(", ");
    const newId = `CV-${String(Math.floor(100000 + Math.random() * 899999))}`;

    const existingCluster = findCluster(cases, category, locality);
    let caseId, finalCases, joinedCluster = false, clusterCase = null;

    const letter = generateLetter(lang, {
      caseId: existingCluster ? existingCluster.id : newId,
      category, urgency,
      locationLabel: localityLabel || existingCluster?.locality || "",
      description: text.trim(), dateStr, isEscalation: false,
      memberCount: existingCluster ? existingCluster.memberCount + 1 : 1,
    });

    if (existingCluster) {
      joinedCluster = true;
      caseId = existingCluster.id;
      finalCases = cases.map((c) => {
        if (c.id !== existingCluster.id) return c;
        const newCount = c.memberCount + 1;
        const newPressure = bumpPressure(c.pressure);
        return {
          ...c, memberCount: newCount, pressure: newPressure,
          members: [...c.members.slice(0, 3), `+${Math.max(0, newCount - 3)} more`],
          lastUpdate: Date.now(),
        };
      });
      clusterCase = finalCases.find((c) => c.id === existingCluster.id);
    } else {
      caseId = newId;
      let mapXY = { x: 50, y: 50 };
      if (coords) mapXY = coordsToMapXY(coords.lat, coords.lng);
      else {
        // jitter around a default point so demo data doesn't overlap perfectly
        mapXY = { x: 30 + Math.random() * 40, y: 30 + Math.random() * 40 };
      }
      const newCase = {
        id: newId, category,
        locality: locality || "", country: country || "",
        coords: { lat: coords?.lat ?? null, lng: coords?.lng ?? null, x: mapXY.x, y: mapXY.y },
        title: { [lang]: summarize(text) },
        memberCount: 1,
        pressure: urgency === "high" ? 38 : 24,
        status: "submitted",
        createdAt: Date.now(), lastUpdate: Date.now(),
        urgency, members: [t.your_report_flag], letter, escalated: false,
        lang, description: text.trim(),
      };
      finalCases = [newCase, ...cases];
      clusterCase = newCase;
    }

    setCases(finalCases);
    setResult({
      caseId, category, urgency,
      authority: authorityFor(category, lang, localityLabel || existingCluster?.locality),
      letter, dateStr, joinedCluster, clusterCase: { ...clusterCase },
    });
    setActiveCaseId(caseId);
    setView("result");
    resetForm();
  }

  /* ---------- derived ---------- */
  const filteredCases = useMemo(() => {
    let list = cases.slice();
    if (filter !== "all") list = list.filter((c) => c.category === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) =>
        c.id.toLowerCase().includes(q) ||
        (c.locality || "").toLowerCase().includes(q) ||
        (c.country || "").toLowerCase().includes(q) ||
        Object.values(c.title || {}).some((v) => (v || "").toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => b.pressure - a.pressure);
  }, [cases, filter, search]);

  const activeCase = cases.find((c) => c.id === activeCaseId);

  function caseTitle(c) {
    return c.title?.[lang] || c.title?.en || Object.values(c.title || {})[0] || c.id;
  }

  function caseLocationLabel(c) {
    return [c.locality, c.country].filter(Boolean).join(", ") || "—";
  }

  /* ---------- copy / download letter ---------- */
  function copyLetter(text) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopyState(true);
      setTimeout(() => setCopyState(false), 1500);
    });
  }
  function downloadLetter(text, caseId) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${caseId}-complaint-letter.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ---------- shared layout ---------- */
  const primaryBtn = {
    display: "inline-flex", alignItems: "center", gap: 8, background: "var(--ink)", color: "var(--paper)",
    border: "none", padding: "13px 24px", borderRadius: 999, fontSize: 15, fontWeight: 600,
  };
  const secondaryBtn = {
    display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", color: "var(--ink)",
    border: "1.5px solid var(--ink)", padding: "13px 24px", borderRadius: 999, fontSize: 15, fontWeight: 600,
  };
  const linkBtn = {
    display: "inline-flex", alignItems: "center", gap: 4, background: "transparent", border: "none",
    color: "var(--ink)", fontWeight: 600, fontSize: 14, padding: "4px 0", borderBottom: "1.5px solid var(--ink)",
  };
  const labelStyle = { display: "block", fontSize: 13, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 };

  function navBtnStyle(active) {
    return {
      border: "none", background: active ? "var(--ink)" : "transparent",
      color: active ? "var(--paper)" : "var(--ink)",
      fontSize: 13.5, fontWeight: 600, padding: "8px 14px", borderRadius: 999,
    };
  }

  const Header = (
    <header style={{
      position: "sticky", top: 0, zIndex: 30, background: "var(--paper)",
      borderBottom: "1px solid var(--line)", padding: "14px 20px",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setView("home")}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Stamp size={20} color="var(--paper)" />
        </div>
        <span className="serif" style={{ fontSize: 21, fontWeight: 700 }}>{t.appName}</span>
      </div>
      <nav style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <button onClick={() => setView("report")} style={navBtnStyle(view === "report")}>{t.nav_report}</button>
        <button onClick={() => setView("dashboard")} style={navBtnStyle(view === "dashboard")}>{t.nav_dashboard}</button>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginInlineStart: 8, padding: "4px 6px", border: "1px solid var(--line)", borderRadius: 999, flexWrap: "wrap" }}>
          <Globe size={15} color="var(--ink-soft)" />
          {LANG_CODES.map((code) => (
            <button key={code} onClick={() => setLang(code)} style={{
              border: "none", background: lang === code ? "var(--ink)" : "transparent",
              color: lang === code ? "var(--paper)" : "var(--ink-soft)",
              fontSize: 12, fontWeight: 600, padding: "4px 8px", borderRadius: 999,
            }}>{code.toUpperCase()}</button>
          ))}
        </div>
      </nav>
    </header>
  );

  /* ---------- HOME ---------- */
  function Home() {
    return (
      <div>
        <section style={{ padding: "64px 20px 48px", maxWidth: 980, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
            <CaseStamp id="No. 00001" label={t.stamp_filed} />
          </div>
          <h1 className="serif" style={{ fontSize: "clamp(28px,5vw,48px)", lineHeight: 1.15, fontWeight: 700, margin: "0 0 18px" }}>
            {t.hero_title}
          </h1>
          <p style={{ fontSize: 17, color: "var(--ink-soft)", maxWidth: 620, margin: "0 auto 32px", lineHeight: 1.6 }}>
            {t.hero_sub}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => setView("report")} style={primaryBtn}>
              <FileText size={17} /> {t.cta_start}
            </button>
            <button onClick={() => setView("dashboard")} style={secondaryBtn}>
              <MapPin size={17} /> {t.cta_map}
            </button>
          </div>
        </section>

        <section style={{ borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", background: "var(--paper-deep)" }}>
          <div style={{ maxWidth: 980, margin: "0 auto", padding: "36px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 28 }}>
            {[
              { icon: Mic, title: t.label_voice.replace("Or ", "").replace("Ou ", "").replace("أو ", ""), body: t.hero_sub.split(".")[0] + "." },
              { icon: Stamp, title: t.result_letter, body: t.expect_text.split(".")[0] + "." },
              { icon: Users, title: t.cluster_score, body: t.cluster_sub },
            ].map((f, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <f.icon size={24} color="var(--signal)" />
                <div className="serif" style={{ fontWeight: 700, fontSize: 17 }}>{f.title}</div>
                <div style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.55 }}>{f.body}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ maxWidth: 980, margin: "0 auto", padding: "44px 20px 64px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
            <h2 className="serif" style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{t.cases_title}</h2>
            <button onClick={() => setView("dashboard")} style={linkBtn}>{t.dashboard_title} <ChevronRight size={15} style={dir === "rtl" ? { transform: "rotate(180deg)" } : {}} /></button>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {filteredCases.slice(0, 3).map((c) => <CaseCard key={c.id} c={c} />)}
          </div>
        </section>
      </div>
    );
  }

  /* ---------- CASE CARD ---------- */
  function CaseCard({ c }) {
    const Icon = CATEGORIES[c.category].icon;
    const color = CATEGORIES[c.category].color;
    const daysOpen = Math.floor((Date.now() - c.createdAt) / DAY);
    return (
      <div onClick={() => { setActiveCaseId(c.id); setView("case"); }}
        style={{
          display: "flex", gap: 14, alignItems: "center", background: "#fff", border: "1px solid var(--line)",
          borderRadius: 14, padding: 16, cursor: "pointer", transition: "box-shadow .15s",
        }}
        onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 4px 16px rgba(27,42,74,0.08)"}
        onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}
      >
        <div style={{ width: 44, height: 44, borderRadius: 10, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={20} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
            <Pill color={color}>{t[CATEGORIES[c.category].labelKey]}</Pill>
            <span style={{ fontSize: 12, color: "#9a9384" }}>{c.id}</span>
            <span style={{ fontSize: 12, color: "#9a9384" }}>· {caseLocationLabel(c)}</span>
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.4, marginBottom: 6 }}>{caseTitle(c)}</div>
          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--ink-soft)" }}>
              <Users size={13} /> {c.memberCount} {t.reports_count}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--ink-soft)" }}>
              <Clock size={13} /> {daysOpen} {t.days_open}
            </div>
            <div style={{ flex: 1, minWidth: 90, maxWidth: 160 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9a9384", marginBottom: 2 }}>
                <span>{t.pressure}</span><span>{c.pressure}</span>
              </div>
              <PressureBar score={c.pressure} />
            </div>
          </div>
        </div>
        <ChevronRight size={18} color="#9a9384" style={dir === "rtl" ? { transform: "rotate(180deg)" } : {}} />
      </div>
    );
  }

  /* ---------- REPORT FORM ---------- */
  function ReportForm() {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px 80px" }}>
        <h1 className="serif" style={{ fontSize: 30, fontWeight: 700, marginBottom: 6 }}>{t.form_title}</h1>
        <p style={{ color: "var(--ink-soft)", marginBottom: 28, lineHeight: 1.6 }}>{t.form_sub}</p>

        <label style={labelStyle}>{t.label_text}</label>
        <textarea
          value={text} onChange={(e) => setText(e.target.value)} placeholder={t.placeholder_text}
          rows={5} dir="auto"
          style={{ width: "100%", padding: 14, borderRadius: 12, border: "1.5px solid var(--line)", background: "#fff", fontSize: 15, lineHeight: 1.6, resize: "vertical", marginBottom: 20 }}
        />

        <label style={labelStyle}>{t.label_voice}</label>
        <button onClick={toggleRecording} style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "13px 16px",
          borderRadius: 12, border: `1.5px solid ${recording ? "var(--signal)" : "var(--line)"}`,
          background: recording ? "var(--signal)10" : "#fff", marginBottom: 20, fontSize: 14.5, fontWeight: 600,
          color: recording ? "var(--signal)" : "var(--ink)",
        }}>
          {recording ? <span className="pulse-dot" style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--signal)" }} /> : <Mic size={18} />}
          {recording ? t.recording : t.record_start}
        </button>

        <label style={labelStyle}>{t.label_photo}</label>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={(e) => setPhoto(e.target.files?.[0] ? URL.createObjectURL(e.target.files[0]) : null)} />
        {!photo ? (
          <button onClick={() => fileRef.current?.click()} style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "13px 16px",
            borderRadius: 12, border: "1.5px solid var(--line)", background: "#fff", marginBottom: 20, fontSize: 14.5, fontWeight: 600,
          }}>
            <Camera size={18} /> {t.upload_photo}
          </button>
        ) : (
          <div style={{ marginBottom: 20 }}>
            <img src={photo} alt="preview" style={{ width: "100%", borderRadius: 12, maxHeight: 220, objectFit: "cover", marginBottom: 8 }} />
            <button onClick={() => setPhoto(null)} style={{ ...linkBtn, fontSize: 13, color: "var(--signal)", borderColor: "var(--signal)" }}>
              <X size={14} /> {t.remove_photo}
            </button>
          </div>
        )}

        <label style={labelStyle}>{t.label_location}</label>
        <button onClick={handleUseLocation} disabled={locating} style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "13px 16px",
          borderRadius: 12, border: "1.5px solid var(--line)", background: "#fff", marginBottom: 10, fontSize: 14.5, fontWeight: 600,
          opacity: locating ? 0.6 : 1,
        }}>
          {locating ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <MapPin size={18} />}
          {locating ? t.locating : t.use_location}
        </button>
        {locationError && <div style={{ fontSize: 12.5, color: "var(--signal)", marginBottom: 10 }}>{t.location_denied}</div>}
        {coords && !locationError && (
          <div style={{ fontSize: 12.5, color: "var(--sage)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <CheckCircle2 size={14} /> {t.location_set}: {coords.lat.toFixed(3)}, {coords.lng.toFixed(3)}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }} className="grid-2">
          <div>
            <label style={labelStyle}>{t.label_area}</label>
            <input
              value={locality} onChange={(e) => setLocality(e.target.value)}
              placeholder={t.placeholder_area} list="neighborhood-suggestions" dir="auto"
              style={{ width: "100%", padding: "13px 14px", borderRadius: 12, border: "1.5px solid var(--line)", background: "#fff", fontSize: 14.5 }}
            />
            <datalist id="neighborhood-suggestions">
              {NEIGHBORHOOD_DEFAULTS.map((n) => <option key={n} value={n} />)}
            </datalist>
          </div>
          <div>
            <label style={labelStyle}>{t.label_country}</label>
            <input
              value={country} onChange={(e) => setCountry(e.target.value)}
              placeholder="—" dir="auto"
              style={{ width: "100%", padding: "13px 14px", borderRadius: 12, border: "1.5px solid var(--line)", background: "#fff", fontSize: 14.5 }}
            />
          </div>
        </div>

        <button onClick={handleSubmit} disabled={!text.trim()} style={{
          ...primaryBtn, width: "100%", justifyContent: "center", padding: "15px 24px", fontSize: 16,
          opacity: text.trim() ? 1 : 0.45, cursor: text.trim() ? "pointer" : "not-allowed",
        }}>
          <Send size={18} /> {t.submit}
        </button>
        <p style={{ fontSize: 12, color: "#9a9384", textAlign: "center", marginTop: 14 }}>{t.privacy_note}</p>
      </div>
    );
  }

  /* ---------- PROCESSING ---------- */
  function Processing() {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
        <Loader2 size={40} color="var(--ink)" style={{ animation: "spin 1.2s linear infinite" }} />
        <h2 className="serif" style={{ fontSize: 24, fontWeight: 700, margin: "20px 0 6px" }}>{t.classify_title}</h2>
        <p style={{ color: "var(--ink-soft)", marginBottom: 32 }}>{t.classify_sub}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: dir === "rtl" ? "right" : "left" }}>
          {PROCESS_STEPS.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, opacity: i <= processingStep ? 1 : 0.35 }}>
              {i < processingStep ? <CheckCircle2 size={18} color="var(--sage)" /> : i === processingStep ? <Loader2 size={18} color="var(--ink)" style={{ animation: "spin 1s linear infinite" }} /> : <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid var(--line)" }} />}
              <span style={{ fontSize: 14.5, fontWeight: i === processingStep ? 700 : 500 }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ---------- RESULT ---------- */
  function Result() {
    if (!result) return null;
    const Icon = CATEGORIES[result.category].icon;
    const color = CATEGORIES[result.category].color;
    return (
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 20px 80px" }}>
        <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 28, flexWrap: "wrap" }}>
          <CaseStamp id={result.caseId} label={t.stamp_received} />
          <div>
            <h1 className="serif" style={{ fontSize: 26, fontWeight: 700, margin: "0 0 6px" }}>{t.result_title}</h1>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Pill color={color}><Icon size={13} /> {t[CATEGORIES[result.category].labelKey]}</Pill>
              <Pill color={result.urgency === "high" ? "var(--signal)" : "var(--ochre)"}>
                {t.result_urgency}: {result.urgency === "high" ? t.severity_high : t.severity_medium}
              </Pill>
            </div>
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: 20, marginBottom: 16 }}>
          <Row label={t.result_case} value={result.caseId} dir={dir} />
          <Row label={t.result_sent_to} value={result.authority} dir={dir} />
          <Row label={t.result_category} value={t[CATEGORIES[result.category].labelKey]} dir={dir} last />
        </div>

        {result.joinedCluster && (
          <div style={{ background: "var(--ochre)" + "15", border: "1px solid var(--ochre)50", borderRadius: 14, padding: 18, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
              <Users size={20} color="var(--ochre)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div className="serif" style={{ fontWeight: 700, fontSize: 16 }}>{t.cluster_title}</div>
                <div style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 4, lineHeight: 1.5 }}>
                  <strong>{result.clusterCase.memberCount}</strong> {t.cluster_sub}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-soft)", marginBottom: 4 }}>
              <span>{t.cluster_score}</span><span style={{ fontWeight: 700 }}>{result.clusterCase.pressure}/100</span>
            </div>
            <PressureBar score={result.clusterCase.pressure} />
          </div>
        )}

        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: 20, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileText size={18} color="var(--ink)" />
              <span className="serif" style={{ fontWeight: 700, fontSize: 16 }}>{t.result_letter}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => copyLetter(result.letter)} style={{ ...linkBtn, fontSize: 12.5 }}>
                <Copy size={13} /> {copyState ? t.copied : t.copy_letter}
              </button>
              <button onClick={() => downloadLetter(result.letter, result.caseId)} style={{ ...linkBtn, fontSize: 12.5 }}>
                <Download size={13} /> {t.download_letter}
              </button>
            </div>
          </div>
          <pre style={{
            whiteSpace: "pre-wrap", fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 13.5, lineHeight: 1.7,
            background: "var(--paper-deep)", padding: 16, borderRadius: 10, border: "1px solid var(--line)",
            maxHeight: 320, overflow: "auto", margin: 0,
          }} className="scrollbar-thin" dir="auto">{result.letter}</pre>
        </div>

        <div style={{ background: "var(--sage)" + "12", border: "1px solid var(--sage)40", borderRadius: 14, padding: 18, marginBottom: 28 }}>
          <div className="serif" style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: "var(--sage)" }}>{t.result_expect}</div>
          <div style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.6 }}>{t.expect_text}</div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button onClick={() => { setActiveCaseId(result.caseId); setView("case"); }} style={primaryBtn}><Eye size={17} /> {t.view_case}</button>
          <button onClick={() => { setResult(null); setView("report"); }} style={secondaryBtn}>{t.new_report}</button>
        </div>
      </div>
    );
  }

  function Row({ label, value, last, dir }) {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "10px 0", borderBottom: last ? "none" : "1px solid var(--line)" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#9a9384", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 600, textAlign: dir === "rtl" ? "left" : "right" }}>{value}</span>
      </div>
    );
  }

  /* ---------- DASHBOARD / HEATMAP ---------- */
  function Dashboard() {
    const visible = filteredCases;
    const usingRealCoords = visible.some((c) => c.coords?.lat != null);
    return (
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 20px 80px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 className="serif" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>{t.dashboard_title}</h1>
            <p style={{ color: "var(--ink-soft)", marginBottom: 0, lineHeight: 1.6, maxWidth: 520 }}>{t.dashboard_sub}</p>
          </div>
          <button onClick={() => { if (window.confirm("Reset demo data? This clears all locally stored reports.")) setCases(resetCases()); }}
            style={{ ...linkBtn, fontSize: 12.5, color: "#9a9384", borderColor: "#dcd4c4" }}>
            <RefreshCw size={13} /> Reset demo data
          </button>
        </div>

        <div style={{ position: "relative", margin: "20px 0 16px" }}>
          <Search size={16} color="#9a9384" style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.search_placeholder}
            style={{
              width: "100%", padding: "12px 14px", paddingInlineStart: 38, borderRadius: 999, border: "1.5px solid var(--line)",
              background: "#fff", fontSize: 14,
            }} />
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>{t.filter_all}</FilterChip>
          {CATEGORY_KEYS.map((key) => (
            <FilterChip key={key} active={filter === key} onClick={() => setFilter(key)} color={CATEGORIES[key].color}>{t[CATEGORIES[key].labelKey]}</FilterChip>
          ))}
        </div>

        <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 24, marginBottom: 32, alignItems: "start" }}>
          <div style={{ background: "var(--ink)", borderRadius: 16, padding: 16, position: "relative", aspectRatio: "1.4 / 1", overflow: "hidden", minWidth: 0 }}>
            <svg viewBox="0 0 100 80" style={{ width: "100%", height: "100%", display: "block" }}>
              <defs>
                <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
                  <path d="M 8 0 L 0 0 0 8" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                </pattern>
                {CATEGORY_KEYS.map((key) => (
                  <radialGradient key={key} id={`grad-${key}`}>
                    <stop offset="0%" stopColor={CATEGORIES[key].color} stopOpacity="0.9" />
                    <stop offset="100%" stopColor={CATEGORIES[key].color} stopOpacity="0" />
                  </radialGradient>
                ))}
              </defs>
              <rect width="100" height="80" fill="url(#grid)" />
              {visible.map((c) => {
                const xy = c.coords?.lat != null ? coordsToMapXY(c.coords.lat, c.coords.lng) : { x: c.coords?.x ?? 50, y: ((c.coords?.y ?? 50) / 100) * 80 };
                const x = c.coords?.lat != null ? xy.x : (c.coords?.x ?? 50);
                const y = c.coords?.lat != null ? xy.y : (((c.coords?.y ?? 50) / 100) * 80);
                return (
                  <g key={c.id}>
                    <circle cx={x} cy={y} r={2 + c.pressure / 12} fill={`url(#grad-${c.category})`} />
                    <circle cx={x} cy={y} r={1.4} fill={CATEGORIES[c.category].color} stroke="#fff" strokeWidth="0.4"
                      style={{ cursor: "pointer" }}
                      onClick={() => { setActiveCaseId(c.id); setView("case"); }} />
                  </g>
                );
              })}
            </svg>
            <div style={{ position: "absolute", bottom: 12, insetInlineStart: 16, display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.7)", fontSize: 11, flexWrap: "wrap" }}>
              <span>{t.map_legend}:</span>
              <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "var(--sage)" }} /> {"<55"}
              <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "var(--ochre)" }} /> 55–80
              <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "var(--signal)" }} /> {">80"}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 420, overflow: "auto" }} className="scrollbar-thin">
            {visible.length === 0 && (
              <div style={{ color: "#9a9384", fontSize: 14, padding: 20, textAlign: "center", border: "1px dashed var(--line)", borderRadius: 12 }}>
                <div className="serif" style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, color: "var(--ink)" }}>{t.empty_state_title}</div>
                {t.empty_state_body}
              </div>
            )}
            {visible.map((c) => <CaseCard key={c.id} c={c} />)}
          </div>
        </div>
      </div>
    );
  }

  function FilterChip({ active, children, onClick, color }) {
    return (
      <button onClick={onClick} style={{
        border: `1.5px solid ${active ? (color || "var(--ink)") : "var(--line)"}`,
        background: active ? (color || "var(--ink)") + "15" : "#fff",
        color: active ? (color || "var(--ink)") : "var(--ink-soft)",
        fontSize: 13, fontWeight: 600, padding: "7px 14px", borderRadius: 999,
      }}>{children}</button>
    );
  }

  /* ---------- CASE DETAIL ---------- */
  function CaseDetail() {
    if (!activeCase) {
      return (
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "60px 20px", textAlign: "center", color: "#9a9384" }}>
          <button onClick={() => setView("dashboard")} style={{ ...linkBtn, marginBottom: 20 }}>{t.back_home}</button>
          <div>{t.no_results}</div>
        </div>
      );
    }
    const c = activeCase;
    const Icon = CATEGORIES[c.category].icon;
    const color = CATEGORIES[c.category].color;
    const daysOpen = Math.floor((Date.now() - c.createdAt) / DAY);
    const dateStr = new Date(c.createdAt).toLocaleDateString(t.code, { year: "numeric", month: "long", day: "numeric" });
    const localityLabel = caseLocationLabel(c) === "—" ? "" : caseLocationLabel(c);

    const letterText = c.letter || generateLetter(lang, {
      caseId: c.id, category: c.category, urgency: c.urgency, locationLabel: localityLabel,
      description: c.description || caseTitle(c), dateStr, isEscalation: false, memberCount: c.memberCount,
    });
    const escalationText = generateLetter(lang, {
      caseId: c.id, category: c.category, urgency: c.urgency, locationLabel: localityLabel,
      description: c.description || caseTitle(c), dateStr, isEscalation: true, daysOpen, memberCount: c.memberCount,
    });

    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px 80px" }}>
        <button onClick={() => setView("dashboard")} style={{ ...linkBtn, marginBottom: 20, border: "none" }}>
          <ChevronRight size={15} style={dir !== "rtl" ? { transform: "rotate(180deg)" } : {}} /> {t.back_home}
        </button>

        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon size={24} color={color} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              <Pill color={color}>{t[CATEGORIES[c.category].labelKey]}</Pill>
              <span style={{ fontSize: 12, color: "#9a9384", alignSelf: "center" }}>{c.id} · {caseLocationLabel(c)}</span>
            </div>
            <h1 className="serif" style={{ fontSize: 22, fontWeight: 700, margin: 0, lineHeight: 1.35 }}>{caseTitle(c)}</h1>
          </div>
          <CaseStamp id={c.id} label={t[STATUS_KEYS[c.status]] || ""} small />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 24 }}>
          <Stat label={t.reports_count} value={c.memberCount} icon={Users} />
          <Stat label={t.cluster_score} value={`${c.pressure}/100`} icon={ShieldAlert} />
          <Stat label={t.days_open} value={daysOpen} icon={Clock} />
        </div>

        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: 20, marginBottom: 16 }}>
          <div className="serif" style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>{t.timeline_title}</div>
          <Timeline status={c.status} t={t} createdAt={c.createdAt} escalated={c.escalated}
            onViewEscalation={() => setLetterModal({ text: escalationText, title: t.escalation_title, caseId: c.id })} />
        </div>

        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: 20, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <span className="serif" style={{ fontWeight: 700, fontSize: 16 }}>{t.result_letter}</span>
            <button onClick={() => setLetterModal({ text: letterText, title: t.result_letter, caseId: c.id })} style={{ ...linkBtn, fontSize: 13 }}>{t.view_letter}</button>
          </div>
          <div style={{ fontSize: 12.5, color: "#9a9384" }}>{authorityFor(c.category, lang, localityLabel)}</div>
        </div>

        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: 20 }}>
          <div className="serif" style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>{t.members_title}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {c.members.map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--paper-deep)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--ink-soft)" }}>
                  {m.startsWith("+") ? <Users size={13} /> : m[0]}
                </div>
                <span style={{ color: m === t.your_report_flag ? "var(--signal)" : "var(--ink)", fontWeight: m === t.your_report_flag ? 700 : 500 }}>{m}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function Stat({ label, value, icon: I }) {
    return (
      <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#9a9384", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
          <I size={13} /> {label}
        </div>
        <div className="serif" style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      </div>
    );
  }

  /* ---------- LETTER MODAL ---------- */
  function LetterModal() {
    if (!letterModal) return null;
    return (
      <div onClick={() => setLetterModal(null)} style={{
        position: "fixed", inset: 0, background: "rgba(27,42,74,0.5)", display: "flex",
        alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20,
      }}>
        <div onClick={(e) => e.stopPropagation()} style={{
          background: "var(--paper)", borderRadius: 16, maxWidth: 620, width: "100%", maxHeight: "85vh",
          display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid var(--line)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--line)", flexWrap: "wrap", gap: 8 }}>
            <span className="serif" style={{ fontWeight: 700, fontSize: 17 }}>{letterModal.title}</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={() => copyLetter(letterModal.text)} style={{ ...linkBtn, fontSize: 12.5 }}>
                <Copy size={13} /> {copyState ? t.copied : t.copy_letter}
              </button>
              <button onClick={() => downloadLetter(letterModal.text, letterModal.caseId)} style={{ ...linkBtn, fontSize: 12.5 }}>
                <Download size={13} /> {t.download_letter}
              </button>
              <button onClick={() => setLetterModal(null)} style={{ border: "none", background: "transparent" }}><X size={20} /></button>
            </div>
          </div>
          <pre className="scrollbar-thin" dir="auto" style={{
            whiteSpace: "pre-wrap", fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 14, lineHeight: 1.8,
            padding: 24, margin: 0, overflow: "auto",
          }}>{letterModal.text}</pre>
        </div>
      </div>
    );
  }

  /* ---------- RENDER ---------- */
  return (
    <div className="civicai" dir={dir}>
      <GlobalStyle />
      {Header}
      {view === "home" && <Home />}
      {view === "report" && <ReportForm />}
      {view === "processing" && <Processing />}
      {view === "result" && <Result />}
      {view === "dashboard" && <Dashboard />}
      {view === "case" && <CaseDetail />}
      <LetterModal />
      <footer style={{ borderTop: "1px solid var(--line)", padding: "24px 20px", textAlign: "center", fontSize: 12.5, color: "#9a9384" }}>
        {t.appName} — {t.tagline}
      </footer>
    </div>
  );
}
