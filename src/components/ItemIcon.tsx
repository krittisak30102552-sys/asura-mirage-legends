import React from 'react';

export type ItemIconKind = 'item' | 'weapon' | 'relic' | 'skill' | 'reward';
interface Props { itemId: string; rarity?: string; color?: string; size?: number; kind?: ItemIconKind; className?: string; }
const RARITY: Record<string,string> = { common:'#cbd5e1', rare:'#38bdf8', epic:'#c084fc', legendary:'#fbbf24', white:'#cbd5e1', blue:'#38bdf8', gold:'#fbbf24', themed:'#c084fc' };

function kindOf(value: string, group: ItemIconKind): string {
 const id=value.toLowerCase();
 if(group==='skill'){
  if(/dimensional|zero_frame/.test(id)) return 'blade';
  if(/sakura/.test(id)) return 'petal';
  if(/heaven_drum/.test(id)) return 'fist';
  if(/dragon/.test(id)) return 'dragon';
  if(/frost/.test(id)) return 'ice';
  if(/thunder/.test(id)) return 'bolt';
  if(/meteor/.test(id)) return 'meteor';
 }
 if(/gun|revolver|outlaw/.test(id)) return 'gun';
 if(/katana|sword|blade|scimitar|zero_frame/.test(id)) return 'blade';
 if(/fist|claw|heaven_drum/.test(id)) return 'fist';
 if(/glaive|spear|polearm|staff/.test(id)) return 'spear';
 if(/thunder|lightning|bolt|pearl/.test(id)) return 'bolt';
 if(/meteor|fire|magma/.test(id)) return 'meteor';
 if(/dragon/.test(id)) return 'dragon';
 if(/sakura|petal|rose/.test(id)) return 'petal';
 if(/ice|frost|freeze|glacial|snow/.test(id)) return 'ice';
 if(/boot|feather|wind|hermes|sandals|tabi/.test(id)) return 'wing';
 if(/leaf|bamboo|straw/.test(id)) return 'leaf';
 if(/shield|guard|aegis|armor|robe|vest|cloth/.test(id)) return 'shield';
 if(/talisman|seal|sigil|rune|charm/.test(id)) return 'seal';
 if(/coin|gold/.test(id)) return 'coin';
 if(/blood|vampire|fang|heart/.test(id)) return 'heart';
 if(/map|treasure|chest/.test(id)) return 'map';
 if(/coffin|revive/.test(id)) return 'coffin';
 if(/potion|bottle|regen|healing/.test(id)) return 'potion';
 if(/shadow|cloak|cowl|ghost|phantom/.test(id)) return 'cloak';
 if(/tiger|lion|demon|mask|kabuto|tengu/.test(id)) return 'mask';
 if(/bell/.test(id)) return 'bell';
 if(/turtle|shell/.test(id)) return 'shell';
 if(/brush|paint/.test(id)) return 'brush';
 return 'crystal';
}

