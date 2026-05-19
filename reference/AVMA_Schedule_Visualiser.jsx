import { useState, useMemo, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const MS_DAY = 86400000;
const addDays = (d, n) => new Date(d.getTime() + Math.round(n) * MS_DAY);
const daysBetween = (a, b) => Math.round((b.getTime() - a.getTime()) / MS_DAY);
const fmtDate = d => `${d.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]} ${d.getFullYear()}`;
const fmtShort = d => `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
const eom = (y,m) => new Date(y, m+1, 0);

/* ══ SHAFT DATA ══════════════════════════════════════════════ */
const SHAFTS = {
  VS7: {
    label:"VS7 — Downcast", diameter:"7.5m", braceRL:1101.4, finalDepth:591.0, preSink:50.1,
    mainSinkStart: new Date(2025,2,26),
    holdPoint: 533.7, standOff: 545.7, roadwayRoof: 553.7, sumpDepth: 36,
    formations: [
      {name:"Ashfield Shale",code:"ASSH",from:0,to:29},
      {name:"Hawkesbury Sandstone",code:"HBSS",from:29,to:179,aFin:new Date(2026,1,16)},
      {name:"Newport Formation",code:"NPFM",from:179,to:218,aStart:new Date(2026,1,16),aFin:new Date(2026,3,24)},
      {name:"Garie Formation",code:"GRFM",from:218,to:222,aStart:new Date(2026,3,24),aFin:new Date(2026,3,27)},
      {name:"Bald Hill Claystone",code:"BACS",from:222,to:244,aStart:new Date(2026,3,27)},
      {name:"Bulgo Sandstone",code:"BGSS",from:244,to:470},
      {name:"Stanwell Park Claystone",code:"SPCS",from:470,to:481},{name:"Scarborough Sandstone",code:"SBSS",from:481,to:496},
      {name:"Wombarra Claystone",code:"WBCS",from:496,to:523},{name:"Coalcliff Sandstone",code:"CCSS",from:523,to:551},
      {name:"Bulli Seam",code:"BUSM",from:551,to:554},{name:"Loddon Sandstone",code:"LDSS",from:554,to:565},
      {name:"Balgownie Coal",code:"BASM",from:565,to:566},{name:"Lawrence Sandstone",code:"LRSS",from:566,to:574},
      {name:"Cape Horn Seam",code:"CHSM",from:574,to:575},{name:"Unnamed",code:"UNNM",from:575,to:582},
      {name:"Unclassified",code:"UNCL",from:582,to:591},
    ],
    actual: [
      {date:new Date(2025,2,26),depth:50.1},
      {date:eom(2025,3),depth:57.8},{date:eom(2025,4),depth:61.5},{date:eom(2025,5),depth:66.6},
      {date:eom(2025,6),depth:81.2},{date:eom(2025,7),depth:87.6},{date:eom(2025,8),depth:102.0},
      {date:eom(2025,9),depth:115.6},{date:eom(2025,10),depth:132.2},{date:eom(2025,11),depth:150.0},
      {date:eom(2026,0),depth:169.1},{date:eom(2026,1),depth:185.1},{date:eom(2026,2),depth:206.4},
      {date:eom(2026,3),depth:223.4},{date:new Date(2026,4,18),depth:233.0},
    ],
  },
  VS8: {
    label:"VS8 — Upcast", diameter:"5.55m", braceRL:1102.4, finalDepth:548.1, preSink:46.8,
    mainSinkStart: new Date(2024,9,23),
    holdPoint: 528.1, standOff: 541.4, roadwayRoof: 548.1, sumpDepth: 0,
    formations: [
      {name:"Ashfield Shale",code:"ASSH",from:0,to:30},
      {name:"Hawkesbury Sandstone",code:"HBSS",from:30,to:187,aFin:new Date(2025,7,28)},
      {name:"Newport Formation",code:"NPFM",from:187,to:217,aStart:new Date(2025,7,28),aFin:new Date(2025,9,16)},
      {name:"Garie Formation",code:"GRFM",from:217,to:222,aStart:new Date(2025,9,16),aFin:new Date(2025,9,21)},
      {name:"Bald Hill Claystone",code:"BACS",from:222,to:251,aStart:new Date(2025,9,21),aFin:new Date(2025,10,30)},
      {name:"Bulgo Sandstone",code:"BGSS",from:251,to:478,aStart:new Date(2025,10,30)},
      {name:"Stanwell Park Claystone",code:"SPCS",from:478,to:485},{name:"Scarborough Sandstone",code:"SBSS",from:485,to:499},
      {name:"Wombarra Claystone",code:"WBCS",from:499,to:531},{name:"Coalcliff Sandstone",code:"CCSS",from:531,to:548.1},
    ],
    actual: [
      {date:new Date(2024,9,23),depth:46.8},
      {date:eom(2024,11),depth:63.8},{date:eom(2025,0),depth:71.6},{date:eom(2025,1),depth:84.8},
      {date:eom(2025,2),depth:99.4},{date:eom(2025,3),depth:116.6},{date:eom(2025,4),depth:128.4},
      {date:eom(2025,5),depth:144.1},{date:eom(2025,6),depth:165.3},{date:eom(2025,7),depth:178.8},
      {date:eom(2025,8),depth:205.8},{date:eom(2025,9),depth:227.8},{date:eom(2025,10),depth:251.9},
      {date:eom(2025,11),depth:271.6},{date:eom(2026,0),depth:292.6},{date:eom(2026,1),depth:313.3},
      {date:eom(2026,2),depth:334.4},{date:eom(2026,3),depth:351.4},{date:new Date(2026,4,18),depth:369.1},
    ],
  },
};

const RATE_GROUPS = [
  {id:"HBSS",label:"Hawkesbury SS",default:0.70,color:"#FCE4B0",type:"sandstone"},
  {id:"NPFM",label:"Newport Fm",default:0.55,color:"#AACFE8",type:"transitional"},
  {id:"GRFM",label:"Garie Fm",default:0.55,color:"#CBC4E0",type:"transitional"},
  {id:"BACS",label:"Bald Hill CS",default:0.45,color:"#E8A87C",type:"claystone"},
  {id:"BGSS",label:"Bulgo SS",default:0.80,color:"#FFF2CC",type:"sandstone"},
  {id:"SPCS",label:"Stanwell Park CS",default:0.45,color:"#D9C4A0",type:"claystone"},
  {id:"SBSS",label:"Scarborough SS",default:0.70,color:"#FCE4B0",type:"sandstone"},
  {id:"WBCS",label:"Wombarra CS",default:0.45,color:"#E8A87C",type:"claystone"},
  {id:"CCSS",label:"Coalcliff SS",default:0.70,color:"#FCE4B0",type:"sandstone"},
  {id:"LOWER",label:"Lower Fms",default:0.50,color:"#B0B0B0",type:"mixed"},
];

const LOWER_CODES = new Set(["BUSM","LDSS","BASM","LRSS","CHSM","UNNM","UNCL"]);
const LITHO_COLORS = {ASSH:"#B0B0B0",HBSS:"#FCE4B0",NPFM:"#AACFE8",GRFM:"#CBC4E0",BACS:"#E8A87C",BGSS:"#FFF2CC",SPCS:"#D9C4A0",SBSS:"#FCE4B0",WBCS:"#E8A87C",CCSS:"#FCE4B0",BUSM:"#404040",LDSS:"#FCE4B0",BASM:"#404040",LRSS:"#FCE4B0",CHSM:"#404040",UNNM:"#D9D9D9",UNCL:"#E8E8E8"};
const DARK_CODES = new Set(["BUSM","BASM","CHSM"]);
const getRateKey = c => LOWER_CODES.has(c) ? "LOWER" : c;
const typeColor = t => t==="claystone"?"#c05000":t==="sandstone"?"#2a7a2a":t==="transitional"?"#6668a8":"#163D4C";

function getFormationAt(shaft, depth) {
  for (const fm of shaft.formations) { if (depth >= fm.from && depth < fm.to) return fm; }
  return shaft.formations[shaft.formations.length - 1];
}

/* ══ PROJECTION ENGINE ═══════════════════════════════════════ */
function computeProjection(shaft, rates, curDepth, today) {
  const results = []; let runDate = new Date(today);
  for (const fm of shaft.formations) {
    const thick = fm.to - fm.from;
    if (fm.to <= curDepth) { results.push({...fm,thickness:thick,remaining:0,days:0,rate:0,entryDate:null,exitDate:null,status:"complete"}); continue; }
    const rem = fm.from < curDepth ? fm.to - curDepth : thick;
    const rate = rates[getRateKey(fm.code)] || 0.5;
    const days = rem / rate;
    const isActive = fm.from < curDepth;
    const entry = isActive && fm.aStart ? fm.aStart : new Date(runDate);
    const exit = addDays(runDate, days);
    results.push({...fm,thickness:thick,remaining:Math.round(rem*10)/10,days:Math.round(days*10)/10,rate,entryDate:entry,exitDate:exit,status:isActive?"active":"pending"});
    runDate = exit;
  }
  return {formations:results,totalDays:Math.round(daysBetween(today,runDate)),completionDate:runDate};
}

function computeTimelineProjection(shaft, quarters, curDepth, today) {
  let depth = curDepth, date = new Date(today);
  const points = [{date:date.getTime(), depth}];
  for (const q of quarters) {
    if (depth >= shaft.finalDepth) break;
    const effectiveStart = date > q.start ? date : q.start;
    if (effectiveStart >= q.end) continue;
    const daysInQ = daysBetween(effectiveStart, q.end);
    const advance = Math.min(q.rate * daysInQ, shaft.finalDepth - depth);
    depth += advance;
    date = advance < q.rate * daysInQ ? addDays(effectiveStart, advance / q.rate) : q.end;
    points.push({date:date.getTime(), depth});
    if (depth >= shaft.finalDepth) break;
  }
  return points;
}

function buildPlannedCurve(shaft, rates) {
  const pts = [{date:shaft.mainSinkStart.getTime(),depth:shaft.preSink}];
  let cum = 0;
  for (const fm of shaft.formations) {
    if (fm.to <= shaft.preSink) continue;
    const s = Math.max(fm.from, shaft.preSink), sink = fm.to - s;
    if (sink <= 0) continue;
    cum += sink / (rates[getRateKey(fm.code)] || 0.5);
    pts.push({date:addDays(shaft.mainSinkStart,cum).getTime(),depth:fm.to});
  }
  return pts;
}

function buildProjectedCurve(shaft, rates, curDepth, today) {
  const pts = [{date:today.getTime(),depth:curDepth}];
  let rd = new Date(today);
  for (const fm of shaft.formations) {
    if (fm.to <= curDepth) continue;
    const rem = fm.from < curDepth ? fm.to - curDepth : fm.to - fm.from;
    rd = addDays(rd, rem / (rates[getRateKey(fm.code)] || 0.5));
    pts.push({date:rd.getTime(),depth:fm.to});
  }
  return pts;
}

function buildPlannedTimeline(shaft, rates) {
  const bars = []; let rd = new Date(shaft.mainSinkStart);
  for (const fm of shaft.formations) {
    if (fm.to <= shaft.preSink) continue;
    const sink = fm.to - Math.max(fm.from, shaft.preSink);
    if (sink<=0) continue;
    const days = sink / (rates[getRateKey(fm.code)]||0.5);
    bars.push({...fm,thickness:fm.to-fm.from,entryDate:new Date(rd),exitDate:addDays(rd,days),days:Math.round(days)});
    rd = addDays(rd, days);
  }
  return bars;
}

function generateQuarters(startDate, count) {
  const qs = [];
  let y = startDate.getFullYear(), m = Math.floor(startDate.getMonth()/3)*3;
  for (let i=0;i<count;i++) {
    const qm = m + i*3, qy = y + Math.floor(qm/12), qmn = qm%12;
    qs.push({label:`Q${Math.floor(qmn/3)+1} ${qy}`, start:new Date(qy,qmn,1), end:new Date(qy,qmn+3,0), rate:0.65});
  }
  return qs;
}

/* ══ COMPONENT ═══════════════════════════════════════════════ */
export default function App() {
  const [activeShaft, setActiveShaft] = useState("VS7");
  const [rates, setRates] = useState(()=>{const r={};RATE_GROUPS.forEach(g=>r[g.id]=g.default);return r;});
  const [rateMode, setRateMode] = useState("geology");
  const [rightTab, setRightTab] = useState("schedule");
  const [hoveredFm, setHoveredFm] = useState(null);
  const [depthOverrides, setDepthOverrides] = useState({VS7:null, VS8:null});

  const today = useMemo(()=>new Date(2026,4,19),[]);
  const shaft = SHAFTS[activeShaft];
  const otherKey = activeShaft==="VS7"?"VS8":"VS7";
  const defaultDepth = shaft.actual[shaft.actual.length-1].depth;
  const curDepth = depthOverrides[activeShaft] ?? defaultDepth;
  const handleDepthChange = useCallback((val)=>{const v=parseFloat(val);if(!isNaN(v)&&v>=0&&v<=SHAFTS[activeShaft].finalDepth)setDepthOverrides(p=>({...p,[activeShaft]:v}));},[activeShaft]);

  const [timelineRates, setTimelineRates] = useState(()=>{
    const qs = generateQuarters(new Date(2026,3,1), 8);
    return {VS7:qs.map(q=>({...q,rate:0.60})), VS8:qs.map(q=>({...q,rate:0.75}))};
  });

  const projection = useMemo(()=>computeProjection(shaft,rates,curDepth,today),[shaft,rates,curDepth,today]);
  const otherProj = useMemo(()=>computeProjection(SHAFTS[otherKey],rates,SHAFTS[otherKey].actual[SHAFTS[otherKey].actual.length-1].depth,today),[otherKey,rates,today]);

  const totalRemaining = shaft.finalDepth - curDepth;
  const pctComplete = ((curDepth/shaft.finalDepth)*100).toFixed(1);

  const timelinePts = useMemo(()=>rateMode==="timeline"?computeTimelineProjection(shaft,timelineRates[activeShaft],curDepth,today):null,[rateMode,shaft,timelineRates,activeShaft,curDepth,today]);
  const projDays = rateMode==="geology" ? projection.totalDays : (()=>{if(!timelinePts) return "—"; const l=timelinePts[timelinePts.length-1]; return l.depth>=shaft.finalDepth?Math.round((l.date-today.getTime())/MS_DAY):"Extend qtrs";})();
  const projEnd = rateMode==="geology" ? projection.completionDate : (()=>{if(!timelinePts) return null; const l=timelinePts[timelinePts.length-1]; return l.depth>=shaft.finalDepth?new Date(l.date):null;})();
  const weightedRate = typeof projDays==="number"&&projDays>0 ? totalRemaining/projDays : 0;

  const ptdDays = daysBetween(shaft.mainSinkStart, today);
  const ptdRate = ((curDepth - shaft.preSink) / ptdDays).toFixed(3);

  const scurveData = useMemo(() => {
    const actualPts = shaft.actual.map(a=>({date:a.date.getTime(),depth:a.depth}));
    const planned = buildPlannedCurve(shaft, rates);
    const projPts = rateMode==="geology" ? buildProjectedCurve(shaft,rates,curDepth,today) : computeTimelineProjection(shaft,timelineRates[activeShaft],curDepth,today);
    const all = new Set();
    [actualPts,planned,projPts].forEach(a=>a.forEach(p=>all.add(p.date)));
    const sorted = [...all].sort((a,b)=>a-b);
    const interp = (arr,t) => {
      if(t<arr[0].date||t>arr[arr.length-1].date) return null;
      for(let i=0;i<arr.length-1;i++){if(t>=arr[i].date&&t<=arr[i+1].date){const f=(t-arr[i].date)/(arr[i+1].date-arr[i].date);return arr[i].depth+f*(arr[i+1].depth-arr[i].depth);}}
      return arr[arr.length-1].depth;
    };
    return sorted.map(t=>({time:t,planned:interp(planned,t),actual:interp(actualPts,t),projected:interp(projPts,t)}));
  },[shaft,rates,curDepth,today,rateMode,timelineRates,activeShaft]);

  const ganttPlanned = useMemo(()=>buildPlannedTimeline(shaft,rates),[shaft,rates]);
  const handleRate = useCallback((id,val)=>{const v=parseFloat(val);if(!isNaN(v)&&v>=0.05&&v<=2.0)setRates(p=>({...p,[id]:v}));},[]);
  const handleTimelineRate = useCallback((sk,idx,val)=>{const v=parseFloat(val);if(!isNaN(v)&&v>=0.05&&v<=2.0)setTimelineRates(p=>({...p,[sk]:p[sk].map((q,i)=>i===idx?{...q,rate:v}:q)}));},[]);

  const colH = 500, px = colH / shaft.finalDepth;

  const plannedAtToday = useMemo(()=>{
    const c=buildPlannedCurve(shaft,rates); const t=today.getTime();
    for(let i=0;i<c.length-1;i++){if(t>=c[i].date&&t<=c[i+1].date){const f=(t-c[i].date)/(c[i+1].date-c[i].date);return c[i].depth+f*(c[i+1].depth-c[i].depth);}}
    return c[c.length-1].depth;
  },[shaft,rates,today]);
  const variance = curDepth - plannedAtToday;

  const ganttStart = shaft.mainSinkStart;
  const ganttEnd = useMemo(()=>{
    const ends = [...ganttPlanned.map(g=>g.exitDate.getTime()),...projection.formations.filter(f=>f.exitDate).map(f=>f.exitDate.getTime())];
    return new Date(Math.max(...ends)+45*MS_DAY);
  },[ganttPlanned,projection]);
  const ganttTotalDays = daysBetween(ganttStart, ganttEnd);
  const todayPct = (daysBetween(ganttStart,today)/ganttTotalDays)*100;

  return (
    <div style={{fontFamily:"Arial,sans-serif",background:"#f3f3f3",minHeight:"100vh"}}>
      <svg width="0" height="0" style={{position:"absolute"}}><defs>
        <pattern id="mH" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#c0c0c0"/><line x1="0" y1="0" x2="0" y2="6" stroke="#a0a0a0" strokeWidth="1.2"/></pattern>
        <pattern id="mHd" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="#ccc"/><line x1="0" y1="0" x2="0" y2="4" stroke="#aaa" strokeWidth="1"/></pattern>
      </defs></svg>

      {/* HEADER */}
      <div style={{background:"#E60033",padding:"10px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontWeight:800,fontSize:16,color:"#fff",letterSpacing:1.5}}>AVMA</span>
          <span style={{color:"rgba(255,255,255,0.8)",fontSize:12}}>Shaft Schedule Visualiser</span>
        </div>
        <div style={{display:"flex",gap:3}}>
          {["VS7","VS8"].map(k=><button key={k} onClick={()=>setActiveShaft(k)} style={{padding:"4px 16px",border:"none",borderRadius:4,cursor:"pointer",fontWeight:700,fontSize:11,background:activeShaft===k?"#fff":"rgba(255,255,255,0.18)",color:activeShaft===k?"#E60033":"#fff"}}>{k}</button>)}
        </div>
      </div>

      {/* KPI */}
      <div style={{background:"#163D4C",padding:"5px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:4}}>
        <div style={{color:"#fff",fontSize:11,fontWeight:600}}>{shaft.label} — Ø{shaft.diameter} — RL {shaft.braceRL}m — Final {shaft.finalDepth}m</div>
        <div style={{display:"flex",gap:14}}>
          {[
            {l:"Depth",v:`${curDepth.toFixed(1)}m`,c:"#F5B216"},{l:"Remaining",v:`${totalRemaining.toFixed(1)}m`,c:"#fff"},
            {l:"Complete",v:`${pctComplete}%`,c:"#F5B216"},{l:"Wtd Rate",v:`${weightedRate.toFixed(2)} m/d`,c:"#fff"},
            {l:"Days Left",v:`${projDays}`,c:"#F5B216"},{l:"End Date",v:projEnd?fmtDate(projEnd):"Extend qtrs",c:"#F5B216"},
          ].map((k,i)=><div key={i} style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.5)",fontSize:7,textTransform:"uppercase",letterSpacing:0.3}}>{k.l}</div><div style={{color:k.c,fontSize:11,fontWeight:700}}>{k.v}</div></div>)}
        </div>
      </div>

      {/* MAIN */}
      <div style={{display:"flex"}}>
        {/* LITHO COLUMN */}
        <div style={{width:160,flexShrink:0,background:"#fff",borderRight:"1px solid #ddd",padding:"10px 6px"}}>
          <div style={{fontSize:9,fontWeight:700,color:"#163D4C",marginBottom:4,textTransform:"uppercase",letterSpacing:0.4}}>Lithology</div>
          {/* Depth input */}
          <div style={{marginBottom:6,display:"flex",alignItems:"center",gap:4}}>
            <label style={{fontSize:8,color:"#888"}}>Depth:</label>
            <input type="number" step="0.1" value={curDepth}
              onChange={e=>handleDepthChange(e.target.value)}
              style={{width:56,padding:"2px 4px",border:"1px solid #ccc",borderRadius:3,fontSize:11,fontWeight:600}}/>
            <span style={{fontSize:7,color:"#aaa"}}>m</span>
            {depthOverrides[activeShaft]!==null&&<button onClick={()=>setDepthOverrides(p=>({...p,[activeShaft]:null}))} style={{fontSize:7,color:"#E60033",background:"none",border:"none",cursor:"pointer",padding:0}}>↺</button>}
          </div>
          {/* Column with depth scale alongside */}
          <div style={{display:"flex",gap:0}}>
            {/* Depth scale (left) */}
            <div style={{width:28,flexShrink:0,position:"relative",height:colH}}>
              {[0,50,100,150,200,250,300,350,400,450,500,550,Math.round(shaft.finalDepth)].filter(d=>d<=shaft.finalDepth).map(d=>(
                <div key={d} style={{position:"absolute",top:d*px-5,right:2,fontSize:6,color:"#888",fontWeight:d%100===0?600:400,lineHeight:"10px",textAlign:"right"}}>
                  {d}
                </div>
              ))}
              {/* Current depth on scale */}
              <div style={{position:"absolute",top:curDepth*px-5,right:2,fontSize:7,color:"#E60033",fontWeight:700,lineHeight:"10px",textAlign:"right"}}>{curDepth.toFixed(0)}</div>
            </div>
            {/* Visual column */}
            <div style={{flex:1,position:"relative",height:colH,border:"1px solid #888",borderRadius:2,overflow:"hidden"}}>
              {shaft.formations.map((fm,i)=>{const top=fm.from*px,h=(fm.to-fm.from)*px;return(
                <div key={i} onMouseEnter={()=>setHoveredFm(fm.code)} onMouseLeave={()=>setHoveredFm(null)}
                  style={{position:"absolute",top,left:0,right:0,height:h,background:LITHO_COLORS[fm.code],borderBottom:"1px solid rgba(0,0,0,0.06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:h>22?7:0,fontWeight:700,color:DARK_CODES.has(fm.code)?"#fff":"#444",outline:hoveredFm===fm.code?"2px solid #E60033":"none",outlineOffset:-2,zIndex:hoveredFm===fm.code?3:1}}>{h>28?fm.code:""}</div>
              );})}
              <svg style={{position:"absolute",top:0,left:0,width:"100%",height:curDepth*px,zIndex:4,pointerEvents:"none"}}><rect width="100%" height="100%" fill="url(#mH)" opacity="0.65"/></svg>
              {curDepth*px>30&&<div style={{position:"absolute",top:(curDepth*px)/2-6,left:0,right:0,textAlign:"center",fontSize:7,fontWeight:800,color:"#777",letterSpacing:2,zIndex:5,pointerEvents:"none"}}>MINED</div>}
              <div style={{position:"absolute",top:curDepth*px-1,left:0,right:0,height:2,background:"#E60033",zIndex:6}}/>
              {shaft.standOff&&<div style={{position:"absolute",top:shaft.standOff*px,left:0,right:0,height:0,zIndex:3,borderTop:"1.5px dashed #F5B216"}}/>}
              {/* Tick marks on column edge */}
              {[0,100,200,300,400,500].filter(d=>d<=shaft.finalDepth).map(d=><div key={d} style={{position:"absolute",top:d*px,left:0,width:4,borderTop:"1px solid rgba(0,0,0,0.2)",zIndex:2}}/>)}
            </div>
          </div>
          <div style={{marginTop:4,display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
            <svg width="10" height="10"><rect width="10" height="10" fill="url(#mH)" stroke="#999" strokeWidth="0.5" rx="1"/></svg>
            <span style={{fontSize:7,color:"#888"}}>Mined</span>
            <div style={{width:10,height:2,background:"#E60033",borderRadius:1}}/>
            <span style={{fontSize:7,color:"#888"}}>Current</span>
            <div style={{width:10,height:0,borderTop:"1.5px dashed #F5B216"}}/>
            <span style={{fontSize:7,color:"#888"}}>Stand-off</span>
          </div>
          <div style={{marginTop:5,fontSize:7,color:"#666",lineHeight:1.5,background:"#f8f8f8",borderRadius:3,padding:"3px 5px",border:"1px solid #eee"}}>
            <div>Hold: <b>{shaft.holdPoint}m</b> · Stand-off: <b>{shaft.standOff}m</b></div>
            <div>Roadway: <b>{shaft.roadwayRoof}m</b> · Final: <b>{shaft.finalDepth}m</b></div>
            {shaft.sumpDepth>0&&<div>Sump: <b>{shaft.sumpDepth}m</b></div>}
          </div>
        </div>

        {/* RATES PANEL */}
        <div style={{width:250,flexShrink:0,background:"#fafafa",borderRight:"1px solid #ddd",padding:"10px 10px",overflowY:"auto"}}>
          <div style={{display:"flex",gap:2,marginBottom:8}}>
            {[{id:"geology",l:"Geology"},{id:"timeline",l:"Timeline"}].map(m=>(
              <button key={m.id} onClick={()=>setRateMode(m.id)} style={{flex:1,padding:"4px 0",border:"1px solid #ccc",borderRadius:3,cursor:"pointer",fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:0.3,background:rateMode===m.id?"#163D4C":"#fff",color:rateMode===m.id?"#fff":"#163D4C"}}>{m.l}</button>
            ))}
          </div>

          {rateMode==="geology"&&(<>
            <div style={{fontSize:9,fontWeight:700,color:"#163D4C",marginBottom:6,textTransform:"uppercase",letterSpacing:0.4}}>Advance Rates (m/day)</div>
            {RATE_GROUPS.map(g=>{
              const hasFormation = shaft.formations.some(f=>getRateKey(f.code)===g.id);
              if(!hasFormation && g.id!=="LOWER") return null;
              if(g.id==="LOWER" && !shaft.formations.some(f=>LOWER_CODES.has(f.code))) return null;
              return (
              <div key={g.id} style={{marginBottom:5}} onMouseEnter={()=>setHoveredFm(g.id==="LOWER"?null:g.id)} onMouseLeave={()=>setHoveredFm(null)}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:3}}>
                    <div style={{width:7,height:7,borderRadius:2,background:g.color,border:"1px solid rgba(0,0,0,0.1)"}}/>
                    <span style={{fontSize:9,fontWeight:600,color:"#333"}}>{g.label}</span>
                  </div>
                  <input type="number" step="0.01" min="0.10" max="2.00" value={rates[g.id]} onChange={e=>handleRate(g.id,e.target.value)}
                    style={{width:44,padding:"1px 2px",border:"1px solid #ccc",borderRadius:3,fontSize:10,fontWeight:700,textAlign:"right",color:typeColor(g.type)}}/>
                </div>
                <input type="range" min="0.10" max="1.50" step="0.01" value={rates[g.id]} onChange={e=>handleRate(g.id,e.target.value)}
                  style={{width:"100%",height:3,accentColor:typeColor(g.type)}}/>
              </div>);
            })}
            <div style={{marginTop:8,borderTop:"1px solid #e0e0e0",paddingTop:6}}>
              <div style={{fontSize:8,color:"#888",marginBottom:3,textTransform:"uppercase"}}>Presets</div>
              {[{l:"Conservative",m:-0.10},{l:"Base Case",m:0},{l:"Optimistic",m:0.10}].map(p=>(
                <button key={p.l} onClick={()=>{const r={};RATE_GROUPS.forEach(g=>r[g.id]=Math.max(0.1,+(g.default+p.m).toFixed(2)));setRates(r);}}
                  style={{display:"block",width:"100%",padding:"3px 5px",marginBottom:2,border:"1px solid #ccc",borderRadius:3,background:"#fff",cursor:"pointer",fontSize:9,fontWeight:600,color:"#163D4C",textAlign:"left"}}>
                  {p.l} {p.m>0?`(+${p.m})`:p.m<0?`(${p.m})`:"(default)"}
                </button>
              ))}
            </div>
          </>)}

          {rateMode==="timeline"&&(<>
            <div style={{fontSize:9,fontWeight:700,color:"#163D4C",marginBottom:6,textTransform:"uppercase",letterSpacing:0.4}}>{activeShaft} Quarterly Rates (m/day)</div>
            {timelineRates[activeShaft].map((q,i)=>{
              const depthAtQ = curDepth + timelineRates[activeShaft].slice(0,i).reduce((s,qq)=>{
                const es = qq.start > today ? qq.start : today;
                return es >= qq.end ? s : s + qq.rate * daysBetween(es, qq.end);
              },0);
              const fm = getFormationAt(shaft, Math.min(shaft.finalDepth-0.1, depthAtQ));
              const done = depthAtQ >= shaft.finalDepth;
              return (
                <div key={i} style={{marginBottom:5,opacity:q.end<today||done?0.35:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:1}}>
                    <div>
                      <span style={{fontSize:9,fontWeight:700,color:"#163D4C"}}>{q.label}</span>
                      {fm&&!done&&<span style={{fontSize:7,color:"#888",marginLeft:4}}>~{fm.code}</span>}
                      {done&&<span style={{fontSize:7,color:"#2a7a2a",marginLeft:4}}>✓ Complete</span>}
                    </div>
                    <input type="number" step="0.01" min="0.10" max="2.00" value={q.rate} disabled={done}
                      onChange={e=>handleTimelineRate(activeShaft,i,e.target.value)}
                      style={{width:44,padding:"1px 2px",border:"1px solid #ccc",borderRadius:3,fontSize:10,fontWeight:700,textAlign:"right",color:"#163D4C"}}/>
                  </div>
                  {!done&&<input type="range" min="0.10" max="1.50" step="0.01" value={q.rate}
                    onChange={e=>handleTimelineRate(activeShaft,i,e.target.value)}
                    style={{width:"100%",height:3,accentColor:"#163D4C"}}/>}
                </div>
              );
            })}
            <div style={{fontSize:8,color:"#888",marginTop:4,lineHeight:1.4}}>
              Calendar-based rates, independent of formation boundaries. ~code shows expected formation at quarter start.
            </div>
          </>)}

          <div style={{marginTop:8,borderTop:"1px solid #e0e0e0",paddingTop:6}}>
            <div style={{fontSize:8,color:"#888",marginBottom:2,textTransform:"uppercase"}}>{otherKey}</div>
            <div style={{fontSize:10,color:"#333",lineHeight:1.5}}>
              Depth: <b>{SHAFTS[otherKey].actual[SHAFTS[otherKey].actual.length-1].depth.toFixed(1)}m</b> / {SHAFTS[otherKey].finalDepth}m<br/>
              PTD: <b>{((SHAFTS[otherKey].actual[SHAFTS[otherKey].actual.length-1].depth-SHAFTS[otherKey].preSink)/daysBetween(SHAFTS[otherKey].mainSinkStart,today)).toFixed(3)} m/d</b><br/>
              {rateMode==="geology"&&<>End: <b>{fmtDate(otherProj.completionDate)}</b></>}
            </div>
          </div>
        </div>

        {/* RIGHT TABS */}
        <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
          <div style={{display:"flex",gap:0,borderBottom:"2px solid #163D4C",background:"#fff"}}>
            {[{id:"schedule",l:"Schedule"},{id:"scurve",l:"S-Curve"},{id:"gantt",l:"Gantt"}].map(t=>(
              <button key={t.id} onClick={()=>setRightTab(t.id)} style={{padding:"6px 14px",border:"none",cursor:"pointer",fontSize:10,fontWeight:700,background:rightTab===t.id?"#163D4C":"transparent",color:rightTab===t.id?"#fff":"#163D4C",borderRadius:"4px 4px 0 0",textTransform:"uppercase",letterSpacing:0.3}}>{t.l}</button>
            ))}
          </div>
          <div style={{flex:1,overflow:"auto",padding:"10px 12px",background:"#fff"}}>

            {/* SCHEDULE TABLE */}
            {rightTab==="schedule"&&(<table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
              <thead><tr style={{background:"#163D4C"}}>
                {["Formation","From","To","Thick.","Rem.","Rate","Days","Act. Rate","Entry","Exit",""].map(h=><th key={h} style={{padding:"4px 4px",color:"#fff",fontWeight:600,fontSize:8,textAlign:"left",whiteSpace:"nowrap",textTransform:"uppercase"}}>{h}</th>)}
              </tr></thead>
              <tbody>{projection.formations.map((fm,i)=>{const isA=fm.status==="active",isC=fm.status==="complete";
                const origFm=shaft.formations.find(f=>f.code===fm.code);
                const hasActual=origFm?.aStart&&origFm?.aFin;
                const actDays=hasActual?daysBetween(origFm.aStart,origFm.aFin):null;
                const actRate=hasActual&&actDays>0?fm.thickness/actDays:null;
                const showActStart=origFm?.aStart; const showActFin=origFm?.aFin;
                return(
                <tr key={i} onMouseEnter={()=>setHoveredFm(fm.code)} onMouseLeave={()=>setHoveredFm(null)}
                  style={{background:isA?"#FFF8E8":isC?"#f0f0f0":i%2===0?"#fff":"#fafafa",borderBottom:"1px solid #eee",opacity:isC?0.4:1}}>
                  <td style={{padding:"3px 4px",fontWeight:600,whiteSpace:"nowrap"}}><span style={{display:"inline-block",width:6,height:6,borderRadius:2,marginRight:3,background:LITHO_COLORS[fm.code],border:"1px solid rgba(0,0,0,0.1)",verticalAlign:"middle"}}/>{fm.name}</td>
                  <td style={{padding:"3px 4px",textAlign:"right"}}>{fm.from}</td><td style={{padding:"3px 4px",textAlign:"right"}}>{fm.to}</td>
                  <td style={{padding:"3px 4px",textAlign:"right"}}>{fm.thickness.toFixed(1)}</td>
                  <td style={{padding:"3px 4px",textAlign:"right",fontWeight:isA?700:400,color:isA?"#E60033":undefined}}>{isC?"—":`${fm.remaining}m`}</td>
                  <td style={{padding:"3px 4px",textAlign:"right"}}>{isC?"—":fm.rate.toFixed(2)}</td>
                  <td style={{padding:"3px 4px",textAlign:"right",fontWeight:600}}>{isC?"—":fm.days.toFixed(0)}</td>
                  <td style={{padding:"3px 4px",textAlign:"right",fontWeight:700,color:actRate?actRate>0.6?"#2a7a2a":"#e65100":"#aaa"}}>{actRate?`${actRate.toFixed(2)}`:(isC&&showActFin?"—":"")}{actDays?<span style={{fontWeight:400,color:"#888",fontSize:8}}> ({actDays}d)</span>:""}</td>
                  <td style={{padding:"3px 4px",whiteSpace:"nowrap",fontSize:9}}>{isC&&showActStart?fmtDate(showActStart):fm.entryDate?fmtDate(fm.entryDate):"—"}</td>
                  <td style={{padding:"3px 4px",whiteSpace:"nowrap",fontSize:9}}>{isC&&showActFin?fmtDate(showActFin):fm.exitDate?fmtDate(fm.exitDate):"—"}</td>
                  <td style={{padding:"3px 4px"}}>{isC?<span style={{fontSize:7,color:"#888"}}>✓</span>:isA?<span style={{fontSize:7,color:"#E60033",fontWeight:700}}>● ACTIVE</span>:<span style={{fontSize:7,color:"#bbb"}}>○</span>}</td>
                </tr>);})}</tbody>
              <tfoot><tr style={{background:"#E60033",color:"#fff",fontWeight:700}}>
                <td style={{padding:"5px 4px"}}>TOTAL</td><td style={{padding:"5px 4px",textAlign:"right"}}>0</td><td style={{padding:"5px 4px",textAlign:"right"}}>{shaft.finalDepth}</td>
                <td style={{padding:"5px 4px",textAlign:"right"}}>{shaft.finalDepth}</td><td style={{padding:"5px 4px",textAlign:"right"}}>{totalRemaining.toFixed(1)}m</td>
                <td style={{padding:"5px 4px",textAlign:"right"}}>{weightedRate.toFixed(2)}</td><td style={{padding:"5px 4px",textAlign:"right"}}>{projDays}</td>
                <td style={{padding:"5px 4px"}}></td>
                <td style={{padding:"5px 4px",fontSize:9}}>{fmtDate(today)}</td><td style={{padding:"5px 4px",fontSize:9}}>{projEnd?fmtDate(projEnd):"—"}</td><td/>
              </tr></tfoot>
            </table>)}

            {/* S-CURVE */}
            {rightTab==="scurve"&&(<div>
              <div style={{display:"flex",gap:12,marginBottom:8,alignItems:"center",flexWrap:"wrap"}}>
                {[{c:"#163D4C",l:"Planned (geology rates)",d:false},{c:"#E60033",l:"Actual (EOM data)",d:false},{c:"#E60033",l:rateMode==="geology"?"Projected (geology)":"Projected (timeline)",d:true}].map((leg,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:3}}>
                    <div style={{width:16,height:leg.d?0:3,background:leg.d?"none":leg.c,borderTop:leg.d?`2px dashed ${leg.c}`:"none"}}/>
                    <span style={{fontSize:8,color:"#666"}}>{leg.l}</span>
                  </div>
                ))}
                <div style={{fontSize:8,color:"#aaa",marginLeft:"auto"}}>PTD: {ptdRate} m/d over {ptdDays}d</div>
              </div>
              <ResponsiveContainer width="100%" height={380}>
                <LineChart data={scurveData} margin={{top:8,right:20,left:5,bottom:20}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee"/>
                  <XAxis dataKey="time" type="number" scale="time" domain={["dataMin","dataMax"]} tickFormatter={v=>fmtShort(new Date(v))} tick={{fontSize:8}}/>
                  <YAxis reversed domain={[0,shaft.finalDepth]} tick={{fontSize:8}} label={{value:"Depth (m)",angle:-90,position:"insideLeft",fontSize:8,fill:"#888"}}/>
                  <Tooltip labelFormatter={v=>fmtDate(new Date(v))} formatter={(v,n)=>[v!=null?`${v.toFixed(1)}m`:"—",n==="planned"?"Planned":n==="actual"?"Actual":"Projected"]} contentStyle={{fontSize:10,borderRadius:4}}/>
                  <ReferenceLine x={today.getTime()} stroke="#E60033" strokeDasharray="4 4" strokeWidth={1} label={{value:"Today",position:"top",fontSize:7,fill:"#E60033"}}/>
                  <ReferenceLine y={curDepth} stroke="#E60033" strokeDasharray="2 3" strokeWidth={0.6}/>
                  {shaft.standOff&&<ReferenceLine y={shaft.standOff} stroke="#F5B216" strokeDasharray="4 2" strokeWidth={1} label={{value:"Stand-off",position:"right",fontSize:7,fill:"#F5B216"}}/>}
                  {shaft.formations.filter(f=>f.to<shaft.finalDepth&&f.to>shaft.preSink).map(f=><ReferenceLine key={f.code} y={f.to} stroke="#eee" strokeWidth={0.5}/>)}
                  <Line type="monotone" dataKey="planned" stroke="#163D4C" strokeWidth={2} dot={false} connectNulls/>
                  <Line type="monotone" dataKey="actual" stroke="#E60033" strokeWidth={2.5} dot={{r:2,fill:"#E60033"}} connectNulls/>
                  <Line type="monotone" dataKey="projected" stroke="#E60033" strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls/>
                </LineChart>
              </ResponsiveContainer>
              <div style={{marginTop:6,padding:"6px 10px",borderRadius:4,background:variance>0?"#e8f5e9":"#fff3e0",border:`1px solid ${variance>0?"#a5d6a7":"#ffcc80"}`,fontSize:10,display:"flex",alignItems:"center",gap:10}}>
                <b style={{color:variance>0?"#2a7a2a":"#e65100"}}>{variance>0?"▲":"▼"} {Math.abs(variance).toFixed(1)}m {variance>0?"ahead":"behind"} plan</b>
                <span style={{color:"#666"}}>Day {ptdDays} — Planned: {plannedAtToday.toFixed(1)}m vs Actual: {curDepth.toFixed(1)}m</span>
              </div>
              <div style={{marginTop:10,fontSize:9}}>
                <div style={{fontWeight:700,color:"#163D4C",marginBottom:3,textTransform:"uppercase",fontSize:8}}>Monthly Actual Rates</div>
                <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                  {shaft.actual.slice(1).map((a,i)=>{
                    const prev=shaft.actual[i]; const adv=a.depth-prev.depth; const days=daysBetween(prev.date,a.date);
                    const rate=days>0?adv/days:0; const fm=getFormationAt(shaft,a.depth);
                    return <div key={i} style={{padding:"3px 5px",background:"#f8f8f8",borderRadius:3,border:"1px solid #eee",minWidth:58}}>
                      <div style={{fontWeight:600,color:"#333",fontSize:9}}>{fmtShort(a.date)}</div>
                      <div style={{color:rate>0.6?"#2a7a2a":rate>0.4?"#e65100":"#c00",fontWeight:700,fontSize:10}}>{rate.toFixed(2)}</div>
                      <div style={{color:"#aaa",fontSize:6}}>{adv.toFixed(1)}m/{days}d · {fm?.code}</div>
                    </div>;
                  })}
                </div>
              </div>
            </div>)}

            {/* GANTT */}
            {rightTab==="gantt"&&(<div>
              <div style={{display:"flex",gap:12,marginBottom:6}}>
                {[{f:"#163D4C",o:0.2,l:"Planned"},{f:"litho",o:1,l:"Projected"}].map((leg,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:3}}><div style={{width:12,height:6,background:leg.f==="litho"?"#AACFE8":leg.f,opacity:leg.o,borderRadius:2,border:"1px solid rgba(0,0,0,0.1)"}}/><span style={{fontSize:8,color:"#666"}}>{leg.l}</span></div>)}
                <div style={{display:"flex",alignItems:"center",gap:3}}><svg width="12" height="6"><rect width="12" height="6" fill="url(#mHd)" rx="2"/></svg><span style={{fontSize:8,color:"#666"}}>Mined</span></div>
              </div>
              <div style={{overflowX:"auto"}}>
                <div style={{position:"relative",marginLeft:140,height:16,marginBottom:1}}>
                  {(()=>{const ts=[];let d=new Date(ganttStart.getFullYear(),Math.floor(ganttStart.getMonth()/3)*3,1);while(d<=ganttEnd){const p=(daysBetween(ganttStart,d)/ganttTotalDays)*100;if(p>=0&&p<=100)ts.push({d:new Date(d),p});d=new Date(d.getFullYear(),d.getMonth()+3,1);}return ts.map((t,i)=><div key={i} style={{position:"absolute",left:`${t.p}%`,fontSize:6,color:"#888",fontWeight:600,whiteSpace:"nowrap",transform:"translateX(-50%)",borderLeft:"1px solid #ddd",paddingLeft:2}}>{fmtShort(t.d)}</div>);})()}
                </div>
                {ganttPlanned.map((fm,i)=>{const ps=(daysBetween(ganttStart,fm.entryDate)/ganttTotalDays)*100,pw=(fm.days/ganttTotalDays)*100;
                  const pf=projection.formations.find(f=>f.code===fm.code);const isC=pf?.status==="complete",isA=pf?.status==="active";
                  const hp=pf?.entryDate&&pf?.exitDate;const prs=hp?(daysBetween(ganttStart,pf.entryDate)/ganttTotalDays)*100:0;const prw=hp?(pf.days/ganttTotalDays)*100:0;
                  return <div key={i} style={{display:"flex",alignItems:"center",height:18,marginBottom:1}} onMouseEnter={()=>setHoveredFm(fm.code)} onMouseLeave={()=>setHoveredFm(null)}>
                    <div style={{width:140,flexShrink:0,fontSize:8,fontWeight:600,color:"#333",display:"flex",alignItems:"center",gap:2,whiteSpace:"nowrap",overflow:"hidden"}}>
                      <div style={{width:5,height:5,borderRadius:2,background:LITHO_COLORS[fm.code],border:"1px solid rgba(0,0,0,0.08)",flexShrink:0}}/>{fm.name}
                    </div>
                    <div style={{flex:1,position:"relative",height:"100%",background:i%2===0?"#fafafa":"#fff"}}>
                      <div style={{position:"absolute",left:`${todayPct}%`,top:0,bottom:0,width:1,background:"#E60033",zIndex:5,opacity:0.4}}/>
                      <div style={{position:"absolute",left:`${ps}%`,width:`${pw}%`,top:2,height:6,background:"#163D4C",opacity:0.12,borderRadius:2}}/>
                      {(isC||isA)&&<svg style={{position:"absolute",left:`${ps}%`,width:`${isC?pw:Math.max(0,todayPct-ps)}%`,top:2,height:6,borderRadius:2,overflow:"hidden"}}><rect width="100%" height="100%" fill="url(#mHd)" rx="2"/></svg>}
                      {hp&&!isC&&<div style={{position:"absolute",left:`${prs}%`,width:`${prw}%`,top:9,height:6,background:LITHO_COLORS[fm.code],borderRadius:2,border:"1px solid rgba(0,0,0,0.1)",boxShadow:isA?"0 0 0 1px #E60033":"none"}}>{prw>2.5&&<span style={{fontSize:5,color:DARK_CODES.has(fm.code)?"#fff":"#333",fontWeight:700,paddingLeft:2,lineHeight:"6px"}}>{pf.days.toFixed(0)}d</span>}</div>}
                    </div>
                  </div>;
                })}
                <div style={{position:"relative",marginLeft:140,height:12,marginTop:2}}>
                  <div style={{position:"absolute",left:`${todayPct}%`,transform:"translateX(-50%)",fontSize:6,fontWeight:700,color:"#E60033",whiteSpace:"nowrap"}}>▼ {fmtDate(today)}</div>
                </div>
              </div>
              <div style={{marginTop:10,padding:"6px 10px",background:"#f8f8f8",borderRadius:4,border:"1px solid #e0e0e0",fontSize:9,display:"flex",gap:16,flexWrap:"wrap"}}>
                <div><span style={{color:"#888"}}>Start:</span> <b>{fmtDate(shaft.mainSinkStart)}</b></div>
                <div><span style={{color:"#888"}}>Elapsed:</span> <b>{ptdDays}d</b></div>
                <div><span style={{color:"#888"}}>Remaining:</span> <b style={{color:"#E60033"}}>{projDays}d</b></div>
                <div><span style={{color:"#888"}}>End:</span> <b style={{color:"#163D4C"}}>{projEnd?fmtDate(projEnd):"—"}</b></div>
              </div>
            </div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
