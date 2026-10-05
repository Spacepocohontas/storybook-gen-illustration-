import type { StoryBible, StoryChapter, StoryScene, StoryCharacter } from "./types";

const headingPattern = /^\s*((?:chapter|part)\s+[\wIVX0-9]+(?:\s*[:.-]\s*.*)?|prologue|epilogue)\s*$/i;
const stopNames = new Set(["The","This","That","There","Then","When","Where","What","Chapter","Part","Prologue","Epilogue","She","He","They","His","Her","Their","You","Your"]);

function unique<T>(items:T[]):T[]{ return [...new Set(items)]; }

function splitChapters(text:string): StoryChapter[] {
  const lines=text.replace(/\r\n/g,"\n").split("\n");
  const chunks:{title:string;lines:string[]}[]=[];
  let current={title:"Opening",lines:[] as string[]};
  for(const line of lines){
    if(headingPattern.test(line.trim()) && current.lines.some(l=>l.trim())){
      chunks.push(current);
      current={title:line.trim(),lines:[]};
    }else if(headingPattern.test(line.trim()) && !current.lines.some(l=>l.trim())){
      current.title=line.trim();
    }else current.lines.push(line);
  }
  if(current.lines.some(l=>l.trim())||!chunks.length) chunks.push(current);
  return chunks.map((chunk,index)=>({
    id:`chapter-${index+1}`,
    title:chunk.title||`Chapter ${index+1}`,
    index,
    text:chunk.lines.join("\n").trim(),
    sceneIds:[]
  }));
}

function findCharacters(text:string): StoryCharacter[] {
  const matches=[...text.matchAll(/\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){0,2})\b/g)].map(m=>m[1]);
  const counts=new Map<string,number>();
  for(const name of matches){
    const first=name.split(" ")[0];
    if(stopNames.has(first)) continue;
    counts.set(name,(counts.get(name)||0)+1);
  }
  return [...counts.entries()]
    .sort((a,b)=>b[1]-a[1])
    .slice(0,20)
    .map(([name],index)=>({id:`character-${index+1}`,name,aliases:[],notes:"Detected locally from repeated capitalized names."}));
}

function findLocations(text:string): string[] {
  const matches=[...text.matchAll(/\b(?:in|at|inside|outside|near|toward|into)\s+(?:the\s+)?([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){0,2})/g)].map(m=>m[1]);
  return unique(matches).slice(0,20);
}

function escapeRegExp(value:string){return value.replace(/[.*+?^$(){}|[\]\\]/g,"\\$&");}

export function buildStoryBible(text:string): StoryBible {
  const chapters=splitChapters(text);
  const characters=findCharacters(text);
  const scenes:StoryScene[]=[];
  chapters.forEach((chapter,chapterIndex)=>{
    const blocks=chapter.text.split(/\n\s*\n(?:\s*[*#~-]{3,}\s*\n\s*)?/).map(x=>x.trim()).filter(Boolean);
    const sceneBlocks=blocks.length?blocks:[chapter.text];
    sceneBlocks.forEach((block,index)=>{
      const present=characters.filter(c=>new RegExp(`\\b${escapeRegExp(c.name)}\\b`).test(block)).map(c=>c.name);
      const scene:StoryScene={
        id:`scene-${chapterIndex+1}-${index+1}`,
        chapterIndex,
        index,
        heading:index===0?chapter.title:`${chapter.title} · Scene ${index+1}`,
        excerpt:block.replace(/\s+/g," ").slice(0,320),
        characters:present
      };
      scenes.push(scene);
      chapter.sceneIds.push(scene.id);
    });
  });
  return {
    chapters,
    scenes,
    characters,
    locations:findLocations(text),
    motifs:[],
    generatedAt:new Date().toISOString(),
    method:"local-heuristic"
  };
}
