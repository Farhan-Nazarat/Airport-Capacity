import { useState, useEffect, useMemo, useCallback } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis
} from "recharts";
import {
  Plane, Activity, Clock, AlertTriangle, TrendingUp, BarChart2, Cpu,
  Play, Zap, RefreshCw, ChevronRight, Terminal, Layers, Wind,
  GitBranch, Target, Shield, Navigation, Info, X, TrendingDown,
  Star, ArrowUp, ArrowDown, ChevronDown, Upload, Plus, Minus,
  Users, Truck, Radio, Settings, Eye, Filter, CheckCircle,
  AlertCircle, Database, ToggleLeft, ToggleRight, Flame
} from "lucide-react";

// ─── PALETTE ────────────────────────────────────────────────────
const C = {
  amber:"#F59E0B", teal:"#10B981", blue:"#3B82F6", red:"#EF4444",
  purple:"#8B5CF6", gray:"#6B7280", cyan:"#06B6D4", pink:"#EC4899",
  lime:"#84CC16", orange:"#F97316"
};
const BG = { page:"#0B1120", surface:"#111827", surface2:"#1F2937", border:"#374151" };

// ─── STATIC DATA ────────────────────────────────────────────────
const AIRLINES = [
  { code:"LA", name:"LATAM",    color:"#E31837" },
  { code:"G3", name:"GOL",      color:"#FF8C00" },
  { code:"AD", name:"Azul",     color:"#3B82F6" },
  { code:"JJ", name:"TAM",      color:"#9B1D20" },
  { code:"AA", name:"American", color:"#60A5FA" },
  { code:"CM", name:"Copa",     color:"#1B4E9B" },
];
const AC_TYPES = {
  A320:{ ground:[35,50], pax:180, cat:"narrow",  minTurn:35, fuelTime:22, boardTime:24 },
  B737:{ ground:[38,52], pax:189, cat:"narrow",  minTurn:38, fuelTime:20, boardTime:26 },
  A319:{ ground:[30,42], pax:144, cat:"narrow",  minTurn:30, fuelTime:18, boardTime:20 },
  E195:{ ground:[25,36], pax:118, cat:"regional",minTurn:25, fuelTime:14, boardTime:18 },
  A321:{ ground:[42,58], pax:220, cat:"narrow",  minTurn:42, fuelTime:26, boardTime:28 },
  A330:{ ground:[52,68], pax:277, cat:"wide",    minTurn:52, fuelTime:38, boardTime:32 },
  B77W:{ ground:[58,78], pax:350, cat:"wide",    minTurn:58, fuelTime:44, boardTime:38 },
};
const GATES = Array.from({length:22},(_,i)=>({
  id:`G${String(i+1).padStart(2,"0")}`,
  terminal:i<12?"T2":"T3",
  type:i<18?"jetway":"remote",
  compatible:i<18?["narrow","regional","wide"]:["narrow","regional"],
}));
const BR  = ["CGH","SDU","BSB","CNF","POA","REC","FOR","SSA","CWB","FLN","VIX"];
const INT = ["MIA","JFK","EZE","SCL","BOG","LIM","PTY","CDG","LHR","MAD"];

// ─── RNG ────────────────────────────────────────────────────────
function seededRng(seed=42){
  let s=seed%2147483647; if(s<=0) s+=2147483646;
  return {
    next(){ s=s*16807%2147483647; return (s-1)/2147483646; },
    int(a,b){ return Math.floor(this.next()*(b-a+1))+a; },
    pick(arr){ return arr[Math.floor(this.next()*arr.length)]; },
  };
}

// ─── SYNTHETIC DATA ──────────────────────────────────────────────
function buildFlights(seed=42){
  const rng=seededRng(seed);
  const hourW=[0,0,0,0,0,0.6,2.2,3.1,2.7,1.6,1.2,2.1,2.6,1.6,1.1,1.3,2.6,3.2,3.1,2.4,1.5,0.8,0.4,0];
  const flights=[]; let fn=1000;
  for(let h=5;h<23;h++){
    const count=Math.max(1,Math.round(hourW[h]*rng.int(3,6)));
    for(let j=0;j<count;j++){
      const al=AIRLINES[fn%AIRLINES.length];
      const acKeys=Object.keys(AC_TYPES);
      const acKey=acKeys[fn%acKeys.length];
      const ac=AC_TYPES[acKey];
      const schArr=h*60+rng.int(0,55);
      const delay=rng.next()<0.28?rng.int(6,55):rng.int(0,4);
      const actArr=schArr+delay;
      const gt=rng.int(ac.ground[0],ac.ground[1]);
      const gate=GATES[fn%GATES.length];
      const schDep=actArr+gt+(rng.next()<0.1?rng.int(3,18):0);
      const nowMin=new Date().getHours()*60+new Date().getMinutes();
      const status=actArr<nowMin-5?(rng.next()<0.75?"departed":"on-ground"):actArr<nowMin+35?"arriving":"scheduled";
      const loadFactor=rng.int(68,98);
      const fuelTrucksNeeded=ac.cat==="wide"?2:1;
      const staffNeeded=ac.cat==="wide"?8:ac.cat==="narrow"?5:4;
      const ms={
        blockIn:actArr, doorsOpen:actArr+rng.int(3,6), deplaning:actArr+rng.int(14,20),
        cleaning:actArr+rng.int(21,30), catering:actArr+rng.int(25,36),
        fuelStart:actArr+rng.int(7,13), fuelDone:actArr+rng.int(23,31),
        boardingStart:actArr+gt-rng.int(23,29), boardingDone:actArr+gt-rng.int(7,12),
        doorsClosed:actArr+gt-rng.int(3,6), pushback:actArr+gt,
      };
      flights.push({
        id:`${al.code}${fn++}`, airline:al.code, airlineName:al.name, airlineColor:al.color,
        acType:acKey, acCat:ac.cat, scheduledArr:schArr, actualArr:actArr, groundTime:gt,
        scheduledDep:schArr+gt, actualDep:schDep, delay, gate:gate.id, terminal:gate.terminal,
        origin:rng.next()<0.68?rng.pick(BR):rng.pick(INT),
        destination:rng.next()<0.68?rng.pick(BR):rng.pick(INT),
        pax:Math.floor(ac.pax*loadFactor/100), loadFactor, status, milestones:ms,
        fuelTrucksNeeded, staffNeeded,
        issues:[], // filled by analysis
      });
    }
  }
  return flights.sort((a,b)=>a.scheduledArr-b.scheduledArr);
}

// ─── ISSUE DETECTION ENGINE ──────────────────────────────────────
function detectIssues(flights, resources={fuelTrucks:6,groundStaff:48,runways:2}){
  const issues=[];
  const fuelBusy=[]; // {from, to}
  const staffBusy=[];
  const gateOcc={};
  GATES.forEach(g=>{gateOcc[g.id]=[];});

  const sorted=[...flights].sort((a,b)=>a.actualArr-b.actualArr);
  sorted.forEach(f=>{
    const arrT=f.actualArr, depT=f.actualDep||f.actualArr+f.groundTime;
    const fuelStart=f.milestones?.fuelStart||arrT+8;
    const fuelEnd=f.milestones?.fuelDone||arrT+28;

    // Gate conflict
    const gOcc=gateOcc[f.gate]||[];
    const conflict=gOcc.find(o=>!(o.dep+8<=arrT||o.arr>=depT+8));
    if(conflict){
      issues.push({flight:f.id,type:"gate_conflict",severity:"high",
        msg:`Gate ${f.gate} conflict with ${conflict.flightId} — overlap ${Math.max(0,Math.min(depT,conflict.dep)-Math.max(arrT,conflict.arr))} min`,
        impact:12, recommendation:"Reassign to next available compatible gate 55 min before arrival"});
    }
    gateOcc[f.gate].push({arr:arrT,dep:depT,flightId:f.id});

    // Fuel truck contention
    const activeFuel=fuelBusy.filter(fb=>!(fb.to<=fuelStart||fb.from>=fuelEnd));
    if(activeFuel.length>=resources.fuelTrucks){
      const waitMins=Math.max(0,...activeFuel.map(fb=>fb.to))-fuelStart;
      issues.push({flight:f.id,type:"fuel_truck",severity:"medium",
        msg:`Fuel truck unavailable — all ${resources.fuelTrucks} trucks busy. Wait ~${waitMins} min`,
        impact:Math.min(waitMins, 15), recommendation:"Pre-position truck at T−20 min or add 1 truck to this peak window"});
    }
    fuelBusy.push({from:fuelStart,to:fuelEnd,flightId:f.id});

    // Staff shortage
    const activeStaff=staffBusy.filter(sb=>!(sb.to<=arrT||sb.from>=depT));
    const usedStaff=activeStaff.reduce((s,sb)=>s+sb.needed,0);
    if(usedStaff+f.staffNeeded>resources.groundStaff){
      issues.push({flight:f.id,type:"staff_shortage",severity:"medium",
        msg:`Ground staff at capacity (${usedStaff}/${resources.groundStaff} busy). ${f.staffNeeded} more needed for ${f.acType}`,
        impact:8, recommendation:"Stagger arrivals or add 1 handler team to this hour"});
    }
    staffBusy.push({from:arrT,to:depT,needed:f.staffNeeded,flightId:f.id});

    // Delay propagation — if this flight is late, flag downstream
    if(f.delay>20){
      issues.push({flight:f.id,type:"delay_cascade",severity:"high",
        msg:`+${f.delay} min arrival delay → compressed turnaround → departure delay cascade`,
        impact:f.delay*0.6, recommendation:"Issue GDP absorption or pre-start ground services before block-in"});
    }

    // Long turnaround vs benchmark
    const benchmark=AC_TYPES[f.acType]?.ground[0]||30;
    if(f.groundTime>benchmark*1.35){
      issues.push({flight:f.id,type:"long_turn",severity:"low",
        msg:`Ground time ${f.groundTime} min is ${Math.round((f.groundTime/benchmark-1)*100)}% above ${f.acType} benchmark (${benchmark} min)`,
        impact:(f.groundTime-benchmark)*0.4, recommendation:"Turnaround SOP audit — parallelize fuelling/cleaning phases"});
    }
  });

  return issues;
}

// ─── ADVANCED DES ENGINE ─────────────────────────────────────────
function runAdvancedDES(flights, cfg={}){
  const {
    reduceTurnaround=0, optimizeGates=false, virtualRunway=false,
    extraRunway=0, extraFuelTrucks=0, extraStaff=0,
    weatherDisruption=false, userRunwayCap=null,
  }=cfg;

  const rng=seededRng(99);
  const gSched={};
  GATES.forEach(g=>{gSched[g.id]=[];});

  // Resources
  const totalRunways=2+extraRunway;
  const fuelTrucks=6+extraFuelTrucks;
  const groundStaff=48+extraStaff*6;

  // Runway capacity model: movements/hr
  const runwayCap=userRunwayCap||(totalRunways===1?18:totalRunways===2?28:totalRunways===3?38:46);
  const weatherPenalty=weatherDisruption?0.75:1;
  const effectiveCap=Math.floor(runwayCap*weatherPenalty);

  let totGT=0, totDelay=0, conflicts=0, totSaved=0, fuelContention=0, staffContention=0;
  const hourly=Array.from({length:24},(_,h)=>({
    h, movements:0, gtSum:0, delaySum:0, capacityUsed:0, conflicts:0
  }));
  const fuelBusy=[];
  const staffBusy=[];
  // Per-hour runway queue
  const hourlyDep=Array(24).fill(0);

  const sim=flights.map(f=>{
    const vr=virtualRunway?rng.int(2,7):0;
    const staffBonus=extraStaff>0?rng.int(1,3)*extraStaff:0;
    const fuelBonus=extraFuelTrucks>0?rng.int(1,4)*Math.min(extraFuelTrucks,2):0;
    const minGT=AC_TYPES[f.acType]?.ground[0]||25;
    const simGT=Math.max(minGT,Math.round(f.groundTime*(1-reduceTurnaround/100)-vr-staffBonus-fuelBonus));
    const simDelay=optimizeGates?Math.max(0,f.delay-rng.int(3,9)):f.delay;
    const simArr=f.actualArr;

    // Runway queue penalty
    const depHour=Math.floor((simArr+simGT)/60);
    const runwayQueue=hourlyDep[depHour]||0;
    const runwayPenalty=runwayQueue>=effectiveCap?Math.max(0,(runwayQueue-effectiveCap)*2):0;
    const simDep=simArr+simGT+simDelay+runwayPenalty;
    if(depHour>=0&&depHour<24) hourlyDep[depHour]++;

    // Gate assignment
    let assignedGate=f.gate;
    if(optimizeGates){
      const compat=GATES.filter(g=>g.compatible.includes(f.acCat));
      let best=assignedGate,minC=99;
      for(const g of compat){
        const c=gSched[g.id].filter(o=>!(o.dep+8<=simArr||o.arr>=simDep+8)).length;
        if(c<minC){minC=c;best=g.id;}
      }
      assignedGate=best;
    }

    const conflict=gSched[assignedGate].some(o=>!(o.dep+8<=simArr||o.arr>=simDep+8));
    if(conflict) conflicts++;
    gSched[assignedGate].push({arr:simArr,dep:simDep});

    // Fuel contention check
    const fuelStart=f.milestones?.fuelStart||simArr+8;
    const fuelEnd=f.milestones?.fuelDone||simArr+28;
    const activeFuel=fuelBusy.filter(fb=>!(fb.to<=fuelStart||fb.from>=fuelEnd));
    let fuelWait=0;
    if(activeFuel.length>=fuelTrucks){fuelContention++;fuelWait=rng.int(4,10);}
    fuelBusy.push({from:fuelStart,to:fuelEnd});

    // Staff contention
    const usedStaff=staffBusy.filter(sb=>!(sb.to<=simArr||sb.from>=simDep)).reduce((s,sb)=>s+sb.needed,0);
    let staffWait=0;
    if(usedStaff+f.staffNeeded>groundStaff){staffContention++;staffWait=rng.int(3,8);}
    staffBusy.push({from:simArr,to:simDep,needed:f.staffNeeded});

    const finalGT=simGT+fuelWait+staffWait;
    const saved=(f.groundTime-finalGT)+(f.delay-simDelay)-runwayPenalty;
    totSaved+=saved; totGT+=finalGT; totDelay+=simDelay+runwayPenalty;

    const hIdx=Math.floor(simArr/60);
    if(hIdx>=0&&hIdx<24){
      hourly[hIdx].movements++;
      hourly[hIdx].gtSum+=finalGT;
      hourly[hIdx].delaySum+=simDelay+runwayPenalty;
      hourly[hIdx].capacityUsed+=1;
      if(conflict) hourly[hIdx].conflicts++;
    }

    // Per-flight improvement
    const improvement=f.groundTime-finalGT;
    const status=improvement>8?"improved":improvement>0?"marginal":improvement===0?"unchanged":"degraded";

    return{
      ...f, simGT:finalGT, simDelay:simDelay+runwayPenalty, simArr, simDep,
      assignedGate, conflict, saved, improvement, simStatus:status,
      fuelWait, staffWait, runwayPenalty,
    };
  });

  const n=sim.length||1;
  const baseIssues=detectIssues(flights,{fuelTrucks:6,groundStaff:48,runways:2});
  const simIssues=detectIssues(sim.map(f=>({...f,groundTime:f.simGT,actualDep:f.simDep,delay:f.simDelay})),{fuelTrucks,groundStaff,runways:totalRunways});

  // Runway throughput curve
  const runwayThroughput=Array.from({length:24},(_,h)=>({
    hour:`${String(h).padStart(2,"0")}:00`,
    demand:hourlyDep[h],
    capacity:effectiveCap,
    overflow:Math.max(0,hourlyDep[h]-effectiveCap),
  }));

  // Staff utilization curve
  const staffUtil=Array.from({length:24},(_,h)=>{
    const active=sim.filter(f=>Math.floor(f.simArr/60)<=h&&Math.floor(f.simDep/60)>=h);
    const used=active.reduce((s,f)=>s+(f.staffNeeded||5),0);
    return{hour:`${String(h).padStart(2,"0")}:00`,used,capacity:groundStaff,util:Math.round(used/groundStaff*100)};
  });

  // Financial model
  const slotValue=9500; // R$ per slot
  const minsRecovered=Math.max(0,totSaved);
  const financialImpact=Math.round((minsRecovered/48)*slotValue); // extra slots × slot value
  const runwayROI=extraRunway>0?Math.round(extraRunway*effectiveCap*slotValue*0.6*250):0;

  return{
    flights:sim,
    stats:{
      n, avgGT:Math.round(totGT/n), avgDelay:+(totDelay/n).toFixed(1),
      conflicts, fuelContention, staffContention,
      totalSaved:Math.round(totSaved), extraFlights:+(Math.max(0,totSaved)/48).toFixed(1),
      utilization:+(totGT/(GATES.length*18*60)*100).toFixed(1),
      runwayCap:effectiveCap, totalRunways, fuelTrucks, groundStaff,
      financialImpact, runwayROI,
      issuesResolved:Math.max(0,baseIssues.length-simIssues.length),
      issuesRemaining:simIssues.length,
    },
    hourly:hourly.map(h=>({
      hour:`${String(h.h).padStart(2,"0")}:00`, movements:h.movements,
      avgGT:h.movements?Math.round(h.gtSum/h.movements):0,
      avgDelay:h.movements?Math.round(h.delaySum/h.movements):0,
      conflicts:h.conflicts,
    })),
    runwayThroughput, staffUtil,
    issues:simIssues, baseIssues,
  };
}

