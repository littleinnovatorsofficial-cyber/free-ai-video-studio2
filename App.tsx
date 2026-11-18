
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import * as Speech from "expo-speech";
import { StatusBar } from "expo-status-bar";

import {
  Character,
  Scene,
  Settings,
  ReferenceView,
} from "./types";

import {
  loadAll,
  saveCharacters,
  saveScenes,
  saveSettings,
} from "./storage";

import { makeScenePrompt } from "./prompt";
import { submitComfyJob } from "./comfy";

type Tab = "characters" | "scenes" | "voice" | "connect";

const uid = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const REFERENCE_VIEWS: ReferenceView[] = [
  "front",
  "side",
  "back",
  "expression",
  "other",
];

const DEFAULT_SETTINGS: Settings = {
  comfyUrl: "http://192.168.1.10:8188",
  workflowJson: "",
  positivePromptNode: "",
  negativePromptNode: "",
  imageNode: "",
};

export default function App() {
  const [tab, setTab] = useState<Tab>("characters");

  const [characters, setCharacters] = useState<Character[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [settings, setSettings] =
    useState<Settings>(DEFAULT_SETTINGS);

  const [busy, setBusy] = useState(false);
  const [lastJob, setLastJob] = useState("");

  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const [referenceView, setReferenceView] =
    useState<ReferenceView>("front");

  const [sceneTitle, setSceneTitle] = useState("");
  const [sceneStory, setSceneStory] = useState("");
  const [sceneDialogue, setSceneDialogue] = useState("");
  const [sceneDuration, setSceneDuration] = useState("10");

  const [selected, setSelected] = useState<string[]>([]);
  const [activeScene, setActiveScene] = useState("");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll()
      .then((v) => {
        setCharacters(v.characters || []);
        setScenes(v.scenes || []);
        setSettings({
          ...DEFAULT_SETTINGS,
          ...(v.settings || {}),
        });
      })
      .catch(() => {
        Alert.alert(
          "Loading error",
          "Could not load saved projects."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const persistChars = (v: Character[]) => {
    setCharacters(v);
    saveCharacters(v);
  };

  const persistScenes = (v: Scene[]) => {
    setScenes(v);
    saveScenes(v);
  };

  const persistSettings = (v: Settings) => {
    setSettings(v);
    saveSettings(v);
  };

  const currentScene =
    scenes.find((s) => s.id === activeScene) || scenes[0];

  const currentPrompt = useMemo(
    () =>
      currentScene
        ? makeScenePrompt(currentScene, characters)
        : "",
    [currentScene, characters]
  );

  // Select an image from the phone.
  async function pickImage() {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Please allow photo access in Android settings."
      );
      return null;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
      });

    if (result.canceled || !result.assets?.[0]) {
      return null;
    }

    return result.assets[0];
  }

  // Add a new character with its first reference image.
  async function addCharacter() {
    if (!newName.trim()) {
      Alert.alert(
        "Name required",
        "Enter a character name first."
      );
      return;
    }

    try {
      const item = await pickImage();

      if (!item) return;

      const newReference = {
        id: uid(),
        uri: item.uri,
        view: referenceView,
        label: referenceView,
        createdAt: Date.now(),
      };

      const newCharacter: Character = {
        id: uid(),
        name: newName.trim(),
        description: newDesc.trim(),
        imageUri: item.uri,
        referenceImages: [newReference],
        appearanceLocked: true,
      };

      persistChars([...characters, newCharacter]);

      setNewName("");
      setNewDesc("");
      setReferenceView("front");

      Alert.alert(
        "Character added",
        "Your character and first reference image have been saved."
      );
    } catch (error: any) {
      Alert.alert(
        "Image error",
        error?.message || "Could not add character."
      );
    }
  }

  // Add more reference images to an existing character.
  async function addCharacterReference(characterId: string) {
    try {
      const item = await pickImage();

      if (!item) return;

      const newReference = {
        id: uid(),
        uri: item.uri,
        view: referenceView,
        label: referenceView,
        createdAt: Date.now(),
      };

      const updated = characters.map((character) => {
        if (character.id !== characterId) {
          return character;
        }

        return {
          ...character,
          imageUri: character.imageUri || item.uri,
          referenceImages: [
            ...(character.referenceImages || []),
            newReference,
          ],
        };
      });

      persistChars(updated);

      Alert.alert(
        "Reference added",
        `New ${referenceView} image saved.`
      );
    } catch (error: any) {
      Alert.alert(
        "Image error",
        error?.message || "Could not add reference."
      );
    }
  }

  // Remove one reference image.
  function deleteReference(
    characterId: string,
    referenceId: string
  ) {
    Alert.alert(
      "Delete reference?",
      "Do you want to remove this reference image?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const updated = characters.map((character) => {
              if (character.id !== characterId) {
                return character;
              }

              const remaining = (
                character.referenceImages || []
              ).filter((image) => image.id !== referenceId);

              return {
                ...character,
                referenceImages: remaining,
                imageUri:
                  remaining[0]?.uri || undefined,
              };
            });

            persistChars(updated);
          },
        },
      ]
    );
  }

  // Delete a character.
  function deleteCharacter(character: Character) {
    Alert.alert(
      "Delete character?",
      `Delete ${character.name} and its reference images?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            persistChars(
              characters.filter(
                (item) => item.id !== character.id
              )
            );

            setSelected((old) =>
              old.filter((id) => id !== character.id)
            );
          },
        },
      ]
    );
  }

  // Create a new scene.
  function addScene() {
    if (!sceneTitle.trim() || !sceneStory.trim()) {
      Alert.alert(
        "Scene details",
        "Enter a title and story action."
      );
      return;
    }

    const scene: Scene = {
      id: uid(),
      title: sceneTitle.trim(),
      story: sceneStory.trim(),
      dialogue: sceneDialogue.trim(),
      duration: Math.max(
        1,
        Number(sceneDuration) || 10
      ),
      characterIds: selected,
      prompt: "",
    };

    persistScenes([...scenes, scene]);

    setActiveScene(scene.id);
    setSceneTitle("");
    setSceneStory("");
    setSceneDialogue("");
    setSceneDuration("10");
    setSelected([]);
    setTab("scenes");
  }

  // Delete a scene.
  function deleteScene(scene: Scene) {
    Alert.alert(
      "Delete scene?",
      scene.title,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const updated = scenes.filter(
              (item) => item.id !== scene.id
            );

            persistScenes(updated);

            if (activeScene === scene.id) {
              setActiveScene(updated[0]?.id || "");
            }
          },
        },
      ]
    );
  }

  // Tamil voice preview.
  function speakTamil() {
    if (!currentScene?.dialogue) {
      Alert.alert(
        "Dialogue missing",
        "Add Tamil dialogue to a scene first."
      );
      return;
    }

    Speech.stop();

    Speech.speak(currentScene.dialogue, {
      language: "ta-IN",
      rate: 0.88,
      onError: () => {
        Alert.alert(
          "Tamil voice unavailable",
          "Check Android Text-to-Speech settings and install a Tamil voice."
        );
      },
    });
  }

  // Send the current scene prompt to ComfyUI.
  async function generate() {
    if (!currentScene) {
      Alert.alert(
        "No scene",
        "Create a scene first."
      );
      return;
    }

    setBusy(true);
    setLastJob("");

    try {
      const id = await submitComfyJob(
        settings,
        currentPrompt
      );

      setLastJob(id);

      Alert.alert(
        "Job submitted",
        `ComfyUI job ID:\n${id}\n\nOpen your ComfyUI server to monitor generation.`
      );
    } catch (error: any) {
      Alert.alert(
        "Generation not submitted",
        error?.message || "Unknown error."
      );
    } finally {
      setBusy(false);
    }
  }

  const Card = ({ children }: any) => (
    <View style={styles.card}>{children}</View>
  );

  const Btn = ({
    title,
    onPress,
    secondary = false,
    disabled = false,
  }: any) => (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.btn,
        secondary && styles.secondary,
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text style={styles.btnText}>{title}</Text>
    </TouchableOpacity>
  );

  const Field = ({
    label,
    value,
    onChangeText,
    placeholder,
    multiline = false,
    keyboardType,
  }: any) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#82909e"
        multiline={multiline}
        keyboardType={keyboardType}
        style={[
          styles.input,
          multiline && {
            height: 100,
            textAlignVertical: "top",
          },
        ]}
      />
    </View>
  );

  const ReferenceSelector = () => (
    <View style={{ marginTop: 8, marginBottom: 8 }}>
      <Text style={styles.label}>
        Select reference image view
      </Text>

      <View style={styles.viewSelector}>
        {REFERENCE_VIEWS.map((view) => (
          <TouchableOpacity
            key={view}
            onPress={() => setReferenceView(view)}
            style={[
              styles.viewButton,
              referenceView === view &&
                styles.selectedViewButton,
            ]}
          >
            <Text
              style={[
                styles.viewButtonText,
                referenceView === view &&
                  styles.selectedViewText,
              ]}
            >
              {view.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color="#38bdf8"
        />
        <Text style={styles.help}>
          Loading your projects...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.brand}>
          FREE AI VIDEO STUDIO
        </Text>

        <Text style={styles.sub}>
          Open-source • Tamil • Character consistency
        </Text>
      </View>

      <View style={styles.tabs}>
        {(
          ["characters", "scenes", "voice", "connect"] as Tab[]
        ).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[
              styles.tab,
              tab === t && styles.activeTab,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                tab === t && { color: "#fff" },
              ]}
            >
              {{
                characters: "Characters",
                scenes: "Scenes",
                voice: "Tamil Voice",
                connect: "AI Connect",
              }[t]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 40,
        }}
      >
        {/* CHARACTER LIBRARY */}

        {tab === "characters" && (
          <>
            <Text style={styles.heading}>
              Character Library
            </Text>

            <Text style={styles.help}>
              Create characters and save multiple approved
              reference images. Reuse the same characters
              in different scenes.
            </Text>

            <Card>
              <Field
                label="Character name"
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g. Hanna"
              />

              <Field
                label="Fixed appearance description"
                value={newDesc}
                onChangeText={setNewDesc}
                placeholder="Describe exact face, clothes, colours and accessories..."
                multiline
              />

              <ReferenceSelector />

              <Btn
                title="＋ Add character with reference"
                onPress={addCharacter}
              />
            </Card>

            {characters.map((c) => {
              const refs =
                c.referenceImages?.length
                  ? c.referenceImages
                  : c.imageUri
                  ? [
                      {
                        id: `legacy-${c.id}`,
                        uri: c.imageUri,
                        view: "other" as ReferenceView,
                        label: "Existing image",
                      },
                    ]
                  : [];

              return (
                <Card key={c.id}>
                  <Text style={styles.cardTitle}>
                    {c.name}
                  </Text>

                  <Text style={styles.help}>
                    {c.description || "No appearance notes"}
                  </Text>

                  <Text style={styles.label}>
                    Saved reference images: {refs.length}
                  </Text>

                  {refs.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      {refs.map((ref) => (
                        <View
                          key={ref.id}
                          style={styles.referenceCard}
                        >
                          <Image
                            source={{ uri: ref.uri }}
                            style={styles.referenceImage}
                          />

                          <Text style={styles.referenceLabel}>
                            {(ref.label || ref.view || "other")
                              .toString()
                              .toUpperCase()}
                          </Text>

                          {ref.id.startsWith("legacy-") ? (
                            <Text style={styles.smallNote}>
                              Existing image
                            </Text>
                          ) : (
                            <TouchableOpacity
                              onPress={() =>
                                deleteReference(c.id, ref.id)
                              }
                              style={styles.deleteRefButton}
                            >
                              <Text style={styles.deleteRefText}>
                                Remove
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                    </ScrollView>
                  )}

                  <View style={{ marginTop: 12 }}>
                    <ReferenceSelector />

                    <Btn
                      title="＋ Add another reference image"
                      onPress={() =>
                        addCharacterReference(c.id)
                      }
                    />

                    <Btn
                      title="Delete character"
                      secondary
                      onPress={() => deleteCharacter(c)}
                    />
                  </View>
                </Card>
              );
            })}

            {!characters.length && (
              <Text style={styles.empty}>
                No characters yet. Add your first character.
              </Text>
            )}
          </>
        )}

        {/* SCENE BUILDER */}

        {tab === "scenes" && (
          <>
            <Text style={styles.heading}>
              Scene Builder
            </Text>

            <Text style={styles.help}>
              Create individual scenes and assign your
              approved reference characters.
            </Text>

            <Card>
              <Field
                label="Scene title"
                value={sceneTitle}
                onChangeText={setSceneTitle}
                placeholder="Scene 01 — The river"
              />

              <Field
                label="What happens in this scene?"
                value={sceneStory}
                onChangeText={setSceneStory}
                placeholder="Describe the action clearly..."
                multiline
              />

              <Field
                label="Tamil dialogue (optional)"
                value={sceneDialogue}
                onChangeText={setSceneDialogue}
                placeholder="தமிழ் வசனம்..."
                multiline
              />

              <Field
                label="Duration in seconds"
                value={sceneDuration}
                onChangeText={setSceneDuration}
                placeholder="10"
                keyboardType="numeric"
              />

              <Text style={styles.label}>
                Assign reference characters
              </Text>

              {characters.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() =>
                    setSelected((old) =>
                      old.includes(c.id)
                        ? old.filter((x) => x !== c.id)
                        : [...old, c.id]
                    )
                  }
                  style={styles.selectRow}
                >
                  <Text style={{ color: "#fff" }}>
                    {selected.includes(c.id) ? "☑" : "□"}{" "}
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}

              {!characters.length && (
                <Text style={styles.help}>
                  Add characters in Character Library first.
                </Text>
              )}

              <Btn
                title="＋ Create scene"
                onPress={addScene}
              />
            </Card>

            {scenes.map((s) => (
              <View key={s.id}>
                <TouchableOpacity
                  onPress={() => setActiveScene(s.id)}
                >
                  <Card>
          
