export function drawItemIconCanvas(ctx: CanvasRenderingContext2D, itemId: string, rarity: string, cx: number, cy: number, size: number, overrideColor?: number) {
 const id=itemId.toLowerCase(), colors:Record<string,string>={common:'#cbd5e1',rare:'#38bdf8',epic:'#c084fc',legendary:'#fbbf24'};
 const color=overrideColor!==undefined?'#'+overrideColor.toString(16).padStart(6,'0').slice(-6):(colors[rarity]||colors.common);
 let art='crystal';
 if(/gun|revolver|outlaw/.test(id))art='gun';else if(/katana|sword|blade|scimitar|zero_frame/.test(id))art='blade';else if(/fist|claw|heaven_drum/.test(id))art='fist';else if(/spear|polearm|glaive|staff/.test(id))art='spear';else if(/thunder|lightning|bolt/.test(id))art='bolt';else if(/meteor|fire|magma/.test(id))art='meteor';else if(/dragon/.test(id))art='dragon';else if(/sakura|petal|rose/.test(id))art='petal';else if(/ice|frost|freeze|glacial/.test(id))art='ice';else if(/boot|feather|wind|hermes|sandals/.test(id))art='wing';else if(/leaf|bamboo|straw/.test(id))art='leaf';else if(/shield|guard|aegis|armor|robe|vest/.test(id))art='shield';else if(/talisman|seal|sigil|rune|charm/.test(id))art='seal';else if(/coin|gold/.test(id))art='coin';else if(/blood|vampire|fang|heart/.test(id))art='heart';else if(/map|treasure|chest/.test(id))art='map';else if(/coffin|revive/.test(id))art='coffin';else if(/potion|bottle|regen|healing/.test(id))art='potion';else if(/shadow|cloak|cowl|ghost|phantom/.test(id))art='cloak';else if(/tiger|lion|demon|mask|kabuto|tengu/.test(id))art='mask';
 ctx.save();ctx.translate(cx,cy);ctx.scale(size/64,size/64);
 ctx.beginPath();ctx.moveTo(0,-30);ctx.lineTo(21,-22);ctx.lineTo(30,-4);ctx.lineTo(24,18);ctx.lineTo(0,30);ctx.lineTo(-24,19);ctx.lineTo(-30,-1);ctx.lineTo(-20,-22);ctx.closePath();ctx.fillStyle='#100d18';ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=2.2;ctx.stroke();
 const line=(...p:number[])=>{ctx.beginPath();ctx.moveTo(p[0],p[1]);for(let i=2;i<p.length;i+=2)ctx.lineTo(p[i],p[i+1]);ctx.stroke();};
 const shape=(p:number[],fill:string)=>{ctx.beginPath();ctx.moveTo(p[0],p[1]);for(let i=2;i<p.length;i+=2)ctx.lineTo(p[i],p[i+1]);ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle='#21182a';ctx.lineWidth=2.5;ctx.stroke();};
 switch(art){
 case 'blade':shape([-19,17,-10,1,16,-20,12,-3,-3,15],'#fff8ee');line(-13,13,10,-9);line(-18,16,-8,23);line(-13,21,-19,26);break;
 case 'fist':shape([-19,5,-19,-8,-12,-8,-9,-19,-3,-19,0,-8,3,-20,9,-19,11,-7,15,-13,20,-10,20,1,23,8,19,17,7,19,-12,16],color);line(-14,-2,14,1);line(-12,6,14,8);line(-6,12,11,14);break;
 case 'gun':shape([-22,-7,12,-7,20,-2,16,5,2,5,1,18,-8,20,-10,5,-22,5],'#a8b6c7');line(-15,-2,14,-2);line(18,-4,25,-8);break;
 case 'spear':line(-17,22,10,-12);shape([6,-12,17,-26,23,-15,13,-7],color);line(10,-18,16,-11);break;
 case 'dragon':shape([-18,14,-6,8,-9,-8,8,-5,17,-13,16,-3,24,2,10,7,5,5,4,16,-8,18],color);line(-7,0,-16,-7);line(7,-3,12,0);break;
 case 'petal':for(let i=0;i<5;i++){ctx.save();ctx.rotate(i*Math.PI*2/5);ctx.beginPath();ctx.ellipse(0,-9,6,12,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.stroke();ctx.restore();}ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.fillStyle='#fbbf24';ctx.fill();break;
 case 'ice':line(0,-24,0,24);line(-20,-12,20,12);line(-20,12,20,-12);line(0,-24,-5,-17);line(0,-24,5,-17);line(0,24,-5,17);line(0,24,5,17);break;
 case 'bolt':shape([5,-25,-14,2,-2,2,-7,25,17,-6,3,-6],'#fbbf24');line(2,-18,-5,-1);break;
 case 'meteor':shape([-16,15,-20,5,-11,1,-9,-12,1,-5,10,-18,20,-9,18,5,8,17],color);shape([-9,12,-2,1,2,-11,11,-8,12,2,4,12],'#fbbf24');line(-16,-2,-25,-8);line(-15,7,-26,8);break;
 case 'wing':shape([-18,22,-19,0,-9,-16,18,-25,13,-1,2,14],color);line(-16,19,12,-18);line(-10,7,-10,-6);break;
 case 'leaf':shape([-20,18,-18,-6,18,-24,17,5],color);line(-18,16,12,-19);line(-7,5,-9,-8);break;
 case 'shield':shape([0,-24,18,-16,16,5,0,25,-16,5,-18,-16],color);line(0,-17,0,17);line(-10,-10,10,-10);break;
 case 'seal':shape([0,-24,19,-12,14,11,0,24,-14,11,-19,-12],color);line(0,-16,0,16);line(-9,0,9,0);break;
 case 'coin':ctx.beginPath();ctx.arc(0,0,21,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(0,0,15,0,Math.PI*2);ctx.strokeStyle='#fff0ad';ctx.lineWidth=2;ctx.stroke();line(5,-10,-3,-10,-5,-3,4,1,5,7,-5,9);break;
 case 'heart':ctx.beginPath();ctx.moveTo(0,22);ctx.bezierCurveTo(-26,6,-21,-14,-9,-14);ctx.bezierCurveTo(-2,-14,0,-7,0,-7);ctx.bezierCurveTo(7,-19,25,-12,21,1);ctx.bezierCurveTo(18,11,8,18,0,22);ctx.fillStyle=color;ctx.fill();ctx.stroke();break;
 case 'map':shape([-22,-14,-7,-20,7,-13,22,-20,22,15,7,22,-7,15,-22,22],color);line(-7,-20,-7,15);line(7,-13,7,22);line(-15,4,-5,-4,5,5,15,-7);break;
 case 'coffin':shape([-7,-24,7,-24,18,-10,13,19,0,26,-13,19,-18,-10],color);line(0,-13,0,13);line(-7,0,7,0);break;
 case 'potion':shape([-7,-23,7,-23,7,-12,14,-5,18,14,13,22,-13,22,-18,14,-14,-5,-7,-12],color);line(-11,3,11,3);break;
 case 'cloak':shape([-8,-22,8,-22,15,-11,25,22,0,13,-25,22,-15,-11],color);line(0,-15,0,12);break;
 case 'mask':shape([-17,-16,-7,-25,0,-17,7,-25,17,-16,14,8,0,24,-14,8],color);shape([-11,-2,-3,-5,-4,2],'#f8fafc');shape([11,-2,3,-5,4,2],'#f8fafc');break;
 default:shape([0,-25,18,-10,15,10,0,24,-15,10,-18,-10],color);shape([0,-16,9,-5,2,1,10,8,0,17,-9,8,-2,1,-9,-5],'#f8fafc');
 }
 ctx.restore();
}