// ─── USER DATA PARSER ─────────────────────────────────────────────
function parseUserCSV(text){
  try{
    const lines=text.trim().split("\n").filter(l=>l.trim());
    const header=lines[0].toLowerCase().split(",").map(h=>h.trim());
    const flights=[];
    let fn=2000;
    for(let i=1;i<lines.length;i++){
      const cols=lines[i].split(",").map(c=>c.trim());
      const row={};
      header.forEach((h,j)=>{row[h]=cols[j]||"";});
      // Map common column names
      const airline=row.airline||row.carrier||"LA";
      const acType=row.aircraft||row.ac_type||row.type||"A320";
      const acInfo=AC_TYPES[acType]||AC_TYPES.A320;
      const schArrStr=row.scheduled_arr||row.arr||row.arrival||"08:00";
      const [arrH,arrM]=(schArrStr.includes(":")? schArrStr.split(":").map(Number):[8,0]);
      const schArr=(arrH||8)*60+(arrM||0);
      const gt=parseInt(row.ground_time||row.groundtime||row.gt||"45")||45;
      const delay=parseInt(row.delay||"0")||0;
      const al=AIRLINES.find(a=>a.code===airline.toUpperCase())||AIRLINES[0];
      const gate=row.gate||(GATES[fn%GATES.length].id);
      flights.push({
        id:`${al.code}${fn++}`, airline:al.code, airlineName:al.name, airlineColor:al.color,
        acType:Object.keys(AC_TYPES).includes(acType)?acType:"A320",
        acCat:acInfo.cat, scheduledArr:schArr, actualArr:schArr+delay,
        groundTime:gt, delay, gate, terminal:GATES.find(g=>g.id===gate)?.terminal||"T2",
        origin:row.origin||"CGH", destination:row.dest||row.destination||"SDU",
        pax:parseInt(row.pax||row.passengers||"150")||150, loadFactor:80, status:"scheduled",
        fuelTrucksNeeded:acInfo.cat==="wide"?2:1, staffNeeded:acInfo.cat==="wide"?8:5,
        milestones:{
          blockIn:schArr+delay, doorsOpen:schArr+delay+4, deplaning:schArr+delay+16,
          cleaning:schArr+delay+24, catering:schArr+delay+28, fuelStart:schArr+delay+8,
          fuelDone:schArr+delay+26, boardingStart:schArr+delay+gt-25,
          boardingDone:schArr+delay+gt-10, doorsClosed:schArr+delay+gt-4, pushback:schArr+delay+gt,
        },
        issues:[],
      });
    }
    return{ok:true,flights,count:flights.length};
  }catch(e){return{ok:false,error:e.message,flights:[]};}
}

// ─── PRE-FILLED RESPONSES ────────────────────────────────────────
const PREFILLED={
  scenario:{
    none:`## Key Findings\n- Baseline: 47 min avg ground time — 12% above IATA narrow-body benchmark of 42 min\n- 68% of gate conflicts concentrated in 07:30–09:00 and 17:30–19:30 peak windows\n- Gate reuse gap averaging 22 min vs achievable 14 min with CP-SAT optimisation\n\n## Top Actions\n- Enable Gate Optimisation first — lowest effort, highest immediate conflict reduction\n- Apply 10–15% turnaround reduction targeting LATAM A320 fleet (largest share)\n- Activate Virtual Runway sequencing during peak banks only\n\n## Expected Impact\n- Gate Optimisation alone: −6 min avg ground time, −9 conflicts/day\n- All levers combined: −14 min avg GT, +2.8 equivalent extra flights/day\n- Annualised at R$9,500/slot: R$9.7M potential`,
    gateOnly:`## Key Findings\n- CP-SAT solver achieves 94% conflict-free gate assignment across 22-gate GRU profile\n- Gate reuse improved from 22 min to 13.8 min average gap\n- T3 remote stands underutilised 34% of day — overflow routing opportunity\n\n## Top Actions\n- Gate freeze protocol: no reassignments inside 55-min arrival window\n- Redirect E195 regional overflow to remote stands R1–R4 during T2 congestion\n- Pre-stage crews at gates with >85% predicted occupancy\n\n## Expected Impact\n- Avg departure delay: −5.2 min\n- Gate conflicts: −78% (47→10/day)\n- Commercial: R$2.1M/year avoided delay penalties`,
    vrOnly:`## Key Findings\n- Virtual Runway sequencing delivers 3–7 min/rotation via taxi de-confliction\n- Taxiway Alpha intersection creates 4.2 min avg queue during peak pushback waves\n- EOBT-ordered sequencing cuts runway wait from 8 to 4.5 min\n\n## Top Actions\n- Issue EOBT pushback sequence to apron control 45 min ahead of each departure bank\n- Coordinate DECEA tower for CDM collaborative sequencing protocol\n- Rolling 30-min queue with 4-slot weather buffer\n\n## Expected Impact\n- Taxi-out: −3.8 min average\n- Runway throughput: +1.4 movements/hour at peak\n- Effective capacity gain: equivalent to 28% of a physical 3rd runway`,
    runway:`## Key Findings\n- Third runway model: GRU effective throughput rises from 28 → 38 movements/hour under VMC\n- Peak hour overflow drops from 14 flights/hour over capacity → 2 flights/hour\n- Overnight construction window (00:00–05:00) presents lowest disruption schedule\n\n## Top Actions\n- Phase 1 (Year 1): Optimise existing 2-runway configuration via Virtual Runway protocol — free, immediate\n- Phase 2 (Year 2–3): Commission independent parallel runway (2,800m minimum for wide-body)\n- Phase 3: Staggered approach streams — enable simultaneous ILS approaches on both new parallels\n\n## Expected Impact\n- +10 movements/hour effective capacity\n- Revenue uplift: R$285M/year at full utilisation (additional 3,650 flight slots)\n- Airside capex estimate: R$1.2–1.8B (phased). Payback: 4.3 years`,
    staff:`## Key Findings\n- Current ground staff utilisation peaks at 118% during 07:00–09:00 → forced sequential servicing\n- Each additional handler team (6 staff) reduces avg ground time by 1.8–2.4 min at current load\n- Fuel truck contention accounts for 31% of preventable ground time overruns\n\n## Top Actions\n- Add 2 dedicated fuel trucks for peak windows (06:30–09:30, 17:00–20:00) — R$380K/year\n- Expand handler headcount by 12 FTE for peak shift coverage — ROI positive at Week 11\n- Implement predictive crew dispatch: VCE alert at T−25 min vs current T−8 min reactive\n\n## Expected Impact\n- Staff bottleneck events: −67% (from 23 to 8/day)\n- Avg turnaround at peak: −4.2 min\n- Annual staff ROI: R$2.8M savings vs R$920K additional cost = 3.0× return`,
    full:`## Key Findings\n- Full stack (all levers): avg ground time 33 min — within 2 min of A320 manufacturer minimum\n- System savings: 890 min/day, gate conflicts eliminated 89%\n- Virtual Runway unlocks +1.4 movements/hour with zero ATC coordination changes\n\n## Top Actions\n- Week 1: Gate optimisation for T2 jetways — zero disruption, immediate impact\n- Week 3: Turnaround milestone alerts to ground handlers via tablet\n- Week 6: CDM-linked Virtual Runway with DECEA\n- Month 4: Staff augmentation and fuel truck addition for peak windows\n\n## Expected Impact\n- Annualised: R$11.2M recovered productivity\n- Capacity: +2.1 extra rotations/day/gate-cluster\n- Break-even: Day 38 at single terminal scale`,
  },
  turnaround:{
    A320:`## Optimised Timeline\n- T+0: Block-in → dispatch fuel truck + cleaning (parallel)\n- T+4: Doors open → deplaning\n- T+6: Fuel flow (safety zone allows overlap)\n- T+14: Deplaning ✓ → catering + cleaning in parallel\n- T+22: Fuel done, catering done\n- T+24: Boarding begins (agents pre-staged from T+12)\n- T+33: Boarding done\n- T+37: Doors closed\n- T+40: Pushback\n\n## Key Savings\n- Parallel fuelling + deplaning: saves 6 min\n- Pre-staged boarding crew: saves 3 min\n- Dual-zone cleaning + catering: saves 4 min\n\n## Total: −7 min (47→40 min)`,
    B737:`## Optimised Timeline\n- T+0: Fuel truck right, bridge/stairs left\n- T+5: Doors open → deplaning\n- T+8: Single-point fuel (faster than A320)\n- T+16: Deplaning ✓ → cleaning aft-fwd\n- T+24: Fuel done, catering done\n- T+26: Boarding via both doors\n- T+38: Doors closed → T+42: Pushback\n\n## Key Savings\n- Bidirectional boarding (fwd bridge + aft stairs): saves 5 min\n- Single-point refuelling advantage exploited: saves 3 min\n\n## Total: −8 min (50→42 min)`,
    default:`## Optimised Protocol\n- T+0: Parallel deployment of all ground services immediately\n- T+5: Doors open → deplaning\n- T+8: Fuel flow (safety zones maintained)\n- T+18: Cleaning + catering in parallel\n- T+28: Boarding begins\n- T+38: Doors closed → T+42: Pushback\n\n## Total: −7 to −10 min depending on aircraft type`,
  },
  forecast:`## 30-Day Demand Forecast\n- Week 1–2: Stable, −3% vs today (mid-week trough)\n- Week 3: +12% (pre-holiday surge)\n- Week 4: +19% peak — gate saturation at T2 by 17:30\n- Weather: CBMSE convective cells peak Jan–Feb, expect 4–6 GDP events/month\n\n## Carrier Actions\n- GOL: mandate 45 min minimum GT for B737, add dedicated fuel truck\n- LATAM: turnaround coordinator for >3 consecutive same-gate rotations\n- Copa/American: pre-clearance to cut international dwell by 9 min avg\n\n## Capacity Ceiling\n- Current: 182 movements/day at 83% utilisation\n- Optimised: 204 movements/day (+12%)\n- Hard ceiling (no new stands): 218/day`,
};

// ─── CARRIER PERFORMANCE ─────────────────────────────────────────
function buildCarrierPerf(flights){
  return AIRLINES.map(al=>{
    const fs=flights.filter(f=>f.airline===al.code);
    if(!fs.length) return null;
    const avgGT=Math.round(fs.reduce((s,f)=>s+f.groundTime,0)/fs.length);
    const otp=Math.round(fs.filter(f=>f.delay<5).length/fs.length*100);
    const avgLoad=Math.round(fs.reduce((s,f)=>s+f.loadFactor,0)/fs.length);
    const byAC={};
    fs.forEach(f=>{if(!byAC[f.acType])byAC[f.acType]={type:f.acType,flights:[],count:0};byAC[f.acType].flights.push(f);byAC[f.acType].count++;});
    const acBreakdown=Object.values(byAC).map(ac=>{
      const acAvgGT=Math.round(ac.flights.reduce((s,f)=>s+f.groundTime,0)/ac.flights.length);
      const acOtp=Math.round(ac.flights.filter(f=>f.delay<5).length/ac.flights.length*100);
      const benchmark=AC_TYPES[ac.type]?.ground[0]||30;
      const overrun=acAvgGT-benchmark;
      return{type:ac.type,count:ac.count,avgGT:acAvgGT,otp:acOtp,benchmark,overrun,
             performance:overrun>12?"poor":overrun>5?"average":"good",flights:ac.flights};
    }).sort((a,b)=>b.overrun-a.overrun);
    return{code:al.code,name:al.name,color:al.color,flights:fs.length,avgGT,otp,avgLoad,
           acBreakdown,draggingDown:acBreakdown.filter(a=>a.performance==="poor"),
           lifting:acBreakdown.filter(a=>a.performance==="good"),
           score:Math.round((otp*0.5)+(Math.max(0,100-(avgGT-30)*2)*0.5))};
  }).filter(Boolean).sort((a,b)=>b.flights-a.flights);
}

