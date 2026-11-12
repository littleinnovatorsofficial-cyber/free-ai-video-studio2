import React, { useEffect, useMemo, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Speech from "expo-speech";
import { StatusBar } from "expo-status-bar";
import { Character, Scene, Settings } from "./src/types";
import { loadAll, saveCharacters, saveScenes, saveSettings } from "./src/storage";
import { makeScenePrompt } from "./src/prompt";
import { submitComfyJob } from "./src/comfy";

type Tab = "characters" | "scenes" | "voice" | "connect";
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2,7)}`;

export default function App() {
  const [tab, setTab] = useState<Tab>("characters");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [settings, setSettings] = useState<Settings>({
    comfyUrl: "http://192.168.1.10:8188", workflowJson: "",
    positivePromptNode: "", negativePromptNode: "", imageNode: ""
  });
  const [busy, setBusy] = useState(false);
  const [lastJob, setLastJob] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [sceneTitle, setSceneTitle] = useState("");
  const [sceneStory, setSceneStory] = useState("");
  const [sceneDialogue, setSceneDialogue] = useState("");
  const [sceneDuration, setSceneDuration] = useState("8");
  const [selected, setSelected] = useState<string[]>([]);
  const [activeScene, setActiveScene] = useState<string>("");

  useEffect(() => {
    loadAll().then(v => { setCharacters(v.characters); setScenes(v.scenes); setSettings(v.settings); });
  }, []);
  const persistChars = (v: Character[]) => { setCharacters(v); saveCharacters(v); };
  const persistScenes = (v: Scene[]) => { setScenes(v); saveScenes(v); };
  const persistSettings = (v: Settings) => { setSettings(v); saveSettings(v); };
  const currentScene = scenes.find(s => s.id === activeScene) || scenes[0];
  const currentPrompt = useMemo(() => currentScene ? makeScenePrompt(currentScene, characters) : "", [currentScene, characters]);

  async function addCharacter() {
    if (!newName.trim()) return Alert.alert("Name required", "Enter a character name.");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert("Permission needed", "Allow photo access to select a character reference.");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    if (result.canceled) return;
    const item = result.assets[0];
    persistChars([...characters, { id: uid(), name: newName.trim(), description: newDesc.trim(), imageUri: item.uri }]);
    setNewName(""); setNewDesc("");
  }
  function addScene() {
    if (!sceneTitle.trim() || !sceneStory.trim()) return Alert.alert("Scene details", "Enter a title and story action.");
    const scene: Scene = { id: uid(), title: sceneTitle.trim(), story: sceneStory.trim(), dialogue: sceneDialogue.trim(), duration: Math.max(1, Number(sceneDuration) || 8), characterIds: selected, prompt: "" };
    persistScenes([...scenes, scene]); setActiveScene(scene.id);
    setSceneTitle(""); setSceneStory(""); setSceneDialogue(""); setSelected([]);
    setTab("scenes");
  }
  async function speakTamil() {
    if (!currentScene?.dialogue) return Alert.alert("Dialogue missing", "Add dialogue to a scene first.");
    Speech.stop();
    Speech.speak(currentScene.dialogue, { language: "ta-IN", rate: 0.88, onError: () => Alert.alert("Tamil voice unavailable", "Your Android device may not have a Tamil TTS voice installed. Check Android Text-to-Speech settings.") });
  }
  async function generate() {
    if (!currentScene) return Alert.alert("No scene", "Create a scene first.");
    setBusy(true); setLastJob("");
    try {
      const id = await submitComfyJob(settings, currentPrompt);
      setLastJob(id);
      Alert.alert("Job submitted", `ComfyUI job ID:\n${id}\n\nOpen your ComfyUI server to monitor generation and download the result.`);
    } catch (e: any) { Alert.alert("Generation not submitted", e?.message || "Unknown error"); }
    finally { setBusy(false); }
  }
  const Card = ({ children }: any) => <View style={styles.card}>{children}</View>;
  const Btn = ({ title, onPress, secondary=false, disabled=false }: any) => <TouchableOpacity disabled={disabled} onPress={onPress} style={[styles.btn, secondary && styles.secondary, disabled && {opacity:.45}]}><Text style={styles.btnText}>{title}</Text></TouchableOpacity>;
  const Field = ({ label, value, onChangeText, placeholder, multiline=false }: any) => <View style={{marginBottom:12}}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#82909e" multiline={multiline} style={[styles.input, multiline && {height:100,textAlignVertical:"top"}]} /></View>;

  return <View style={styles.root}>
    <StatusBar style="light"/>
    <View style={styles.header}><Text style={styles.brand}>FREE AI VIDEO STUDIO</Text><Text style={styles.sub}>Open-source • Tamil • Character consistency</Text></View>
    <View style={styles.tabs}>
      {(["characters","scenes","voice","connect"] as Tab[]).map(t=><TouchableOpacity key={t} onPress={()=>setTab(t)} style={[styles.tab,tab===t&&styles.activeTab]}><Text style={[styles.tabText,tab===t&&{color:"#fff"}]}>{({characters:"Characters",scenes:"Scenes",voice:"Tamil Voice",connect:"AI Connect"} as any)[t]}</Text></TouchableOpacity>)}
    </View>
    <ScrollView contentContainerStyle={{padding:16,paddingBottom:40}}>
      {tab==="characters" && <>
        <Text style={styles.heading}>Character Library</Text>
        <Text style={styles.help}>Upload your approved character reference sheet. Reuse the same character in every scene.</Text>
        <Card>
          <Field label="Character name" value={newName} onChangeText={setNewName} placeholder="e.g. Hanna"/>
          <Field label="Fixed appearance description" value={newDesc} onChangeText={setNewDesc} placeholder="Describe exact clothes, colours, face, accessories..." multiline/>
          <Btn title="＋ Add reference image" onPress={addCharacter}/>
        </Card>
        {characters.map(c=><Card key={c.id}><View style={{flexDirection:"row",gap:12,alignItems:"center"}}>{c.imageUri?<Image source={{uri:c.imageUri}} style={styles.avatar}/>:<View style={styles.avatar}/>}<View style={{flex:1}}><Text style={styles.cardTitle}>{c.name}</Text><Text style={styles.help}>{c.description || "No appearance notes"}</Text></View><Btn title="Delete" secondary onPress={()=>Alert.alert("Delete character?",c.name,[{text:"Cancel"},{text:"Delete",style:"destructive",onPress:()=>persistChars(characters.filter(x=>x.id!==c.id))}])}/></View></Card>)}
        {!characters.length && <Text style={styles.empty}>No characters yet. Add your first reference sheet.</Text>}
      </>}
      {tab==="scenes" && <>
        <Text style={styles.heading}>Scene Builder</Text>
        <Card>
          <Field label="Scene title" value={sceneTitle} onChangeText={setSceneTitle} placeholder="Scene 01 — The river"/>
          <Field label="What happens in this scene?" value={sceneStory} onChangeText={setSceneStory} placeholder="Describe the action clearly..." multiline/>
          <Field label="Tamil dialogue (optional)" value={sceneDialogue} onChangeText={setSceneDialogue} placeholder="தமிழ் வசனம்..." multiline/>
          <Field label="Duration in seconds" value={sceneDuration} onChangeText={setSceneDuration} placeholder="8"/>
          <Text style={styles.label}>Assign reference characters</Text>
          {characters.map(c=><TouchableOpacity key={c.id} onPress={()=>setSelected(old=>old.includes(c.id)?old.filter(x=>x!==c.id):[...old,c.id])} style={styles.selectRow}><Text style={{color:"#fff"}}>{selected.includes(c.id)?"☑":"□"}  {c.name}</Text></TouchableOpacity>)}
          <Btn title="＋ Create scene" onPress={addScene}/>
        </Card>
        {scenes.map(s=><TouchableOpacity key={s.id} onPress={()=>setActiveScene(s.id)}><Card><Text style={styles.cardTitle}>{activeScene===s.id?"● ":""}{s.title}</Text><Text style={styles.help}>{s.duration}s · {s.story}</Text></Card></TouchableOpacity>)}
        {currentScene && <Card><Text style={styles.cardTitle}>Generated consistency prompt</Text><Text selectable style={styles.prompt}>{makeScenePrompt(currentScene,characters)}</Text><Btn title="Copy prompt" secondary onPress={()=>Alert.alert("Prompt ready","Select and copy the prompt text above.")}/><Btn title={busy?"Submitting...":"Send to ComfyUI"} onPress={generate} disabled={busy}/>{busy&&<ActivityIndicator color="#7dd3fc"/>}{lastJob?<Text style={styles.help}>Latest job: {lastJob}</Text>:null}</Card>}
      </>}
      {tab==="voice" && <>
        <Text style={styles.heading}>Tamil Voice Preview</Text>
        <Text style={styles.help}>Uses Android's installed Text-to-Speech engine. No paid TTS API is called.</Text>
        <Card>{scenes.map(s=><TouchableOpacity key={s.id} onPress={()=>setActiveScene(s.id)} style={styles.selectRow}><Text style={{color:"#fff"}}>{activeScene===s.id?"● ":""}{s.title}</Text></TouchableOpacity>)}<Text style={styles.label}>Selected dialogue</Text><Text style={styles.prompt}>{currentScene?.dialogue || "Select a scene that contains Tamil dialogue."}</Text><Btn title="▶ Play Tamil voice" onPress={speakTamil}/><Btn title="■ Stop" secondary onPress={()=>Speech.stop()}/></Card>
      </>}
      {tab==="connect" && <>
        <Text style={styles.heading}>Open-source AI Connection</Text>
        <Text style={styles.help}>Connect to your own ComfyUI server or a temporary free GPU runtime. This app does not require a paid provider API key.</Text>
        <Card>
          <Field label="ComfyUI server URL" value={settings.comfyUrl} onChangeText={v=>persistSettings({...settings,comfyUrl:v})} placeholder="http://192.168.1.10:8188"/>
          <Field label="ComfyUI API workflow JSON" value={settings.workflowJson} onChangeText={v=>persistSettings({...settings,workflowJson:v})} placeholder="Paste API-format workflow JSON. Use {{PROMPT}} in a text input." multiline/>
          <Field label="Positive prompt node ID (optional)" value={settings.positivePromptNode} onChangeText={v=>persistSettings({...settings,positivePromptNode:v})} placeholder="e.g. 6"/>
          <Field label="Negative prompt node ID (optional)" value={settings.negativePromptNode} onChangeText={v=>persistSettings({...settings,negativePromptNode:v})} placeholder="e.g. 7"/>
          <Btn title="Save connection settings" onPress={()=>{saveSettings(settings);Alert.alert("Saved","Settings saved on this phone.");}}/>
        </Card>
        <Card><Text style={styles.cardTitle}>Important setup notes</Text><Text style={styles.help}>• ComfyUI must be running and reachable from your phone.\n• For Android and remote hosts, use HTTPS where possible.\n• ComfyUI may need CORS enabled for your app origin, or a small same-network proxy.\n• Export workflow using ComfyUI's API format, not the normal UI workflow.\n• Each model workflow has different input nodes; set the correct node IDs.\n• Video models require large GPU memory. A free notebook/host may disconnect or impose usage limits.</Text></Card>
      </>}
      <Text style={styles.footer}>Your projects are stored locally on this phone. Back up your reference images and prompts separately.</Text>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:"#0b1220"}, header:{paddingTop:54,paddingHorizontal:18,paddingBottom:16,backgroundColor:"#111c30"},
  brand:{fontSize:20,fontWeight:"900",letterSpacing:1.2,color:"#f8fafc"},sub:{color:"#9fb0c5",marginTop:4,fontSize:12},
  tabs:{flexDirection:"row",paddingHorizontal:8,backgroundColor:"#111c30",justifyContent:"space-around"},
  tab:{paddingVertical:12,paddingHorizontal:9,borderBottomWidth:2,borderBottomColor:"transparent"},activeTab:{borderBottomColor:"#38bdf8"},tabText:{fontSize:12,color:"#9fb0c5",fontWeight:"700"},
  heading:{fontSize:23,fontWeight:"800",color:"#f8fafc",marginBottom:6},help:{color:"#9fb0c5",fontSize:13,lineHeight:19},card:{backgroundColor:"#152238",borderColor:"#263b58",borderWidth:1,borderRadius:16,padding:14,marginTop:12},
  label:{color:"#dbeafe",fontWeight:"700",fontSize:12,marginBottom:6},input:{backgroundColor:"#0b1526",borderWidth:1,borderColor:"#314766",borderRadius:10,padding:12,color:"#fff",fontSize:14},
  btn:{backgroundColor:"#087eaa",padding:13,borderRadius:11,alignItems:"center",marginTop:8},secondary:{backgroundColor:"#34445b"},btnText:{color:"#fff",fontWeight:"800"},
  cardTitle:{color:"#f8fafc",fontSize:16,fontWeight:"800",marginBottom:6},avatar:{width:68,height:68,borderRadius:12,backgroundColor:"#334155"},
  empty:{color:"#82909e",textAlign:"center",padding:24},selectRow:{padding:10,backgroundColor:"#20324a",borderRadius:9,marginVertical:4},
  prompt:{color:"#d4e5f8",fontSize:12,lineHeight:18,marginVertical:8},footer:{color:"#6f8198",fontSize:11,textAlign:"center",marginTop:22}
});