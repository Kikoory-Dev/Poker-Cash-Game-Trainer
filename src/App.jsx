import { useState, useEffect, useRef } from "react";
import questionsData from "./data/questions.json";

const RED = new Set(["♥","♦"]);

function Card({ rank, suit }) {
  const col = RED.has(suit) ? "#d63031" : "#1a1a2e";
  return (
    <div style={{
      width:58, height:80, borderRadius:12,
      background:"#faf8f2", border:"1.5px solid #ddd8cc",
      boxShadow:"0 4px 12px rgba(0,0,0,0.28)",
      position:"relative", flexShrink:0,
      display:"flex", alignItems:"center", justifyContent:"center"
    }}>
      <span style={{position:"absolute",top:4,left:5,fontSize:18,fontWeight:800,color:col,lineHeight:1,fontFamily:"Georgia,serif"}}>{rank}</span>
      <span style={{fontSize:28,color:col,lineHeight:1}}>{suit}</span>
    </div>
  );
}

const CAT_COLOR = {
  "Open Raise":  "#4caf7d",
  "3-Bet Value": "#9b7fe8",
  "Cold-Call":   "#5ba8d4",
  "ISO Raise":   "#e8a84c",
  "Squeeze":     "#f07850",
  "vs 3-Bet":    "#e84c8a",
};
const DIFF_COLOR = { easy:"#4caf7d", medium:"#e8a84c", hard:"#e87070" };
const POS_COLOR  = { UTG:"#e87070", MP:"#e8a84c", CO:"#4caf7d", BTN:"#5ba8d4", SB:"#9b7fe8", BB:"#f07850" };

const ALL_POSITIONS  = ["UTG","MP","CO","BTN","SB","BB"];
const ALL_SCENARIOS  = ["RFI","Facing a raise","Facing raise + caller","Limper(s)"];
const ALL_ACTIONS    = [...new Set(questionsData.map(q => q.action_type))].sort();
const ALL_CATEGORIES = [...new Set(questionsData.map(q => q.category))];
const ALL_DIFFS      = ["easy","medium","hard"];

function loadProgress() {
  try { return JSON.parse(localStorage.getItem("pct_l1v4")||"{}"); } catch { return {}; }
}
function saveProgress(p) {
  try { localStorage.setItem("pct_l1v4", JSON.stringify(p)); } catch {} }

// ── FILTER CHIP ──────────────────────────────
function Chip({ label, active, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      height:34, padding:"0 14px",
      borderRadius:8,
      fontSize:13, fontWeight: active ? 700 : 500,
      cursor:"pointer",
      border:`1px solid ${active ? color : "#23263a"}`,
      background: active ? color : "#13151f",
      color: active ? "#0a0c14" : "#6b7080",
      whiteSpace:"nowrap",
      fontFamily:"'Inter',sans-serif",
      letterSpacing: active ? "0.01em" : 0,
      transition:"all .12s",
      WebkitTapHighlightColor:"transparent",
      flexShrink:0,
    }}>{label}</button>
  );
}

// ── FILTER ROW ───────────────────────────────
function FilterRow({ label, options, selected, onToggle, getColor }) {
  return (
    <div style={{marginBottom:20}}>
      <div style={{
        fontSize:11, fontWeight:700, color:"#3d4155",
        letterSpacing:"0.12em", textTransform:"uppercase",
        marginBottom:8,
      }}>{label}</div>
      <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:2,
        msOverflowStyle:"none", scrollbarWidth:"none"}}>
        <Chip label="All" active={selected.length===0} color="#e8a84c" onClick={()=>onToggle("__all__")}/>
        {options.map(o=>(
          <Chip key={o} label={o}
            active={selected.includes(o)}
            color={getColor ? getColor(o) : "#e8a84c"}
            onClick={()=>onToggle(o)}/>
        ))}
      </div>
    </div>
  );
}

// ── STAT CARD ────────────────────────────────
function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background:"#13151f", borderRadius:12,
      padding:"14px 12px", border:"1px solid #1e2130",
      display:"flex", flexDirection:"column", gap:2,
    }}>
      <div style={{fontSize:11,fontWeight:700,color:"#3d4155",
        letterSpacing:"0.1em",textTransform:"uppercase"}}>{label}</div>
      <div style={{fontSize:26,fontWeight:800,color:color||"#e8e4d8",
        fontFamily:"'Inter',sans-serif",lineHeight:1.1}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:"#3d4155"}}>{sub}</div>}
    </div>
  );
}