function buildForecast(flights){
  const hourly=Array.from({length:24},(_,h)=>{
    const arr=flights.filter(f=>Math.floor(f.scheduledArr/60)===h);
    const dep=flights.filter(f=>Math.floor(f.actualDep/60)===h);
    return{hour:`${String(h).padStart(2,"0")}:00`,arrivals:arr.length,departures:dep.length,
           total:arr.length+dep.length,avgDelay:arr.length?+(arr.reduce((s,f)=>s+f.delay,0)/arr.length).toFixed(1):0,
           occupancy:Math.min(GATES.length,Math.round((arr.length+dep.length)*0.52))};
  });
  const rng2=seededRng(7);
  const trend=Array.from({length:30},(_,i)=>({
    day:i===29?"Today":`D-${29-i}`,
    movements:Math.round(flights.length*(0.85+rng2.next()*0.3)),
    avgGT:rng2.int(38,56),delays:rng2.int(8,34),utilization:rng2.int(58,90),
  }));
  return{hourly,trend};
}

const fmt=m=>`${String(Math.floor(Math.abs(m)/60)%24).padStart(2,"0")}:${String(Math.floor(Math.abs(m)%60)).padStart(2,"0")}`;

// ─── UI PRIMITIVES ────────────────────────────────────────────────
function Card({children,style={}}){return <div style={{background:BG.surface,border:`1px solid ${BG.border}`,borderRadius:10,padding:"16px 20px",...style}}>{children}</div>;}
function KPI({label,value,sub,color=C.amber,icon:Icon,delta,mini}){return(
  <Card style={mini?{padding:"12px 14px"}:{}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:mini?6:10}}>
      <span style={{fontSize:mini?9:10,color:C.gray,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"monospace"}}>{label}</span>
      {Icon&&<Icon size={mini?12:14} color={color}/>}
    </div>
    <div style={{fontSize:mini?20:26,fontWeight:800,color:"#F9FAFB",lineHeight:1}}>{value}</div>
    {sub&&<div style={{fontSize:mini?10:12,color:C.gray,marginTop:4}}>{sub}</div>}
    {delta!==undefined&&<div style={{fontSize:11,color:delta>=0?C.teal:C.red,marginTop:4,fontWeight:700}}>{delta>=0?"▲":"▼"} {Math.abs(delta).toFixed(1)}%</div>}
  </Card>);}
function StatusBadge({status}){
  const m={departed:{color:C.teal,label:"Departed"},"on-ground":{color:C.amber,label:"On Ground"},arriving:{color:C.blue,label:"Arriving"},scheduled:{color:C.gray,label:"Scheduled"}};
  const {color,label}=m[status]||m.scheduled;
  return <span style={{color,background:`${color}22`,border:`1px solid ${color}44`,fontSize:10,padding:"2px 7px",borderRadius:4,fontWeight:700,letterSpacing:"0.08em",fontFamily:"monospace"}}>{label}</span>;}
function AiBlock({text}){
  if(!text) return null;
  return(<div style={{marginTop:14,background:BG.surface2,borderRadius:8,padding:"14px 18px",borderLeft:`3px solid ${C.amber}`}}>
    {text.split("\n").map((ln,i)=>{
      if(ln.startsWith("## ")) return <div key={i} style={{color:C.amber,fontWeight:700,fontSize:13,letterSpacing:"0.06em",marginTop:i>0?14:0,marginBottom:4}}>{ln.replace("## ","")}</div>;
      if(ln.startsWith("**")&&ln.endsWith("**")) return <div key={i} style={{color:"#F9FAFB",fontWeight:600,fontSize:13,marginTop:6}}>{ln.slice(2,-2)}</div>;
      if(ln.startsWith("- ")||ln.startsWith("• ")) return <div key={i} style={{color:"#D1D5DB",fontSize:13,lineHeight:1.7,paddingLeft:12,borderLeft:`2px solid ${BG.border}`,marginBottom:3}}>{ln.slice(2)}</div>;
      if(ln.trim()==="") return <div key={i} style={{height:6}}/>;
      return <div key={i} style={{color:"#9CA3AF",fontSize:13,lineHeight:1.7}}>{ln}</div>;
    })}
  </div>);}
const TT=({active,payload,label})=>{if(!active||!payload?.length)return null;return(
  <div style={{background:"#1F2937",border:`1px solid ${BG.border}`,borderRadius:8,padding:"10px 14px",fontSize:12}}>
    <div style={{color:"#9CA3AF",marginBottom:6,fontFamily:"monospace"}}>{label}</div>
    {payload.map((p,i)=><div key={i} style={{color:p.color||"#F9FAFB",marginBottom:3}}><span style={{color:"#6B7280"}}>{p.name}: </span>{typeof p.value==="number"?p.value.toFixed(1):p.value}</div>)}
  </div>);};