const Art: React.FC<{type:string;color:string}> = ({type,color}) => {
 const dark='#21182a', white='#fff8ee';
 switch(type) {
 case 'blade': return <g strokeLinejoin="round" strokeLinecap="round"><path d="M13 47 Q22 27 49 10 Q48 27 33 40 Q23 50 13 47Z" fill={white} stroke={dark} strokeWidth="2.5"/><path d="M18 43 L43 17" stroke={color} strokeWidth="3"/><path d="M14 44 L8 52 L19 49 L24 43Z" fill={color} stroke={dark} strokeWidth="2.5"/><path d="M7 54 L14 47" stroke="#fbbf24" strokeWidth="4"/></g>;
 case 'fist': return <g stroke={dark} strokeWidth="2.5" strokeLinejoin="round"><path d="M12 38 L12 26 Q13 21 19 23 L21 13 Q25 9 29 14 L31 23 L33 13 Q37 9 41 15 L42 24 L46 17 Q51 16 52 22 L51 31 L54 37 L49 48 Q46 53 39 52 L22 50 Q14 49 12 42Z" fill={color}/><path d="M19 29 L47 31 M20 37 L45 39 M24 45 L40 46" stroke={white} strokeWidth="2"/></g>;
 case 'gun': return <g stroke={dark} strokeWidth="2.5" strokeLinejoin="round"><path d="M8 22 L43 22 L52 28 L46 34 L31 34 L30 46 L22 49 L19 34 L8 34Z" fill="#a8b6c7"/><path d="M13 27 L42 27 L46 30 L13 30Z" fill={color}/><path d="M52 29 L59 26" stroke="#fbbf24" strokeWidth="3"/></g>;
 case 'spear': return <g strokeLinejoin="round" strokeLinecap="round"><path d="M13 53 L44 16" stroke="#986942" strokeWidth="5"/><path d="M37 23 L46 6 L53 16 L43 27Z" fill={color} stroke={dark} strokeWidth="2.5"/><path d="M44 10 L48 17 L42 21" fill="none" stroke={white} strokeWidth="2"/></g>;
 case 'dragon': return <g strokeLinejoin="round"><path d="M11 45 Q26 41 28 30 Q34 21 47 24 L54 16 L52 29 L60 34 L46 39 Q39 34 34 43 Q25 55 13 50Z" fill={color} stroke={dark} strokeWidth="2.5"/><path d="M29 30 Q22 21 14 24 L19 34 L11 38" fill={color} stroke={dark} strokeWidth="2.5"/><path d="M39 27 L45 31 L41 35" fill="none" stroke={white} strokeWidth="2.5"/><circle cx="49" cy="29" r="1.8" fill={white}/></g>;
 case 'petal': return <g stroke={dark} strokeWidth="1.7">{[0,72,144,216,288].map(a=><ellipse key={a} cx="32" cy="21" rx="7" ry="13" fill={color} transform={'rotate('+a+' 32 32)'}/>)}<circle cx="32" cy="32" r="6" fill="#fbbf24"/></g>;
 case 'ice': return <g strokeLinecap="round" strokeLinejoin="round"><path d="M32 7 L42 25 L37 33 L46 38 L37 55 L31 45 L24 55 L18 39 L26 33 L21 24Z" fill={color} stroke={dark} strokeWidth="2.5"/><path d="M32 13 L32 45 M23 26 L41 39 M41 26 L23 39" stroke={white} strokeWidth="2.5"/></g>;
 case 'bolt': return <g strokeLinejoin="round"><path d="M38 5 L15 35 L29 35 L22 59 L50 25 L35 27Z" fill={color} stroke={dark} strokeWidth="2.5"/><path d="M36 14 L24 33 L33 32 L28 47" fill="none" stroke={white} strokeWidth="2.5"/></g>;
 case 'meteor': return <g strokeLinejoin="round"><path d="M12 43 Q20 34 18 23 L30 30 Q38 15 51 19 Q55 35 44 45 Q29 55 12 43Z" fill={color} stroke={dark} strokeWidth="2.5"/><path d="M20 41 Q31 44 39 34 Q46 28 42 22 Q52 28 46 39 Q37 51 20 41Z" fill="#fbbf24"/><path d="M13 28 L5 22 M15 36 L5 35 M22 48 L15 56" stroke="#fb923c" strokeWidth="3.5"/></g>;
 case 'wing': return <g stroke={dark} strokeWidth="2.5" strokeLinejoin="round"><path d="M12 52 Q16 17 50 8 Q48 40 12 52Z" fill={color}/><path d="M14 49 L44 14 M24 41 L20 28 M32 34 L30 22 M39 27 L39 18" fill="none" stroke={white} strokeWidth="2"/></g>;
 case 'leaf': return <g strokeLinejoin="round"><path d="M11 51 Q12 17 52 10 Q49 47 11 51Z" fill={color} stroke={dark} strokeWidth="2.5"/><path d="M14 48 L45 16 M25 36 L24 24 M33 29 L43 30" fill="none" stroke={white} strokeWidth="2.3"/></g>;
 case 'shield': return <g strokeLinejoin="round"><path d="M32 7 L52 16 L49 36 Q43 49 32 57 Q19 49 15 36 L12 16Z" fill={color} stroke={dark} strokeWidth="2.7"/><path d="M32 14 L44 20 L42 35 Q39 43 32 48 Q24 42 22 35 L20 20Z" fill="none" stroke={white} strokeWidth="2"/><path d="M32 17 L32 47" stroke={white} strokeWidth="2"/></g>;
 case 'seal': return <g strokeLinejoin="round"><path d="M32 7 L51 19 L46 43 L32 56 L18 43 L13 19Z" fill={color} stroke={dark} strokeWidth="2.5"/><path d="M32 15 L42 24 L40 39 L32 48 L24 39 L22 24Z" fill="none" stroke={white} strokeWidth="2"/><path d="M32 20 L32 42 M25 31 L39 31" stroke={white} strokeWidth="2.5"/></g>;
 case 'coin': return <g strokeLinejoin="round"><circle cx="32" cy="32" r="22" fill={color} stroke={dark} strokeWidth="3"/><circle cx="32" cy="32" r="16" fill="none" stroke="#fff0ad" strokeWidth="2.5"/><path d="M37 21 Q25 18 25 26 Q25 31 35 32 Q43 35 37 42 Q31 47 24 41 M32 17 L32 47" fill="none" stroke={dark} strokeWidth="3" strokeLinecap="round"/></g>;
 case 'heart': return <g strokeLinejoin="round"><path d="M32 53 Q8 35 13 22 Q18 10 30 20 L32 23 L36 19 Q48 12 53 24 Q58 38 32 53Z" fill={color} stroke={dark} strokeWidth="2.8"/><path d="M24 23 Q20 21 20 27" fill="none" stroke={white} strokeWidth="2.6"/></g>;
 case 'map': return <g stroke={dark} strokeWidth="2.5" strokeLinejoin="round"><path d="M9 18 L25 11 L40 17 L55 10 L55 45 L40 53 L25 47 L9 54Z" fill={color}/><path d="M25 11 L25 47 M40 17 L40 53" fill="none" stroke={white} strokeWidth="2"/><path d="M18 27 L23 33 L33 23 L40 28 L47 21" fill="none" stroke="#fbbf24" strokeWidth="3"/></g>;
 case 'coffin': return <g strokeLinejoin="round"><path d="M25 8 L39 8 L50 22 L45 50 L32 57 L19 50 L14 22Z" fill={color} stroke={dark} strokeWidth="2.5"/><path d="M25 15 L39 15 L44 24 L40 45 L32 50 L24 45 L20 24Z" fill="none" stroke={white} strokeWidth="2"/><path d="M32 22 L32 40 M24 31 L40 31" stroke="#fbbf24" strokeWidth="3"/></g>;
 case 'potion': return <g strokeLinejoin="round"><path d="M25 9 L39 9 L39 19 L45 26 L49 45 Q48 53 40 54 L24 54 Q16 53 15 45 L20 26 L25 19Z" fill={color} stroke={dark} strokeWidth="2.5"/><path d="M24 32 L41 32 L44 44 Q43 48 37 49 L26 49 Q21 48 21 44Z" fill={white}/></g>;
 case 'cloak': return <g strokeLinejoin="round"><path d="M25 12 L39 12 L45 22 L55 51 L32 45 L9 51 L19 22Z" fill={color} stroke={dark} strokeWidth="2.5"/><path d="M25 13 Q31 24 32 43 Q35 25 39 13" fill="none" stroke={white} strokeWidth="2.5"/></g>;
 case 'mask': return <g strokeLinejoin="round"><path d="M12 18 L23 8 L29 17 L35 17 L41 8 L53 18 L50 42 L32 55 L15 42Z" fill={color} stroke={dark} strokeWidth="2.5"/><path d="M18 29 L28 26 L27 33 L20 35Z M36 26 L46 29 L44 35 L37 33Z" fill={white} stroke={dark} strokeWidth="1.5"/><path d="M25 42 L32 38 L39 42 L32 48Z" fill={dark}/></g>;
 case 'bell': return <g strokeLinejoin="round"><path d="M20 42 L22 28 Q22 14 32 14 Q42 14 42 28 L44 42 L49 47 L15 47Z" fill={color} stroke={dark} strokeWidth="2.5"/><circle cx="32" cy="51" r="4" fill="#fbbf24" stroke={dark} strokeWidth="2"/></g>;
 case 'shell': return <g strokeLinejoin="round"><path d="M10 39 Q8 19 23 14 Q39 6 51 20 Q57 28 54 40 L48 49 L16 49Z" fill={color} stroke={dark} strokeWidth="2.5"/><path d="M14 37 L32 18 L50 37 M21 48 L32 18 L43 48 M11 35 L53 35" fill="none" stroke={white} strokeWidth="2"/></g>;
 case 'brush': return <g strokeLinejoin="round"><path d="M17 43 L41 16 L49 23 L25 50Z" fill={color} stroke={dark} strokeWidth="2.5"/><path d="M41 16 L47 9 Q51 7 54 12 L49 23Z" fill={white} stroke={dark} strokeWidth="2"/><path d="M15 44 Q8 52 15 56 Q24 58 25 50Z" fill="#fbbf24" stroke={dark} strokeWidth="2.5"/></g>;
 default: return <g strokeLinejoin="round"><path d="M32 7 L49 21 L47 41 L32 56 L17 41 L15 21Z" fill={color} stroke={dark} strokeWidth="2.5"/><path d="M32 13 L41 24 L35 34 L43 40 L32 50 L21 40 L29 34 L23 24Z" fill={white}/><path d="M32 13 L32 50 M23 24 L41 24 M21 40 L43 40" fill="none" stroke={color} strokeWidth="2"/></g>;
 }
};
export const ItemIcon: React.FC<Props> = ({itemId,rarity='common',color,size=40,kind='item',className=''}) => {
 const accent = color || RARITY[rarity] || RARITY.common;
 const type = kindOf(itemId,kind);
 return <svg className={className} width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={itemId.replace(/[_-]/g,' ')} style={{display:'inline-block',flex:'0 0 auto',overflow:'visible'}}>
  <defs><linearGradient id="custom-item-icon-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={accent} stopOpacity=".34"/><stop offset="100%" stopColor="#100d18" stopOpacity=".97"/></linearGradient></defs>
  <path d="M32 2 L52 10 L62 28 L56 49 L32 62 L8 52 L2 31 L11 10Z" fill="#100d18" stroke="#0b0910" strokeWidth="2"/>
  <path d="M32 5 L49 12 L58 29 L52 46 L32 57 L12 48 L6 31 L13 13Z" fill="url(#custom-item-icon-bg)" stroke={accent} strokeWidth="1.5"/>
  <circle cx="32" cy="32" r="23" fill="#100d18" fillOpacity=".3" stroke={accent} strokeOpacity=".28"/>
  <Art type={type} color={accent}/>
 </svg>;
};