export default function App() {
  const [screen, setScreen]     = useState("home");
  const [progress, setProgress] = useState(loadProgress);
  const [posF,  setPosF]  = useState([]);
  const [scenF, setScenF] = useState([]);
  const [actF,  setActF]  = useState([]);
  const [catF,  setCatF]  = useState([]);
  const [difF,  setDifF]  = useState([]);
  const [queue, setQueue]       = useState([]);
  const [idx, setIdx]           = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [session, setSession]   = useState({correct:0,wrong:0});
  const [streak, setStreak]     = useState(0);
  const scrollRef = useRef(null);

  useEffect(()=>saveProgress(progress),[progress]);

  function toggle(setter, current, val) {
    if(val==="__all__"){setter([]);return;}
    setter(current.includes(val)?current.filter(x=>x!==val):[...current,val]);
  }

  const filtered = questionsData.filter(q=>
    (posF.length===0||posF.includes(q.my_position))&&
    (scenF.length===0||scenF.includes(q.scenario))&&
    (actF.length===0||actF.includes(q.action_type))&&
    (catF.length===0||catF.includes(q.category))&&
    (difF.length===0||difF.includes(q.difficulty))
  );

  const totalAttempts = Object.values(progress).reduce((a,p)=>a+p.seen,0);
  const totalCorrect  = Object.values(progress).reduce((a,p)=>a+p.correct,0);
  const accuracy      = totalAttempts>0 ? Math.round(totalCorrect/totalAttempts*100) : 0;
  const attempted     = Object.keys(progress).length;

  function startSession() {
    if(!filtered.length)return;
    setQueue([...filtered].sort(()=>Math.random()-0.5));
    setIdx(0);setSelected(null);setRevealed(false);
    setSession({correct:0,wrong:0});setStreak(0);
    setScreen("quiz");
  }

  function choose(i) {
    if(revealed)return;
    setSelected(i);setRevealed(true);
    const q=queue[idx];const ok=i===q.correct;
    setStreak(s=>ok?s+1:0);
    setSession(s=>({correct:s.correct+(ok?1:0),wrong:s.wrong+(ok?0:1)}));
    const prev=progress[q.id]||{seen:0,correct:0};
    setProgress(p=>({...p,[q.id]:{seen:prev.seen+1,correct:prev.correct+(ok?1:0)}}));
    setTimeout(()=>scrollRef.current?.scrollTo({top:0,behavior:"smooth"}),80);
  }

  function next() {
    if(idx+1>=queue.length){setScreen("result");return;}
    setIdx(i=>i+1);setSelected(null);setRevealed(false);
    scrollRef.current?.scrollTo({top:0,behavior:"instant"});
  }

  const q=queue[idx];
  const accent=q?(CAT_COLOR[q.category]||"#888"):"#888";

  // ── HOME ─────────────────────────────────────────────────────────────
  if(screen==="home") return (
    <div style={{
      minHeight:"100vh", background:"#0a0c14",
      fontFamily:"'Inter','SF Pro Display',sans-serif",
      color:"#e8e4d8",
      paddingTop:"env(safe-area-inset-top,0px)",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}
        ::-webkit-scrollbar{display:none;}
      `}</style>

      <div style={{maxWidth:480,margin:"0 auto",padding:"24px 20px 140px"}}>

        {/* ── Top bar ── */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:28}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"#3d4155",
              letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:4}}>
              Level 1 · Preflop · TAG
            </div>
            <h1 style={{fontSize:30,fontWeight:900,margin:0,
              letterSpacing:"-0.03em",color:"#f0ece0",lineHeight:1}}>
              Preflop Trainer
            </h1>
          </div>
          <div style={{
            background:"#13151f",border:"1px solid #1e2130",
            borderRadius:10,padding:"6px 12px",
            fontSize:12,fontWeight:700,color:"#e8a84c",
            fontFamily:"'Inter',sans-serif",
          }}>
            {questionsData.length} Q
          </div>
        </div>

        {/* ── Stats row ── */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:28}}>
          <StatCard label="Accuracy" value={totalAttempts>0?`${accuracy}%`:"—"} color="#e8a84c"/>
          <StatCard label="Attempted" value={attempted} sub={`of ${questionsData.length}`} color="#5ba8d4"/>
          <StatCard label="Streak" value={streak>0?`🔥${streak}`:"—"} color="#4caf7d"/>
        </div>

        {/* ── Category progress ── */}
        {totalAttempts>0&&(
          <div style={{
            background:"#13151f",borderRadius:14,
            border:"1px solid #1e2130",padding:"16px",
            marginBottom:28,
          }}>
            <div style={{fontSize:11,fontWeight:700,color:"#3d4155",
              letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:14}}>
              By Category
            </div>
            {ALL_CATEGORIES.map(cat=>{
              const cqs=questionsData.filter(q=>q.category===cat);
              const seen=cqs.reduce((a,q)=>a+(progress[q.id]?.seen||0),0);
              const corr=cqs.reduce((a,q)=>a+(progress[q.id]?.correct||0),0);
              const pct=seen>0?Math.round(corr/seen*100):null;
              const col=CAT_COLOR[cat]||"#888";
              return(
                <div key={cat} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",
                    alignItems:"center",marginBottom:5}}>
                    <span style={{fontSize:13,fontWeight:600,color:"#9098b0"}}>{cat}</span>
                    <span style={{fontSize:13,fontWeight:700,
                      color:pct!=null?col:"#2a2d3d",fontFamily:"'Inter',sans-serif"}}>
                      {pct!=null?`${pct}%`:"—"}
                    </span>
                  </div>
                  <div style={{height:4,background:"#1e2130",borderRadius:2,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${pct||0}%`,
                      background:col,borderRadius:2,transition:"width .5s"}}/>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Divider ── */}
        <div style={{fontSize:11,fontWeight:700,color:"#3d4155",
          letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:20}}>
          Filters
        </div>

        <FilterRow label="Position" options={ALL_POSITIONS} selected={posF}
          onToggle={v=>toggle(setPosF,posF,v)} getColor={p=>POS_COLOR[p]||"#888"}/>

        <FilterRow label="Scenario" options={ALL_SCENARIOS} selected={scenF}
          onToggle={v=>toggle(setScenF,scenF,v)} getColor={()=>"#5ba8d4"}/>

        <FilterRow label="Action Type" options={ALL_ACTIONS} selected={actF}
          onToggle={v=>toggle(setActF,actF,v)}
          getColor={a=>a==="Fold"?"#e87070":a==="Call"?"#5ba8d4":"#4caf7d"}/>

        <FilterRow label="Category" options={ALL_CATEGORIES} selected={catF}
          onToggle={v=>toggle(setCatF,catF,v)} getColor={c=>CAT_COLOR[c]||"#888"}/>

        <FilterRow label="Difficulty" options={ALL_DIFFS} selected={difF}
          onToggle={v=>toggle(setDifF,difF,v)} getColor={d=>DIFF_COLOR[d]}/>

      </div>

      {/* ── Sticky footer ── */}
      <div style={{
        position:"fixed",bottom:0,left:0,right:0,
        background:"linear-gradient(transparent,#0a0c14 28%,#0a0c14)",
        padding:"20px 20px",
        paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 16px)",
      }}>
        <button onClick={startSession} disabled={!filtered.length} style={{
          width:"100%",height:56,borderRadius:14,
          background:filtered.length
            ?"linear-gradient(135deg,#e8a84c 0%,#d4832a 100%)"
            :"#13151f",
          color:filtered.length?"#0a0c14":"#3d4155",
          fontSize:16,fontWeight:800,border:"none",
          cursor:filtered.length?"pointer":"default",
          fontFamily:"'Inter',sans-serif",
          letterSpacing:"-0.01em",
          boxShadow:filtered.length?"0 6px 28px rgba(232,168,76,0.32)":"none",
          WebkitTapHighlightColor:"transparent",
          display:"flex",alignItems:"center",justifyContent:"center",gap:10,
        }}>
          {filtered.length>0?(
            <>
              <span>Start Session</span>
              <span style={{
                background:"rgba(0,0,0,0.15)",borderRadius:6,
                padding:"2px 8px",fontSize:13,fontWeight:700,
              }}>{filtered.length}</span>
            </>
          ):"No questions match filters"}
        </button>

        {totalAttempts>0&&(
          <button onClick={()=>{setProgress({});saveProgress({});}} style={{
            width:"100%",marginTop:8,height:40,borderRadius:10,
            background:"transparent",border:"1px solid #1e2130",
            color:"#3d4155",fontSize:13,fontWeight:500,cursor:"pointer",
            fontFamily:"'Inter',sans-serif",
            WebkitTapHighlightColor:"transparent",
          }}>Reset progress</button>
        )}
      </div>
    </div>
  );

  // ── QUIZ ─────────────────────────────────────────────────────────────
  if(screen==="quiz"&&q){
    const cards=q.hand.map(c=>({rank:c.slice(0,-1),suit:c.slice(-1)}));
    const ok=selected===q.correct;

    return(
      <div style={{
        position:"fixed",inset:0,
        background:"#0a0c14",color:"#e8e4d8",
        fontFamily:"'Inter','SF Pro Display',sans-serif",
        display:"flex",flexDirection:"column",
        paddingTop:"env(safe-area-inset-top,0px)",
        paddingBottom:"env(safe-area-inset-bottom,0px)",
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          *{-webkit-font-smoothing:antialiased;}
          ::-webkit-scrollbar{display:none;}
        `}</style>

        {/* Header */}
        <div style={{flexShrink:0,padding:"10px 18px 8px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <button onClick={()=>setScreen("home")} style={{
              background:"#13151f",border:"1px solid #1e2130",
              borderRadius:8,padding:"6px 12px",
              color:"#6b7080",fontSize:13,fontWeight:600,cursor:"pointer",
              fontFamily:"'Inter',sans-serif",
              WebkitTapHighlightColor:"transparent",
            }}>← Home</button>

            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {streak>0&&(
                <span style={{fontSize:13,fontWeight:700,color:"#4caf7d",
                  background:"rgba(76,175,125,0.12)",padding:"4px 10px",borderRadius:6}}>
                  🔥 {streak}
                </span>
              )}
              <span style={{
                fontSize:11,fontWeight:700,color:DIFF_COLOR[q.difficulty],
                background:`${DIFF_COLOR[q.difficulty]}18`,
                padding:"4px 10px",borderRadius:6,textTransform:"capitalize",
              }}>{q.difficulty}</span>
              <span style={{
                fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:600,
                color:"#3d4155",
              }}>{idx+1}<span style={{color:"#1e2130"}}>/{queue.length}</span></span>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{height:3,background:"#13151f",borderRadius:2,overflow:"hidden"}}>
            <div style={{
              height:"100%",
              width:`${((idx+1)/queue.length)*100}%`,
              background:accent,borderRadius:2,transition:"width .25s",
            }}/>
          </div>
        </div>

        {/* Scrollable content */}
        <div ref={scrollRef} style={{
          flex:1,overflowY:"auto",
          padding:"8px 18px 24px",
          WebkitOverflowScrolling:"touch",
        }}>
          <div style={{maxWidth:480,margin:"0 auto"}}>

            {/* Badges */}
            <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:12}}>
              <span style={{
                fontSize:11,fontWeight:800,color:accent,
                background:`${accent}18`,padding:"4px 10px",
                borderRadius:6,textTransform:"uppercase",letterSpacing:"0.08em",
              }}>{q.category}</span>
              <span style={{
                fontSize:11,fontWeight:600,color:"#3d4155",
                background:"#13151f",border:"1px solid #1e2130",
                padding:"4px 10px",borderRadius:6,
              }}>{q.scenario}</span>
              <span style={{
                fontSize:11,fontWeight:700,
                color:POS_COLOR[q.my_position]||"#888",
                background:`${POS_COLOR[q.my_position]||"#888"}18`,
                padding:"4px 10px",borderRadius:6,
              }}>{q.my_position}</span>
            </div>

            {/* Range context — collapsed by default */}
            <details style={{marginBottom:12}}>
              <summary style={{
                fontSize:12,fontWeight:600,color:"#3d4155",
                cursor:"pointer",listStyle:"none",
                display:"flex",alignItems:"center",gap:6,
                background:"#13151f",padding:"9px 14px",
                borderRadius:10,border:"1px solid #1e2130",
              }}>
                <span style={{fontSize:10}}>▶</span>
                <span style={{letterSpacing:"0.08em",textTransform:"uppercase",fontSize:11}}>
                  Range Context
                </span>
              </summary>
              <div style={{
                background:"#13151f",
                padding:"12px 14px",
                borderRadius:"0 0 10px 10px",
                border:"1px solid #1e2130",borderTop:"none",
                fontSize:12,fontWeight:500,color:"#6b7080",lineHeight:1.7,
              }}>
                {q.range_context}
              </div>
            </details>

            {/* Question card */}
            <div style={{
              background:"#13151f",borderRadius:16,
              border:`1px solid ${accent}30`,
              padding:"18px",marginBottom:14,
            }}>
              {/* Position + situation */}
              <div style={{
                display:"flex",alignItems:"center",
                justifyContent:"space-between",marginBottom:14,
              }}>
                <span style={{
                  fontFamily:"'Inter',sans-serif",
                  fontSize:13,fontWeight:800,
                  color:accent,background:`${accent}18`,
                  padding:"5px 12px",borderRadius:8,
                }}>{q.position}</span>
                <span style={{
                  fontSize:12,fontWeight:500,color:"#3d4155",
                  flex:1,textAlign:"right",marginLeft:10,lineHeight:1.4,
                }}>{q.situation}</span>
              </div>

              {/* Cards */}
              <div style={{display:"flex",gap:10,marginBottom:16}}>
                {cards.map((c,i)=><Card key={i} rank={c.rank} suit={c.suit}/>)}
              </div>

              {/* Question text */}
              <p style={{
                margin:0,fontSize:17,fontWeight:700,
                color:"#f0ece0",lineHeight:1.55,
                letterSpacing:"-0.01em",
              }}>{q.question}</p>
            </div>

            {/* Options */}
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
              {q.options.map((opt,i)=>{
                let bg="#13151f",bc="#1e2130",tc="#9098b0",icon=null;
                if(revealed){
                  if(i===q.correct){bg="rgba(76,175,125,0.10)";bc="#4caf7d";tc="#7dd9a0";icon="✓";}
                  else if(i===selected){bg="rgba(232,112,112,0.10)";bc="#e87070";tc="#e87070";icon="✗";}
                  else{tc="#2a2d3d";}
                }
                return(
                  <button key={i} onClick={()=>choose(i)} disabled={revealed} style={{
                    width:"100%",minHeight:54,
                    padding:"14px 16px",borderRadius:12,
                    border:`1.5px solid ${bc}`,background:bg,color:tc,
                    fontSize:15,fontWeight:600,
                    cursor:revealed?"default":"pointer",
                    textAlign:"left",
                    fontFamily:"'Inter',sans-serif",
                    lineHeight:1.4,
                    display:"flex",alignItems:"center",
                    justifyContent:"space-between",
                    transition:"border-color .1s,background .1s",
                    outline:"none",
                    WebkitTapHighlightColor:"transparent",
                  }}>
                    <span style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                      <span style={{
                        fontSize:11,fontWeight:800,
                        color:revealed?tc:"#2a2d3d",
                        flexShrink:0,marginTop:2,
                        fontFamily:"'Inter',sans-serif",
                        letterSpacing:"0.05em",
                      }}>{String.fromCharCode(65+i)}</span>
                      <span>{opt}</span>
                    </span>
                    {icon&&(
                      <span style={{fontWeight:900,fontSize:18,flexShrink:0,marginLeft:12}}>
                        {icon}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {revealed&&(
              <div style={{
                background:ok?"rgba(76,175,125,0.07)":"rgba(232,112,112,0.07)",
                borderRadius:14,
                border:`1px solid ${ok?"rgba(76,175,125,0.2)":"rgba(232,112,112,0.2)"}`,
                padding:"16px",marginBottom:12,
              }}>
                <div style={{
                  display:"flex",alignItems:"center",gap:8,marginBottom:10,
                }}>
                  <div style={{
                    width:24,height:24,borderRadius:6,
                    background:ok?"#4caf7d":"#e87070",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:13,fontWeight:900,color:"#0a0c14",flexShrink:0,
                  }}>{ok?"✓":"✗"}</div>
                  <span style={{
                    fontSize:12,fontWeight:800,
                    color:ok?"#4caf7d":"#e87070",
                    textTransform:"uppercase",letterSpacing:"0.1em",
                  }}>{ok?"Correct":"Incorrect"}</span>
                </div>
                <p style={{
                  margin:"0 0 0",fontSize:14,fontWeight:500,
                  color:"#9098b0",lineHeight:1.7,
                }}>{q.explanation}</p>

                {!ok&&q.why_wrong&&q.why_wrong[String(selected)]&&(
                  <div style={{
                    marginTop:12,paddingTop:12,
                    borderTop:"1px solid rgba(255,255,255,0.05)",
                  }}>
                    <div style={{
                      fontSize:10,fontWeight:800,color:"#e87070",
                      letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:6,
                    }}>Why {String.fromCharCode(65+selected)} is wrong</div>
                    <p style={{
                      margin:0,fontSize:14,fontWeight:500,
                      color:"#6b7080",lineHeight:1.65,
                    }}>{q.why_wrong[String(selected)]}</p>
                  </div>
                )}
              </div>
            )}

            {/* Next */}
            {revealed&&(
              <button onClick={next} style={{
                width:"100%",height:56,borderRadius:14,
                background:"linear-gradient(135deg,#e8a84c,#d4832a)",
                color:"#0a0c14",fontSize:16,fontWeight:800,
                border:"none",cursor:"pointer",
                fontFamily:"'Inter',sans-serif",
                letterSpacing:"-0.01em",
                boxShadow:"0 6px 24px rgba(232,168,76,0.28)",
                WebkitTapHighlightColor:"transparent",
                marginBottom:4,
              }}>
                {idx+1>=queue.length?"See Results →":"Next →"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── RESULT ───────────────────────────────────────────────────────────
  if(screen==="result"){
    const total=session.correct+session.wrong;
    const acc=total>0?Math.round(session.correct/total*100):0;
    const grade=acc>=85?{l:"Excellent",c:"#4caf7d"}
               :acc>=65?{l:"Good",c:"#e8a84c"}
               :        {l:"Keep drilling",c:"#e87070"};
    return(
      <div style={{
        minHeight:"100vh",background:"#0a0c14",color:"#e8e4d8",
        fontFamily:"'Inter',sans-serif",
        display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",
        padding:"32px 24px",
        paddingTop:"calc(env(safe-area-inset-top,0px) + 32px)",
        paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 32px)",
        textAlign:"center",
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');*{-webkit-font-smoothing:antialiased;}`}</style>
        <div style={{fontSize:56,marginBottom:20}}>🃏</div>
        <div style={{fontSize:11,fontWeight:700,color:"#3d4155",
          letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>
          Session Complete
        </div>
        <h2 style={{fontSize:32,fontWeight:900,margin:"0 0 6px",letterSpacing:"-0.03em"}}>
          {acc}%
        </h2>
        <div style={{fontSize:14,fontWeight:700,color:grade.c,marginBottom:32,
          letterSpacing:"0.05em",textTransform:"uppercase"}}>
          {grade.l}
        </div>

        <div style={{
          width:"100%",maxWidth:340,
          background:"#13151f",borderRadius:16,
          border:"1px solid #1e2130",padding:"20px",
          marginBottom:20,
        }}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            {[
              {l:"Correct",v:session.correct,c:"#4caf7d"},
              {l:"Wrong",v:session.wrong,c:"#e87070"},
              {l:"Total",v:total,c:"#e8a84c"},
            ].map(s=>(
              <div key={s.l} style={{textAlign:"center"}}>
                <div style={{fontSize:24,fontWeight:800,color:s.c}}>{s.v}</div>
                <div style={{fontSize:11,fontWeight:600,color:"#3d4155",
                  textTransform:"uppercase",letterSpacing:"0.08em",marginTop:2}}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{width:"100%",maxWidth:340}}>
          <button onClick={startSession} style={{
            width:"100%",height:56,borderRadius:14,
            background:"linear-gradient(135deg,#e8a84c,#d4832a)",
            color:"#0a0c14",fontSize:16,fontWeight:800,
            border:"none",cursor:"pointer",marginBottom:10,
            fontFamily:"'Inter',sans-serif",
            boxShadow:"0 6px 24px rgba(232,168,76,0.28)",
            WebkitTapHighlightColor:"transparent",
          }}>Retry Session</button>
          <button onClick={()=>setScreen("home")} style={{
            width:"100%",height:48,borderRadius:12,
            background:"transparent",border:"1px solid #1e2130",
            color:"#6b7080",fontSize:14,fontWeight:600,cursor:"pointer",
            fontFamily:"'Inter',sans-serif",
            WebkitTapHighlightColor:"transparent",
          }}>← Back to Home</button>
        </div>
      </div>
    );
  }
  return null;
}
