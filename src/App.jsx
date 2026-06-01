import { useState, useEffect, useRef } from "react";
import questionsData from "./data/questions.json";

const RED = new Set(["♥","♦"]);

function Card({ rank, suit }) {
  const col = RED.has(suit) ? "#d63031" : "#0f111a";
  return (
    <div style={{
      width:60, height:82, borderRadius:12,
      background:"#f5f1e8", border:"1px solid #e0d8c8",
      boxShadow:"0 4px 16px rgba(0,0,0,0.4)",
      position:"relative", flexShrink:0,
      display:"flex", alignItems:"center", justifyContent:"center",
    }}>
      <span style={{
        position:"absolute",top:5,left:6,
        fontSize:17,fontWeight:900,color:col,lineHeight:1,
        fontFamily:"'Georgia',serif",
      }}>{rank}</span>
      <span style={{fontSize:30,color:col,lineHeight:1}}>{suit}</span>
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
const POS_COLOR  = {
  UTG:"#e87070", MP:"#e8a84c", CO:"#4caf7d",
  BTN:"#5ba8d4", SB:"#9b7fe8", BB:"#f07850",
};

const ALL_POSITIONS  = ["UTG","MP","CO","BTN","SB","BB"];
const ALL_SCENARIOS  = ["RFI","Facing a raise","Facing raise + caller","Limper(s)"];
const ALL_ACTIONS    = [...new Set(questionsData.map(q => q.action_type))].sort();
const ALL_CATEGORIES = [...new Set(questionsData.map(q => q.category))];
const ALL_DIFFS      = ["easy","medium","hard"];

function loadProgress() {
  try { return JSON.parse(localStorage.getItem("pct_l1v5")||"{}"); } catch { return {}; }
}
function saveProgress(p) {
  try { localStorage.setItem("pct_l1v5", JSON.stringify(p)); } catch {} }

function Chip({ label, active, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      height:36,
      padding:"0 16px",
      borderRadius:18,
      fontSize:14,
      fontWeight: active ? 700 : 500,
      fontFamily:"'Inter',-apple-system,sans-serif",
      cursor:"pointer",
      border:`1.5px solid ${active ? color : "#252836"}`,
      background: active ? color : "transparent",
      color: active ? "#0a0c14" : "#555a70",
      whiteSpace:"nowrap",
      flexShrink:0,
      transition:"all .12s",
      WebkitTapHighlightColor:"transparent",
      letterSpacing: active ? "0" : "0",
    }}>{label}</button>
  );
}

