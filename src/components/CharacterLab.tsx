import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, ShieldCheck, Sparkles, Activity, Gauge, Swords } from 'lucide-react';
import { generateHeroTexture } from '../graphics/pixelSprites';
import { getCharacterAnimationFrameCount, getCharacterConfig } from '../data/characterConfig';
import type { HeroAnimationState, HeroId } from '../types/game';

type LabId = HeroId | 'ginzoAwakened';
type Accent = { title: string; hint: string; tint: string; glow: string; ring: string; slash: string; element: string };
const characters: Array<{id:LabId; name:string; accent:Accent}> = [
 {id:'ginzo',name:'Ginzo',accent:{title:'Crimson Ronin',hint:'ผมขาว · ชุดแดง · คาตานะ',tint:'from-rose-950 via-[#120a12] to-[#080a13]',glow:'rgba(251,65,91,.28)',ring:'rgba(251,65,91,.3)',slash:'#ff647d',element:'FIRE / STEEL'}},
 {id:'ginzoAwakened',name:'Ginzo Awakened',accent:{title:'Gilded Ascension',hint:'ร่างตื่นทอง · ออร่าทอง',tint:'from-amber-950 via-[#171108] to-[#080a13]',glow:'rgba(255,193,59,.32)',ring:'rgba(255,207,94,.38)',slash:'#ffe28a',element:'GOLD / AWAKENED'}},
 {id:'katherine',name:'Catherine',accent:{title:'Astral Archmage',hint:'เมจสาว · ผมทอง · คทาคริสตัล',tint:'from-violet-950 via-[#110d1c] to-[#080a13]',glow:'rgba(174,125,255,.28)',ring:'rgba(182,151,255,.32)',slash:'#c2a5ff',element:'ARCANE / STARS'}},
 {id:'quan',name:'Quan',accent:{title:'Azure Dragon Fist',hint:'นักสู้กังฟู · หมัดมังกร',tint:'from-emerald-950 via-[#091613] to-[#080a13]',glow:'rgba(67,230,180,.24)',ring:'rgba(92,255,207,.25)',slash:'#ffd36b',element:'CHI / MARTIAL'}},
 {id:'bamdee',name:'Bamdee',accent:{title:'Jade Edge',hint:'นักดาบหยก · คมดาบสีมรกต',tint:'from-teal-950 via-[#091513] to-[#080a13]',glow:'rgba(65,255,202,.24)',ring:'rgba(95,255,209,.3)',slash:'#73ffe0',element:'JADE / STEEL'}},
];
const states: Array<{id:HeroAnimationState;name:string}> = [
 {id:'idle',name:'Idle'},{id:'run',name:'Walk'},{id:'dash',name:'Dash'},
 {id:'attack1',name:'Attack 1'},{id:'attack2',name:'Attack 2'},{id:'attack3',name:'Attack 3'},
 {id:'attack4',name:'Attack 4'},{id:'hurt',name:'Hurt'},{id:'dead',name:'Dead'},
];

