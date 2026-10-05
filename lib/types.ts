export type StoryCharacter = {
  id: string;
  name: string;
  aliases: string[];
  notes: string;
};

export type StoryScene = {
  id: string;
  chapterIndex: number;
  index: number;
  heading: string;
  excerpt: string;
  characters: string[];
};

export type StoryChapter = {
  id: string;
  title: string;
  index: number;
  text: string;
  sceneIds: string[];
};

export type StoryBible = {
  chapters: StoryChapter[];
  scenes: StoryScene[];
  characters: StoryCharacter[];
  locations: string[];
  motifs: string[];
  generatedAt: string;
  method: "local-heuristic";
};

export type CharacterProfile = {
  id: string;
  name: string;
  referenceImages: string[];
  traits: Record<string, string>;
  lockedTraits: string[];
  consistencySeed: string;
};