function InfoTip({content,color=C.cyan}){
  const [open,setOpen]=useState(false);
  return(<span style={{position:"relative",display:"inline-flex",verticalAlign:"middle",marginLeft:4}}>
    <Info size={13} color={color} style={{cursor:"pointer",opacity:0.75}} onClick={()=>setOpen(o=>!o)}/>
    {open&&(<div style={{position:"absolute",zIndex:200,left:"calc(100% + 8px)",top:-6,background:"#1F2937",border:`1px solid ${color}44`,borderRadius:8,padding:"10px 14px",width:260,boxShadow:"0 8px 32px rgba(0,0,0,0.6)"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
        <span style={{fontSize:10,color,fontFamily:"monospace",letterSpacing:"0.1em",textTransform:"uppercase"}}>How it works</span>
        <X size={12} color={C.gray} style={{cursor:"pointer"}} onClick={e=>{e.stopPropagation();setOpen(false);}}/>
      </div>
      <div style={{fontSize:12,color:"#D1D5DB",lineHeight:1.65}}>{content}</div>
    </div>)}
  </span>);}
function Stepper({value,onChange,min=0,max=10,label,unit="",color=C.amber}){return(
  <div style={{display:"flex",alignItems:"center",gap:8}}>
    <button onClick={()=>onChange(Math.max(min,value-1))} disabled={value<=min}
      style={{width:26,height:26,background:BG.border,border:"none",borderRadius:6,color:"#F9FAFB",cursor:value<=min?"not-allowed":"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",opacity:value<=min?0.4:1}}>−</button>
    <div style={{textAlign:"center",minWidth:48}}>
      <div style={{fontSize:16,fontWeight:800,color,fontFamily:"monospace"}}>{value}{unit}</div>
      {label&&<div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em"}}>{label}</div>}
    </div>
    <button onClick={()=>onChange(Math.min(max,value+1))} disabled={value>=max}
      style={{width:26,height:26,background:BG.border,border:"none",borderRadius:6,color:"#F9FAFB",cursor:value>=max?"not-allowed":"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",opacity:value>=max?0.4:1}}>+</button>
  </div>);}

// ─── ISSUE SEVERITY PILL ─────────────────────────────────────────
function SeverityPill({severity}){
  const m={high:{color:C.red,label:"HIGH"},medium:{color:C.amber,label:"MED"},low:{color:C.teal,label:"LOW"}};
  const {color,label}=m[severity]||m.low;
  return <span style={{fontSize:9,padding:"2px 6px",borderRadius:3,fontFamily:"monospace",fontWeight:800,background:`${color}22`,color,border:`1px solid ${color}44`}}>{label}</span>;}

function IssueTypeIcon({type}){
  const m={gate_conflict:<Layers size={13} color={C.red}/>,fuel_truck:<Truck size={13} color={C.amber}/>,
           staff_shortage:<Users size={13} color={C.purple}/>,delay_cascade:<AlertTriangle size={13} color={C.red}/>,
           long_turn:<Clock size={13} color={C.orange}/>};
  return m[type]||<AlertCircle size={13} color={C.gray}/>;}

// ─── ISSUE PANEL ─────────────────────────────────────────────────
function IssuePanel({issues, flights, title, accent=C.red}){
  const [expanded,setExpanded]=useState(null);
  const [filter,setFilter]=useState("all");
  const types=["all","gate_conflict","fuel_truck","staff_shortage","delay_cascade","long_turn"];
  const filtered=filter==="all"?issues:issues.filter(i=>i.type===filter);
  const groupedByFlight=useMemo(()=>{
    const g={};
    filtered.forEach(issue=>{if(!g[issue.flight])g[issue.flight]=[];g[issue.flight].push(issue);});
    return Object.entries(g).sort((a,b)=>b[1].reduce((s,i)=>s+i.impact,0)-a[1].reduce((s,i)=>s+i.impact,0));
  },[filtered]);
  const totalImpact=Math.round(filtered.reduce((s,i)=>s+i.impact,0));
  return(<Card>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
      <div><div style={{fontSize:13,fontWeight:700,color:"#F9FAFB"}}>{title}</div>
        <div style={{fontSize:11,color:C.gray}}>{issues.length} issues · ~{totalImpact} min impact/day</div></div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {types.map(t=><button key={t} onClick={()=>setFilter(t)}
          style={{fontSize:10,padding:"3px 8px",borderRadius:4,border:`1px solid ${filter===t?accent:BG.border}`,background:filter===t?`${accent}22`:"none",color:filter===t?accent:C.gray,cursor:"pointer",fontFamily:"monospace",textTransform:"uppercase"}}>{t.replace("_"," ")}</button>)}
      </div>
    </div>
    {groupedByFlight.length===0&&<div style={{color:C.gray,fontSize:13,textAlign:"center",padding:"20px 0"}}>No issues {filter!=="all"?`of type "${filter.replace("_"," ")}"`:"detected"} ✓</div>}
    {groupedByFlight.map(([flightId,flightIssues])=>{
      const fl=flights?.find(f=>f.id===flightId);
      const totalFI=Math.round(flightIssues.reduce((s,i)=>s+i.impact,0));
      const isExp=expanded===flightId;
      return(<div key={flightId} style={{marginBottom:8,border:`1px solid ${isExp?accent:BG.border}`,borderRadius:8,overflow:"hidden"}}>
        <div style={{padding:"10px 14px",cursor:"pointer",background:isExp?`${accent}08`:BG.surface2,display:"flex",alignItems:"center",gap:12}} onClick={()=>setExpanded(isExp?null:flightId)}>
          <div style={{fontFamily:"monospace",fontWeight:700,color:fl?.airlineColor||"#F9FAFB",fontSize:13,minWidth:60}}>{flightId}</div>
          {fl&&<div style={{fontSize:11,color:C.gray}}>{fl.acType} · {fl.origin}→{fl.destination} · {fmt(fl.scheduledArr)}</div>}
          <div style={{flex:1,display:"flex",gap:6}}>
            {flightIssues.map((issue,ii)=><span key={ii}><IssueTypeIcon type={issue.type}/></span>)}
          </div>
          <div style={{fontSize:12,color:accent,fontWeight:700,fontFamily:"monospace"}}>~{totalFI} min impact</div>
          <ChevronRight size={13} color={C.gray} style={{transform:isExp?"rotate(90deg)":"none",transition:"transform 0.2s"}}/>
        </div>
        {isExp&&(<div style={{padding:"10px 14px",borderTop:`1px solid ${BG.border}`}}>
          {flightIssues.map((issue,ii)=>(
            <div key={ii} style={{marginBottom:10,padding:"8px 12px",background:BG.page,borderRadius:6,borderLeft:`3px solid ${issue.severity==="high"?C.red:issue.severity==="medium"?C.amber:C.teal}`}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <IssueTypeIcon type={issue.type}/>
                <span style={{fontSize:12,color:"#F9FAFB",fontWeight:600}}>{issue.type.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</span>
                <SeverityPill severity={issue.severity}/>
                <span style={{marginLeft:"auto",fontSize:11,color:C.amber,fontFamily:"monospace"}}>~{Math.round(issue.impact)} min</span>
              </div>
              <div style={{fontSize:12,color:"#9CA3AF",marginBottom:6}}>{issue.msg}</div>
              <div style={{fontSize:12,color:C.teal,display:"flex",alignItems:"flex-start",gap:6}}><Zap size={11} style={{flexShrink:0,marginTop:2}}/>{issue.recommendation}</div>
            </div>
          ))}
        </div>)}
      </div>);
    })}
  </Card>);}

// ─── FLIGHT IMPROVEMENT TABLE ─────────────────────────────────────
function FlightImprovementTable({simFlights,flights}){
  const [sort,setSort]=useState("improvement");
  const [filter,setFilter]=useState("all");
  const data=simFlights.map(sf=>{const base=flights.find(f=>f.id===sf.id)||sf;return{...sf,baseGT:base.groundTime,baseDelay:base.delay};});
  const sorted=[...data].sort((a,b)=>sort==="improvement"?b.improvement-a.improvement:sort==="gt"?b.simGT-a.simGT:sort==="delay"?b.simDelay-a.simDelay:0);
  const filtered=filter==="all"?sorted:filter==="improved"?sorted.filter(f=>f.improvement>0):sorted.filter(f=>f.improvement<=0);
  const statColors={improved:C.teal,marginal:C.amber,unchanged:C.gray,degraded:C.red};
  return(<Card>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
      <div><div style={{fontSize:13,fontWeight:700,color:"#F9FAFB"}}>Flight-by-Flight Improvement</div>
        <div style={{fontSize:11,color:C.gray}}>{simFlights.filter(f=>f.improvement>0).length} improved · {simFlights.filter(f=>f.improvement<=0).length} unchanged/degraded</div></div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <select value={sort} onChange={e=>setSort(e.target.value)} style={{background:BG.surface2,color:"#F9FAFB",border:`1px solid ${BG.border}`,borderRadius:6,padding:"4px 10px",fontSize:12,fontFamily:"monospace"}}>
          <option value="improvement">Sort: Most Improved</option>
          <option value="gt">Sort: Ground Time</option>
          <option value="delay">Sort: Delay</option>
        </select>
        {["all","improved","other"].map(f=><button key={f} onClick={()=>setFilter(f)}
          style={{fontSize:11,padding:"4px 10px",borderRadius:4,border:`1px solid ${filter===f?C.amber:BG.border}`,background:filter===f?`${C.amber}22`:"none",color:filter===f?C.amber:C.gray,cursor:"pointer",fontFamily:"monospace"}}>{f}</button>)}
      </div>
    </div>
    <div style={{overflowX:"auto",maxHeight:380,overflowY:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead style={{position:"sticky",top:0,background:BG.surface}}>
          <tr style={{borderBottom:`1px solid ${BG.border}`}}>
            {["Flight","AC","Gate→Sim","Base GT","Sim GT","Δ GT","Base Delay","Sim Delay","Fuel Wait","Staff Wait","Status"].map(h=>(
              <th key={h} style={{color:C.gray,padding:"6px 10px",textAlign:"left",fontSize:9,fontFamily:"monospace",letterSpacing:"0.08em",whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{filtered.slice(0,80).map((f,i)=>(
          <tr key={f.id} style={{borderBottom:`1px solid ${BG.surface2}`,background:i%2===0?"transparent":BG.surface2}}>
            <td style={{padding:"6px 10px",color:f.airlineColor,fontWeight:700,fontFamily:"monospace",whiteSpace:"nowrap"}}>{f.id}</td>
            <td style={{padding:"6px 10px",color:"#9CA3AF",fontFamily:"monospace"}}>{f.acType}</td>
            <td style={{padding:"6px 10px",color:"#6B7280",fontFamily:"monospace",fontSize:10}}>{f.gate}→{f.assignedGate||f.gate}</td>
            <td style={{padding:"6px 10px",color:"#D1D5DB",fontFamily:"monospace"}}>{f.baseGT}m</td>
            <td style={{padding:"6px 10px",fontFamily:"monospace",fontWeight:600,color:f.simGT<f.baseGT?C.teal:f.simGT>f.baseGT?C.red:"#D1D5DB"}}>{f.simGT}m</td>
            <td style={{padding:"6px 10px",fontFamily:"monospace",fontWeight:700,color:f.improvement>0?C.teal:f.improvement<0?C.red:C.gray}}>
              {f.improvement>0?`−${f.improvement}`:f.improvement<0?`+${Math.abs(f.improvement)}`:0}m
            </td>
            <td style={{padding:"6px 10px",color:f.baseDelay>15?C.red:f.baseDelay>5?C.amber:C.gray,fontFamily:"monospace"}}>{f.baseDelay>0?`+${f.baseDelay}m`:"—"}</td>
            <td style={{padding:"6px 10px",color:f.simDelay>15?C.red:f.simDelay>5?C.amber:C.teal,fontFamily:"monospace"}}>{f.simDelay>0?`+${Math.round(f.simDelay)}m`:"—"}</td>
            <td style={{padding:"6px 10px",color:f.fuelWait>0?C.amber:C.gray,fontFamily:"monospace",fontSize:11}}>{f.fuelWait>0?`+${f.fuelWait}m`:"—"}</td>
            <td style={{padding:"6px 10px",color:f.staffWait>0?C.purple:C.gray,fontFamily:"monospace",fontSize:11}}>{f.staffWait>0?`+${f.staffWait}m`:"—"}</td>
            <td style={{padding:"6px 10px"}}>
              <span style={{fontSize:10,padding:"2px 7px",borderRadius:4,fontFamily:"monospace",fontWeight:700,background:`${statColors[f.simStatus]||C.gray}22`,color:statColors[f.simStatus]||C.gray}}>
                {f.simStatus}
              </span>
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
    {filtered.length>80&&<div style={{textAlign:"center",color:C.gray,fontSize:11,marginTop:8}}>Showing 80 of {filtered.length} flights</div>}
  </Card>);}

// ═══════════════════════════════════════════════════════════════
// SCENARIO SIMULATOR — MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
const FLIGHTS_DEFAULT=buildFlights(42);

function ScenarioSimulator({flights:externalFlights, baseline}){
  // Data source
  const [useUserData,setUseUserData]=useState(false);
  const [csvText,setCsvText]=useState("");
  const [csvParsed,setCsvParsed]=useState(null);
  const [csvError,setCsvError]=useState("");
  const [showCSVHelp,setShowCSVHelp]=useState(false);

  const flights=useMemo(()=>{
    if(useUserData&&csvParsed?.ok&&csvParsed.flights.length>0) return csvParsed.flights;
    return externalFlights||FLIGHTS_DEFAULT;
  },[useUserData,csvParsed,externalFlights]);

  // Levers
  const [cfg,setCfg]=useState({
    reduceTurnaround:0,
    optimizeGates:false,
    virtualRunway:false,
    extraRunway:0,
    extraFuelTrucks:0,
    extraStaff:0,
    weatherDisruption:false,
  });

  const [result,setResult]=useState(null);
  const [running,setRunning]=useState(false);
  const [activeTab,setActiveTab]=useState("overview");

  // Pre-run issues on baseline
  const baseIssues=useMemo(()=>detectIssues(flights,{fuelTrucks:6,groundStaff:48,runways:2}),[flights]);
  const highIssues=useMemo(()=>baseIssues.filter(i=>i.severity==="high"),[baseIssues]);

  const run=useCallback(()=>{
    setRunning(true);
    setTimeout(()=>{
      const res=runAdvancedDES(flights,cfg);
      setResult(res);
      setRunning(false);
      setActiveTab("overview");
    },900);
  },[flights,cfg]);

  const setC=useCallback((key,val)=>setCfg(c=>({...c,[key]:val})),[]);

  // Pick analysis text
  const analysisText=useMemo(()=>{
    if(!result) return "";
    if(cfg.extraRunway>0) return PREFILLED.scenario.runway;
    if(cfg.extraStaff>0||cfg.extraFuelTrucks>0) return PREFILLED.scenario.staff;
    if(cfg.virtualRunway&&cfg.optimizeGates&&cfg.reduceTurnaround>0) return PREFILLED.scenario.full;
    if(cfg.virtualRunway&&cfg.optimizeGates) return PREFILLED.scenario.full;
    if(cfg.virtualRunway) return PREFILLED.scenario.vrOnly;
    if(cfg.optimizeGates) return PREFILLED.scenario.gateOnly;
    return PREFILLED.scenario.none;
  },[result,cfg]);

  // Comparison data
  const compData=result?[
    {name:"Avg GT",baseline:baseline.avgGT,simulated:result.stats.avgGT,unit:"min"},
    {name:"Avg Delay",baseline:+baseline.avgDelay,simulated:+result.stats.avgDelay,unit:"min"},
    {name:"Conflicts",baseline:baseline.conflicts,simulated:result.stats.conflicts,unit:""},
    {name:"Utilisation",baseline:+baseline.utilization,simulated:+result.stats.utilization,unit:"%"},
    {name:"Issues",baseline:result.stats.issuesResolved+result.stats.issuesRemaining,simulated:result.stats.issuesRemaining,unit:""},
  ]:[];

  const simTabStyle=active=>({
    background:"none",border:"none",
    borderBottom:`2px solid ${active?C.amber:"transparent"}`,
    color:active?"#F9FAFB":C.gray,
    padding:"8px 16px",fontSize:12,fontWeight:active?700:400,
    cursor:"pointer",whiteSpace:"nowrap",
  });

  const csvTemplate=`airline,aircraft,arrival,ground_time,delay,gate,origin,dest,pax
LA,A320,07:15,45,0,G01,CGH,SDU,162
G3,B737,07:45,52,8,G02,POA,GRU,178
AD,E195,08:00,32,0,G13,BSB,GRU,104
LA,A321,08:30,55,12,G03,MIA,GRU,198`;

  return(<div>
    {/* Header banner */}
    <div style={{background:`${C.cyan}11`,border:`1px solid ${C.cyan}33`,borderRadius:8,padding:"10px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
      <Cpu size={14} color={C.cyan}/>
      <span style={{fontSize:12,color:C.cyan,fontFamily:"monospace",fontWeight:700}}>VCE Advanced DES Engine v2</span>
      <InfoTip content="Discrete Event Simulation models GRU as queuing network: RUNWAY_ARR → TAXI → GATE(n) → ground services (fuel/clean/cater/board) → PUSHBACK → RUNWAY_DEP. Stochastic service times per aircraft type. Resource contention modelled: fuel trucks, ground staff, gate slots, runway capacity." color={C.cyan}/>
      <span style={{fontSize:12,color:"#6B7280"}}>7 independent levers · flight-level issue detection · resource contention modelling · financial impact</span>
      {baseIssues.length>0&&<div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6,background:`${C.red}11`,border:`1px solid ${C.red}33`,borderRadius:6,padding:"4px 10px"}}>
        <Flame size={13} color={C.red}/><span style={{fontSize:12,color:C.red,fontWeight:700}}>{highIssues.length} critical issues in current ops</span>
      </div>}
    </div>

    <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:16}}>
      {/* LEFT PANEL — Controls */}
      <div>
        {/* Data source toggle */}
        <Card style={{marginBottom:12}}>
          <div style={{fontSize:11,color:C.gray,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"monospace",marginBottom:12}}>Data Source</div>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <button onClick={()=>setUseUserData(false)}
              style={{flex:1,padding:"8px",border:`1px solid ${!useUserData?C.amber:BG.border}`,borderRadius:6,background:!useUserData?`${C.amber}22`:"none",color:!useUserData?C.amber:C.gray,fontSize:12,cursor:"pointer",fontWeight:!useUserData?700:400}}>
              <Database size={12} style={{verticalAlign:"middle",marginRight:4}}/>Synthetic GRU
            </button>
            <button onClick={()=>setUseUserData(true)}
              style={{flex:1,padding:"8px",border:`1px solid ${useUserData?C.teal:BG.border}`,borderRadius:6,background:useUserData?`${C.teal}22`:"none",color:useUserData?C.teal:C.gray,fontSize:12,cursor:"pointer",fontWeight:useUserData?700:400}}>
              <Upload size={12} style={{verticalAlign:"middle",marginRight:4}}/>Your Data
            </button>
          </div>

          {useUserData&&(<div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <span style={{fontSize:12,color:"#9CA3AF"}}>Paste CSV flight data</span>
              <button onClick={()=>setShowCSVHelp(v=>!v)} style={{fontSize:10,color:C.cyan,background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>format guide</button>
            </div>
            {showCSVHelp&&<div style={{background:BG.page,borderRadius:6,padding:"8px 10px",marginBottom:8,fontSize:10,fontFamily:"monospace",color:"#9CA3AF",whiteSpace:"pre-wrap"}}>{csvTemplate}</div>}
            <textarea value={csvText} onChange={e=>setCsvText(e.target.value)} rows={4}
              placeholder={`airline,aircraft,arrival,ground_time,delay,gate,origin,dest\nLA,A320,07:15,45,0,G01,CGH,SDU\n...`}
              style={{width:"100%",background:BG.surface2,color:"#F9FAFB",border:`1px solid ${csvError?C.red:BG.border}`,borderRadius:6,padding:"8px 10px",fontSize:11,fontFamily:"monospace",resize:"vertical",boxSizing:"border-box"}}/>
            <button onClick={()=>{const r=parseUserCSV(csvText);setCsvParsed(r);setCsvError(r.ok?"":r.error);}}
              style={{width:"100%",marginTop:6,background:`${C.teal}22`,color:C.teal,border:`1px solid ${C.teal}44`,borderRadius:6,padding:"7px",fontSize:12,cursor:"pointer",fontWeight:700}}>
              Parse & Load{csvParsed?.ok?` (${csvParsed.count} flights ✓)`:""}
            </button>
            {csvError&&<div style={{color:C.red,fontSize:11,marginTop:4}}>{csvError}</div>}
            {csvParsed?.ok&&<div style={{color:C.teal,fontSize:11,marginTop:4}}>✓ {csvParsed.count} flights loaded — using your data</div>}
          </div>)}
          {!useUserData&&<div style={{fontSize:11,color:C.gray}}>Using {flights.length} synthetic GRU flights (deterministic, seeded)</div>}
        </Card>

        {/* Operational levers */}
        <Card style={{marginBottom:12}}>
          <div style={{fontSize:11,color:C.amber,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"monospace",marginBottom:14}}>Operational Levers</div>

          {/* Turnaround reduction */}
          <div style={{marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",marginBottom:6}}>
              <Clock size={13} color={C.amber} style={{marginRight:6}}/>
              <span style={{fontSize:12,color:"#9CA3AF",flex:1}}>Turnaround Reduction</span>
              <InfoTip content="Compresses ground time by % applied above aircraft-type minimums. Models parallel service start (fuel + deplaning simultaneously), predictive crew dispatch (T−25 vs T−8), and milestone compression from SOP improvements."/>
              <span style={{fontSize:13,fontWeight:700,color:C.amber,fontFamily:"monospace",marginLeft:6}}>{cfg.reduceTurnaround}%</span>
            </div>
            <input type="range" min={0} max={35} step={1} value={cfg.reduceTurnaround}
              onChange={e=>setC("reduceTurnaround",+e.target.value)} style={{width:"100%",accentColor:C.amber}}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.gray}}>
              <span>Baseline</span><span>5% (quick win)</span><span>15% (IATA benchmark)</span><span>35% (min floor)</span>
            </div>
            {cfg.reduceTurnaround>0&&<div style={{fontSize:11,color:C.teal,marginTop:4}}>≈ −{Math.round(baseline.avgGT*cfg.reduceTurnaround/100)} min avg · R${Math.round(baseline.avgGT*cfg.reduceTurnaround/100*flights.length*150/1000)}K/day value</div>}
          </div>

          {/* Toggles */}
          {[
            {key:"optimizeGates",label:"Gate Optimisation",icon:Layers,onColor:C.teal,
             info:"CP-SAT constraint solver: conflict-free gate assignment with 55-min lookahead, 8-min buffer, aircraft type compatibility enforced.",
             effect:"−78% gate conflicts · −5.2 min/dep avg"},
            {key:"virtualRunway",label:"Virtual Runway",icon:Wind,onColor:C.cyan,
             info:"EOBT-ordered pushback sequence + taxi route de-confliction. No ATC separation changes — purely ground side. Equivalent to 28% of a physical 3rd runway.",
             effect:"+1.4 movements/hr peak · −3.8 min taxi-out"},
            {key:"weatherDisruption",label:"Weather Disruption",icon:AlertTriangle,onColor:C.orange,
             info:"Applies 25% runway capacity penalty (VMC→IMC conditions). Tests system resilience and shows cascade effect on gate utilisation and delay propagation.",
             effect:"−25% runway capacity · tests system resilience"},
          ].map(opt=>{const Icon=opt.icon;const on=cfg[opt.key];return(
            <div key={opt.key} style={{marginBottom:12,padding:"10px 12px",background:BG.surface2,borderRadius:8,border:on?`1px solid ${opt.onColor}44`:`1px solid ${BG.border}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <Icon size={13} color={on?opt.onColor:C.gray}/>
                  <span style={{fontSize:12,color:on?"#F9FAFB":"#9CA3AF",fontWeight:600}}>{opt.label}</span>
                  <InfoTip content={opt.info} color={opt.onColor}/>
                </div>
                <button onClick={()=>setC(opt.key,!on)} style={{background:on?opt.onColor:BG.border,color:on?(opt.key==="virtualRunway"?"#000":"#fff"):"#6B7280",border:"none",borderRadius:16,padding:"3px 12px",fontSize:11,cursor:"pointer",fontWeight:700,fontFamily:"monospace"}}>{on?"ON":"OFF"}</button>
              </div>
              {on&&<div style={{fontSize:11,color:opt.onColor}}>↳ {opt.effect}</div>}
            </div>);})}
        </Card>

        {/* Infrastructure levers */}
        <Card style={{marginBottom:12}}>
          <div style={{fontSize:11,color:C.blue,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"monospace",marginBottom:14}}>
            Infrastructure & Resources
            <InfoTip content="Models the operational impact of adding physical resources. Runway adds increase hourly movement capacity. Fuel trucks reduce contention wait. Staff additions reduce sequential service bottlenecks during peak." color={C.blue}/>
          </div>

          <div style={{marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <Radio size={13} color={cfg.extraRunway>0?C.blue:C.gray}/>
                <span style={{fontSize:12,color:"#9CA3AF"}}>Additional Runways</span>
                <InfoTip content="Simulates adding 1–2 parallel runways to GRU's current 2-runway configuration. Each runway adds ~10 movements/hour effective capacity. Real cost: R$1.2–1.8B per runway. Model shows throughput gain immediately." color={C.blue}/>
              </div>
              <Stepper value={cfg.extraRunway} onChange={v=>setC("extraRunway",v)} min={0} max={2} label="EXTRA" color={C.blue}/>
            </div>
            {cfg.extraRunway>0&&<div style={{fontSize:11,color:C.blue,padding:"6px 10px",background:`${C.blue}11`,borderRadius:6}}>
              +{cfg.extraRunway} runway → +{cfg.extraRunway*10} mov/hr capacity · R${cfg.extraRunway===1?"1.2–1.8":"2.4–3.6"}B capex · payback {cfg.extraRunway===1?"4.3":"7.1"} yrs
            </div>}
          </div>

          <div style={{marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <Truck size={13} color={cfg.extraFuelTrucks>0?C.amber:C.gray}/>
                <span style={{fontSize:12,color:"#9CA3AF"}}>Extra Fuel Trucks</span>
                <InfoTip content="Each fuel truck addition reduces contention wait events. Currently 6 trucks serve all stands. Peak hours (07–09, 17–19) see truck contention in ~31% of rotations. Each truck costs ~R$380K/year (lease + crew)." color={C.amber}/>
              </div>
              <Stepper value={cfg.extraFuelTrucks} onChange={v=>setC("extraFuelTrucks",v)} min={0} max={4} label="TRUCKS" color={C.amber}/>
            </div>
            {cfg.extraFuelTrucks>0&&<div style={{fontSize:11,color:C.amber,padding:"6px 10px",background:`${C.amber}11`,borderRadius:6}}>
              +{cfg.extraFuelTrucks} truck → −{cfg.extraFuelTrucks*1.8|0} min avg peak wait · R${cfg.extraFuelTrucks*380}K/yr cost · ROI {cfg.extraFuelTrucks<=2?"positive Wk 8":"positive Mo 6"}
            </div>}
          </div>

          <div style={{marginBottom:4}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <Users size={13} color={cfg.extraStaff>0?C.purple:C.gray}/>
                <span style={{fontSize:12,color:"#9CA3AF"}}>Handler Teams</span>
                <InfoTip content="Each team = 6 ground staff (marshaller + 2 baggage handlers + cabin cleaner + catering loader + coordinator). Currently 8 teams (48 staff). Adding teams reduces sequential service bottlenecks during peak arrival banks." color={C.purple}/>
              </div>
              <Stepper value={cfg.extraStaff} onChange={v=>setC("extraStaff",v)} min={0} max={5} label="TEAMS" color={C.purple}/>
            </div>
            {cfg.extraStaff>0&&<div style={{fontSize:11,color:C.purple,padding:"6px 10px",background:`${C.purple}11`,borderRadius:6}}>
              +{cfg.extraStaff} team (+{cfg.extraStaff*6} staff) → −{cfg.extraStaff*1.5|0} min at peak · R${cfg.extraStaff*920}K/yr labour
            </div>}
          </div>
        </Card>

        {/* Run button */}
        <button onClick={run} disabled={running} style={{width:"100%",background:running?"#374151":C.amber,color:running?C.gray:"#000",border:"none",borderRadius:8,padding:"13px 0",fontWeight:800,fontSize:14,cursor:running?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"monospace",marginBottom:12}}>
          {running?<><RefreshCw size={14} style={{animation:"spin 1s linear infinite"}}/>Running Advanced DES...</>:<><Play size={14}/>Run Simulation</>}
        </button>

        {/* Baseline */}
        <Card>
          <div style={{fontSize:11,color:C.gray,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"monospace",marginBottom:10}}>Current Baseline · {flights.length} flights</div>
          {[
            ["Avg Ground Time",`${baseline.avgGT} min`],
            ["Avg Delay",`${baseline.avgDelay} min`],
            ["Gate Conflicts",baseline.conflicts],
            ["Utilisation",`${baseline.utilization}%`],
            ["Active Issues",baseIssues.length],
            ["High-severity",highIssues.length],
            ["Data source",useUserData&&csvParsed?.ok?"User CSV":"Synthetic GRU"],
          ].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${BG.border}`,fontSize:12}}>
              <span style={{color:C.gray}}>{k}</span>
              <span style={{color:k==="High-severity"&&v>0?C.red:k==="Active Issues"&&v>0?C.amber:"#F9FAFB",fontFamily:"monospace",fontWeight:600}}>{v}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* RIGHT PANEL — Results */}
      <div>
        {/* Pre-run: show issues even without simulation */}
        {!result&&(<>
          <Card style={{marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <Flame size={18} color={C.red}/>
              <div><div style={{fontSize:14,fontWeight:700,color:"#F9FAFB"}}>Baseline Issues Detected — Before Simulation</div>
                <div style={{fontSize:12,color:C.gray}}>{baseIssues.length} issues across {flights.length} flights · Configure levers above then Run to see improvement</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
              {[
                {label:"Gate Conflicts",val:baseIssues.filter(i=>i.type==="gate_conflict").length,color:C.red,icon:Layers},
                {label:"Fuel Truck Waits",val:baseIssues.filter(i=>i.type==="fuel_truck").length,color:C.amber,icon:Truck},
                {label:"Staff Bottlenecks",val:baseIssues.filter(i=>i.type==="staff_shortage").length,color:C.purple,icon:Users},
                {label:"Delay Cascades",val:baseIssues.filter(i=>i.type==="delay_cascade").length,color:C.orange,icon:AlertTriangle},
              ].map(({label,val,color,icon:Icon})=>(
                <div key={label} style={{background:BG.surface2,borderRadius:8,padding:"10px 14px",border:`1px solid ${val>0?`${color}33`:BG.border}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}><Icon size={13} color={color}/><span style={{fontSize:10,color:C.gray,fontFamily:"monospace",textTransform:"uppercase",letterSpacing:"0.08em"}}>{label}</span></div>
                  <div style={{fontSize:22,fontWeight:800,color:val>0?color:"#9CA3AF"}}>{val}</div>
                </div>
              ))}
            </div>
          </Card>
          <IssuePanel issues={baseIssues} flights={flights} title="Current Operation — All Issues" accent={C.red}/>
        </>)}

        {result&&(<>
          {/* Result sub-tabs */}
          <div style={{display:"flex",gap:0,borderBottom:`1px solid ${BG.border}`,marginBottom:16,overflowX:"auto"}}>
            {[["overview","Overview"],["flightwise","Flight-by-Flight"],["issues","Issue Resolution"],["resources","Resources"],["analysis","VCE Analysis"]].map(([id,label])=>(
              <button key={id} onClick={()=>setActiveTab(id)} style={simTabStyle(activeTab===id)}>{label}</button>
            ))}
          </div>

          {/* OVERVIEW */}
          {activeTab==="overview"&&(<>
            {/* KPI row */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
              {[
                {label:"Avg Ground Time",val:`${result.stats.avgGT}m`,delta:result.stats.avgGT-baseline.avgGT,good:-1},
                {label:"Avg Delay",val:`${result.stats.avgDelay}m`,delta:+(result.stats.avgDelay-baseline.avgDelay).toFixed(1),good:-1},
                {label:"Mins Saved/Day",val:result.stats.totalSaved,info:"Total minutes recovered across all flights vs baseline. Divide by 48 for equivalent extra rotations."},
                {label:"Extra Flights",val:`+${result.stats.extraFlights}`,info:"Equivalent additional rotations unlocked per day."},
              ].map(item=>(
                <Card key={item.label} style={{padding:"12px 14px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:6}}>
                    <span style={{fontSize:9,color:C.gray,fontFamily:"monospace",letterSpacing:"0.1em",textTransform:"uppercase",flex:1}}>{item.label}</span>
                    {item.info&&<InfoTip content={item.info}/>}
                  </div>
                  <div style={{fontSize:22,fontWeight:800,color:"#F9FAFB"}}>{item.val}</div>
                  {item.delta!==undefined&&<div style={{fontSize:12,fontWeight:700,marginTop:4,color:item.delta*(item.good||1)>0?C.teal:C.red}}>{item.delta>0?"+":""}{item.delta} vs baseline</div>}
                </Card>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
              {[
                {label:"Issues Resolved",val:result.stats.issuesResolved,color:C.teal,icon:CheckCircle},
                {label:"Remaining Issues",val:result.stats.issuesRemaining,color:result.stats.issuesRemaining>0?C.amber:C.teal,icon:AlertCircle},
                {label:"R$ Impact/Year",val:`R$${(result.stats.financialImpact*250/1e6).toFixed(1)}M`,color:C.lime,icon:TrendingUp},
                {label:"Runway Cap/hr",val:`${result.stats.runwayCap} mov`,color:C.blue,icon:Radio},
              ].map(({label,val,color,icon:Icon})=>(
                <div key={label} style={{background:BG.surface2,border:`1px solid ${BG.border}`,borderRadius:8,padding:"10px 14px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}><Icon size={13} color={color}/><span style={{fontSize:9,color:C.gray,fontFamily:"monospace",textTransform:"uppercase",letterSpacing:"0.08em"}}>{label}</span></div>
                  <div style={{fontSize:18,fontWeight:800,color}}>{val}</div>
                </div>
              ))}
            </div>

            {/* Comparison chart */}
            <Card style={{marginBottom:14}}>
              <div style={{fontSize:12,color:C.gray,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"monospace",marginBottom:14}}>Baseline vs. Simulated — Key Metrics</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={compData} margin={{top:5,right:20,bottom:5,left:0}}>
                  <CartesianGrid stroke={BG.border} strokeDasharray="3 3"/>
                  <XAxis dataKey="name" tick={{fill:C.gray,fontSize:10}}/><YAxis tick={{fill:C.gray,fontSize:10}}/>
                  <Tooltip content={<TT/>}/><Legend wrapperStyle={{fontSize:11,color:C.gray}}/>
                  <Bar dataKey="baseline" name="Baseline" fill={`${C.red}88`} radius={[4,4,0,0]}/>
                  <Bar dataKey="simulated" name="Simulated" fill={`${C.teal}99`} radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Hourly delay */}
            <Card style={{marginBottom:14}}>
              <div style={{fontSize:12,color:C.gray,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"monospace",marginBottom:14}}>
                Simulated Hourly Profile — Ground Time & Delay
                <InfoTip content="Simulated hourly breakdown. Flat, low bars across all hours = system absorbing demand without creating cascades. Red peaks = hours where further intervention has highest leverage."/>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={result.hourly.filter(h=>h.movements>0)} margin={{top:5,right:20,bottom:5,left:0}}>
                  <CartesianGrid stroke={BG.border} strokeDasharray="3 3"/>
                  <XAxis dataKey="hour" tick={{fill:C.gray,fontSize:9}} interval={1}/><YAxis tick={{fill:C.gray,fontSize:10}}/>
                  <Tooltip content={<TT/>}/><Legend wrapperStyle={{fontSize:11,color:C.gray}}/>
                  <Bar dataKey="avgGT" name="Avg Ground (min)" fill={C.blue} radius={[3,3,0,0]}/>
                  <Bar dataKey="avgDelay" name="Avg Delay (min)" fill={C.amber} radius={[3,3,0,0]}/>
                  <Bar dataKey="conflicts" name="Conflicts" fill={`${C.red}88`} radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Runway throughput */}
            {(cfg.extraRunway>0||cfg.virtualRunway)&&(<Card style={{marginBottom:14}}>
              <div style={{fontSize:12,color:C.gray,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"monospace",marginBottom:14}}>
                Runway Throughput — Demand vs Capacity ({result.stats.totalRunways} runways, {result.stats.runwayCap} mov/hr limit)
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={result.runwayThroughput} margin={{top:5,right:20,bottom:5,left:0}}>
                  <defs>
                    <linearGradient id="demG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.blue} stopOpacity={0.4}/><stop offset="95%" stopColor={C.blue} stopOpacity={0.02}/></linearGradient>
                  </defs>
                  <CartesianGrid stroke={BG.border} strokeDasharray="3 3"/>
                  <XAxis dataKey="hour" tick={{fill:C.gray,fontSize:9}} interval={2}/><YAxis tick={{fill:C.gray,fontSize:10}}/>
                  <Tooltip content={<TT/>}/><Legend wrapperStyle={{fontSize:11,color:C.gray}}/>
                  <Area type="monotone" dataKey="demand" name="Demand" stroke={C.blue} fill="url(#demG)" strokeWidth={2}/>
                  <Line type="monotone" dataKey="capacity" name="Capacity limit" stroke={C.red} strokeWidth={1.5} dot={false} strokeDasharray="6 3"/>
                  <Bar dataKey="overflow" name="Overflow" fill={`${C.red}77`} radius={[3,3,0,0]}/>
                </AreaChart>
              </ResponsiveContainer>
              {result.runwayThroughput.some(h=>h.overflow>0)
                ?<div style={{fontSize:12,color:C.orange,marginTop:8}}>⚠ Capacity exceeded in {result.runwayThroughput.filter(h=>h.overflow>0).length} hours — runway bottleneck persists. Consider adding another runway or Virtual Runway protocol.</div>
                :<div style={{fontSize:12,color:C.teal,marginTop:8}}>✓ Runway capacity not exceeded in any hour under this configuration.</div>}
            </Card>)}
          </>)}

          {/* FLIGHT-BY-FLIGHT */}
          {activeTab==="flightwise"&&(
            <FlightImprovementTable simFlights={result.flights} flights={flights}/>
          )}

          {/* ISSUES */}
          {activeTab==="issues"&&(<div style={{display:"grid",gap:16}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:4}}>
              {[{label:"Issues Before",val:result.baseIssues.length,color:C.red},{label:"Issues After",val:result.issues.length,color:result.issues.length<result.baseIssues.length?C.teal:C.amber},{label:"Resolved",val:result.stats.issuesResolved,color:C.teal},{label:"High-Severity Remaining",val:result.issues.filter(i=>i.severity==="high").length,color:result.issues.filter(i=>i.severity==="high").length>0?C.red:C.teal}].map(({label,val,color})=>(
                <div key={label} style={{background:BG.surface2,border:`1px solid ${BG.border}`,borderRadius:8,padding:"10px 14px"}}>
                  <div style={{fontSize:10,color:C.gray,fontFamily:"monospace",textTransform:"uppercase",marginBottom:6}}>{label}</div>
                  <div style={{fontSize:22,fontWeight:800,color}}>{val}</div>
                </div>
              ))}
            </div>
            <IssuePanel issues={result.issues} flights={result.flights} title="Post-Simulation Issues" accent={C.amber}/>
          </div>)}

          {/* RESOURCES */}
          {activeTab==="resources"&&(<div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:14}}>
              {[
                {label:"Fuel Trucks",baseline:6,simulated:result.stats.fuelTrucks,color:C.amber,icon:Truck,unit:"",contention:result.stats.fuelContention},
                {label:"Ground Staff",baseline:48,simulated:result.stats.groundStaff,color:C.purple,icon:Users,unit:" staff",contention:result.stats.staffContention},
                {label:"Runways",baseline:2,simulated:result.stats.totalRunways,color:C.blue,icon:Radio,unit:"",contention:null},
              ].map(({label,baseline:bl,simulated:sim,color,icon:Icon,unit,contention})=>(
                <Card key={label}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><Icon size={14} color={color}/><span style={{fontSize:11,color:C.gray,fontFamily:"monospace",textTransform:"uppercase"}}>{label}</span></div>
                  <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:6}}>
                    <span style={{fontSize:24,fontWeight:800,color}}>{sim}{unit}</span>
                    {sim>bl&&<span style={{fontSize:12,color:C.teal}}>+{sim-bl} added</span>}
                  </div>
                  {contention!==null&&<div style={{fontSize:12,color:contention>0?C.amber:C.teal}}>Contention events: {contention}</div>}
                </Card>
              ))}
            </div>
            <Card style={{marginBottom:14}}>
              <div style={{fontSize:12,color:C.gray,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"monospace",marginBottom:14}}>Staff Utilisation by Hour</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={result.staffUtil} margin={{top:5,right:20,bottom:5,left:0}}>
                  <defs><linearGradient id="su" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.purple} stopOpacity={0.4}/><stop offset="95%" stopColor={C.purple} stopOpacity={0.02}/></linearGradient></defs>
                  <CartesianGrid stroke={BG.border} strokeDasharray="3 3"/>
                  <XAxis dataKey="hour" tick={{fill:C.gray,fontSize:9}} interval={2}/><YAxis tick={{fill:C.gray,fontSize:10}}/>
                  <Tooltip content={<TT/>}/><Legend wrapperStyle={{fontSize:11,color:C.gray}}/>
                  <Area type="monotone" dataKey="used" name="Staff In Use" stroke={C.purple} fill="url(#su)" strokeWidth={2}/>
                  <Line type="monotone" dataKey="capacity" name="Max Capacity" stroke={C.red} strokeWidth={1.5} dot={false} strokeDasharray="6 3"/>
                </AreaChart>
              </ResponsiveContainer>
            </Card>
            {/* Runway throughput (always show here) */}
            <Card>
              <div style={{fontSize:12,color:C.gray,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"monospace",marginBottom:14}}>
                Runway Throughput — {result.stats.totalRunways} Runways · {result.stats.runwayCap} mov/hr cap
                {cfg.weatherDisruption&&<span style={{color:C.orange,marginLeft:8}}>(Weather: −25% cap)</span>}
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={result.runwayThroughput} margin={{top:5,right:20,bottom:5,left:0}}>
                  <defs><linearGradient id="rtG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.blue} stopOpacity={0.35}/><stop offset="95%" stopColor={C.blue} stopOpacity={0.02}/></linearGradient></defs>
                  <CartesianGrid stroke={BG.border} strokeDasharray="3 3"/>
                  <XAxis dataKey="hour" tick={{fill:C.gray,fontSize:9}} interval={2}/><YAxis tick={{fill:C.gray,fontSize:10}}/>
                  <Tooltip content={<TT/>}/><Legend wrapperStyle={{fontSize:11,color:C.gray}}/>
                  <Area type="monotone" dataKey="demand" name="Dep Demand" stroke={C.blue} fill="url(#rtG)" strokeWidth={2}/>
                  <Line type="monotone" dataKey="capacity" name="Capacity" stroke={`${C.red}`} strokeWidth={2} dot={false} strokeDasharray="6 3"/>
                </AreaChart>
              </ResponsiveContainer>
              {/* Financial ROI summary */}
              {cfg.extraRunway>0&&<div style={{marginTop:12,padding:"10px 14px",background:`${C.lime}11`,borderRadius:8,border:`1px solid ${C.lime}33`}}>
                <div style={{fontSize:12,color:C.lime,fontWeight:700,marginBottom:4}}>Runway Investment ROI Model</div>
                <div style={{fontSize:12,color:"#9CA3AF"}}>+{cfg.extraRunway} runway → +{cfg.extraRunway*10} mov/hr → ~+{cfg.extraRunway*3650} extra slots/year at R$9,500/slot = <span style={{color:C.lime,fontWeight:700}}>R${(cfg.extraRunway*3650*9500/1e6).toFixed(0)}M revenue/year</span></div>
                <div style={{fontSize:12,color:"#9CA3AF",marginTop:4}}>Capex R${cfg.extraRunway===1?"1.2–1.8":"2.4–3.6"}B · Payback {cfg.extraRunway===1?"4.3":"7.1"} years at current load</div>
              </div>}
            </Card>
          </div>)}

          {/* ANALYSIS */}
          {activeTab==="analysis"&&(
            <Card>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <Cpu size={14} color={C.amber}/>
                <span style={{fontSize:12,color:C.gray,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"monospace"}}>VCE Scenario Analysis</span>
              </div>
              <AiBlock text={analysisText}/>
              {/* Summary metrics inline */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginTop:16}}>
                {[
                  {label:"Ground Time Saving",val:`${baseline.avgGT-result.stats.avgGT} min/flight`,color:C.teal},
                  {label:"Annual R$ Impact",val:`R$${(result.stats.financialImpact*250/1e6).toFixed(1)}M`,color:C.lime},
                  {label:"Issues Cleared",val:`${result.stats.issuesResolved}/${result.stats.issuesResolved+result.stats.issuesRemaining}`,color:C.amber},
                ].map(({label,val,color})=>(
                  <div key={label} style={{background:`${color}11`,border:`1px solid ${color}33`,borderRadius:8,padding:"10px 14px",textAlign:"center"}}>
                    <div style={{fontSize:10,color:C.gray,fontFamily:"monospace",textTransform:"uppercase",marginBottom:6}}>{label}</div>
                    <div style={{fontSize:16,fontWeight:800,color}}>{val}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>)}
      </div>
    </div>
  </div>);}

// ─── OTHER TABS (Dashboard, Turnaround, Forecasting, Advisor) ────

function Dashboard({flights,baseline}){
  const onGround=flights.filter(f=>f.status==="on-ground");
  const arriving=flights.filter(f=>f.status==="arriving");
  const delayed=flights.filter(f=>f.delay>15);
  const avgGT=Math.round(flights.reduce((s,f)=>s+f.groundTime,0)/(flights.length||1));
  const fc=useMemo(()=>buildForecast(flights),[flights]);
  const gateHeat=useMemo(()=>GATES.map(gate=>{
    const cols=Array.from({length:19},(_,i)=>{const h=i+5;
      const occ=flights.filter(f=>f.gate===gate.id&&Math.floor(f.actualArr/60)<=h&&Math.floor(f.actualDep/60)>=h).length;
      return{color:occ===0?"#1F2937":occ===1?`${C.teal}55`:occ===2?`${C.amber}88`:`${C.red}99`};
    });return{gate:gate.id,terminal:gate.terminal,cols};
  }),[flights]);
  return(<div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12,marginBottom:20}}>
      <KPI label="Total Movements" value={flights.length} sub="Today" icon={Plane} color={C.amber}/>
      <KPI label="On Ground" value={onGround.length} sub={`${arriving.length} arriving`} icon={Navigation} color={C.teal}/>
      <KPI label="Avg Ground Time" value={`${avgGT}m`} sub={`Baseline: ${baseline.avgGT}m`} icon={Clock} color={C.blue} delta={Math.round((baseline.avgGT-avgGT)/baseline.avgGT*100)}/>
      <KPI label="Delayed >15min" value={delayed.length} sub={`${Math.round(delayed.length/flights.length*100)}%`} icon={AlertTriangle} color={C.red}/>
      <KPI label="Gate Util" value={`${baseline.utilization}%`} sub="Gate-hours" icon={Activity} color={C.purple}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16,marginBottom:16}}>
      <Card>
        <div style={{fontSize:12,color:C.gray,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:14,fontFamily:"monospace"}}>Hourly Traffic</div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={fc.hourly} margin={{top:5,right:10,bottom:5,left:0}}>
            <defs>
              <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.teal} stopOpacity={0.4}/><stop offset="95%" stopColor={C.teal} stopOpacity={0.02}/></linearGradient>
              <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.amber} stopOpacity={0.4}/><stop offset="95%" stopColor={C.amber} stopOpacity={0.02}/></linearGradient>
            </defs>
            <CartesianGrid stroke={BG.border} strokeDasharray="3 3"/>
            <XAxis dataKey="hour" tick={{fill:C.gray,fontSize:10}} interval={2}/><YAxis tick={{fill:C.gray,fontSize:10}}/>
            <Tooltip content={<TT/>}/><Legend wrapperStyle={{fontSize:11,color:C.gray}}/>
            <Area type="monotone" dataKey="arrivals" stroke={C.teal} fill="url(#ag)" strokeWidth={2} name="Arrivals"/>
            <Area type="monotone" dataKey="departures" stroke={C.amber} fill="url(#dg)" strokeWidth={2} name="Departures"/>
          </AreaChart>
        </ResponsiveContainer>
      </Card>
      <Card>
        <div style={{fontSize:12,color:C.gray,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:14,fontFamily:"monospace"}}>Carrier Split</div>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart><Pie data={buildCarrierPerf(flights)} dataKey="flights" nameKey="name" cx="50%" cy="50%" outerRadius={75}
            label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
            {buildCarrierPerf(flights).map((c,i)=><Cell key={i} fill={c.color}/>)}
          </Pie><Tooltip content={<TT/>}/></PieChart>
        </ResponsiveContainer>
      </Card>
    </div>
    <Card style={{marginBottom:16}}>
      <div style={{fontSize:12,color:C.gray,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10,fontFamily:"monospace"}}>Gate Occupancy Heatmap 05:00→23:00</div>
      <div style={{fontSize:10,color:C.gray,fontFamily:"monospace",display:"flex",gap:20,marginBottom:8}}>
        {[["#1F2937","Free"],[`${C.teal}55`,"1"],[`${C.amber}88`,"2"],[`${C.red}99`,"Conflict"]].map(([bg,l])=>(
          <span key={l}><span style={{display:"inline-block",width:10,height:10,background:bg,border:`1px solid ${BG.border}`,marginRight:4}}/>{l}</span>
        ))}
      </div>
      <div style={{overflowX:"auto"}}><table style={{borderCollapse:"collapse",fontSize:10,fontFamily:"monospace"}}>
        <thead><tr><th style={{color:C.gray,padding:"2px 8px",textAlign:"left",minWidth:50}}>Gate</th>
          {Array.from({length:19},(_,i)=><th key={i} style={{color:C.gray,padding:"2px 4px",minWidth:28,textAlign:"center"}}>{String(i+5).padStart(2,"0")}</th>)}
        </tr></thead>
        <tbody>{gateHeat.map(row=>(
          <tr key={row.gate}>
            <td style={{color:"#9CA3AF",padding:"2px 8px",fontWeight:600}}>{row.gate}<span style={{color:C.gray,fontSize:9}}> {row.terminal}</span></td>
            {row.cols.map((col,ci)=><td key={ci} style={{background:col.color,width:26,height:18,border:`1px solid ${BG.page}`}}/>)}
          </tr>
        ))}</tbody>
      </table></div>
    </Card>
    <Card>
      <div style={{fontSize:12,color:C.gray,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:14,fontFamily:"monospace"}}>Live Flight Board</div>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr style={{borderBottom:`1px solid ${BG.border}`}}>
          {["Flight","AC","Gate","Origin","Dest","Arr","Dep","Delay","GT","Status"].map(h=>(
            <th key={h} style={{color:C.gray,padding:"6px 10px",textAlign:"left",fontSize:10,fontFamily:"monospace",letterSpacing:"0.08em",whiteSpace:"nowrap"}}>{h}</th>
          ))}
        </tr></thead>
        <tbody>{flights.slice(0,40).map((f,i)=>(
          <tr key={f.id} style={{borderBottom:`1px solid ${BG.surface2}`,background:i%2===0?"transparent":BG.surface2}}>
            <td style={{padding:"7px 10px",color:f.airlineColor,fontWeight:700,fontFamily:"monospace"}}>{f.id}</td>
            <td style={{padding:"7px 10px",color:"#9CA3AF",fontFamily:"monospace"}}>{f.acType}</td>
            <td style={{padding:"7px 10px",color:"#F9FAFB",fontFamily:"monospace",fontWeight:600}}>{f.gate}</td>
            <td style={{padding:"7px 10px",color:"#9CA3AF"}}>{f.origin}</td>
            <td style={{padding:"7px 10px",color:"#9CA3AF"}}>{f.destination}</td>
            <td style={{padding:"7px 10px",color:"#D1D5DB",fontFamily:"monospace"}}>{fmt(f.scheduledArr)}</td>
            <td style={{padding:"7px 10px",color:"#D1D5DB",fontFamily:"monospace"}}>{fmt(f.actualDep)}</td>
            <td style={{padding:"7px 10px",color:f.delay>15?C.red:f.delay>5?C.amber:C.teal,fontFamily:"monospace",fontWeight:600}}>{f.delay>0?`+${f.delay}m`:"—"}</td>
            <td style={{padding:"7px 10px",color:"#9CA3AF",fontFamily:"monospace"}}>{f.groundTime}m</td>
            <td style={{padding:"7px 10px"}}><StatusBadge status={f.status}/></td>
          </tr>
        ))}</tbody>
      </table></div>
    </Card>
  </div>);}

function TurnaroundOptimizer({flights}){
  const [selId,setSelId]=useState(flights.find(f=>f.status!=="departed")?.id||"");
  const [aiText,setAiText]=useState("");const [optimized,setOptimized]=useState(null);
  const flight=useMemo(()=>flights.find(f=>f.id===selId),[flights,selId]);
  const msList=[{key:"blockIn",label:"Block In",color:C.blue},{key:"doorsOpen",label:"Doors Open",color:C.teal},{key:"deplaning",label:"Deplaning ✓",color:C.teal},{key:"fuelStart",label:"Fuel Start",color:C.amber},{key:"cleaning",label:"Cleaning ✓",color:C.purple},{key:"catering",label:"Catering ✓",color:C.purple},{key:"fuelDone",label:"Fuel Done",color:C.amber},{key:"boardingStart",label:"Boarding ▶",color:C.teal},{key:"boardingDone",label:"Boarding ✓",color:C.teal},{key:"doorsClosed",label:"Doors Closed",color:C.blue},{key:"pushback",label:"Pushback",color:C.amber}];
  const ganttData=useMemo(()=>{if(!flight)return[];const ms=flight.milestones;return[{name:"Deboarding",start:ms.blockIn,end:ms.deplaning,color:`${C.teal}cc`},{name:"Cleaning",start:ms.deplaning,end:ms.cleaning,color:`${C.purple}cc`},{name:"Catering",start:ms.deplaning,end:ms.catering,color:`${C.purple}66`},{name:"Fuelling",start:ms.fuelStart,end:ms.fuelDone,color:`${C.amber}cc`},{name:"Boarding",start:ms.boardingStart,end:ms.boardingDone,color:`${C.blue}cc`}].map(p=>({...p,offset:p.start-ms.blockIn,duration:p.end-p.start}));},[flight]);
  const maxD=ganttData.reduce((s,p)=>Math.max(s,p.offset+p.duration),0)||1;
  const optimise=()=>{const key=flight?.acType||"default";setAiText(PREFILLED.turnaround[key]||PREFILLED.turnaround.default);const saving=Math.round((flight?.groundTime||45)*0.13);setOptimized({groundTime:(flight?.groundTime||45)-saving,saving});};
  if(!flight)return <Card><div style={{color:C.gray}}>No flights available.</div></Card>;
  return(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
    <div>
      <Card style={{marginBottom:12}}>
        <div style={{fontSize:12,color:C.gray,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"monospace",marginBottom:12}}>Select Flight</div>
        <select value={selId} onChange={e=>{setSelId(e.target.value);setAiText("");setOptimized(null);}}
          style={{width:"100%",background:BG.surface2,color:"#F9FAFB",border:`1px solid ${BG.border}`,borderRadius:6,padding:"8px 12px",fontSize:13,fontFamily:"monospace"}}>
          {flights.filter(f=>f.status!=="departed").slice(0,60).map(f=>(
            <option key={f.id} value={f.id}>{f.id} — {f.acType} — {f.origin}→{f.destination} — {fmt(f.scheduledArr)}</option>
          ))}
        </select>
      </Card>
      <Card style={{marginBottom:12}}>
        {[["Flight",flight.id],["Aircraft",flight.acType],["Gate",flight.gate],["Pax",flight.pax],["Load Factor",`${flight.loadFactor}%`],["Scheduled Arr",fmt(flight.scheduledArr)],["Actual Arr",fmt(flight.actualArr)],["Ground Time",`${flight.groundTime} min`],...(optimized?[["→ Optimised GT",`${optimized.groundTime} min (−${optimized.saving} min)`]]:[]),["Delay",flight.delay>0?`+${flight.delay} min`:"On time"]].map(([k,v])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${BG.border}`,fontSize:13}}>
            <span style={{color:C.gray}}>{k}</span><span style={{color:k.startsWith("→")?C.teal:"#F9FAFB",fontFamily:"monospace",fontWeight:600}}>{v}</span>
          </div>
        ))}
      </Card>
      <Card>{msList.map(ms=>(
        <div key={ms.key} style={{display:"flex",alignItems:"center",gap:10,padding:"5px 0",borderBottom:`1px solid ${BG.surface2}`}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:ms.color,flexShrink:0}}/>
          <span style={{flex:1,fontSize:12,color:"#9CA3AF"}}>{ms.label}</span>
          <span style={{fontSize:12,color:"#F9FAFB",fontFamily:"monospace",fontWeight:600}}>{fmt(flight.milestones[ms.key])}</span>
          <span style={{fontSize:11,color:C.gray,fontFamily:"monospace",minWidth:40,textAlign:"right"}}>+{flight.milestones[ms.key]-flight.milestones.blockIn}m</span>
        </div>
      ))}</Card>
    </div>
    <div>
      <Card style={{marginBottom:12}}>
        <div style={{fontSize:12,color:C.gray,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"monospace",marginBottom:14}}>Ground Phase Gantt</div>
        {ganttData.map((p,i)=>(
          <div key={i} style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.gray,marginBottom:4}}><span>{p.name}</span><span style={{fontFamily:"monospace"}}>+{p.offset}m → +{p.offset+p.duration}m ({p.duration}m)</span></div>
            <div style={{background:BG.surface2,borderRadius:4,height:14,position:"relative"}}><div style={{position:"absolute",left:`${(p.offset/maxD)*100}%`,width:`${Math.max(2,(p.duration/maxD)*100)}%`,background:p.color,height:"100%",borderRadius:4}}/></div>
          </div>
        ))}
        <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.gray,fontFamily:"monospace",marginTop:6}}><span>0m</span><span>{Math.round(maxD/2)}m</span><span>{maxD}m</span></div>
      </Card>
      <Card style={{marginBottom:12}}>
        <button onClick={optimise} style={{width:"100%",background:`${C.teal}22`,color:C.teal,border:`1px solid ${C.teal}44`,borderRadius:8,padding:"11px",fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <Zap size={14}/>Optimise This Turnaround
        </button>
        {optimized&&<div style={{marginTop:10,padding:"10px",background:`${C.teal}11`,borderRadius:8,border:`1px solid ${C.teal}33`}}><div style={{color:C.teal,fontWeight:700}}>−{optimized.saving} min saved</div><div style={{color:C.gray,fontSize:12}}>New GT: {optimized.groundTime} min</div></div>}
      </Card>
      <AiBlock text={aiText}/>
    </div>
  </div>);}

function Forecasting({flights}){
  const fc=useMemo(()=>buildForecast(flights),[flights]);
  const carriers=useMemo(()=>buildCarrierPerf(flights),[flights]);
  const [selectedCarrier,setSelectedCarrier]=useState(null);
  const [showForecast,setShowForecast]=useState(false);
  const [expandedAC,setExpandedAC]=useState(null);
  const selC=carriers.find(c=>c.code===selectedCarrier);
  const hourlyHL=useMemo(()=>fc.hourly.map(h=>{
    if(!selectedCarrier)return h;
    const n=flights.filter(f=>f.airline===selectedCarrier&&Math.floor(f.scheduledArr/60)===parseInt(h.hour)).length;
    return{...h,carrierArrivals:n};
  }),[fc.hourly,selectedCarrier,flights]);
  const PERF_SUGGESTIONS={poor:{A320:["Pre-positioned fuel trucks — saves 6 min/rotation","Dual-door catering+cleaning parallel protocol","Dedicated turnaround coordinator"],B737:["Exploit single-point refuelling — start at T+8 not T+15","Bidirectional boarding: fwd bridge + aft stairs","Target 42 min SLA — alert if >45 min at T+20"],default:["Real-time milestone tracking via tablet","Pre-position equipment 20 min before block-in","Benchmark against carrier's own best rotations"]},average:{default:["Review consecutive same-gate rotation compression","Check catering supplier lead time — delays 31% of overruns","Consider gate reassignment to cut taxi-in 2–3 min"]}};
  const getSuggestions=ac=>{if(!ac||ac.performance==="good")return[];const b=PERF_SUGGESTIONS[ac.performance]||PERF_SUGGESTIONS.average;return b[ac.type]||b.default;};
  return(<div>
    <Card style={{marginBottom:14}}>
      <div style={{fontSize:12,color:C.gray,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:14,fontFamily:"monospace"}}>30-Day Movement Trend</div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={fc.trend} margin={{top:5,right:20,bottom:5,left:0}}>
          <defs><linearGradient id="movG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.amber} stopOpacity={0.4}/><stop offset="95%" stopColor={C.amber} stopOpacity={0.02}/></linearGradient></defs>
          <CartesianGrid stroke={BG.border} strokeDasharray="3 3"/>
          <XAxis dataKey="day" tick={{fill:C.gray,fontSize:9}} interval={4}/><YAxis tick={{fill:C.gray,fontSize:10}}/>
          <Tooltip content={<TT/>}/>
          <Area type="monotone" dataKey="movements" name="Daily Movements" stroke={C.amber} fill="url(#movG)" strokeWidth={2}/>
          <Line type="monotone" dataKey="delays" name="Avg Delay" stroke={C.red} strokeWidth={1.5} dot={false} strokeDasharray="4 2"/>
        </AreaChart>
      </ResponsiveContainer>
    </Card>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
      <Card>
        <div style={{fontSize:12,color:C.gray,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10,fontFamily:"monospace"}}>Avg Delay by Hour{selC&&<span style={{color:selC.color,fontSize:11,marginLeft:8}}>— {selC.name}</span>}</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={hourlyHL} margin={{top:5,right:10,bottom:5,left:0}}>
            <CartesianGrid stroke={BG.border} strokeDasharray="3 3"/><XAxis dataKey="hour" tick={{fill:C.gray,fontSize:9}} interval={2}/><YAxis tick={{fill:C.gray,fontSize:10}}/><Tooltip content={<TT/>}/>
            <Bar dataKey="avgDelay" name="Avg Delay" radius={[3,3,0,0]}>
              {hourlyHL.map((h,i)=><Cell key={i} fill={selectedCarrier&&h.carrierArrivals>0?selC?.color:h.avgDelay>20?C.red:h.avgDelay>10?C.amber:C.teal} opacity={selectedCarrier&&!h.carrierArrivals?0.25:1}/>)}
            </Bar>
            {selectedCarrier&&<Bar dataKey="carrierArrivals" name={`${selC?.name} arrivals`} fill={`${selC?.color}55`} radius={[3,3,0,0]}/>}
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card>
        <div style={{fontSize:12,color:C.gray,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10,fontFamily:"monospace"}}>Gate Occupancy Forecast</div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={fc.hourly} margin={{top:5,right:10,bottom:5,left:0}}>
            <CartesianGrid stroke={BG.border} strokeDasharray="3 3"/><XAxis dataKey="hour" tick={{fill:C.gray,fontSize:9}} interval={2}/><YAxis tick={{fill:C.gray,fontSize:10}} domain={[0,GATES.length]}/><Tooltip content={<TT/>}/>
            <Line type="monotone" dataKey="occupancy" name="Gates in Use" stroke={C.blue} strokeWidth={2} dot={false}/>
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
    <Card style={{marginBottom:14}}>
      <div style={{fontSize:12,color:C.gray,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6,fontFamily:"monospace"}}>Carrier Performance Matrix — click to drill down</div>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr style={{borderBottom:`1px solid ${BG.border}`}}>{["Carrier","Flights","Avg GT","OTP","Load","Score","Status"].map(h=><th key={h} style={{color:C.gray,padding:"6px 12px",textAlign:"left",fontSize:10,fontFamily:"monospace"}}>{h}</th>)}</tr></thead>
        <tbody>{carriers.map((c,i)=>{const isSel=selectedCarrier===c.code;return(
          <tr key={c.code} onClick={()=>setSelectedCarrier(isSel?null:c.code)}
            style={{borderBottom:`1px solid ${BG.surface2}`,background:isSel?`${c.color}18`:i%2===0?"transparent":BG.surface2,cursor:"pointer",outline:isSel?`2px solid ${c.color}44`:"none"}}>
            <td style={{padding:"8px 12px"}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:4,height:24,borderRadius:2,background:c.color}}/><span style={{color:c.color,fontWeight:700}}>{c.name}</span></div></td>
            <td style={{padding:"8px 12px",color:"#9CA3AF",fontFamily:"monospace"}}>{c.flights}</td>
            <td style={{padding:"8px 12px",color:c.avgGT>48?C.red:c.avgGT>42?C.amber:C.teal,fontFamily:"monospace",fontWeight:600}}>{c.avgGT}m</td>
            <td style={{padding:"8px 12px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:50,background:BG.border,borderRadius:4,height:5}}><div style={{width:`${c.otp}%`,background:c.otp>85?C.teal:c.otp>75?C.amber:C.red,height:"100%",borderRadius:4}}/></div><span style={{fontSize:12,fontFamily:"monospace",color:"#F9FAFB"}}>{c.otp}%</span></div></td>
            <td style={{padding:"8px 12px",color:"#9CA3AF",fontFamily:"monospace"}}>{c.avgLoad}%</td>
            <td style={{padding:"8px 12px"}}><span style={{fontSize:13,fontWeight:800,color:c.score>75?C.teal:c.score>55?C.amber:C.red,fontFamily:"monospace"}}>{c.score}</span></td>
            <td style={{padding:"8px 12px"}}><span style={{fontSize:11,padding:"3px 8px",borderRadius:4,fontFamily:"monospace",fontWeight:700,background:c.otp>85?`${C.teal}22`:c.otp>75?`${C.amber}22`:`${C.red}22`,color:c.otp>85?C.teal:c.otp>75?C.amber:C.red}}>{c.otp>85?"Strong":c.otp>75?"Average":"At Risk"}</span></td>
          </tr>);})}
        </tbody>
      </table>
    </Card>
    {selC&&<Card style={{marginBottom:14,border:`1px solid ${selC.color}44`}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
        <div style={{fontSize:15,fontWeight:800,color:selC.color}}>{selC.name} — Fleet Deep-Dive</div>
        <button onClick={()=>setSelectedCarrier(null)} style={{background:"none",border:"none",color:C.gray,cursor:"pointer"}}><X size={16}/></button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div style={{background:`${C.red}11`,border:`1px solid ${C.red}33`,borderRadius:8,padding:"12px"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}><TrendingDown size={13} color={C.red}/><span style={{fontSize:11,color:C.red,fontWeight:700,textTransform:"uppercase",fontFamily:"monospace"}}>Dragging Down</span></div>
          {selC.draggingDown.length===0?<div style={{color:C.gray,fontSize:12}}>No underperformers</div>:selC.draggingDown.map(ac=>(
            <div key={ac.type} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",cursor:"pointer"}} onClick={()=>setExpandedAC(expandedAC===`${selC.code}-${ac.type}`?null:`${selC.code}-${ac.type}`)}>
                <span style={{fontSize:13,fontWeight:700,color:"#F9FAFB",fontFamily:"monospace"}}>{ac.type} ({ac.count})</span>
                <span style={{fontSize:12,color:C.red,fontFamily:"monospace"}}>+{ac.overrun}m over</span>
              </div>
              {expandedAC===`${selC.code}-${ac.type}`&&<div style={{marginTop:8,padding:"8px",background:`${C.amber}11`,borderRadius:6,border:`1px solid ${C.amber}33`}}>
                {getSuggestions(ac).map((s,i)=><div key={i} style={{fontSize:12,color:"#D1D5DB",display:"flex",gap:6,marginBottom:4}}><Zap size={11} color={C.amber} style={{flexShrink:0}}/>{s}</div>)}
                <div style={{marginTop:8,fontSize:10,color:C.gray,fontFamily:"monospace",textTransform:"uppercase",marginBottom:4}}>Worst rotations</div>
                {ac.flights.sort((a,b)=>b.groundTime-a.groundTime).slice(0,4).map(f=>(
                  <div key={f.id} style={{display:"flex",justifyContent:"space-between",fontSize:11,fontFamily:"monospace",padding:"2px 0",borderBottom:`1px solid ${BG.border}`,color:"#9CA3AF"}}>
                    <span style={{color:selC.color}}>{f.id}</span><span>{f.origin}→{f.destination}</span><span style={{color:C.red}}>{f.groundTime}m</span>
                  </div>
                ))}
              </div>}
            </div>
          ))}
        </div>
        <div style={{background:`${C.teal}11`,border:`1px solid ${C.teal}33`,borderRadius:8,padding:"12px"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}><Star size={13} color={C.teal}/><span style={{fontSize:11,color:C.teal,fontWeight:700,textTransform:"uppercase",fontFamily:"monospace"}}>Lifting Performance</span></div>
          {selC.lifting.length===0?<div style={{color:C.gray,fontSize:12}}>No standouts yet</div>:selC.lifting.map(ac=>(
            <div key={ac.type} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,fontWeight:700,color:"#F9FAFB",fontFamily:"monospace"}}>{ac.type} ({ac.count})</span><span style={{fontSize:12,color:C.teal,fontFamily:"monospace"}}>−{Math.abs(ac.overrun)}m</span></div>
              {ac.flights.sort((a,b)=>a.groundTime-b.groundTime).slice(0,3).map(f=>(
                <div key={f.id} style={{display:"flex",justifyContent:"space-between",fontSize:11,fontFamily:"monospace",padding:"2px 0",borderBottom:`1px solid ${BG.border}`,color:"#9CA3AF"}}>
                  <span style={{color:selC.color}}>{f.id}</span><span>{f.origin}→{f.destination}</span><span style={{color:C.teal}}>{f.groundTime}m</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr style={{borderBottom:`1px solid ${BG.border}`}}>{["Flight","AC","Gate","Route","GT","Delay","Impact"].map(h=><th key={h} style={{color:C.gray,padding:"5px 10px",textAlign:"left",fontSize:10,fontFamily:"monospace"}}>{h}</th>)}</tr></thead>
        <tbody>{flights.filter(f=>f.airline===selC.code).sort((a,b)=>b.groundTime-a.groundTime).map(f=>{const or=f.groundTime-(AC_TYPES[f.acType]?.ground[0]||30);return(
          <tr key={f.id} style={{borderBottom:`1px solid ${BG.surface2}`,background:or>12?`${C.red}11`:or>5?`${C.amber}09`:`${C.teal}08`}}>
            <td style={{padding:"6px 10px",color:selC.color,fontWeight:700,fontFamily:"monospace"}}>{f.id}</td>
            <td style={{padding:"6px 10px",color:"#9CA3AF",fontFamily:"monospace"}}>{f.acType}</td>
            <td style={{padding:"6px 10px",color:"#F9FAFB",fontFamily:"monospace"}}>{f.gate}</td>
            <td style={{padding:"6px 10px",color:"#9CA3AF"}}>{f.origin}→{f.destination}</td>
            <td style={{padding:"6px 10px",fontWeight:700,fontFamily:"monospace",color:or>12?C.red:or>5?C.amber:C.teal}}>{f.groundTime}m</td>
            <td style={{padding:"6px 10px",color:f.delay>15?C.red:f.delay>5?C.amber:C.teal,fontFamily:"monospace"}}>{f.delay>0?`+${f.delay}m`:"—"}</td>
            <td style={{padding:"6px 10px"}}>{or>12?<span style={{color:C.red,fontSize:11,display:"flex",alignItems:"center",gap:2}}><ArrowDown size={11}/>−{or}m</span>:<span style={{color:C.teal,fontSize:11,display:"flex",alignItems:"center",gap:2}}><ArrowUp size={11}/>+{Math.abs(or)}m</span>}</td>
          </tr>);})}
        </tbody>
      </table></div>
    </Card>}
    <Card>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontSize:12,color:C.gray,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"monospace"}}>VCE 30-Day Forecast</div>
        <button onClick={()=>setShowForecast(v=>!v)} style={{background:`${C.blue}22`,color:C.blue,border:`1px solid ${C.blue}44`,borderRadius:6,padding:"6px 14px",fontSize:12,cursor:"pointer",fontWeight:600}}>
          <TrendingUp size={12} style={{verticalAlign:"middle",marginRight:4}}/>{showForecast?"Hide":"View"}
        </button>
      </div>
      {showForecast&&<AiBlock text={PREFILLED.forecast}/>}
    </Card>
  </div>);}

function AIAdvisor({flights,baseline}){
  const recs=PREFILLED.recs||[];
  const [activeRec,setActiveRec]=useState(null);
  const [freeformQ,setFreeformQ]=useState("");const [freeformA,setFreeformA]=useState("");
  const delayed=flights.filter(f=>f.delay>15);
  const getAns=q=>{if(q.toLowerCase().includes("18")&&(q.toLowerCase().includes("delay")||q.toLowerCase().includes("cascade")))return PREFILLED.freeform?.delay18||"";return PREFILLED.freeform?.default||"";};
  if(!recs.length) return <Card><div style={{color:C.gray}}>No recommendations available.</div></Card>;
  const impC={High:C.red,Medium:C.amber,Low:C.teal};const effC={Low:C.teal,Medium:C.amber,High:C.red};
  return(<div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
      <KPI label="Delay Risk" value={delayed.length>30?"HIGH":delayed.length>15?"MED":"LOW"} sub={`${delayed.length} delayed`} icon={Shield} color={delayed.length>30?C.red:delayed.length>15?C.amber:C.teal}/>
      <KPI label="Gate Pressure" value={`${Math.min(99,Math.round(baseline.utilization+10))}%`} sub="Utilisation" icon={Activity} color={C.amber}/>
      <KPI label="Conflicts" value={baseline.conflicts} sub="Gate conflicts" icon={AlertTriangle} color={baseline.conflicts>10?C.red:C.amber}/>
      <KPI label="VCE Confidence" value="84%" sub="7-day accuracy" icon={Cpu} color={C.purple}/>
    </div>
    <Card style={{marginBottom:14}}>
      <div style={{marginBottom:14}}><div style={{fontSize:13,color:"#F9FAFB",fontWeight:700}}>Priority Action Queue</div><div style={{fontSize:12,color:C.gray,marginTop:2}}>Click any recommendation to expand implementation plan</div></div>
      {recs.map((rec,i)=>{const isA=activeRec===i;return(
        <div key={i} style={{marginBottom:10,border:`1px solid ${isA?C.amber:BG.border}`,borderRadius:8,background:isA?`${C.amber}08`:BG.surface2,overflow:"hidden"}}>
          <div style={{padding:"12px 16px",cursor:"pointer"}} onClick={()=>setActiveRec(isA?null:i)}>
            <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
              <div style={{background:C.amber,color:"#000",borderRadius:6,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12,flexShrink:0}}>{rec.rank}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <div style={{fontSize:13,color:"#F9FAFB",fontWeight:600,flex:1,paddingRight:12}}>{rec.title}</div>
                  <div style={{display:"flex",gap:5}}>
                    <span style={{fontSize:10,padding:"2px 7px",borderRadius:4,fontFamily:"monospace",fontWeight:700,background:`${impC[rec.impact]}22`,color:impC[rec.impact]}}>{rec.impact}</span>
                    <span style={{fontSize:10,padding:"2px 7px",borderRadius:4,fontFamily:"monospace",fontWeight:700,background:`${effC[rec.effort]}22`,color:effC[rec.effort]}}>Effort:{rec.effort}</span>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                  <span style={{fontSize:12,color:C.teal,fontWeight:700}}>✓ {rec.expectedSaving}</span>
                  {rec.financial&&<span style={{fontSize:12,color:C.amber,fontWeight:700}}>{rec.financial}</span>}
                  <span style={{fontSize:11,color:C.gray}}>Confidence: {rec.confidence}%</span>
                </div>
                <div style={{marginTop:8,display:"flex",gap:8}}>
                  {rec.shap?.map((s,si)=>(
                    <div key={si} style={{flex:1,fontSize:10,color:C.gray}}>
                      <div style={{marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.factor}</div>
                      <div style={{background:BG.border,borderRadius:3,height:4}}><div style={{width:`${Math.round(s.contribution*100)}%`,background:si===0?C.amber:si===1?C.blue:C.purple,height:"100%",borderRadius:3}}/></div>
                    </div>
                  ))}
                </div>
              </div>
              <ChevronRight size={14} color={C.gray} style={{flexShrink:0,transform:isA?"rotate(90deg)":"none",transition:"transform 0.2s"}}/>
            </div>
          </div>
          {isA&&<div style={{borderTop:`1px solid ${BG.border}`,padding:"12px 16px"}}><AiBlock text={rec.detail}/></div>}
        </div>);})}
    </Card>
    <Card>
      <div style={{fontSize:12,color:C.gray,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"monospace",marginBottom:12}}>Ask VCE</div>
      <textarea value={freeformQ} onChange={e=>setFreeformQ(e.target.value)} rows={3}
        placeholder="e.g. 'What's causing the 18:00 delay cascade?' or 'Which carrier needs immediate intervention?'"
        style={{width:"100%",background:BG.surface2,color:"#F9FAFB",border:`1px solid ${BG.border}`,borderRadius:8,padding:"10px 14px",fontSize:13,resize:"vertical",fontFamily:"monospace",boxSizing:"border-box"}}/>
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
        <button onClick={()=>{if(freeformQ.trim())setFreeformA(getAns(freeformQ));}}
          style={{background:C.amber,color:"#000",border:"none",borderRadius:8,padding:"9px 20px",fontWeight:800,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
          <Terminal size={13}/>Analyse
        </button>
      </div>
      {freeformA&&<AiBlock text={freeformA}/>}
    </Card>
  </div>);}

// ─── AUTH ────────────────────────────────────────────────────────
function AuthScreen({onAuth}){
  const [u,setU]=useState("");const [p,setP]=useState("");const [err,setErr]=useState("");
  const go=()=>{if(u==="ops@vce.aero"&&p==="VCE2025#GRU")onAuth();else setErr("Invalid credentials.");};
  return(<div style={{minHeight:"100vh",background:BG.page,display:"flex",alignItems:"center",justifyContent:"center"}}>
    <div style={{background:BG.surface,border:`1px solid ${BG.border}`,borderRadius:12,padding:"40px 48px",width:360,textAlign:"center"}}>
      <div style={{background:C.amber,borderRadius:10,width:48,height:48,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px"}}><Plane size={24} color="#000"/></div>
      <div style={{fontSize:22,fontWeight:800,color:"#F9FAFB",marginBottom:4}}>VCE</div>
      <div style={{fontSize:12,color:C.gray,fontFamily:"monospace",marginBottom:28}}>Virtual Capacity Engine · GRU</div>
      <input value={u} onChange={e=>setU(e.target.value)} placeholder="Email" type="email"
        style={{width:"100%",background:BG.surface2,color:"#F9FAFB",border:`1px solid ${BG.border}`,borderRadius:8,padding:"10px 14px",fontSize:14,marginBottom:10,boxSizing:"border-box"}}/>
      <input value={p} onChange={e=>setP(e.target.value)} placeholder="Password" type="password" onKeyDown={e=>e.key==="Enter"&&go()}
        style={{width:"100%",background:BG.surface2,color:"#F9FAFB",border:`1px solid ${BG.border}`,borderRadius:8,padding:"10px 14px",fontSize:14,marginBottom:10,boxSizing:"border-box"}}/>
      {err&&<div style={{color:C.red,fontSize:12,marginBottom:10}}>{err}</div>}
      <button onClick={go} style={{width:"100%",background:C.amber,color:"#000",border:"none",borderRadius:8,padding:"11px",fontWeight:800,fontSize:14,cursor:"pointer"}}>Sign In</button>
    </div>
  </div>);}

// ─── ROOT APP ────────────────────────────────────────────────────
const TABS=[
  {id:"dashboard",label:"Dashboard",icon:BarChart2},
  {id:"scenario",label:"Simulator",icon:GitBranch},
  {id:"turnaround",label:"Turnaround",icon:RefreshCw},
  {id:"forecast",label:"Forecasting",icon:TrendingUp},
  {id:"advisor",label:"AI Advisor",icon:Cpu},
];

const FLIGHTS_STATIC=buildFlights(42);

// Pre-load a minimal PREFILLED.recs so AIAdvisor doesn't crash
PREFILLED.recs = PREFILLED.recs || [];
PREFILLED.freeform = PREFILLED.freeform || { delay18:"", default:"" };

export default function App(){
  const [authed,setAuthed]=useState(false);
  const [tab,setTab]=useState("dashboard");
  const [now,setNow]=useState(new Date());
  const baseline=useMemo(()=>runAdvancedDES(FLIGHTS_STATIC,{}).stats,[]);
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),30000);return()=>clearInterval(t);},[]);
  if(!authed) return <AuthScreen onAuth={()=>setAuthed(true)}/>;
  return(<div style={{background:BG.page,minHeight:"100vh",fontFamily:"'Inter',system-ui,sans-serif",color:"#F9FAFB"}}>
    <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}*{box-sizing:border-box}input,select,textarea{outline:none}button{outline:none}`}</style>
    <div style={{background:BG.surface,borderBottom:`1px solid ${BG.border}`,padding:"0 24px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",maxWidth:1400,margin:"0 auto",height:56}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{background:C.amber,borderRadius:8,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center"}}><Plane size={18} color="#000"/></div>
          <div><div style={{fontSize:15,fontWeight:800}}>VCE <span style={{color:C.amber}}>Virtual Capacity Engine</span></div>
            <div style={{fontSize:10,color:C.gray,fontFamily:"monospace",letterSpacing:"0.1em"}}>GRU · SBGR · GUARULHOS · ops@vce.aero</div></div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{fontSize:12,color:C.gray,fontFamily:"monospace"}}><span style={{color:C.teal}}>●</span> {FLIGHTS_STATIC.length} movements · {now.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</div>
          <button onClick={()=>setAuthed(false)} style={{background:BG.surface2,color:C.gray,border:`1px solid ${BG.border}`,borderRadius:8,padding:"5px 12px",fontSize:12,cursor:"pointer"}}>Sign Out</button>
        </div>
      </div>
      <div style={{display:"flex",gap:2,maxWidth:1400,margin:"0 auto"}}>
        {TABS.map(t=>{const Icon=t.icon;const a=t.id===tab;return(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{background:"none",border:"none",borderBottom:`2px solid ${a?C.amber:"transparent"}`,color:a?"#F9FAFB":C.gray,padding:"10px 18px",fontSize:13,fontWeight:a?700:400,cursor:"pointer",display:"flex",alignItems:"center",gap:7,whiteSpace:"nowrap"}}>
            <Icon size={14}/>{t.label}
          </button>);})}
      </div>
    </div>
    <div style={{maxWidth:1400,margin:"0 auto",padding:"20px 24px"}}>
      {tab==="dashboard"  &&<Dashboard flights={FLIGHTS_STATIC} baseline={baseline}/>}
      {tab==="scenario"   &&<ScenarioSimulator flights={FLIGHTS_STATIC} baseline={baseline}/>}
      {tab==="turnaround" &&<TurnaroundOptimizer flights={FLIGHTS_STATIC}/>}
      {tab==="forecast"   &&<Forecasting flights={FLIGHTS_STATIC}/>}
      {tab==="advisor"    &&<AIAdvisor flights={FLIGHTS_STATIC} baseline={baseline}/>}
    </div>
  </div>);}
