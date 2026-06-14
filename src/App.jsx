import { useState, useEffect, useRef } from "react";
import questionsData from "./data/questions.json";
import rangesData from "./data/ranges.json";

const RED = new Set(["♥","♦"]);

function Card({ rank, suit }) {
  const col = RED.has(suit) ? "#c0392b" : "#1a1f2e";
  return (
    <div style={{width:60,height:82,borderRadius:12,background:"#f5f0e8",border:"1px solid #d8ceba",
      boxShadow:"0 4px 16px rgba(0,0,0,0.35)",position:"relative",flexShrink:0,
      display:"flex",alignItems:"center",justifyContent:"center"}}>
      <span style={{position:"absolute",top:5,left:6,fontSize:17,fontWeight:900,color:col,lineHeight:1,fontFamily:"Georgia,serif"}}>{rank}</span>
      <span style={{fontSize:30,color:col,lineHeight:1}}>{suit}</span>
    </div>
  );
}

const CAT_COLOR={"Open Raise":"#6db87a","3-Bet Value":"#a98fe8","Cold-Call":"#70b4d4","ISO Raise":"#d4a847","Squeeze":"#e0845a","vs 3-Bet":"#e07090"};
const DIFF_COLOR={easy:"#6db87a",medium:"#d4a847",hard:"#d96060"};
const POS_COLOR={UTG:"#d96060",MP:"#d4a847",CO:"#6db87a",BTN:"#70b4d4",SB:"#a98fe8",BB:"#e0845a"};
const ALL_POSITIONS=["UTG","MP","CO","BTN","SB","BB"];
const ALL_SCENARIOS=["RFI","Facing a raise","Facing raise + caller","Limper(s)"];
const ALL_ACTIONS=[...new Set(questionsData.map(q=>q.action_type))].sort();
const ALL_CATEGORIES=[...new Set(questionsData.map(q=>q.category))];
const ALL_DIFFS=["easy","medium","hard"];
const SESSION_SIZES=[10,20,30,50];
const C={bg:"#1a2218",bg2:"#212d1f",bg3:"#273324",border:"#2e3d2b",text:"#e8e0cc",muted:"#6b7d62",accent:"#c8a84b",cream:"#f0e8d0",sage:"#8fa882"};


// Combo-weighted percentage (pairs=6, suited=4, offsuit=12, total=1326)
function comboCount(label){
  if(label.length===2) return 6;
  if(label[2]==='s') return 4;
  return 12;
}
function rangePct(hands){
  const c = hands.reduce((s,h)=>s+comboCount(h),0);
  return Math.round(c/1326*100*10)/10;
}

// ── RANGE CHART (lookup reference) ──────────────────────────
const CHART_RANKS = ["A","K","Q","J","T","9","8","7","6","5","4","3","2"];
function chartHandLabel(r, c) {
  if (r === c) return CHART_RANKS[r] + CHART_RANKS[c];
  if (r < c)  return CHART_RANKS[r] + CHART_RANKS[c] + "s";
  return CHART_RANKS[c] + CHART_RANKS[r] + "o";
}

