import { useState, useEffect } from "react";
import questionsData from "./data/questions.json";

// ── Card display ──────────────────────────────
const RED = new Set(["♥","♦"]);
function Card({ rank, suit }) {
  const col = RED.has(suit) ? "#c0392b" : "#1a1a2e";
  return (
    <div style={{width:52,height:72,borderRadius:10,background:"#faf8f2",border:"1.5px solid #ddd8cc",
      boxShadow:"0 3px 10px rgba(0,0,0,0.25)",position:"relative",flexShrink:0,
      display:"flex",alignItems:"center",justifyContent:"center"}}>
      <span style={{position:"absolute",top:3,left:4,fontSize:17,fontWeight:800,color:col,lineHeight:1,fontFamily:"Georgia,serif"}}>{rank}</span>
      <span style={{fontSize:24,color:col,lineHeight:1}}>{suit}</span>
    </div>
  );
}

const CAT_COLOR = {
  "Open Raise":    "#4caf7d",
  "3-Bet Value":   "#9b7fe8",
  "Cold-Call":     "#5ba8d4",
  "ISO Raise":     "#e8a84c",
  "Squeeze":       "#f07850",
  "Blind Defense": "#e87070",
};
const DIFF_COLOR = { easy:"#4caf7d", medium:"#e8a84c", hard:"#e87070" };
const CATS = [...new Set(questionsData.map(q => q.category))];
const DIFFS = ["easy","medium","hard"];

