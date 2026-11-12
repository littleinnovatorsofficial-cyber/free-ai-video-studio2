import AsyncStorage from "@react-native-async-storage/async-storage";
import { Character, Scene, Settings } from "./types";

const KEYS = { chars: "favs.characters.v1", scenes: "favs.scenes.v1", settings: "favs.settings.v1" };
export async function loadAll() {
  const [c, s, x] = await Promise.all([
    AsyncStorage.getItem(KEYS.chars), AsyncStorage.getItem(KEYS.scenes), AsyncStorage.getItem(KEYS.settings)
  ]);
  return {
    characters: c ? JSON.parse(c) as Character[] : [],
    scenes: s ? JSON.parse(s) as Scene[] : [],
    settings: x ? JSON.parse(x) as Settings : {
      comfyUrl: "http://192.168.1.10:8188", workflowJson: "",
      positivePromptNode: "", negativePromptNode: "", imageNode: ""
    }
  };
}
export const saveCharacters = (v: Character[]) => AsyncStorage.setItem(KEYS.chars, JSON.stringify(v));
export const saveScenes = (v: Scene[]) => AsyncStorage.setItem(KEYS.scenes, JSON.stringify(v));
export const saveSettings = (v: Settings) => AsyncStorage.setItem(KEYS.settings, JSON.stringify(v));