function ChartGrid({ highlightSet, optionalSet }) {
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(13, 1fr)",gap:2,width:"100%",maxWidth:430,margin:"0 auto"}}>
      {CHART_RANKS.map((_, r) =>
        CHART_RANKS.map((_, c) => {
          const label = chartHandLabel(r, c);
          const inRange = highlightSet.has(label);
          const isOptional = optionalSet && optionalSet.has(label);
          const isPair = r === c;
          let bg = C.bg3, border = C.border, color = "#3d4a36";
          if (inRange) { bg = `${C.accent}40`; border = C.accent; color = C.cream; }
          else if (isOptional) { bg = "rgba(112,180,212,0.22)"; border = "#70b4d4"; color = "#a8d0e8"; }
          return (
            <div key={label} style={{aspectRatio:"1",fontSize:8.5,fontWeight:isPair?800:600,fontFamily:"'Inter',-apple-system,sans-serif",background:bg,border:`1px solid ${border}`,borderRadius:4,color,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>{label}</div>
          );
        })
      )}
    </div>
  );
}


// Spaced repetition weights
function getScore(prog){
  if(!prog||prog.seen===0)return 0;
  const acc=prog.correct/prog.seen,seen=prog.seen;
  if(acc>=0.8&&seen>=4)return 4;
  if(acc>=0.7&&seen>=3)return 3;
  if(acc>=0.5&&seen>=2)return 2;
  return 1;
}
function getWeight(prog){return[8,6,3,1.5,0.5][getScore(prog)];}

// ── WANIKANI-STYLE SRS ENGINE ──────────────────────────────
// 9 stages: 0 Unseen, 1-4 Apprentice, 5 Guru, 6 Master, 7 Enlightened, 8 Burned
// Intervals (ms) to NEXT review after answering correctly at each stage:
const SRS_INTERVALS_MS = [
  0,                    // 0 unseen (immediate)
  4*60*60*1000,         // 1 -> 4h
  8*60*60*1000,         // 2 -> 8h
  24*60*60*1000,        // 3 -> 1d
  2*24*60*60*1000,      // 4 -> 2d
  7*24*60*60*1000,      // 5 Guru -> 1w
  14*24*60*60*1000,     // 6 Master -> 2w
  30*24*60*60*1000,     // 7 Enlightened -> 1mo
  120*24*60*60*1000,    // 8 Burned -> 4mo (effectively done)
];
const SRS_STAGE_LABEL = ["Unseen","Apprentice I","Apprentice II","Apprentice III","Apprentice IV","Guru","Master","Enlightened","Burned"];
const SRS_STAGE_SHORT = ["—","App I","App II","App III","App IV","Guru","Master","Enlit","Burned"];
const SRS_STAGE_COLOR = ["#6b7d62","#d96060","#d4737d","#d4a847","#d4c047","#a98fe8","#70b4d4","#6db87a","#4a9d5e"];
const SRS_TIER_COLOR = {apprentice:"#d96060", guru:"#a98fe8", master:"#70b4d4", enlightened:"#6db87a", burned:"#4a9d5e"};

function getStage(prog){ return prog?.stage || 0; }

// Advance stage on correct, drop on wrong (WaniKani: wrong drops ~2 stages, min Apprentice I)
function nextStage(stage, correct){
  if(correct) return Math.min(stage+1, 8);
  if(stage<=1) return 1;
  // drop 2 stages but never below 1, with bigger penalty for higher stages
  const penalty = stage>=5 ? 2 : 1;
  return Math.max(stage-penalty, 1);
}

// When is this card next due? Returns timestamp (ms). Stage 0 = due now.
function dueTime(prog){
  if(!prog || !prog.stage) return 0;           // unseen = due now
  if(prog.due) return prog.due;                 // explicit timer
  return 0;
}
function isDue(prog, now){ return dueTime(prog) <= now; }

function timeUntil(ms){
  if(ms<=0) return "now";
  const h=ms/(60*60*1000);
  if(h<1) return Math.ceil(ms/(60*1000))+"m";
  if(h<24) return Math.round(h)+"h";
  const d=h/24;
  if(d<7) return Math.round(d)+"d";
  if(d<30) return Math.round(d/7)+"w";
  return Math.round(d/30)+"mo";
}
const SCORE_LABEL=["Unseen","Struggling","Learning","Solid","Mastered"];
const SCORE_COLOR=["#6b7d62","#d96060","#d4a847","#a8d4b0","#6db87a"];

function weightedSample(questions,progress,n){
  const pool=questions.map(q=>({q,w:getWeight(progress[q.id])}));
  const target=Math.min(n,pool.length);
  const result=[];
  for(let i=0;i<target;i++){
    const total=pool.reduce((s,x)=>s+x.w,0);
    let r=Math.random()*total,idx=0;
    for(;idx<pool.length;idx++){r-=pool[idx].w;if(r<=0)break;}
    idx=Math.min(idx,pool.length-1);
    result.push(pool[idx].q);pool.splice(idx,1);
  }
  return result;
}

function isCorrect(choice, correct){
  return Array.isArray(correct) ? correct.includes(choice) : choice===correct;
}
function loadProgress(){try{return JSON.parse(localStorage.getItem("pct_l1v7")||"{}");}catch{return{};}}
function saveProgress(p){try{localStorage.setItem("pct_l1v7",JSON.stringify(p));}catch{}}

function Chip({label,active,color,onClick}){
  return <button onClick={onClick} style={{height:34,padding:"0 14px",borderRadius:17,fontSize:13,fontWeight:active?700:500,fontFamily:"'Inter',-apple-system,sans-serif",cursor:"pointer",border:`1.5px solid ${active?color:C.border}`,background:active?`${color}28`:"transparent",color:active?color:C.muted,whiteSpace:"nowrap",flexShrink:0,transition:"all .12s",WebkitTapHighlightColor:"transparent"}}>{label}</button>;
}

function FilterRow({label,options,selected,onToggle,getColor}){
  return(
    <div style={{marginBottom:20}}>
      <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:9}}>{label}</div>
      <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:2,WebkitOverflowScrolling:"touch",msOverflowStyle:"none",scrollbarWidth:"none"}}>
        <Chip label="All" active={selected.length===0} color={C.accent} onClick={()=>onToggle("__all__")}/>
        {options.map(o=><Chip key={o} label={o} active={selected.includes(o)} color={getColor?getColor(o):C.accent} onClick={()=>onToggle(o)}/>)}
      </div>
    </div>
  );
}

