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
  "Open Raise":    "#4caf7d",
  "3-Bet Value":   "#9b7fe8",
  "Cold-Call":     "#5ba8d4",
  "ISO Raise":     "#e8a84c",
  "Squeeze":       "#f07850",
  "Blind Defense": "#e87070",
  "vs 3-Bet":      "#e84c8a",
};
const DIFF_COLOR = { easy:"#4caf7d", medium:"#e8a84c", hard:"#e87070" };

const ALL_POSITIONS  = ["UTG","MP","CO","BTN","SB","BB"];
const ALL_SCENARIOS  = ["RFI","Facing a raise","Facing raise + caller","Limper(s)"];
const ALL_ACTIONS    = [...new Set(questionsData.map(q => q.action_type))].sort();
const ALL_CATEGORIES = [...new Set(questionsData.map(q => q.category))];
const ALL_DIFFS      = ["easy","medium","hard"];

function loadProgress() {
  try { return JSON.parse(localStorage.getItem("pct_l1v3") || "{}"); } catch { return {}; }
}
function saveProgress(p) {
  try { localStorage.setItem("pct_l1v3", JSON.stringify(p)); } catch {} }

function Pill({ label, active, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding:"6px 13px", borderRadius:20, fontSize:13, cursor:"pointer",
      border:`1.5px solid ${active ? color : "#252836"}`,
      background: active ? `${color}28` : "transparent",
      color: active ? color : "#666",
      whiteSpace:"nowrap", fontFamily:"'Syne',sans-serif",
      fontWeight: active ? 700 : 400,
      WebkitTapHighlightColor:"transparent",
    }}>{label}</button>
  );
}

