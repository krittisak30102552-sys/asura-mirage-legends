import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';
import { generateHeroTexture } from '../graphics/pixelSprites';
import { getCharacterAnimationFrameCount, getCharacterConfig } from '../data/characterConfig';
import type { HeroAnimationState, HeroId } from '../types/game';

type LabId = HeroId | 'ginzoAwakened';
const characters: Array<{id:LabId; name:string; hint:string; tint:string}> = [
 {id:'ginzo',name:'Ginzo',hint:'ผมขาว · ชุดแดง · คาตานะ',tint:'from-red-500/20 to-rose-950/30'},
 {id:'ginzoAwakened',name:'Ginzo Awakened',hint:'ร่างทอง · ออร่าสีทอง',tint:'from-amber-300/25 to-yellow-950/30'},
 {id:'katherine',name:'Catherine',hint:'เมจสาว · ผมทอง · คทาคริสตัล',tint:'from-violet-500/20 to-indigo-950/30'},
 {id:'quan',name:'Quan',hint:'นักสู้กังฟู · เส้นเนียนสมส่วน',tint:'from-teal-500/20 to-emerald-950/30'},
 {id:'bamdee',name:'Bamdee',hint:'นักดาบโทนเขียว · เส้นเนียนสมส่วน',tint:'from-emerald-400/20 to-teal-950/30'},
];
const states: Array<{id:HeroAnimationState;name:string}> = [
 {id:'idle',name:'Idle'},{id:'run',name:'Run'},{id:'dash',name:'Dash'},
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

 return <div className="min-h-screen bg-[#08090e] text-zinc-100">
  <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 md:px-8">
   <div><p className="font-rajdhani text-xs uppercase tracking-[.35em] text-amber-200/70">Asura Mirage · Dev tools</p><h1 className="mt-1 text-2xl font-bold md:text-3xl">Character Lab <span className="text-amber-300">v1.2.4</span></h1><p className="mt-1 text-sm text-zinc-400">ห้องเทสแอนิเมชันแยก · ไม่กระทบตัวละครในเกมหลัก</p></div>
   <a href="./index.html" className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-sm text-zinc-300 hover:border-amber-300/40"><ArrowLeft size={16}/> กลับเกม</a>
  </header>
  <main className="mx-auto grid max-w-7xl gap-5 px-5 pb-10 md:px-8 lg:grid-cols-[1.3fr_.9fr]">
   <section className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/60 shadow-2xl">
    <div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><p className="text-xs uppercase tracking-[.22em] text-zinc-500">Preview viewport</p><h2 className="mt-1 text-lg font-semibold">{selected.name}</h2></div><span className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-200">LAB PREVIEW ONLY</span></div>
    <div className={"relative flex min-h-[430px] items-center justify-center overflow-hidden bg-gradient-to-br "+selected.tint+" px-6 py-8"}>
     <div className="pointer-events-none absolute inset-0 opacity-25" style={{backgroundImage:'linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px)',backgroundSize:'28px 28px'}}/>
     <div className="pointer-events-none absolute bottom-10 h-20 w-[72%] rounded-[100%] bg-black/50 blur-2xl"/>
     <div className="relative flex h-[390px] w-[312px] items-center justify-center rounded-2xl border border-white/10 bg-black/10"><canvas ref={canvasRef} width={256} height={320} className="h-[360px] w-[288px] object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,.45)]"/></div>
     <div className="absolute bottom-4 left-5 flex gap-2"><span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs">{state}</span><span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs">Frame {frame+1}/{frameCount}</span></div>
    </div>
    <div className="grid gap-4 border-t border-white/10 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
     <div><div className="flex justify-between text-sm"><label htmlFor="frame-slider" className="text-zinc-400">เลื่อนเฟรม</label><span className="font-mono text-amber-200">{frame+1}/{frameCount}</span></div><input id="frame-slider" type="range" min={0} max={frameCount-1} value={frame} onChange={e=>{setPlaying(false);setFrame(Number(e.target.value))}} className="mt-3 w-full accent-amber-300"/></div>
     <div className="flex items-center justify-center gap-2">
      <button onClick={()=>step(-1)} className="rounded-xl border border-white/10 bg-white/5 p-3" aria-label="Previous frame"><ChevronLeft size={18}/></button>
      <button onClick={()=>setPlaying(v=>!v)} className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-3 font-semibold text-zinc-950">{playing?<Pause size={17}/>:<Play size={17}/>} {playing?'Pause':'Play'}</button>
      <button onClick={()=>step(1)} className="rounded-xl border border-white/10 bg-white/5 p-3" aria-label="Next frame"><ChevronRight size={18}/></button>
      <button onClick={()=>{setFrame(0);setPlaying(false)}} className="rounded-xl border border-white/10 bg-white/5 p-3" aria-label="Reset"><RotateCcw size={17}/></button>
     </div>
    </div>
   </section>
   <aside className="space-y-5">
    <section className="rounded-3xl border border-white/10 bg-zinc-900/60 p-5"><div className="mb-4 flex items-center gap-2"><Sparkles size={18} className="text-amber-300"/><h2 className="font-semibold">เลือกตัวละคร</h2></div><div className="grid grid-cols-2 gap-2">
     {characters.map(item=><button key={item.id} onClick={()=>{setSelectedId(item.id);setFrame(0)}} className={"rounded-xl border px-3 py-3 text-left "+(selectedId===item.id?'border-amber-300/60 bg-amber-300/10 text-amber-100':'border-white/10 bg-white/[.025] text-zinc-300 hover:bg-white/[.06]')}><span className="block text-sm font-semibold">{item.name}</span><span className="mt-1 block text-[11px] text-zinc-500">{item.id==='ginzoAwakened'?'Golden awakened':item.id==='quan'||item.id==='bamdee'?'Smooth non-pixel':(item.id==='ginzo'?7:8)+' frames'}</span></button>)}
    </div><p className="mt-4 text-sm text-zinc-400">{selected.hint}</p></section>
    <section className="rounded-3xl border border-white/10 bg-zinc-900/60 p-5"><div className="mb-4 flex items-center gap-2"><Play size={18} className="text-sky-300"/><h2 className="font-semibold">สถานะแอนิเมชัน</h2></div><div className="flex flex-wrap gap-2">{states.map(item=><button key={item.id} onClick={()=>setState(item.id)} className={"rounded-lg border px-3 py-2 text-xs "+(state===item.id?'border-sky-300/50 bg-sky-300/10 text-sky-100':'border-white/10 bg-white/[.025] text-zinc-400 hover:text-white')}>{item.name}</button>)}</div>
     <div className="mt-5 grid grid-cols-2 gap-4"><div><div className="flex justify-between text-xs text-zinc-400"><label htmlFor="fps">ความเร็ว</label><span>{fps} FPS</span></div><input id="fps" type="range" min={1} max={20} value={fps} onChange={e=>setFps(Number(e.target.value))} className="mt-2 w-full accent-sky-300"/></div><div><label htmlFor="facing" className="text-xs text-zinc-400">ทิศทาง</label><select id="facing" value={facing} onChange={e=>setFacing(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-2 py-2 text-sm"><option value={1}>หันขวา</option><option value={-1}>หันซ้าย</option></select></div></div>
    </section>
    <section className="rounded-3xl border border-emerald-300/15 bg-emerald-300/[.04] p-5"><div className="mb-4 flex items-center gap-2"><ShieldCheck size={18} className="text-emerald-300"/><h2 className="font-semibold">Character Config</h2></div><dl className="space-y-3 text-sm">
     <div className="flex justify-between gap-3"><dt className="text-zinc-500">Art style</dt><dd className="max-w-[65%] text-right">{config.artStyle}</dd></div><div className="flex justify-between"><dt className="text-zinc-500">Animation frames</dt><dd className="font-mono">{frameCount}</dd></div><div className="flex justify-between"><dt className="text-zinc-500">Damage multiplier</dt><dd className="font-mono text-emerald-200">×{config.damageMultiplier.toFixed(1)}</dd></div><div className="flex justify-between"><dt className="text-zinc-500">Skills</dt><dd className="text-emerald-200">Original</dd></div><div className="flex justify-between"><dt className="text-zinc-500">Preserve stats</dt><dd className="text-emerald-200"><Check size={16} className="inline"/> Enabled</dd></div>
    </dl><p className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-relaxed text-zinc-400">หน้านี้ทดสอบรูปลักษณ์/เฟรมเท่านั้น ไม่เปลี่ยน damage, cooldown, stats, skills หรือเซฟเกม</p></section>
   </aside>
  </main>
  <footer className="mx-auto max-w-7xl px-5 pb-8 text-xs text-zinc-600 md:px-8">Asura Mirage: Legends · isolated visual test page</footer>
 </div>;
}
