import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";

const execFileAsync = promisify(execFile);
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outputDir = path.join(root, "public", "generated", "studio");
const SR = 22050;

const NOTE = { C:261.63,D:293.66,E:329.63,F:349.23,G:392,A:440,B:493.88 };
const midi = { C4:261.63,D4:293.66,E4:329.63,F4:349.23,G4:392,A4:440,B4:493.88,C5:523.25,D5:587.33,E5:659.25,G5:783.99,A5:880 };

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function env(t,d,a=.02,r=.12){if(t<a)return t/a;if(t>d-r)return Math.max(0,(d-t)/r);return 1;}
function tone(t,f,d,type="sine"){const x=2*Math.PI*f*t;if(type==="triangle")return 2*Math.asin(Math.sin(x))/Math.PI;if(type==="square")return Math.sin(x)>=0?1:-1;return Math.sin(x);}
function add(buffer,i,v){if(i>=0&&i<buffer.length)buffer[i]+=v;}

function renderTrack({duration=120,bpm=80}={}){
  duration=clamp(Number(duration)||120,30,180);
  bpm=clamp(Number(bpm)||80,60,110);
  const n=Math.floor(duration*SR);
  const L=new Float32Array(n), R=new Float32Array(n);
  const beat=60/bpm, bar=beat*4;
  const chords=[[261.63,329.63,392],[392,493.88,587.33],[349.23,440,523.25],[293.66,392,493.88]];
  const melody=[523.25,587.33,659.25,783.99,659.25,587.33,523.25,440];

  for(let i=0;i<n;i++){
    const t=i/SR, b=t/beat, phase=t/bar;
    const chord=chords[Math.floor(phase)%4];
    let s=0;
    for(const f of chord) s += 0.055*tone(t,f,"x", "sine");
    const bass=chord[0]/2;
    s += 0.10*tone(t,bass,"x","triangle");
    s += 0.035*tone(t,chord[2]*2,"x","sine");
    if(t>8){
      const step=Math.floor(b*2);
      const mf=melody[step%melody.length];
      const mt=(b*0.5)%1;
      s += 0.075*tone(mt*beat*2,mf,"x","triangle")*env(mt*beat*2,beat*0.9,.03,.18);
    }
    const kickPhase=(b%4);
    if(kickPhase<0.11){const q=kickPhase/0.11; s += 0.42*Math.sin(2*Math.PI*(78-48*q)*kickPhase)*Math.exp(-22*kickPhase);}
    const sn=((b+2)%4);
    if(sn<0.10){const q=sn/0.10; s += (Math.random()*2-1)*0.22*(1-q);}
    const hat=(b%0.5);
    if(hat<0.035){const q=hat/0.035; s += (Math.random()*2-1)*0.065*(1-q);}
    const side=0.012*Math.sin(2*Math.PI*0.33*t);
    const fadeIn=Math.min(1,t/2), fadeOut=Math.min(1,(duration-t)/3);
    s*=clamp(fadeIn*fadeOut,0,1);
    L[i]+=s+side; R[i]+=s-side;
  }
  let peak=0;
  for(let i=0;i<n;i++) peak=Math.max(peak,Math.abs(L[i]),Math.abs(R[i]));
  const gain=peak>0?0.88/peak:1;
  const data=Buffer.allocUnsafe(n*4);
  for(let i=0;i<n;i++){data.writeInt16LE(clamp(L[i]*gain,-1,1)*32767,i*4);data.writeInt16LE(clamp(R[i]*gain,-1,1)*32767,i*4+2);}
  const h=Buffer.alloc(44);
  h.write("RIFF",0);h.writeUInt32LE(36+data.length,4);h.write("WAVE",8);h.write("fmt ",12);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(2,22);h.writeUInt32LE(SR,24);h.writeUInt32LE(SR*4,28);h.writeUInt16LE(4,32);h.writeUInt16LE(16,34);h.write("data",36);h.writeUInt32LE(data.length,40);
  return Buffer.concat([h,data]);
}

export async function createFullTrack(input={}){
  await fs.mkdir(outputDir,{recursive:true});
  const base="track-"+Date.now();
  const wav=path.join(outputDir,base+".wav");
  const mp3=path.join(outputDir,base+".mp3");
  const duration=Math.min(180,Math.max(30,Number(input.duration)||120));
  const bpm=Math.min(110,Math.max(60,Number(input.bpm)||80));
  await fs.writeFile(wav,renderTrack({duration,bpm}));
  if(!ffmpegPath) throw new Error("FFmpeg encoder unavailable");
  await execFileAsync(ffmpegPath,["-y","-i",wav,"-codec:a","libmp3lame","-b:a","192k","-ar","44100",mp3],{maxBuffer:8*1024*1024});
  return {
    ok:true,
    department:"CREATIVE_STUDIO",
    type:"FULL_TRACK",
    audioUrl:"/generated/studio/"+base+".mp3",
    wavUrl:"/generated/studio/"+base+".wav",
    durationSeconds:duration,
    bpm,
    production:["Afro-pop harmonic bed","bass","kick","snare","hi-hat","melodic lead","stereo mix","MP3 master"],
    note:"Generated as an original instrumental master; lyrics/voice can be layered through the Studio voice pipeline when a voice provider is configured."
  };
}