export default function App(){
  const[screen,setScreen]=useState("home");
  const[progress,setProgress]=useState(loadProgress);
  const[sessionSize,setSessionSize]=useState(20);
  const[posF,setPosF]=useState([]);
  const[scenF,setScenF]=useState([]);
  const[actF,setActF]=useState([]);
  const[catF,setCatF]=useState([]);
  const[difF,setDifF]=useState([]);
  const[queue,setQueue]=useState([]);
  const[idx,setIdx]=useState(0);
  const[selected,setSelected]=useState(null);
  const[revealed,setRevealed]=useState(false);
  const[session,setSession]=useState({correct:0,wrong:0});
  const[streak,setStreak]=useState(0);
  const[gridSel,setGridSel]=useState(()=>new Set());
  const[gridScore,setGridScore]=useState(null);
  const scrollRef=useRef(null);
  // Chart lookup state
  const [chartCat, setChartCat] = useState(Object.keys(rangesData)[0]);
  const [chartGroup, setChartGroup] = useState(Object.keys(rangesData[Object.keys(rangesData)[0]])[0]);
  const [chartVariant, setChartVariant] = useState("conservative");
  const [reviewMode, setReviewMode] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(()=>saveProgress(progress),[progress]);
  // tick every minute so due counts/timers refresh
  useEffect(()=>{ const t=setInterval(()=>setNow(Date.now()),60000); return ()=>clearInterval(t); },[]);

  function toggle(setter,current,val){
    if(val==="__all__"){setter([]);return;}
    setter(current.includes(val)?current.filter(x=>x!==val):[...current,val]);
  }

  const filtered=questionsData.filter(q=>
    (posF.length===0||posF.includes(q.my_position))&&
    (scenF.length===0||scenF.includes(q.scenario))&&
    (actF.length===0||actF.includes(q.action_type))&&
    (catF.length===0||catF.includes(q.category))&&
    (difF.length===0||difF.includes(q.difficulty))
  );

  const totalAttempts=Object.values(progress).reduce((a,p)=>a+p.seen,0);
  const totalCorrect=Object.values(progress).reduce((a,p)=>a+p.correct,0);
  const accuracy=totalAttempts>0?Math.round(totalCorrect/totalAttempts*100):0;
  const scores=questionsData.map(q=>getScore(progress[q.id]));
  const mastered=scores.filter(s=>s===4).length;
  const solid=scores.filter(s=>s===3).length;
  const learning=scores.filter(s=>s===2).length;
  const struggling=scores.filter(s=>s===1).length;
  const unseen=scores.filter(s=>s===0).length;
  const dueCount=filtered.filter(q=>getWeight(progress[q.id])>1).length;
  // SRS review queue: cards whose timer has elapsed (excludes burned + not-yet-started unseen optionally)
  const reviewDue = questionsData.filter(q=>{
    const p=progress[q.id];
    if(!p || !p.stage) return false;          // only cards in the SRS system (seen at least once)
    if(p.stage>=8) return false;              // burned = done
    return isDue(p, now);
  });
  const reviewDueCount = reviewDue.length;
  // upcoming (in system, not yet due)
  const upcoming = questionsData.filter(q=>{ const p=progress[q.id]; return p&&p.stage>0&&p.stage<8&&!isDue(p,now); });
  const nextDueMs = upcoming.length? Math.min(...upcoming.map(q=>dueTime(progress[q.id])-now)) : null;

  function startSession(){
    if(!filtered.length)return;
    setReviewMode(false);
    setQueue(weightedSample(filtered,progress,sessionSize));
    setIdx(0);setSelected(null);setRevealed(false);
    setSession({correct:0,wrong:0});setStreak(0);
    setScreen("quiz");
  }

  function startReviews(){
    if(!reviewDue.length)return;
    setReviewMode(true);
    // review ALL due cards (WaniKani does the full due pile), ordered weakest-stage first
    const ordered=[...reviewDue].sort((a,b)=>getStage(progress[a.id])-getStage(progress[b.id]));
    setQueue(ordered);
    setIdx(0);setSelected(null);setRevealed(false);
    setSession({correct:0,wrong:0});setStreak(0);
    setScreen("quiz");
  }

  function choose(i){
    if(revealed)return;
    setSelected(i);setRevealed(true);
    const q=queue[idx];const ok=isCorrect(i, q.correct);
    setStreak(s=>ok?s+1:0);
    setSession(s=>({correct:s.correct+(ok?1:0),wrong:s.wrong+(ok?0:1)}));
    const prev=progress[q.id]||{seen:0,correct:0,stage:0};
    const ns=nextStage(prev.stage||0, ok);
    const due=Date.now()+SRS_INTERVALS_MS[ns];
    setProgress(p=>({...p,[q.id]:{seen:prev.seen+1,correct:prev.correct+(ok?1:0),stage:ns,due}}));
    setTimeout(()=>scrollRef.current?.scrollTo({top:0,behavior:"smooth"}),80);
  }

  function next(){
    if(idx+1>=queue.length){setScreen("result");return;}
    setIdx(i=>i+1);setSelected(null);setRevealed(false);setGridSel(new Set());setGridScore(null);
    scrollRef.current?.scrollTo({top:0,behavior:"instant"});
  }

  const q=queue[idx];
  const accent=q?(CAT_COLOR[q.category]||C.accent):C.accent;

  // ════════ CHARTS (lookup reference) ════════
  if(screen==="charts"){
    const categories = Object.keys(rangesData);
    const groups = Object.keys(rangesData[chartCat] || {});
    const groupData = rangesData[chartCat]?.[chartGroup] || {};
    const variants = Object.keys(groupData).filter(k => Array.isArray(groupData[k]));
    const activeVariant = variants.includes(chartVariant) ? chartVariant : variants[0];
    const handsArr = groupData[activeVariant] || [];
    const highlightSet = new Set(handsArr);
    // optional set (for vs 3-bet etc.)
    const optionalSet = groupData.optional && activeVariant !== "optional" ? new Set(groupData.optional) : null;
    const noteText = groupData.note || null;
    const pct = rangePct(handsArr);

    return (
      <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Inter',-apple-system,sans-serif",color:C.text,paddingTop:"env(safe-area-inset-top,0px)"}}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');*{-webkit-font-smoothing:antialiased;}::-webkit-scrollbar{display:none;}`}</style>
        <div style={{maxWidth:430,margin:"0 auto",padding:"16px 18px 60px"}}>

          {/* Header */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
            <button onClick={()=>setScreen("home")} style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,padding:"7px 14px",color:C.muted,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Inter',-apple-system,sans-serif",WebkitTapHighlightColor:"transparent"}}>← Home</button>
            <span style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:"0.14em",textTransform:"uppercase"}}>Range Charts</span>
          </div>

          {/* Category selector */}
          <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>Action Type</div>
          <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4,marginBottom:16,scrollbarWidth:"none"}}>
            {categories.map(cat=>(
              <button key={cat} onClick={()=>{setChartCat(cat);setChartGroup(Object.keys(rangesData[cat])[0]);}} style={{height:34,padding:"0 13px",borderRadius:17,fontSize:12,fontWeight:chartCat===cat?700:500,fontFamily:"'Inter',-apple-system,sans-serif",cursor:"pointer",border:`1.5px solid ${chartCat===cat?C.accent:C.border}`,background:chartCat===cat?`${C.accent}28`:"transparent",color:chartCat===cat?C.accent:C.muted,whiteSpace:"nowrap",flexShrink:0,WebkitTapHighlightColor:"transparent"}}>{cat.split(" (")[0]}</button>
            ))}
          </div>

          {/* Group (position) selector */}
          <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>Position / Scenario</div>
          <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4,marginBottom:16,scrollbarWidth:"none"}}>
            {groups.map(g=>(
              <button key={g} onClick={()=>setChartGroup(g)} style={{height:34,padding:"0 13px",borderRadius:17,fontSize:12,fontWeight:chartGroup===g?700:500,fontFamily:"'Inter',-apple-system,sans-serif",cursor:"pointer",border:`1.5px solid ${chartGroup===g?"#70b4d4":C.border}`,background:chartGroup===g?"rgba(112,180,212,0.16)":"transparent",color:chartGroup===g?"#70b4d4":C.muted,whiteSpace:"nowrap",flexShrink:0,WebkitTapHighlightColor:"transparent"}}>{g}</button>
            ))}
          </div>

          {/* Variant toggle (conservative/moderate or default/optional) */}
          {variants.length>1 && (
            <div style={{display:"flex",gap:6,marginBottom:18}}>
              {variants.map(v=>(
                <button key={v} onClick={()=>setChartVariant(v)} style={{flex:1,height:38,borderRadius:10,border:`1.5px solid ${activeVariant===v?C.accent:C.border}`,background:activeVariant===v?`${C.accent}28`:"transparent",color:activeVariant===v?C.accent:C.muted,fontSize:13,fontWeight:700,cursor:"pointer",textTransform:"capitalize",fontFamily:"'Inter',-apple-system,sans-serif",WebkitTapHighlightColor:"transparent"}}>{v}</button>
              ))}
            </div>
          )}

          {/* Stats line */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <span style={{fontSize:13,fontWeight:600,color:C.cream}}>{handsArr.length} hand types · {handsArr.reduce((s,h)=>s+comboCount(h),0)} combos</span>
            <span style={{fontSize:13,fontWeight:700,color:C.accent}}>{pct}% of hands</span>
          </div>

          {/* The grid */}
          <ChartGrid highlightSet={highlightSet} optionalSet={optionalSet}/>

          {/* Legend */}
          <div style={{display:"flex",gap:16,justifyContent:"center",marginTop:14,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:12,height:12,borderRadius:3,background:`${C.accent}40`,border:`1px solid ${C.accent}`}}/>
              <span style={{fontSize:12,color:C.muted}}>In range</span>
            </div>
            {optionalSet && (
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:12,height:12,borderRadius:3,background:"rgba(112,180,212,0.22)",border:"1px solid #70b4d4"}}/>
                <span style={{fontSize:12,color:C.muted}}>Optional</span>
              </div>
            )}
          </div>

          {/* Note */}
          {noteText && (
            <div style={{marginTop:18,background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`,padding:"14px 16px"}}>
              <p style={{margin:0,fontSize:13,fontWeight:500,color:"#8fa882",lineHeight:1.6}}>{noteText}</p>
            </div>
          )}

          {/* Hand list */}
          <div style={{marginTop:18,background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`,padding:"14px 16px"}}>
            <div style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>Hand list</div>
            <p style={{margin:0,fontSize:13,fontWeight:500,color:C.sage,lineHeight:1.8,fontFamily:"'Inter',-apple-system,sans-serif",wordSpacing:"2px"}}>{handsArr.join(", ")}</p>
          </div>
        </div>
      </div>
    );
  }

  if(screen==="home")return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Inter',-apple-system,sans-serif",color:C.text,paddingTop:"env(safe-area-inset-top,0px)"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');*{-webkit-font-smoothing:antialiased;}::-webkit-scrollbar{display:none;}`}</style>
      <div style={{maxWidth:430,margin:"0 auto",padding:"28px 20px 180px"}}>

        <div style={{marginBottom:28}}>
          <p style={{margin:"0 0 5px",fontSize:11,fontWeight:700,color:C.muted,letterSpacing:"0.14em",textTransform:"uppercase"}}>Level 1 · Preflop · TAG</p>
          <h1 style={{margin:0,fontSize:34,fontWeight:900,color:C.cream,letterSpacing:"-0.03em",lineHeight:1.05}}>Preflop<br/>Trainer</h1>
        </div>

        {/* Charts button */}
        <button onClick={()=>setScreen("charts")} style={{width:"100%",height:50,marginBottom:20,borderRadius:12,background:C.bg2,border:`1px solid ${C.border}`,color:C.accent,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',-apple-system,sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:8,WebkitTapHighlightColor:"transparent"}}>
          <span style={{fontSize:16}}>▦</span> Range Charts — Lookup Reference
        </button>

        {/* SRS Reviews panel (WaniKani-style) */}
        <div style={{background:reviewDueCount>0?"rgba(169,143,232,0.12)":C.bg2,borderRadius:14,border:`1.5px solid ${reviewDueCount>0?"#a98fe8":C.border}`,padding:"18px 16px",marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:reviewDueCount>0?14:0}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:reviewDueCount>0?"#a98fe8":C.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:5}}>Reviews Due</div>
              <div style={{fontSize:32,fontWeight:900,color:reviewDueCount>0?"#a98fe8":C.muted,letterSpacing:"-0.02em",lineHeight:1}}>{reviewDueCount}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:4}}>
                {reviewDueCount>0 ? "spaced-repetition cards ready" : (nextDueMs!=null ? `next review in ${timeUntil(nextDueMs)}` : "answer questions to start the SRS")}
              </div>
            </div>
            {/* SRS stage breakdown */}
            <div>
              {(()=>{ 
                const inSys=questionsData.map(q=>getStage(progress[q.id])).filter(s=>s>0);
                const app=inSys.filter(s=>s>=1&&s<=4).length;
                const guru=inSys.filter(s=>s===5).length;
                const master=inSys.filter(s=>s===6).length;
                const enl=inSys.filter(s=>s===7).length;
                const burned=inSys.filter(s=>s===8).length;
                return [["Apprentice",app,"#d96060"],["Guru",guru,"#a98fe8"],["Master",master,"#70b4d4"],["Enlightened",enl,"#6db87a"],["Burned",burned,"#4a9d5e"]].map(([l,n,c])=>(
                  <div key={l} style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
                    <div style={{width:6,height:6,borderRadius:"50%",background:c,flexShrink:0}}/>
                    <span style={{fontSize:11,color:C.muted,width:78}}>{l}</span>
                    <span style={{fontSize:11,fontWeight:700,color:n>0?c:C.border}}>{n}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
          {reviewDueCount>0 && (
            <button onClick={startReviews} style={{width:"100%",height:48,borderRadius:12,background:"#a98fe8",color:"#1a2218",fontSize:15,fontWeight:800,border:"none",cursor:"pointer",fontFamily:"'Inter',-apple-system,sans-serif",WebkitTapHighlightColor:"transparent",boxShadow:"0 0 24px rgba(169,143,232,0.25)"}}>
              Start {reviewDueCount} Reviews
            </button>
          )}
        </div>

        {/* Progress card */}
        <div style={{background:C.bg2,borderRadius:14,border:`1px solid ${C.border}`,padding:"18px 16px",marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:5}}>Progress</div>
              <div style={{fontSize:28,fontWeight:900,color:C.accent,letterSpacing:"-0.02em",lineHeight:1}}>{accuracy>0?`${accuracy}%`:"—"}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:3}}>{totalAttempts} attempts · {Object.keys(progress).length} questions seen</div>
            </div>
            <div>
              {[{l:"Mastered",n:mastered,c:"#6db87a"},{l:"Solid",n:solid,c:"#a8d4b0"},{l:"Learning",n:learning,c:"#d4a847"},{l:"Struggling",n:struggling,c:"#d96060"},{l:"Unseen",n:unseen,c:C.muted}].map(s=>(
                <div key={s.l} style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:s.c,flexShrink:0}}/>
                  <span style={{fontSize:11,color:C.muted,width:72}}>{s.l}</span>
                  <span style={{fontSize:11,fontWeight:700,color:s.n>0?s.c:C.border}}>{s.n}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Status bar */}
          <div style={{display:"flex",height:6,borderRadius:3,overflow:"hidden",gap:1}}>
            {[{n:mastered,c:"#6db87a"},{n:solid,c:"#a8d4b0"},{n:learning,c:"#d4a847"},{n:struggling,c:"#d96060"},{n:unseen,c:C.border}].map((s,i)=>(
              <div key={i} style={{flex:s.n,background:s.c,minWidth:s.n>0?2:0,transition:"flex .5s"}}/>
            ))}
          </div>
        </div>

        {/* Session size */}
        <div style={{marginBottom:22}}>
          <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:9}}>Session size</div>
          <div style={{display:"flex",gap:6}}>
            {SESSION_SIZES.map(n=>(
              <button key={n} onClick={()=>setSessionSize(n)} style={{flex:1,height:36,borderRadius:10,border:`1.5px solid ${sessionSize===n?C.accent:C.border}`,background:sessionSize===n?`${C.accent}28`:"transparent",color:sessionSize===n?C.accent:C.muted,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',-apple-system,sans-serif",WebkitTapHighlightColor:"transparent"}}>{n}</button>
            ))}
          </div>
        </div>

        {/* Category performance */}
        {totalAttempts>0&&(
          <div style={{background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`,padding:"16px",marginBottom:22}}>
            <p style={{margin:"0 0 14px",fontSize:11,fontWeight:700,color:C.muted,letterSpacing:"0.14em",textTransform:"uppercase"}}>By Category</p>
            {ALL_CATEGORIES.map(cat=>{
              const cqs=questionsData.filter(q=>q.category===cat);
              const seen=cqs.reduce((a,q)=>a+(progress[q.id]?.seen||0),0);
              const corr=cqs.reduce((a,q)=>a+(progress[q.id]?.correct||0),0);
              const pct=seen>0?Math.round(corr/seen*100):null;
              const col=CAT_COLOR[cat]||C.accent;
              const due=cqs.filter(q=>getWeight(progress[q.id])>1).length;
              return(
                <div key={cat} style={{marginBottom:11}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:5}}>
                    <span style={{fontSize:13,fontWeight:600,color:"#8fa882"}}>{cat}</span>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      {due>0&&<span style={{fontSize:10,color:"#d4a847"}}>{due} due</span>}
                      <span style={{fontSize:13,fontWeight:700,color:pct!=null?col:C.border}}>{pct!=null?`${pct}%`:"—"}</span>
                    </div>
                  </div>
                  <div style={{height:4,background:C.border,borderRadius:2,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${pct||0}%`,background:col,borderRadius:2,transition:"width .5s"}}/>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p style={{margin:"0 0 18px",fontSize:11,fontWeight:700,color:C.muted,letterSpacing:"0.14em",textTransform:"uppercase"}}>Filters</p>
        <FilterRow label="Position" options={ALL_POSITIONS} selected={posF} onToggle={v=>toggle(setPosF,posF,v)} getColor={p=>POS_COLOR[p]||C.accent}/>
        <FilterRow label="Scenario" options={ALL_SCENARIOS} selected={scenF} onToggle={v=>toggle(setScenF,scenF,v)} getColor={()=>"#70b4d4"}/>
        <FilterRow label="Action Type" options={ALL_ACTIONS} selected={actF} onToggle={v=>toggle(setActF,actF,v)} getColor={a=>a==="Fold"?"#d96060":a==="Call"?"#70b4d4":"#6db87a"}/>
        <FilterRow label="Category" options={ALL_CATEGORIES} selected={catF} onToggle={v=>toggle(setCatF,catF,v)} getColor={c=>CAT_COLOR[c]||C.accent}/>
        <FilterRow label="Difficulty" options={ALL_DIFFS} selected={difF} onToggle={v=>toggle(setDifF,difF,v)} getColor={d=>DIFF_COLOR[d]}/>
      </div>

      <div style={{position:"fixed",bottom:0,left:0,right:0,background:`linear-gradient(transparent,${C.bg} 32%,${C.bg})`,padding:"16px 20px",paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 16px)"}}>
        {dueCount>0&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginBottom:10,fontSize:12,color:C.muted}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#d4a847"}}/>
            <span><span style={{color:"#d4a847",fontWeight:700}}>{Math.min(dueCount,sessionSize)}</span> of {sessionSize} will be review questions</span>
          </div>
        )}
        <button onClick={startSession} disabled={!filtered.length} style={{width:"100%",height:56,borderRadius:14,background:filtered.length?C.accent:"#2e3d2b",color:filtered.length?"#1a2218":C.muted,fontSize:16,fontWeight:800,border:"none",cursor:filtered.length?"pointer":"default",fontFamily:"'Inter',-apple-system,sans-serif",letterSpacing:"-0.01em",boxShadow:filtered.length?"0 0 32px rgba(200,168,75,0.22)":"none",WebkitTapHighlightColor:"transparent",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
          {filtered.length>0?<><span>Start {Math.min(sessionSize,filtered.length)} questions</span><span style={{background:"rgba(0,0,0,0.18)",borderRadius:8,padding:"2px 10px",fontSize:13,fontWeight:800}}>SR</span></>:"No questions match"}
        </button>
        {totalAttempts>0&&(
          <button onClick={()=>{setProgress({});saveProgress({});}} style={{width:"100%",marginTop:8,height:40,borderRadius:10,background:"transparent",border:`1px solid ${C.border}`,color:C.muted,fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"'Inter',-apple-system,sans-serif",WebkitTapHighlightColor:"transparent"}}>Reset progress</button>
        )}
      </div>
    </div>
  );

  if(screen==="quiz"&&q){
    const cards=(q.hand||[]).map(c=>({rank:c.slice(0,-1),suit:c.slice(-1)}));
    const ok=q.question_type==='grid'?(gridScore?gridScore.missed===0&&gridScore.tooLoose===0:false):isCorrect(selected, q.correct);
    const qScore=getScore(progress[q.id]);
    return(
      <div style={{position:"fixed",inset:0,background:C.bg,color:C.text,fontFamily:"'Inter',-apple-system,sans-serif",display:"flex",flexDirection:"column",paddingTop:"env(safe-area-inset-top,0px)",paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');*{-webkit-font-smoothing:antialiased;}::-webkit-scrollbar{display:none;}`}</style>
        <div style={{flexShrink:0,padding:"12px 18px 8px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <button onClick={()=>setScreen("home")} style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,padding:"7px 14px",color:C.muted,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Inter',-apple-system,sans-serif",WebkitTapHighlightColor:"transparent"}}>← Home</button>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {streak>0&&<span style={{fontSize:13,fontWeight:700,color:"#6db87a",background:"rgba(109,184,122,0.15)",padding:"4px 10px",borderRadius:8}}>🔥 {streak}</span>}
              <span style={{fontSize:11,fontWeight:700,color:DIFF_COLOR[q.difficulty],background:`${DIFF_COLOR[q.difficulty]}22`,padding:"4px 10px",borderRadius:8,textTransform:"capitalize"}}>{q.difficulty}</span>
              <span style={{fontSize:13,fontWeight:700,color:C.muted}}>{idx+1}<span style={{color:C.border}}>/{queue.length}</span></span>
            </div>
          </div>
          <div style={{height:3,background:C.bg3,borderRadius:2,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${((idx+1)/queue.length)*100}%`,background:accent,borderRadius:2,transition:"width .25s"}}/>
          </div>
        </div>

        <div ref={scrollRef} style={{flex:1,overflowY:"auto",padding:"8px 18px 24px",WebkitOverflowScrolling:"touch"}}>
          <div style={{maxWidth:430,margin:"0 auto"}}>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
              <span style={{fontSize:11,fontWeight:800,color:accent,background:`${accent}20`,padding:"4px 10px",borderRadius:8,textTransform:"uppercase",letterSpacing:"0.08em"}}>{q.category}</span>
              <span style={{fontSize:11,fontWeight:600,color:C.muted,background:C.bg3,border:`1px solid ${C.border}`,padding:"4px 10px",borderRadius:8}}>{q.scenario}</span>
              <span style={{fontSize:11,fontWeight:700,color:POS_COLOR[q.my_position]||C.accent,background:`${POS_COLOR[q.my_position]||C.accent}20`,padding:"4px 10px",borderRadius:8}}>{q.my_position}</span>
              {(()=>{ const st=getStage(progress[q.id]); return (
                <span style={{fontSize:10,fontWeight:700,color:SRS_STAGE_COLOR[st],background:`${SRS_STAGE_COLOR[st]}18`,padding:"4px 10px",borderRadius:8,marginLeft:"auto"}}>{SRS_STAGE_SHORT[st]}</span>
              ); })()}
            </div>

            <details style={{marginBottom:12}}>
              <summary style={{fontSize:11,fontWeight:700,color:C.muted,cursor:"pointer",listStyle:"none",display:"flex",alignItems:"center",gap:6,background:C.bg3,padding:"9px 14px",borderRadius:10,border:`1px solid ${C.border}`,letterSpacing:"0.08em",textTransform:"uppercase"}}>▶ Range Context</summary>
              <div style={{background:C.bg3,padding:"12px 14px",borderRadius:"0 0 10px 10px",border:`1px solid ${C.border}`,borderTop:"none",fontSize:12,fontWeight:500,color:"#8fa882",lineHeight:1.7}}>{q.range_context}</div>
            </details>

            <div style={{background:C.bg2,borderRadius:16,border:`1px solid ${accent}30`,padding:"18px",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                <span style={{fontSize:13,fontWeight:800,color:accent,background:`${accent}20`,padding:"5px 12px",borderRadius:8}}>{q.position}</span>
                <span style={{fontSize:12,fontWeight:500,color:C.muted,flex:1,textAlign:"right",marginLeft:10,lineHeight:1.4}}>{q.situation}</span>
              </div>
              <div style={{display:"flex",gap:10,marginBottom:16}}>
                {cards.map((c,i)=><Card key={i} rank={c.rank} suit={c.suit}/>)}
              </div>
              <p style={{margin:0,fontSize:17,fontWeight:700,color:C.cream,lineHeight:1.55,letterSpacing:"-0.01em"}}>{q.question}</p>
            </div>

            {q.question_type==='grid'?(()=>{
              const RANKS=['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
              const cellHand=(ri,ci)=>ri===ci?RANKS[ri]+RANKS[ri]:ri<ci?RANKS[ri]+RANKS[ci]+'s':RANKS[ci]+RANKS[ri]+'o';
              const required=new Set(q.correct_hands||[]);
              const optional=new Set(q.optional_hands||[]);
              const all=new Set([...required,...optional]);
              const toggleCell=(hand)=>{if(revealed)return;setGridSel(prev=>{const n=new Set(prev);n.has(hand)?n.delete(hand):n.add(hand);return n;});};
              const submitGrid=()=>{
                let hit=0,missed=0,tooLoose=0;
                required.forEach(h=>{gridSel.has(h)?hit++:missed++;});
                optional.forEach(h=>{if(gridSel.has(h))hit++;});
                gridSel.forEach(h=>{if(!all.has(h))tooLoose++;});
                const score={hit,missed,tooLoose,total:required.size};
                setGridScore(score);
                const ok2=missed===0&&tooLoose===0;
                setRevealed(true);
                const prev=progress[q.id]||{seen:0,correct:0,stage:0};
                const ns=nextStage(prev.stage||0,ok2);
                const due=Date.now()+SRS_INTERVALS_MS[ns];
                setProgress(p=>({...p,[q.id]:{seen:prev.seen+1,correct:prev.correct+(ok2?1:0),stage:ns,due}}));
                setStreak(s=>ok2?s+1:0);
                setSession(s=>({correct:s.correct+(ok2?1:0),wrong:s.wrong+(ok2?0:1)}));
                setTimeout(()=>scrollRef.current?.scrollTo({top:0,behavior:'smooth'}),80);
              };
              return(
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(13,1fr)',gap:2,marginBottom:10,userSelect:'none'}}>
                    {RANKS.map((_,ri)=>RANKS.map((_,ci)=>{
                      const hand=cellHand(ri,ci);
                      const inReq=required.has(hand);const inOpt=optional.has(hand);const inAll=all.has(hand);const sel=gridSel.has(hand);
                      let bg,bc,tc;
                      if(revealed){
                        if(inReq&&sel){bg='rgba(109,184,122,0.3)';bc='#6db87a';tc='#afd9b7';}
                        else if(inOpt&&sel){bg='rgba(109,184,122,0.15)';bc='#6db87a66';tc='#6db87a';}
                        else if(inReq&&!sel){bg='rgba(217,150,60,0.3)';bc='#d9963c';tc='#e0b870';}
                        else if(!inAll&&sel){bg='rgba(217,96,96,0.3)';bc='#d96060';tc='#e08080';}
                        else{bg='transparent';bc='transparent';tc='#33442a';}
                      }else{
                        if(sel){bg=`${C.accent}40`;bc=C.accent;tc=C.cream;}
                        else{bg:'transparent';bc=C.border+'44';tc='#3d5033';}
                      }
                      return(
                        <button key={ri*13+ci} onClick={()=>toggleCell(hand)}
                          style={{padding:'2px 0',borderRadius:3,border:`1px solid ${bc}`,background:bg,
                            color:tc,fontSize:7,fontWeight:700,cursor:revealed?'default':'pointer',
                            lineHeight:1.4,minHeight:19,width:'100%',fontFamily:"'Inter',-apple-system,sans-serif"}}>
                          {hand}
                        </button>
                      );
                    }))}
                  </div>
                  {!revealed&&<button onClick={submitGrid} style={{width:'100%',height:50,borderRadius:12,background:C.accent,color:'#1a2218',fontSize:15,fontWeight:800,border:'none',cursor:'pointer',marginBottom:10,fontFamily:"'Inter',-apple-system,sans-serif"}}>Submit Range</button>}
                  {revealed&&gridScore&&(
                    <div style={{display:'flex',gap:8,marginBottom:10}}>
                      {[['✓ Hit',gridScore.hit,'#6db87a'],['○ Missed',gridScore.missed,'#d9963c'],['✗ Too loose',gridScore.tooLoose,'#d96060']].map(([l,v,col])=>(
                        <div key={l} style={{flex:1,background:C.bg3,borderRadius:8,padding:'8px',textAlign:'center',border:`1px solid ${C.border}`}}>
                          <div style={{fontSize:10,color:C.muted,marginBottom:2}}>{l}</div>
                          <div style={{fontSize:18,fontWeight:900,color:col}}>{v}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{fontSize:11,color:C.muted,textAlign:'center',marginBottom:8}}>
                    {revealed
                      ?(gridScore&&gridScore.missed===0&&gridScore.tooLoose===0
                          ?<span style={{color:'#6db87a',fontWeight:700}}>Perfect range ✓</span>
                          :<span style={{color:'#d96060',fontWeight:700}}>
                            {gridScore&&gridScore.missed>0?`Missed ${gridScore.missed} hand${gridScore.missed>1?'s':''}.`:''}{' '}
                            {gridScore&&gridScore.tooLoose>0?`${gridScore.tooLoose} too loose.`:''}
                          </span>)
                      :<span>Tap to select · Green=hit · Orange=missed · Red=too loose</span>
                    }
                  </div>
                </div>
              );
            })():(
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
              {q.options.map((opt,i)=>{
                let bg=C.bg2,bc=C.border,tc="#8fa882",icon=null;
                if(revealed){
                  if(isCorrect(i, q.correct)){bg="rgba(109,184,122,0.10)";bc="#6db87a";tc="#8fd49e";icon="✓";}
                  else if(i===selected){bg="rgba(217,96,96,0.10)";bc="#d96060";tc="#d96060";icon="✗";}
                  else{tc=C.border;}
                }
                return(
                  <button key={i} onClick={()=>choose(i)} disabled={revealed} style={{width:"100%",minHeight:54,padding:"14px 16px",borderRadius:12,border:`1.5px solid ${bc}`,background:bg,color:tc,fontSize:15,fontWeight:600,cursor:revealed?"default":"pointer",textAlign:"left",fontFamily:"'Inter',-apple-system,sans-serif",lineHeight:1.4,display:"flex",alignItems:"center",justifyContent:"space-between",outline:"none",WebkitTapHighlightColor:"transparent",transition:"border-color .1s"}}>
                    <span style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                      <span style={{fontSize:11,fontWeight:800,color:revealed?tc:C.border,flexShrink:0,marginTop:2,letterSpacing:"0.06em"}}>{String.fromCharCode(65+i)}</span>
                      <span>{opt}</span>
                    </span>
                    {icon&&<span style={{fontWeight:900,fontSize:18,flexShrink:0,marginLeft:12}}>{icon}</span>}
                  </button>
                );
              })}
            </div>
            )}

            {revealed&&(
              <div style={{background:ok?"rgba(109,184,122,0.08)":"rgba(217,96,96,0.08)",borderRadius:14,border:`1px solid ${ok?"rgba(109,184,122,0.22)":"rgba(217,96,96,0.22)"}`,padding:"16px",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <div style={{width:24,height:24,borderRadius:6,background:ok?"#6db87a":"#d96060",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:C.bg,flexShrink:0}}>{ok?"✓":"✗"}</div>
                  <span style={{fontSize:12,fontWeight:800,color:ok?"#6db87a":"#d96060",textTransform:"uppercase",letterSpacing:"0.1em"}}>{ok?"Correct":"Incorrect"}</span>
                </div>
                <p style={{margin:0,fontSize:14,fontWeight:500,color:"#8fa882",lineHeight:1.7}}>{q.explanation}</p>
                {!ok&&q.why_wrong&&q.why_wrong[String(selected)]&&(
                  <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${C.border}`}}>
                    <p style={{margin:"0 0 6px",fontSize:10,fontWeight:800,color:"#d96060",letterSpacing:"0.12em",textTransform:"uppercase"}}>Why {String.fromCharCode(65+selected)} is wrong</p>
                    <p style={{margin:0,fontSize:14,fontWeight:500,color:C.muted,lineHeight:1.65}}>{q.why_wrong[String(selected)]}</p>
                  </div>
                )}
                {(()=>{ const p=progress[q.id]; if(!p||!p.stage) return null; const ms=SRS_INTERVALS_MS[p.stage];
                  return (
                    <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <span style={{fontSize:12,fontWeight:700,color:SRS_STAGE_COLOR[p.stage]}}>{SRS_STAGE_LABEL[p.stage]}{p.stage>=8?" 🔥":""}</span>
                      <span style={{fontSize:12,fontWeight:600,color:C.muted}}>{p.stage>=8?"mastered":`next review in ${timeUntil(ms)}`}</span>
                    </div>
                  ); })()}
              </div>
            )}
            {revealed&&(
              <button onClick={next} style={{width:"100%",height:56,borderRadius:14,background:C.accent,color:"#1a2218",fontSize:16,fontWeight:800,border:"none",cursor:"pointer",fontFamily:"'Inter',-apple-system,sans-serif",letterSpacing:"-0.01em",boxShadow:"0 0 28px rgba(200,168,75,0.2)",WebkitTapHighlightColor:"transparent",marginBottom:4}}>
                {idx+1>=queue.length?"See Results →":"Next →"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if(screen==="result"){
    const total=session.correct+session.wrong;
    const acc=total>0?Math.round(session.correct/total*100):0;
    const grade=acc>=85?{l:"Excellent",c:"#6db87a"}:acc>=65?{l:"Good",c:C.accent}:{l:"Keep drilling",c:"#d96060"};
    return(
      <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Inter',-apple-system,sans-serif",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",textAlign:"center",paddingTop:"calc(env(safe-area-inset-top,0px) + 32px)",paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 32px)"}}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');*{-webkit-font-smoothing:antialiased;}`}</style>
        <div style={{fontSize:52,marginBottom:16}}>🃏</div>
        <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:C.muted,letterSpacing:"0.14em",textTransform:"uppercase"}}>Session Complete</p>
        <h2 style={{margin:"0 0 4px",fontSize:56,fontWeight:900,color:C.cream,letterSpacing:"-0.04em",lineHeight:1}}>{acc}%</h2>
        <p style={{margin:"0 0 32px",fontSize:14,fontWeight:700,color:grade.c,letterSpacing:"0.06em",textTransform:"uppercase"}}>{grade.l}</p>
        <div style={{width:"100%",maxWidth:340,background:C.bg2,borderRadius:16,border:`1px solid ${C.border}`,padding:"20px",marginBottom:20}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            {[{l:"Correct",v:session.correct,c:"#6db87a"},{l:"Wrong",v:session.wrong,c:"#d96060"},{l:"Total",v:total,c:C.accent}].map(s=>(
              <div key={s.l} style={{textAlign:"center"}}>
                <div style={{fontSize:28,fontWeight:900,color:s.c,letterSpacing:"-0.02em"}}>{s.v}</div>
                <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginTop:4}}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{width:"100%",maxWidth:340}}>
          <button onClick={startSession} style={{width:"100%",height:56,borderRadius:14,background:C.accent,color:"#1a2218",fontSize:16,fontWeight:800,border:"none",cursor:"pointer",marginBottom:10,fontFamily:"'Inter',-apple-system,sans-serif",boxShadow:"0 0 28px rgba(200,168,75,0.2)",WebkitTapHighlightColor:"transparent"}}>Another {sessionSize}</button>
          <button onClick={()=>setScreen("home")} style={{width:"100%",height:46,borderRadius:12,background:"transparent",border:`1px solid ${C.border}`,color:C.muted,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"'Inter',-apple-system,sans-serif",WebkitTapHighlightColor:"transparent"}}>← Back to Home</button>
        </div>
      </div>
    );
  }
  return null;
}