function FilterSection({ label, options, selected, onToggle, getColor }) {
  return (
    <div style={{marginBottom:16}}>
      <div style={{fontSize:11,color:"#555",letterSpacing:2,textTransform:"uppercase",marginBottom:8,fontWeight:600}}>{label}</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
        <Pill label="All" active={selected.length===0} color="#e8a84c" onClick={()=>onToggle("__all__")} />
        {options.map(o=>(
          <Pill key={o} label={o} active={selected.includes(o)}
            color={getColor?getColor(o):"#e8a84c"} onClick={()=>onToggle(o)} />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen]   = useState("home");
  const [progress, setProgress] = useState(loadProgress);
  const [posF,  setPosF]  = useState([]);
  const [scenF, setScenF] = useState([]);
  const [actF,  setActF]  = useState([]);
  const [catF,  setCatF]  = useState([]);
  const [difF,  setDifF]  = useState([]);
  const [queue, setQueue]   = useState([]);
  const [idx, setIdx]       = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [session, setSession]   = useState({correct:0,wrong:0});
  const [streak, setStreak]     = useState(0);
  const scrollRef = useRef(null);

  useEffect(()=>saveProgress(progress),[progress]);

  function toggle(setter, current, val) {
    if (val==="__all__"){setter([]);return;}
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
  const accuracy = totalAttempts>0?Math.round(totalCorrect/totalAttempts*100):0;

  function startSession() {
    if(filtered.length===0)return;
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
    setTimeout(()=>scrollRef.current?.scrollTo({top:0,behavior:"smooth"}),100);
  }

  function next() {
    if(idx+1>=queue.length){setScreen("result");return;}
    setIdx(i=>i+1);setSelected(null);setRevealed(false);
    scrollRef.current?.scrollTo({top:0,behavior:"instant"});
  }

  const q = queue[idx];
  const accent = q?(CAT_COLOR[q.category]||"#888"):"#888";

  // ── HOME ──────────────────────────────────
  if(screen==="home") return (
    <div style={{minHeight:"100vh",background:"#090b0f",color:"#e8e4d8",
      fontFamily:"'Syne','DM Sans',sans-serif",
      paddingTop:"env(safe-area-inset-top,0px)"}}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <div style={{maxWidth:480,margin:"0 auto",padding:"20px 18px 120px"}}>

        {/* Header */}
        <div style={{marginBottom:24}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}>
            <div style={{width:4,height:36,background:"linear-gradient(#e8a84c,#9b7fe8)",borderRadius:3}}/>
            <div>
              <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:800,margin:0,letterSpacing:-0.5}}>Preflop Trainer</h1>
              <p style={{color:"#555",fontSize:13,margin:0}}>Level 1 · {questionsData.length} scenarios · TAG ranges</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:24}}>
          {[{l:"Questions",v:questionsData.length},{l:"Attempts",v:totalAttempts},{l:"Accuracy",v:totalAttempts>0?`${accuracy}%`:"—"}].map(s=>(
            <div key={s.l} style={{background:"#12151c",borderRadius:14,padding:"14px 10px",textAlign:"center",border:"1px solid #1c2030"}}>
              <div style={{fontSize:22,fontWeight:800,color:"#e8a84c",fontFamily:"'Syne',sans-serif"}}>{s.v}</div>
              <div style={{fontSize:11,color:"#444",marginTop:3,textTransform:"uppercase",letterSpacing:1}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <FilterSection label="My Position" options={ALL_POSITIONS} selected={posF} onToggle={v=>toggle(setPosF,posF,v)} getColor={()=>"#9b7fe8"}/>
        <FilterSection label="Scenario" options={ALL_SCENARIOS} selected={scenF} onToggle={v=>toggle(setScenF,scenF,v)} getColor={()=>"#5ba8d4"}/>
        <FilterSection label="Action Type" options={ALL_ACTIONS} selected={actF} onToggle={v=>toggle(setActF,actF,v)} getColor={a=>a==="Fold"?"#e87070":a==="Call"?"#5ba8d4":"#4caf7d"}/>
        <FilterSection label="Category" options={ALL_CATEGORIES} selected={catF} onToggle={v=>toggle(setCatF,catF,v)} getColor={c=>CAT_COLOR[c]||"#888"}/>
        <FilterSection label="Difficulty" options={ALL_DIFFS} selected={difF} onToggle={v=>toggle(setDifF,difF,v)} getColor={d=>DIFF_COLOR[d]}/>

        {/* Perf by category */}
        {totalAttempts>0&&(
          <div style={{background:"#12151c",borderRadius:14,padding:"16px",border:"1px solid #1c2030",marginBottom:80}}>
            <div style={{fontSize:11,color:"#444",letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Performance by category</div>
            {ALL_CATEGORIES.map(cat=>{
              const cqs=questionsData.filter(q=>q.category===cat);
              const seen=cqs.reduce((a,q)=>a+(progress[q.id]?.seen||0),0);
              const corr=cqs.reduce((a,q)=>a+(progress[q.id]?.correct||0),0);
              const pct=seen>0?Math.round(corr/seen*100):null;
              const col=CAT_COLOR[cat]||"#888";
              return(
                <div key={cat} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <div style={{fontSize:12,color:"#666",width:110,flexShrink:0}}>{cat}</div>
                  <div style={{flex:1,height:4,background:"#1c2030",borderRadius:2,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${pct||0}%`,background:col,transition:"width .4s",borderRadius:2}}/>
                  </div>
                  <div style={{fontSize:12,color:pct!=null?col:"#333",width:36,textAlign:"right"}}>{pct!=null?`${pct}%`:"—"}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky bottom bar */}
      <div style={{
        position:"fixed",bottom:0,left:0,right:0,
        paddingBottom:"env(safe-area-inset-bottom,16px)",
        background:"linear-gradient(transparent,#090b0f 30%)",
        padding:"20px 18px",
        paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 16px)",
      }}>
        <button onClick={startSession} disabled={filtered.length===0} style={{
          width:"100%",padding:"16px",borderRadius:14,
          background:filtered.length>0?"linear-gradient(135deg,#e8a84c,#c97c30)":"#1c2030",
          color:filtered.length>0?"#090b0f":"#444",
          fontSize:16,fontWeight:800,border:"none",
          cursor:filtered.length>0?"pointer":"default",
          fontFamily:"'Syne',sans-serif",
          boxShadow:filtered.length>0?"0 4px 24px rgba(232,168,76,0.3)":"none",
          WebkitTapHighlightColor:"transparent",
        }}>
          {filtered.length>0?`Start — ${filtered.length} questions`:"No questions match"}
        </button>
        {totalAttempts>0&&(
          <button onClick={()=>{setProgress({});saveProgress({});}} style={{
            width:"100%",marginTop:10,padding:"12px",borderRadius:12,
            background:"transparent",border:"1px solid #1c2030",
            color:"#444",fontSize:13,cursor:"pointer",
            fontFamily:"'Syne',sans-serif",
            WebkitTapHighlightColor:"transparent",
          }}>Reset progress</button>
        )}
      </div>
    </div>
  );

  // ── QUIZ ──────────────────────────────────
  if(screen==="quiz"&&q) {
    const cards=q.hand.map(c=>({rank:c.slice(0,-1),suit:c.slice(-1)}));
    const ok=selected===q.correct;

    return (
      <div style={{
        position:"fixed",top:0,left:0,right:0,bottom:0,
        background:"#090b0f",color:"#e8e4d8",
        fontFamily:"'Syne','DM Sans',sans-serif",
        display:"flex",flexDirection:"column",
        paddingTop:"env(safe-area-inset-top,0px)",
        paddingBottom:"env(safe-area-inset-bottom,0px)",
      }}>
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>

        {/* Fixed header */}
        <div style={{flexShrink:0,padding:"10px 16px 6px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
            <button onClick={()=>setScreen("home")} style={{
              background:"none",border:"none",color:"#555",fontSize:22,
              cursor:"pointer",padding:"4px 8px 4px 0",
              WebkitTapHighlightColor:"transparent",
            }}>←</button>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:13,color:"#555",fontFamily:"'DM Mono',monospace"}}>
                {idx+1}<span style={{color:"#222"}}>/{queue.length}</span>
              </span>
              {streak>0&&<span style={{fontSize:13,color:"#4caf7d",fontWeight:700}}>🔥{streak}</span>}
              <span style={{fontSize:11,color:DIFF_COLOR[q.difficulty],
                background:`${DIFF_COLOR[q.difficulty]}22`,padding:"3px 9px",borderRadius:6,
                textTransform:"capitalize",fontWeight:700}}>
                {q.difficulty}
              </span>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{height:3,background:"#12151c",borderRadius:2,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${((idx+1)/queue.length)*100}%`,
              background:accent,borderRadius:2,transition:"width .3s"}}/>
          </div>
        </div>

        {/* Scrollable body */}
        <div ref={scrollRef} style={{flex:1,overflowY:"auto",padding:"8px 16px 16px",WebkitOverflowScrolling:"touch"}}>
          <div style={{maxWidth:480,margin:"0 auto"}}>

            {/* Category + scenario badges */}
            <div style={{marginBottom:10,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:accent,flexShrink:0}}/>
              <span style={{fontSize:11,color:accent,textTransform:"uppercase",letterSpacing:2,fontWeight:700}}>
                {q.category}
              </span>
              <span style={{fontSize:11,color:"#444",background:"#1c2030",padding:"3px 8px",borderRadius:5}}>
                {q.scenario}
              </span>
              <span style={{fontSize:11,color:"#555",background:"#12151c",padding:"3px 8px",borderRadius:5,
                border:"1px solid #1c2030"}}>
                {q.my_position}
              </span>
            </div>

            {/* Range context — collapsible pill */}
            <details style={{marginBottom:10}}>
              <summary style={{
                fontSize:11,color:"#555",cursor:"pointer",listStyle:"none",
                display:"flex",alignItems:"center",gap:5,
                background:"#0d1018",padding:"7px 12px",borderRadius:8,
                border:"1px solid #1a1f2e",
              }}>
                <span style={{color:"#333"}}>▸</span>
                <span style={{letterSpacing:1,textTransform:"uppercase"}}>Range context</span>
              </summary>
              <div style={{background:"#0d1018",padding:"10px 12px",borderRadius:"0 0 8px 8px",
                borderLeft:"1px solid #1a1f2e",borderRight:"1px solid #1a1f2e",borderBottom:"1px solid #1a1f2e",
                fontSize:12,color:"#666",lineHeight:1.6,marginTop:-1}}>
                {q.range_context}
              </div>
            </details>

            {/* Scenario card */}
            <div style={{background:"#12151c",borderRadius:16,padding:"16px",
              border:`1.5px solid ${accent}44`,marginBottom:12,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:-40,right:-40,width:140,height:140,
                borderRadius:"50%",background:`${accent}12`,pointerEvents:"none"}}/>

              {/* Position badge + situation */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <span style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:accent,
                  background:`${accent}22`,padding:"4px 10px",borderRadius:6,fontWeight:700}}>
                  {q.position}
                </span>
                <span style={{fontSize:12,color:"#444",flex:1,textAlign:"right",marginLeft:8,lineHeight:1.3}}>
                  {q.situation}
                </span>
              </div>

              {/* Cards */}
              <div style={{display:"flex",gap:10,marginBottom:14}}>
                {cards.map((c,i)=><Card key={i} rank={c.rank} suit={c.suit}/>)}
              </div>

              {/* Question */}
              <p style={{margin:0,fontSize:16,lineHeight:1.55,fontWeight:700,color:"#e8e4d8"}}>
                {q.question}
              </p>
            </div>

            {/* Options */}
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
              {q.options.map((opt,i)=>{
                let bc="#1c2030",bg="#12151c",tc="#a0a0a0",icon=null;
                if(revealed){
                  if(i===q.correct){bc="#4caf7d";bg="rgba(76,175,125,0.12)";tc="#7dd9a0";icon="✓";}
                  else if(i===selected){bc="#e87070";bg="rgba(232,112,112,0.10)";tc="#e87070";icon="✗";}
                  else{tc="#2a2a2a";}
                }
                return(
                  <button key={i} onClick={()=>choose(i)} disabled={revealed} style={{
                    width:"100%",padding:"14px 14px",borderRadius:12,
                    border:`1.5px solid ${bc}`,background:bg,color:tc,
                    fontSize:15,cursor:revealed?"default":"pointer",
                    textAlign:"left",fontFamily:"'Syne',sans-serif",lineHeight:1.4,
                    display:"flex",alignItems:"center",justifyContent:"space-between",
                    transition:"border-color .12s,background .12s",outline:"none",
                    WebkitTapHighlightColor:"transparent",
                    minHeight:52,
                  }}>
                    <span style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                      <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,
                        color:revealed?tc:"#333",flexShrink:0,marginTop:2,fontWeight:700}}>
                        {String.fromCharCode(65+i)}
                      </span>
                      <span>{opt}</span>
                    </span>
                    {icon&&<span style={{fontWeight:800,fontSize:17,flexShrink:0,marginLeft:10}}>{icon}</span>}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {revealed&&(
              <div style={{
                background:ok?"rgba(76,175,125,0.08)":"rgba(232,112,112,0.08)",
                borderRadius:14,
                border:`1.5px solid ${ok?"#4caf7d44":"#e8707044"}`,
                padding:"14px",marginBottom:12,
              }}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:9}}>
                  <span style={{fontSize:15}}>{ok?"✓":"✗"}</span>
                  <span style={{fontSize:12,fontWeight:800,
                    color:ok?"#4caf7d":"#e87070",textTransform:"uppercase",letterSpacing:1}}>
                    {ok?"Correct":"Incorrect"}
                  </span>
                </div>
                <p style={{margin:"0 0 10px",fontSize:13,color:"#a0a0a0",lineHeight:1.65}}>{q.explanation}</p>
                {!ok&&q.why_wrong&&q.why_wrong[String(selected)]&&(
                  <div style={{borderTop:"1px solid #1c2030",paddingTop:10,marginTop:4}}>
                    <div style={{fontSize:10,color:"#e87070",letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>
                      Why {String.fromCharCode(65+selected)} is wrong
                    </div>
                    <p style={{margin:0,fontSize:13,color:"#666",lineHeight:1.6}}>
                      {q.why_wrong[String(selected)]}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Next button — inside scroll so it's always reachable */}
            {revealed&&(
              <button onClick={next} style={{
                width:"100%",padding:"16px",borderRadius:14,
                background:"linear-gradient(135deg,#e8a84c,#c97c30)",
                color:"#090b0f",fontSize:16,fontWeight:800,border:"none",
                cursor:"pointer",fontFamily:"'Syne',sans-serif",
                WebkitTapHighlightColor:"transparent",
                marginBottom:8,
              }}>
                {idx+1>=queue.length?"See results →":"Next →"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── RESULT ────────────────────────────────
  if(screen==="result"){
    const total=session.correct+session.wrong;
    const acc=total>0?Math.round(session.correct/total*100):0;
    const grade=acc>=85?{l:"Excellent",c:"#4caf7d"}:acc>=65?{l:"Good",c:"#e8a84c"}:{l:"Keep drilling",c:"#e87070"};
    return(
      <div style={{
        minHeight:"100vh",background:"#090b0f",color:"#e8e4d8",
        fontFamily:"'Syne',sans-serif",display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",padding:"32px 24px",
        textAlign:"center",
        paddingTop:"calc(env(safe-area-inset-top,0px) + 32px)",
        paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 32px)",
      }}>
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet"/>
        <div style={{fontSize:52,marginBottom:16}}>🃏</div>
        <h2 style={{fontSize:28,fontWeight:800,margin:"0 0 6px"}}>Session done</h2>
        <div style={{fontSize:13,color:grade.c,fontWeight:800,marginBottom:28,
          textTransform:"uppercase",letterSpacing:1}}>{grade.l}</div>
        <div style={{width:"100%",maxWidth:340}}>
          <div style={{background:"#12151c",borderRadius:18,padding:24,marginBottom:16,border:"1px solid #1c2030"}}>
            <div style={{fontSize:56,fontWeight:800,color:"#e8a84c",lineHeight:1}}>{acc}%</div>
            <div style={{fontSize:13,color:"#555",marginTop:6}}>
              {session.correct} correct · {session.wrong} wrong · {total} total
            </div>
            {streak>0&&<div style={{fontSize:13,color:"#4caf7d",marginTop:8}}>Best streak 🔥{streak}</div>}
          </div>
          <button onClick={startSession} style={{
            width:"100%",padding:"16px",borderRadius:14,
            background:"linear-gradient(135deg,#e8a84c,#c97c30)",
            color:"#090b0f",fontSize:16,fontWeight:800,border:"none",
            cursor:"pointer",marginBottom:10,fontFamily:"'Syne',sans-serif",
            WebkitTapHighlightColor:"transparent",
          }}>Retry session</button>
          <button onClick={()=>setScreen("home")} style={{
            width:"100%",padding:"14px",borderRadius:12,background:"transparent",
            border:"1px solid #1c2030",color:"#555",fontSize:14,cursor:"pointer",
            fontFamily:"'Syne',sans-serif",WebkitTapHighlightColor:"transparent",
          }}>Back to home</button>
        </div>
      </div>
    );
  }
  return null;
}