function FilterRow({ label, options, selected, onToggle, getColor }) {
  return (
    <div style={{marginBottom:22}}>
      <div style={{
        fontSize:11, fontWeight:700, color:"#3a3f56",
        letterSpacing:"0.14em", textTransform:"uppercase",
        marginBottom:10,
        fontFamily:"'Inter',-apple-system,sans-serif",
      }}>{label}</div>
      <div style={{
        display:"flex", gap:7,
        overflowX:"auto", paddingBottom:4,
        WebkitOverflowScrolling:"touch",
        msOverflowStyle:"none", scrollbarWidth:"none",
      }}>
        <Chip label="All" active={selected.length===0} color="#e8a84c" onClick={()=>onToggle("__all__")}/>
        {options.map(o=>(
          <Chip key={o} label={o}
            active={selected.includes(o)}
            color={getColor?getColor(o):"#e8a84c"}
            onClick={()=>onToggle(o)}/>
        ))}
      </div>
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
  const accuracy      = totalAttempts>0?Math.round(totalCorrect/totalAttempts*100):0;
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

  // ─────────────────────────────────────────
  // HOME
  // ─────────────────────────────────────────
  if(screen==="home") return (
    <div style={{
      minHeight:"100vh",
      background:"#0a0c14",
      fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,sans-serif",
      color:"#e8e4d8",
      paddingTop:"env(safe-area-inset-top,0px)",
    }}>
      <div style={{maxWidth:430,margin:"0 auto",padding:"28px 20px 160px"}}>

        {/* Title */}
        <div style={{marginBottom:32}}>
          <p style={{
            margin:"0 0 6px",
            fontSize:12, fontWeight:700,
            color:"#3a3f56",
            letterSpacing:"0.14em",
            textTransform:"uppercase",
          }}>Level 1 · Preflop · TAG</p>
          <h1 style={{
            margin:0,
            fontSize:34, fontWeight:900,
            color:"#f0ece0",
            letterSpacing:"-0.03em",
            lineHeight:1.05,
          }}>Preflop<br/>Trainer</h1>
        </div>

        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:32}}>
          {[
            {l:"Questions", v:questionsData.length, c:"#f0ece0"},
            {l:"Attempted",  v:attempted,            c:"#5ba8d4"},
            {l:"Accuracy",   v:totalAttempts>0?`${accuracy}%`:"—", c:"#e8a84c"},
          ].map(s=>(
            <div key={s.l} style={{
              background:"#13151f",
              borderRadius:14,
              border:"1px solid #1e2232",
              padding:"14px 12px",
            }}>
              <div style={{
                fontSize:11,fontWeight:700,
                color:"#3a3f56",
                letterSpacing:"0.12em",
                textTransform:"uppercase",
                marginBottom:6,
              }}>{s.l}</div>
              <div style={{
                fontSize:28,fontWeight:900,
                color:s.c,
                lineHeight:1,
                letterSpacing:"-0.03em",
              }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* Category bars — only if attempted */}
        {totalAttempts>0&&(
          <div style={{
            background:"#13151f",borderRadius:14,
            border:"1px solid #1e2232",padding:"18px 16px",
            marginBottom:32,
          }}>
            <p style={{
              margin:"0 0 16px",
              fontSize:11,fontWeight:700,color:"#3a3f56",
              letterSpacing:"0.14em",textTransform:"uppercase",
            }}>By Category</p>
            {ALL_CATEGORIES.map(cat=>{
              const cqs=questionsData.filter(q=>q.category===cat);
              const seen=cqs.reduce((a,q)=>a+(progress[q.id]?.seen||0),0);
              const corr=cqs.reduce((a,q)=>a+(progress[q.id]?.correct||0),0);
              const pct=seen>0?Math.round(corr/seen*100):null;
              const col=CAT_COLOR[cat]||"#888";
              return(
                <div key={cat} style={{marginBottom:12}}>
                  <div style={{
                    display:"flex",justifyContent:"space-between",
                    alignItems:"baseline",marginBottom:5,
                  }}>
                    <span style={{fontSize:13,fontWeight:600,color:"#7a8099"}}>{cat}</span>
                    <span style={{
                      fontSize:14,fontWeight:800,
                      color:pct!=null?col:"#252836",
                    }}>{pct!=null?`${pct}%`:"—"}</span>
                  </div>
                  <div style={{height:4,background:"#1e2232",borderRadius:2,overflow:"hidden"}}>
                    <div style={{
                      height:"100%",width:`${pct||0}%`,
                      background:col,borderRadius:2,
                      transition:"width .5s",
                    }}/>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Filter section header */}
        <p style={{
          margin:"0 0 20px",
          fontSize:11,fontWeight:700,color:"#3a3f56",
          letterSpacing:"0.14em",textTransform:"uppercase",
        }}>Filters</p>

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

      {/* Sticky bottom */}
      <div style={{
        position:"fixed",bottom:0,left:0,right:0,
        background:"linear-gradient(transparent,#0a0c14 35%,#0a0c14)",
        padding:"16px 20px",
        paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 16px)",
      }}>
        <button onClick={startSession} disabled={!filtered.length} style={{
          width:"100%",height:58,
          borderRadius:16,
          background:filtered.length?"#e8a84c":"#13151f",
          color:filtered.length?"#0a0c14":"#3a3f56",
          fontSize:17,fontWeight:800,
          border:"none",
          cursor:filtered.length?"pointer":"default",
          fontFamily:"'Inter',-apple-system,sans-serif",
          letterSpacing:"-0.01em",
          boxShadow:filtered.length?"0 0 32px rgba(232,168,76,0.25)":"none",
          WebkitTapHighlightColor:"transparent",
          display:"flex",alignItems:"center",justifyContent:"center",gap:10,
        }}>
          {filtered.length>0?(
            <>
              <span>Start Session</span>
              <span style={{
                background:"rgba(0,0,0,0.18)",
                borderRadius:8,padding:"2px 10px",
                fontSize:14,fontWeight:800,
              }}>{filtered.length}</span>
            </>
          ):"No questions match"}
        </button>
        {totalAttempts>0&&(
          <button onClick={()=>{setProgress({});saveProgress({});}} style={{
            width:"100%",marginTop:10,height:42,
            borderRadius:12,background:"transparent",
            border:"1px solid #1e2232",
            color:"#3a3f56",fontSize:13,fontWeight:500,
            cursor:"pointer",
            fontFamily:"'Inter',-apple-system,sans-serif",
            WebkitTapHighlightColor:"transparent",
          }}>Reset progress</button>
        )}
      </div>
    </div>
  );

  // ─────────────────────────────────────────
  // QUIZ
  // ─────────────────────────────────────────
  if(screen==="quiz"&&q){
    const cards=q.hand.map(c=>({rank:c.slice(0,-1),suit:c.slice(-1)}));
    const ok=selected===q.correct;

    return(
      <div style={{
        position:"fixed",inset:0,
        background:"#0a0c14",color:"#e8e4d8",
        fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,sans-serif",
        display:"flex",flexDirection:"column",
        paddingTop:"env(safe-area-inset-top,0px)",
        paddingBottom:"env(safe-area-inset-bottom,0px)",
      }}>
        {/* Header */}
        <div style={{flexShrink:0,padding:"12px 18px 8px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <button onClick={()=>setScreen("home")} style={{
              background:"#13151f",border:"1px solid #1e2232",
              borderRadius:10,padding:"7px 14px",
              color:"#555a70",fontSize:13,fontWeight:600,
              cursor:"pointer",fontFamily:"'Inter',-apple-system,sans-serif",
              WebkitTapHighlightColor:"transparent",
            }}>← Home</button>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {streak>0&&(
                <span style={{
                  fontSize:13,fontWeight:700,color:"#4caf7d",
                  background:"rgba(76,175,125,0.12)",
                  padding:"4px 10px",borderRadius:8,
                }}>🔥 {streak}</span>
              )}
              <span style={{
                fontSize:11,fontWeight:700,
                color:DIFF_COLOR[q.difficulty],
                background:`${DIFF_COLOR[q.difficulty]}18`,
                padding:"4px 10px",borderRadius:8,
                textTransform:"capitalize",
              }}>{q.difficulty}</span>
              <span style={{
                fontSize:13,fontWeight:700,color:"#3a3f56",
                fontFamily:"'Inter',sans-serif",
              }}>{idx+1}<span style={{color:"#1e2232"}}>/{queue.length}</span></span>
            </div>
          </div>
          <div style={{height:3,background:"#13151f",borderRadius:2,overflow:"hidden"}}>
            <div style={{
              height:"100%",
              width:`${((idx+1)/queue.length)*100}%`,
              background:accent,borderRadius:2,transition:"width .25s",
            }}/>
          </div>
        </div>

        {/* Scroll body */}
        <div ref={scrollRef} style={{
          flex:1,overflowY:"auto",
          padding:"8px 18px 24px",
          WebkitOverflowScrolling:"touch",
        }}>
          <div style={{maxWidth:430,margin:"0 auto"}}>

            {/* Badges */}
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
              <span style={{
                fontSize:11,fontWeight:800,color:accent,
                background:`${accent}18`,padding:"4px 10px",
                borderRadius:8,textTransform:"uppercase",letterSpacing:"0.08em",
              }}>{q.category}</span>
              <span style={{
                fontSize:11,fontWeight:600,color:"#3a3f56",
                background:"#13151f",border:"1px solid #1e2232",
                padding:"4px 10px",borderRadius:8,
              }}>{q.scenario}</span>
              <span style={{
                fontSize:11,fontWeight:700,
                color:POS_COLOR[q.my_position]||"#888",
                background:`${POS_COLOR[q.my_position]||"#888"}18`,
                padding:"4px 10px",borderRadius:8,
              }}>{q.my_position}</span>
            </div>

            {/* Range context collapsible */}
            <details style={{marginBottom:12}}>
              <summary style={{
                fontSize:11,fontWeight:700,color:"#3a3f56",
                cursor:"pointer",listStyle:"none",
                display:"flex",alignItems:"center",gap:6,
                background:"#13151f",padding:"9px 14px",
                borderRadius:10,border:"1px solid #1e2232",
                letterSpacing:"0.1em",textTransform:"uppercase",
              }}>
                <span>▶ Range Context</span>
              </summary>
              <div style={{
                background:"#13151f",padding:"12px 14px",
                borderRadius:"0 0 10px 10px",
                border:"1px solid #1e2232",borderTop:"none",
                fontSize:12,fontWeight:500,color:"#555a70",lineHeight:1.7,
              }}>{q.range_context}</div>
            </details>

            {/* Question card */}
            <div style={{
              background:"#13151f",borderRadius:16,
              border:`1px solid ${accent}28`,
              padding:"18px",marginBottom:12,
            }}>
              <div style={{
                display:"flex",alignItems:"center",
                justifyContent:"space-between",marginBottom:14,
              }}>
                <span style={{
                  fontSize:13,fontWeight:800,color:accent,
                  background:`${accent}18`,padding:"5px 12px",borderRadius:8,
                }}>{q.position}</span>
                <span style={{
                  fontSize:12,fontWeight:500,color:"#3a3f56",
                  flex:1,textAlign:"right",marginLeft:10,lineHeight:1.4,
                }}>{q.situation}</span>
              </div>
              <div style={{display:"flex",gap:10,marginBottom:16}}>
                {cards.map((c,i)=><Card key={i} rank={c.rank} suit={c.suit}/>)}
              </div>
              <p style={{
                margin:0,fontSize:17,fontWeight:700,
                color:"#f0ece0",lineHeight:1.55,
                letterSpacing:"-0.01em",
              }}>{q.question}</p>
            </div>

            {/* Options */}
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
              {q.options.map((opt,i)=>{
                let bg="#13151f",bc="#1e2232",tc="#7a8099",icon=null;
                if(revealed){
                  if(i===q.correct){bg="rgba(76,175,125,0.10)";bc="#4caf7d";tc="#7dd9a0";icon="✓";}
                  else if(i===selected){bg="rgba(232,112,112,0.10)";bc="#e87070";tc="#e87070";icon="✗";}
                  else{tc="#252836";}
                }
                return(
                  <button key={i} onClick={()=>choose(i)} disabled={revealed} style={{
                    width:"100%",minHeight:54,
                    padding:"14px 16px",borderRadius:12,
                    border:`1.5px solid ${bc}`,background:bg,color:tc,
                    fontSize:15,fontWeight:600,
                    cursor:revealed?"default":"pointer",
                    textAlign:"left",
                    fontFamily:"'Inter',-apple-system,sans-serif",
                    lineHeight:1.4,
                    display:"flex",alignItems:"center",
                    justifyContent:"space-between",
                    outline:"none",
                    WebkitTapHighlightColor:"transparent",
                    transition:"border-color .1s",
                  }}>
                    <span style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                      <span style={{
                        fontSize:11,fontWeight:800,
                        color:revealed?tc:"#252836",
                        flexShrink:0,marginTop:2,
                        letterSpacing:"0.06em",
                      }}>{String.fromCharCode(65+i)}</span>
                      <span>{opt}</span>
                    </span>
                    {icon&&<span style={{fontWeight:900,fontSize:18,flexShrink:0,marginLeft:12}}>{icon}</span>}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {revealed&&(
              <div style={{
                background:ok?"rgba(76,175,125,0.07)":"rgba(232,112,112,0.07)",
                borderRadius:14,
                border:`1px solid ${ok?"rgba(76,175,125,0.18)":"rgba(232,112,112,0.18)"}`,
                padding:"16px",marginBottom:12,
              }}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
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
                  margin:0,fontSize:14,fontWeight:500,
                  color:"#7a8099",lineHeight:1.7,
                }}>{q.explanation}</p>
                {!ok&&q.why_wrong&&q.why_wrong[String(selected)]&&(
                  <div style={{
                    marginTop:12,paddingTop:12,
                    borderTop:"1px solid rgba(255,255,255,0.05)",
                  }}>
                    <p style={{
                      margin:"0 0 6px",fontSize:10,fontWeight:800,
                      color:"#e87070",letterSpacing:"0.12em",
                      textTransform:"uppercase",
                    }}>Why {String.fromCharCode(65+selected)} is wrong</p>
                    <p style={{
                      margin:0,fontSize:14,fontWeight:500,
                      color:"#555a70",lineHeight:1.65,
                    }}>{q.why_wrong[String(selected)]}</p>
                  </div>
                )}
              </div>
            )}

            {revealed&&(
              <button onClick={next} style={{
                width:"100%",height:56,borderRadius:14,
                background:"#e8a84c",
                color:"#0a0c14",fontSize:16,fontWeight:800,
                border:"none",cursor:"pointer",
                fontFamily:"'Inter',-apple-system,sans-serif",
                letterSpacing:"-0.01em",
                boxShadow:"0 0 28px rgba(232,168,76,0.22)",
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

  // ─────────────────────────────────────────
  // RESULT
  // ─────────────────────────────────────────
  if(screen==="result"){
    const total=session.correct+session.wrong;
    const acc=total>0?Math.round(session.correct/total*100):0;
    const grade=acc>=85?{l:"Excellent",c:"#4caf7d"}
               :acc>=65?{l:"Good",c:"#e8a84c"}
               :        {l:"Keep drilling",c:"#e87070"};
    return(
      <div style={{
        minHeight:"100vh",background:"#0a0c14",color:"#e8e4d8",
        fontFamily:"'Inter',-apple-system,sans-serif",
        display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",
        padding:"32px 24px",
        paddingTop:"calc(env(safe-area-inset-top,0px) + 32px)",
        paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 32px)",
        textAlign:"center",
      }}>
        <div style={{fontSize:52,marginBottom:16}}>🃏</div>
        <p style={{
          margin:"0 0 8px",fontSize:11,fontWeight:700,
          color:"#3a3f56",letterSpacing:"0.14em",textTransform:"uppercase",
        }}>Session Complete</p>
        <h2 style={{
          margin:"0 0 4px",fontSize:56,fontWeight:900,
          color:"#f0ece0",letterSpacing:"-0.04em",lineHeight:1,
        }}>{acc}%</h2>
        <p style={{
          margin:"0 0 32px",fontSize:14,fontWeight:700,
          color:grade.c,letterSpacing:"0.06em",textTransform:"uppercase",
        }}>{grade.l}</p>
        <div style={{
          width:"100%",maxWidth:340,
          background:"#13151f",borderRadius:16,
          border:"1px solid #1e2232",padding:"20px",
          marginBottom:20,
        }}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            {[
              {l:"Correct",v:session.correct,c:"#4caf7d"},
              {l:"Wrong",v:session.wrong,c:"#e87070"},
              {l:"Total",v:total,c:"#e8a84c"},
            ].map(s=>(
              <div key={s.l} style={{textAlign:"center"}}>
                <div style={{fontSize:28,fontWeight:900,color:s.c,letterSpacing:"-0.02em"}}>{s.v}</div>
                <div style={{fontSize:10,fontWeight:700,color:"#3a3f56",
                  textTransform:"uppercase",letterSpacing:"0.1em",marginTop:4}}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{width:"100%",maxWidth:340}}>
          <button onClick={startSession} style={{
            width:"100%",height:56,borderRadius:14,
            background:"#e8a84c",color:"#0a0c14",
            fontSize:16,fontWeight:800,border:"none",cursor:"pointer",marginBottom:10,
            fontFamily:"'Inter',-apple-system,sans-serif",
            boxShadow:"0 0 28px rgba(232,168,76,0.22)",
            WebkitTapHighlightColor:"transparent",
          }}>Retry Session</button>
          <button onClick={()=>setScreen("home")} style={{
            width:"100%",height:46,borderRadius:12,background:"transparent",
            border:"1px solid #1e2232",color:"#555a70",fontSize:14,fontWeight:600,
            cursor:"pointer",fontFamily:"'Inter',-apple-system,sans-serif",
            WebkitTapHighlightColor:"transparent",
          }}>← Back to Home</button>
        </div>
      </div>
    );
  }
  return null;
}