export default function CharacterLab() {
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const [selectedId,setSelectedId]=useState<LabId>('ginzo');
 const [state,setState]=useState<HeroAnimationState>('idle');
 const [frame,setFrame]=useState(0);
 const [fps,setFps]=useState(8);
 const [playing,setPlaying]=useState(true);
 const [facing,setFacing]=useState(1);
 const heroId:HeroId=selectedId==='ginzoAwakened'?'ginzo':selectedId;
 const awakened=selectedId==='ginzoAwakened';
 const config=useMemo(()=>getCharacterConfig(heroId,awakened),[heroId,awakened]);
 const frameCount=getCharacterAnimationFrameCount(heroId,awakened);
 const selected=characters.find(item=>item.id===selectedId)??characters[0];

 useEffect(()=>{setFrame(0)},[selectedId,state]);
 useEffect(()=>{
  if(!playing)return;
  const timer=window.setInterval(()=>setFrame(value=>(value+1)%frameCount),1000/fps);
  return()=>window.clearInterval(timer);
 },[playing,fps,frameCount]);
 useEffect(()=>{
  const canvas=canvasRef.current,ctx=canvas?.getContext('2d');
  if(!canvas||!ctx)return;
  const texture=generateHeroTexture(heroId,state,frame,awakened,0.12,facing,true);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(texture.image as HTMLCanvasElement,0,0,canvas.width,canvas.height);
  texture.dispose();
 },[heroId,state,frame,awakened,facing]);
 const step=(direction:number)=>{setPlaying(false);setFrame(value=>(value+direction+frameCount)%frameCount)};

 return <div className="relative min-h-screen overflow-hidden bg-[#05070c] text-zinc-100"><div className="pointer-events-none fixed inset-0 opacity-80" style={{background:'radial-gradient(circle at 7% 0%, '+selected.accent.glow+', transparent 29%), radial-gradient(circle at 96% 84%, '+selected.accent.glow+', transparent 28%)'}}/><div className="pointer-events-none fixed inset-0 opacity-[.13]" style={{backgroundImage:'linear-gradient(rgba(255,255,255,.075) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.075) 1px, transparent 1px)',backgroundSize:'44px 44px'}}/>
  <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 md:px-8">
   <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-200/25 bg-amber-200/[.07] text-amber-200"><Swords size={21}/></div><div><p className="font-rajdhani text-[10px] uppercase tracking-[.36em] text-amber-200/70">Asura Mirage · Development</p><h1 className="mt-0.5 text-xl font-bold tracking-wide sm:text-2xl">CHARACTER <span className="text-amber-200">FORGE</span></h1></div></div>
   <div className="flex items-center gap-3"><span className="hidden items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/[.06] px-3 py-2 text-[10px] font-semibold tracking-[.16em] text-emerald-200 sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300"/> SANDBOX · SAFE MODE</span><a href="./index.html" className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2.5 text-xs text-zinc-300 hover:border-amber-300/40"><ArrowLeft size={15}/> เกมหลัก</a></div>
  </header>
  <main className="mx-auto grid max-w-7xl gap-5 px-5 pb-10 md:px-8 lg:grid-cols-[1.3fr_.9fr]">
   <section className="overflow-hidden rounded-[26px] border border-white/[.1] bg-[#090c13]/90 shadow-[0_24px_80px_rgba(0,0,0,.35)]">
    <div className="flex items-center justify-between border-b border-white/[.08] px-4 py-3.5 sm:px-5"><div><p className="font-rajdhani text-[11px] uppercase tracking-[.25em] text-zinc-500">01 / Model viewport</p><h2 className="mt-1 text-lg font-semibold">{selected.name} <span className="ml-2 text-[10px] tracking-[.2em] text-zinc-500">{selected.accent.element}</span></h2></div><span className="rounded-lg border border-emerald-300/20 bg-emerald-300/[.07] px-3 py-1 text-[10px] tracking-[.12em] text-emerald-200">LAB ONLY</span></div>
    <div className={"relative isolate flex min-h-[500px] items-center justify-center overflow-hidden bg-gradient-to-br "+selected.accent.tint+" px-4 py-8 sm:min-h-[590px] sm:px-8"}>
     <div className="pointer-events-none absolute inset-0" style={{background:'radial-gradient(ellipse at 50% 46%, '+selected.accent.glow+', transparent 43%), linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.58))'}}/>
     <div className="pointer-events-none absolute inset-0 opacity-25" style={{backgroundImage:'linear-gradient(rgba(255,255,255,.09) 1px, transparent 1px),linear-gradient(90deg, rgba(255,255,255,.09) 1px, transparent 1px)',backgroundSize:'36px 36px',maskImage:'radial-gradient(ellipse at center, black 15%, transparent 79%)'}}/>
     <div className="pointer-events-none absolute left-1/2 top-[47%] h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border" style={{borderColor:selected.accent.ring,boxShadow:'0 0 60px '+selected.accent.glow+', inset 0 0 42px '+selected.accent.glow}}/>
     <div className="pointer-events-none absolute left-1/2 top-[47%] h-[240px] w-[340px] -translate-x-1/2 -translate-y-1/2 rotate-[-18deg] rounded-[50%] border border-white/[.07]"/>
     <div className="pointer-events-none absolute left-1/2 top-[47%] h-[340px] w-[250px] -translate-x-1/2 -translate-y-1/2 rotate-[24deg] rounded-[50%] border border-white/[.055]"/>
     <div className="pointer-events-none absolute bottom-[72px] left-1/2 h-24 w-[70%] -translate-x-1/2 rounded-[50%] blur-2xl" style={{background:selected.accent.glow}}/>
     <div className="pointer-events-none absolute bottom-[78px] left-1/2 h-3 w-[64%] -translate-x-1/2 rounded-[50%] border" style={{borderColor:selected.accent.ring,boxShadow:'0 0 30px '+selected.accent.glow}}/>
     {state.startsWith('attack') && frame>0 && frame<frameCount-1 && <div className="pointer-events-none absolute left-1/2 top-[46%] z-20 h-28 w-[min(72%,390px)] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-t-[5px] border-r-2 opacity-75 blur-[1px]" style={{borderColor:selected.accent.slash,boxShadow:'0 -4px 22px '+selected.accent.glow,transform:'translate(-50%,-50%) rotate('+(frame/Math.max(1,frameCount-1)*62-28)+'deg) scaleX('+(0.84+Math.sin(frame/Math.max(1,frameCount-1)*Math.PI)*.2)+')'}}/>}
     <div className="pointer-events-none absolute left-5 top-5 z-30 flex flex-col gap-1.5"><span className="font-rajdhani text-[10px] tracking-[.3em] text-white/45">ASURA / CHARACTER LAB</span><span className="font-rajdhani text-xl font-semibold tracking-wider text-white/80">{selected.accent.title.toUpperCase()}</span></div>
     <div className="pointer-events-none absolute right-5 top-5 z-30 text-right"><div className="font-mono text-[10px] text-white/50">FRAME INDEX</div><div className="mt-1 font-mono text-xl tabular-nums text-white/85">{String(frame+1).padStart(2,'0')}<span className="text-sm text-white/30"> / {String(frameCount).padStart(2,'0')}</span></div></div>
     <div className="relative z-30 flex h-[390px] w-[300px] items-end justify-center sm:h-[450px] sm:w-[360px]"><canvas ref={canvasRef} width={256} height={320} className="h-[390px] w-[312px] object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,.65)] sm:h-[440px] sm:w-[352px]" aria-label={selected.name+" animation preview"}/></div>
     <div className="pointer-events-none absolute bottom-5 left-5 z-30 flex items-center gap-2 text-[10px] tracking-[.2em] text-white/45"><Activity size={13}/><span>{state.replace('attack','strike ').toUpperCase()}</span><span className="text-white/20">/</span><span>{fps} FPS</span></div>
     <div className="pointer-events-none absolute bottom-5 right-5 z-30 font-mono text-[10px] text-white/35">X {facing<0?'−1':'+1'} · 2D RIG</div>
     <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/30 to-transparent"/>
    </div>
    <div className="grid gap-4 border-t border-white/10 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
     <div><div className="flex justify-between text-sm"><label htmlFor="frame-slider" className="text-zinc-400">เลื่อนเฟรม</label><span className="font-mono text-amber-200">{frame+1}/{frameCount}</span></div><input id="frame-slider" type="range" min={0} max={frameCount-1} value={frame} onChange={e=>{setPlaying(false);setFrame(Number(e.target.value))}} className="mt-3 w-full accent-amber-300"/><div className="mt-3 grid gap-1.5" style={{gridTemplateColumns:"repeat("+frameCount+", minmax(0, 1fr))"}}>{Array.from({length:frameCount},(_,index)=><button key={index} onClick={()=>{setPlaying(false);setFrame(index)}} className={"rounded-lg border px-1 py-2 font-mono text-[10px] transition "+(frame===index?"border-amber-200/50 bg-amber-200/[.1] text-amber-100":"border-white/[.06] bg-white/[.02] text-zinc-600 hover:text-zinc-200")}>{String(index+1).padStart(2,"0")}</button>)}</div></div>
     <div className="flex items-center justify-center gap-2">
      <button onClick={()=>step(-1)} className="rounded-xl border border-white/10 bg-white/5 p-3" aria-label="Previous frame"><ChevronLeft size={18}/></button>
      <button onClick={()=>setPlaying(v=>!v)} className="inline-flex items-center gap-2 rounded-xl px-4 py-3 font-semibold text-zinc-950 shadow-lg transition hover:brightness-110" style={{background:"linear-gradient(135deg, "+selected.accent.slash+", #f8d58b)",boxShadow:"0 6px 25px "+selected.accent.glow}}>{playing?<Pause size={17}/>:<Play size={17}/>} {playing?'Pause':'Play'}</button>
      <button onClick={()=>step(1)} className="rounded-xl border border-white/10 bg-white/5 p-3" aria-label="Next frame"><ChevronRight size={18}/></button>
      <button onClick={()=>{setFrame(0);setPlaying(false)}} className="rounded-xl border border-white/10 bg-white/5 p-3" aria-label="Reset"><RotateCcw size={17}/></button>
     </div>
    </div>
   </section>
   <aside className="space-y-5">
    <section className="rounded-[26px] border border-white/[.1] bg-[#090c13]/90 p-5 shadow-[0_24px_80px_rgba(0,0,0,.25)]"><div className="mb-4 flex items-center gap-2"><Sparkles size={18} className="text-amber-300"/><h2 className="font-semibold">เลือกตัวละคร</h2></div><div className="grid grid-cols-2 gap-2">
     {characters.map(item=><button key={item.id} onClick={()=>{setSelectedId(item.id);setFrame(0)}} className={"group relative rounded-2xl border p-3 text-left transition-all "+(selectedId===item.id?'border-amber-200/45 bg-white/[.055] text-amber-100 shadow-[0_0_24px_rgba(255,191,75,.06)]':'border-white/[.07] bg-white/[.018] text-zinc-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[.04]')}><span className="mb-2 block h-1 w-8 rounded-full" style={{background:item.accent.slash,boxShadow:"0 0 12px "+item.accent.glow}}/><span className="block text-sm font-semibold">{item.name}</span><span className="mt-1 block text-[10px] text-zinc-500">{item.accent.title}</span><span className="mt-2 block font-mono text-[9px] tracking-wider text-zinc-600">{item.id==='ginzoAwakened'?'GOLDEN FORM':item.id==='quan'||item.id==='bamdee'?'SMOOTH RIG':(item.id==='ginzo'?7:8)+' KEY FRAMES'}</span></button>)}
    </div><p className="mt-4 text-sm text-zinc-400">{selected.accent.hint}</p></section>
    <section className="rounded-3xl border border-white/10 bg-zinc-900/60 p-5"><div className="mb-4 flex items-center gap-2"><Play size={18} className="text-sky-300"/><h2 className="font-semibold">สถานะแอนิเมชัน</h2></div><div className="grid grid-cols-3 gap-2">{states.map(item=><button key={item.id} onClick={()=>setState(item.id)} className={"rounded-xl border px-2 py-3 text-[11px] font-medium transition "+(state===item.id?'border-white/25 bg-white/[.08] text-white':'border-white/[.06] bg-white/[.018] text-zinc-500 hover:border-white/15 hover:text-zinc-200')}><span className="mb-1 block font-mono text-[9px] text-zinc-600">M{String(states.indexOf(item)+1).padStart(2,'0')}</span>{item.name.replace('Attack','Strike')}</button>)}</div>
     <div className="mt-4 grid grid-cols-2 gap-4 border-t border-white/[.07] pt-4"><div><div className="flex justify-between text-xs text-zinc-400"><label htmlFor="fps">ความเร็ว</label><span>{fps} FPS</span></div><input id="fps" type="range" min={1} max={20} value={fps} onChange={e=>setFps(Number(e.target.value))} className="mt-2 w-full accent-sky-300"/></div><div><label htmlFor="facing" className="text-xs text-zinc-400">ทิศทาง</label><select id="facing" value={facing} onChange={e=>setFacing(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-2 py-2 text-sm"><option value={1}>หันขวา</option><option value={-1}>หันซ้าย</option></select></div></div>
    </section>
    <section className="rounded-[26px] border border-emerald-200/[.14] bg-[#09120f]/90 p-5"><div className="mb-4 flex items-center gap-2"><ShieldCheck size={18} className="text-emerald-300"/><h2 className="font-semibold">Character Config</h2></div><dl className="space-y-3 text-sm">
     <div className="flex justify-between gap-3"><dt className="text-zinc-500">Art style</dt><dd className="max-w-[65%] text-right">{config.artStyle}</dd></div><div className="flex justify-between"><dt className="text-zinc-500">Animation frames</dt><dd className="font-mono">{frameCount}</dd></div><div className="flex justify-between"><dt className="text-zinc-500">Damage multiplier</dt><dd className="font-mono text-emerald-200">×{config.damageMultiplier.toFixed(1)}</dd></div><div className="flex justify-between"><dt className="text-zinc-500">Skills</dt><dd className="text-emerald-200">Original</dd></div><div className="flex justify-between"><dt className="text-zinc-500">Preserve stats</dt><dd className="text-emerald-200"><Check size={16} className="inline"/> Enabled</dd></div>
    </dl><p className="mt-4 rounded-xl border border-emerald-200/[.1] bg-emerald-200/[.035] p-3 text-[10px] leading-relaxed text-emerald-100/60">หน้านี้ทดสอบรูปลักษณ์/เฟรมเท่านั้น ไม่เปลี่ยน damage, cooldown, stats, skills หรือเซฟเกม</p></section>
   </aside>
  </main>
  <footer className="mx-auto max-w-7xl px-5 pb-8 text-xs text-zinc-600 md:px-8">ASURA MIRAGE: LEGENDS / CHARACTER FORGE · VISUAL SANDBOX ONLY</footer>
 </div>;
}