function loadProgress() {
  try { return JSON.parse(localStorage.getItem("pct_l1") || "{}"); }
  catch { return {}; }
}
function saveProgress(p) {
  try { localStorage.setItem("pct_l1", JSON.stringify(p)); } catch {}
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [catFilter, setCatFilter] = useState("All");
  const [difFilter, setDifFilter] = useState("All");
  const [progress, setProgress] = useState(loadProgress);
  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [session, setSession] = useState({ correct: 0, wrong: 0 });
  const [streak, setStreak] = useState(0);

  useEffect(() => saveProgress(progress), [progress]);

  const filtered = questionsData.filter(q =>
    (catFilter === "All" || q.category === catFilter) &&
    (difFilter === "All" || q.difficulty === difFilter)
  );

  const totalAttempts = Object.values(progress).reduce((a, p) => a + p.seen, 0);
  const totalCorrect  = Object.values(progress).reduce((a, p) => a + p.correct, 0);
  const accuracy = totalAttempts > 0 ? Math.round(totalCorrect / totalAttempts * 100) : 0;

  function startSession() {
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    setQueue(shuffled);
    setIdx(0); setSelected(null); setRevealed(false);
    setSession({ correct: 0, wrong: 0 }); setStreak(0);
    setScreen("quiz");
  }

  function choose(i) {
    if (revealed) return;
    setSelected(i); setRevealed(true);
    const q = queue[idx];
    const ok = i === q.correct;
    setStreak(s => ok ? s + 1 : 0);
    setSession(s => ({ correct: s.correct + (ok ? 1 : 0), wrong: s.wrong + (ok ? 0 : 1) }));
    const prev = progress[q.id] || { seen: 0, correct: 0 };
    setProgress(p => ({ ...p, [q.id]: { seen: prev.seen + 1, correct: prev.correct + (ok ? 1 : 0) } }));
  }

  function next() {
    if (idx + 1 >= queue.length) { setScreen("result"); return; }
    setIdx(i => i + 1); setSelected(null); setRevealed(false);
  }

  const q = queue[idx];
  const accent = q ? (CAT_COLOR[q.category] || "#888") : "#888";

  // ── HOME ────────────────────────────────────
  if (screen === "home") return (
    <div style={{ minHeight:"100vh", background:"#090b0f", color:"#e8e4d8",
      fontFamily:"'Syne','DM Sans',sans-serif", padding:"20px 16px 40px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>

      <div style={{ maxWidth:480, margin:"0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
            <div style={{ width:3, height:30, background:"linear-gradient(#e8a84c,#9b7fe8)", borderRadius:2 }}/>
            <div>
              <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, margin:0, letterSpacing:-0.5 }}>
                Preflop Trainer
              </h1>
              <p style={{ color:"#555", fontSize:12, margin:0 }}>
                Level 1 · {questionsData.length} scenarios · TAG conservative ranges
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:18 }}>
          {[
            { l:"Questions", v: questionsData.length },
            { l:"Attempts",  v: totalAttempts },
            { l:"Accuracy",  v: totalAttempts > 0 ? `${accuracy}%` : "—" },
          ].map(s => (
            <div key={s.l} style={{ background:"#12151c", borderRadius:12, padding:"12px 10px",
              textAlign:"center", border:"1px solid #1c2030" }}>
              <div style={{ fontSize:20, fontWeight:700, color:"#e8a84c", fontFamily:"'Syne',sans-serif" }}>{s.v}</div>
              <div style={{ fontSize:10, color:"#444", marginTop:2, textTransform:"uppercase", letterSpacing:1 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Category filter */}
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:10, color:"#444", letterSpacing:2, textTransform:"uppercase", marginBottom:7 }}>
            Category · {filtered.length} questions
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
            {["All", ...CATS].map(c => {
              const col = c === "All" ? "#e8a84c" : (CAT_COLOR[c] || "#888");
              const on = catFilter === c;
              return (
                <button key={c} onClick={() => setCatFilter(c)} style={{
                  padding:"5px 10px", borderRadius:6,
                  border:`1px solid ${on ? col : "#1c2030"}`,
                  background: on ? `${col}22` : "transparent",
                  color: on ? col : "#555", fontSize:11, cursor:"pointer"
                }}>{c}</button>
              );
            })}
          </div>
        </div>

        {/* Difficulty filter */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:10, color:"#444", letterSpacing:2, textTransform:"uppercase", marginBottom:7 }}>Difficulty</div>
          <div style={{ display:"flex", gap:5 }}>
            {["All", ...DIFFS].map(d => {
              const col = d === "All" ? "#e8a84c" : DIFF_COLOR[d];
              const on = difFilter === d;
              return (
                <button key={d} onClick={() => setDifFilter(d)} style={{
                  padding:"5px 12px", borderRadius:6,
                  border:`1px solid ${on ? col : "#1c2030"}`,
                  background: on ? `${col}22` : "transparent",
                  color: on ? col : "#555", fontSize:11, cursor:"pointer", textTransform:"capitalize"
                }}>{d}</button>
              );
            })}
          </div>
        </div>

        <button onClick={startSession} style={{
          width:"100%", padding:"14px", borderRadius:12,
          background:"linear-gradient(135deg,#e8a84c 0%,#c97c30 100%)",
          color:"#090b0f", fontSize:15, fontWeight:700, border:"none", cursor:"pointer",
          fontFamily:"'Syne',sans-serif", boxShadow:"0 4px 24px rgba(232,168,76,0.25)", marginBottom:10
        }}>
          Start {filtered.length} questions →
        </button>

        {totalAttempts > 0 && (
          <button onClick={() => { setProgress({}); saveProgress({}); }} style={{
            width:"100%", padding:"10px", borderRadius:10, background:"transparent",
            border:"1px solid #1c2030", color:"#444", fontSize:12, cursor:"pointer", marginBottom:20
          }}>
            Reset progress
          </button>
        )}

        {/* Per-category progress */}
        {totalAttempts > 0 && (
          <div style={{ background:"#12151c", borderRadius:12, padding:14, border:"1px solid #1c2030" }}>
            <div style={{ fontSize:10, color:"#444", letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>
              Performance by category
            </div>
            {CATS.map(cat => {
              const cqs = questionsData.filter(q => q.category === cat);
              const seen = cqs.reduce((a, q) => a + (progress[q.id]?.seen || 0), 0);
              const corr = cqs.reduce((a, q) => a + (progress[q.id]?.correct || 0), 0);
              const pct = seen > 0 ? Math.round(corr / seen * 100) : null;
              const col = CAT_COLOR[cat] || "#888";
              return (
                <div key={cat} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                  <div style={{ fontSize:11, color:"#666", width:110, flexShrink:0 }}>{cat}</div>
                  <div style={{ flex:1, height:3, background:"#1c2030", borderRadius:2, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct || 0}%`, background:col, transition:"width .4s", borderRadius:2 }}/>
                  </div>
                  <div style={{ fontSize:11, color: pct != null ? col : "#333", width:32, textAlign:"right" }}>
                    {pct != null ? `${pct}%` : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ── QUIZ ────────────────────────────────────
  if (screen === "quiz" && q) {
    const cards = q.hand.map(c => ({ rank: c.slice(0, -1), suit: c.slice(-1) }));
    const ok = selected === q.correct;

    return (
      <div style={{ minHeight:"100vh", background:"#090b0f", color:"#e8e4d8",
        fontFamily:"'Syne','DM Sans',sans-serif", display:"flex", flexDirection:"column" }}>
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>

        {/* Top bar */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px 6px" }}>
          <button onClick={() => setScreen("home")} style={{
            background:"none", border:"none", color:"#555", fontSize:20, cursor:"pointer", padding:4 }}>←</button>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:12, color:"#555" }}>{idx + 1}<span style={{ color:"#2a2a2a" }}>/{queue.length}</span></span>
            <span style={{ fontSize:11, color:"#4caf7d", fontWeight:700 }}>🔥{streak}</span>
          </div>
          <span style={{ fontSize:10, color:DIFF_COLOR[q.difficulty],
            background:`${DIFF_COLOR[q.difficulty]}22`, padding:"2px 8px", borderRadius:4, textTransform:"capitalize" }}>
            {q.difficulty}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ height:2, background:"#12151c", margin:"0 16px 10px" }}>
          <div style={{ height:"100%", width:`${((idx + 1) / queue.length) * 100}%`,
            background:accent, borderRadius:2, transition:"width .3s" }}/>
        </div>

        <div style={{ flex:1, padding:"0 16px 16px", display:"flex", flexDirection:"column",
          maxWidth:480, margin:"0 auto", width:"100%" }}>

          {/* Category badge */}
          <div style={{ marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:5, height:5, borderRadius:"50%", background:accent }}/>
            <span style={{ fontSize:10, color:accent, textTransform:"uppercase", letterSpacing:2, fontWeight:600 }}>
              {q.category}
            </span>
          </div>

          {/* Scenario card */}
          <div style={{ background:"#12151c", borderRadius:14, padding:"14px",
            border:`1px solid ${accent}33`, marginBottom:12, position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:-30, right:-30, width:120, height:120,
              borderRadius:"50%", background:`${accent}15`, pointerEvents:"none" }}/>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:accent,
                background:`${accent}22`, padding:"2px 8px", borderRadius:4 }}>{q.position}</span>
              <span style={{ fontSize:11, color:"#444" }}>{q.situation}</span>
            </div>
            <div style={{ display:"flex", gap:7, marginBottom:12 }}>
              {cards.map((c, i) => <Card key={i} rank={c.rank} suit={c.suit} />)}
            </div>
            <p style={{ margin:0, fontSize:14, lineHeight:1.55, fontWeight:600, color:"#e8e4d8" }}>{q.question}</p>
          </div>

          {/* Options */}
          <div style={{ display:"flex", flexDirection:"column", gap:7, marginBottom:12 }}>
            {q.options.map((opt, i) => {
              let bc = "#1c2030", bg = "#12151c", tc = "#a0a0a0", icon = null;
              if (revealed) {
                if (i === q.correct) { bc = "#4caf7d"; bg = "rgba(76,175,125,0.1)"; tc = "#7dd9a0"; icon = "✓"; }
                else if (i === selected) { bc = "#e87070"; bg = "rgba(232,112,112,0.08)"; tc = "#e87070"; icon = "✗"; }
                else { tc = "#333"; }
              }
              return (
                <button key={i} onClick={() => choose(i)} disabled={revealed} style={{
                  width:"100%", padding:"12px 13px", borderRadius:10,
                  border:`1px solid ${bc}`, background:bg, color:tc,
                  fontSize:13, cursor: revealed ? "default" : "pointer",
                  textAlign:"left", fontFamily:"'Syne',sans-serif", lineHeight:1.4,
                  display:"flex", alignItems:"center", justifyContent:"space-between",
                  transition:"border-color .12s,background .12s", outline:"none"
                }}>
                  <span style={{ display:"flex", gap:9, alignItems:"flex-start" }}>
                    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10,
                      color: revealed ? tc : "#333", flexShrink:0, marginTop:1 }}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span>{opt}</span>
                  </span>
                  {icon && <span style={{ fontWeight:700, fontSize:15, flexShrink:0, marginLeft:8 }}>{icon}</span>}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {revealed && (
            <div style={{
              background: ok ? "rgba(76,175,125,0.07)" : "rgba(232,112,112,0.07)",
              borderRadius:12, border:`1px solid ${ok ? "#4caf7d44" : "#e8707044"}`,
              padding:13, marginBottom:11
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:7 }}>
                <span style={{ fontSize:13 }}>{ok ? "✓" : "✗"}</span>
                <span style={{ fontSize:11, fontWeight:700,
                  color: ok ? "#4caf7d" : "#e87070", textTransform:"uppercase", letterSpacing:1 }}>
                  {ok ? "Correct" : "Incorrect"}
                </span>
              </div>
              <p style={{ margin:"0 0 8px", fontSize:12, color:"#a0a0a0", lineHeight:1.6 }}>{q.explanation}</p>
              {!ok && q.why_wrong && q.why_wrong[String(selected)] && (
                <div style={{ borderTop:"1px solid #1c2030", paddingTop:8, marginTop:4 }}>
                  <div style={{ fontSize:10, color:"#e87070", letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>
                    Why option {String.fromCharCode(65 + selected)} is wrong
                  </div>
                  <p style={{ margin:0, fontSize:12, color:"#666", lineHeight:1.55 }}>
                    {q.why_wrong[String(selected)]}
                  </p>
                </div>
              )}
            </div>
          )}

          {revealed && (
            <button onClick={next} style={{
              width:"100%", padding:"13px", borderRadius:12,
              background:"linear-gradient(135deg,#e8a84c 0%,#c97c30 100%)",
              color:"#090b0f", fontSize:14, fontWeight:700, border:"none",
              cursor:"pointer", fontFamily:"'Syne',sans-serif"
            }}>
              {idx + 1 >= queue.length ? "See results →" : "Next →"}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── RESULT ──────────────────────────────────
  if (screen === "result") {
    const total = session.correct + session.wrong;
    const acc = total > 0 ? Math.round(session.correct / total * 100) : 0;
    const grade = acc >= 85 ? { l:"Excellent", c:"#4caf7d" }
                : acc >= 65 ? { l:"Good", c:"#e8a84c" }
                :              { l:"Keep drilling", c:"#e87070" };
    return (
      <div style={{ minHeight:"100vh", background:"#090b0f", color:"#e8e4d8",
        fontFamily:"'Syne',sans-serif", display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center", padding:24, textAlign:"center" }}>
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet"/>
        <div style={{ fontSize:44, marginBottom:12 }}>🃏</div>
        <h2 style={{ fontSize:26, fontWeight:800, margin:"0 0 4px" }}>Session done</h2>
        <div style={{ fontSize:12, color:grade.c, fontWeight:700, marginBottom:22,
          textTransform:"uppercase", letterSpacing:1 }}>{grade.l}</div>
        <div style={{ width:"100%", maxWidth:320 }}>
          <div style={{ background:"#12151c", borderRadius:16, padding:20, marginBottom:14, border:"1px solid #1c2030" }}>
            <div style={{ fontSize:48, fontWeight:800, color:"#e8a84c", lineHeight:1 }}>{acc}%</div>
            <div style={{ fontSize:12, color:"#555", marginTop:4 }}>
              {session.correct} correct · {session.wrong} wrong · {total} total
            </div>
            {streak > 0 && (
              <div style={{ fontSize:12, color:"#4caf7d", marginTop:5 }}>Peak streak 🔥{streak}</div>
            )}
          </div>
          <button onClick={startSession} style={{
            width:"100%", padding:"13px", borderRadius:12,
            background:"linear-gradient(135deg,#e8a84c,#c97c30)",
            color:"#090b0f", fontSize:14, fontWeight:700, border:"none", cursor:"pointer", marginBottom:8
          }}>Retry session</button>
          <button onClick={() => setScreen("home")} style={{
            width:"100%", padding:"12px", borderRadius:12, background:"transparent",
            border:"1px solid #1c2030", color:"#555", fontSize:13, cursor:"pointer"
          }}>Back to home</button>
        </div>
      </div>
    );
  }

  return null;
}
