import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Title, Text, Group, Button, Stack, Tabs, Badge, Alert, Loader, Card, TextInput, Grid,
  Collapse, Divider,
} from '@mantine/core';
import ScriptCreator from '../components/script/ScriptCreator';
import ScriptUpload from '../components/script/ScriptUpload';
import SceneList from '../components/scenes/SceneList';
import ShotListEditor from '../components/shots/ShotListEditor';
import CharacterPanel from '../components/consistency/CharacterPanel';
import LocationPanel from '../components/consistency/LocationPanel';
import StyleLockPanel from '../components/consistency/StyleLockPanel';
import ImageGenPanel from '../components/consistency/ImageGenPanel';
import SuggestionPanel from '../components/consistency/SuggestionPanel';
import DraggableShotGrid from '../components/storyboard/DraggableShotGrid';
import ShotEditorPanel from '../components/storyboard/ShotEditorPanel';
import BoardView from '../components/storyboard/BoardView';
import WritingAssistant from '../components/assistant/WritingAssistant';
import ExportPanel from '../components/export/ExportPanel';
import SharePanel from '../components/collaboration/SharePanel';
import { joinProject, leaveProject } from '../services/socket';
import * as api from '../api/v2';

export default function ProjectPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [shots, setShots] = useState([]);
  const [script, setScript] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('script');
  const [scriptUploading, setScriptUploading] = useState(false);
  const [scriptGenerating, setScriptGenerating] = useState(false);
  const [generatingSceneId, setGeneratingSceneId] = useState(null);
  const [generatingImageId, setGeneratingImageId] = useState(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  // Phase 2: Consistency state
  const [characters, setCharacters] = useState([]);
  const [locations, setLocations] = useState([]);
  const [styleLock, setStyleLock] = useState(null);
  const [generatingRefId, setGeneratingRefId] = useState(null);
  const [styleLockLoading, setStyleLockLoading] = useState(false);

  // Phase 3: Enhanced editing state
  const [editingShot, setEditingShot] = useState(null);
  const [shotEditorOpen, setShotEditorOpen] = useState(false);
  const [suggestingCamera, setSuggestingCamera] = useState(false);

  // Phase 5: View mode (grid vs board)
  const [shotViewMode, setShotViewMode] = useState('grid');

  // Advanced Image Generation state
  const [generatingImage, setGeneratingImage] = useState(false);

  // Character Suggestion state
  const [suggestions, setSuggestions] = useState(null);
  const [suggestingEntities, setSuggestingEntities] = useState(false);

  // ─── Data Fetching ─────────────────────────────────────────

  const fetchProject = useCallback(async () => {
    try {
      const p = await api.getProject(id);
      setProject(p);
      setTitleDraft(p.title);
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  const fetchScenes = useCallback(async () => {
    try {
      const s = await api.listScenes(id);
      setScenes(s);
    } catch (err) {
      console.error('Failed to load scenes:', err);
    }
  }, [id]);

  const fetchShots = useCallback(async () => {
    try {
      const s = await api.listShots(id);
      setShots(s);
    } catch (err) {
      console.error('Failed to load shots:', err);
    }
  }, [id]);

  const fetchScript = useCallback(async () => {
    try {
      const s = await api.getScript(id);
      setScript(s);
    } catch {
      setScript(null);
    }
  }, [id]);

  const fetchCharacters = useCallback(async () => {
    try {
      const c = await api.listCharacters(id);
      setCharacters(c);
    } catch (err) {
      console.error('Failed to load characters:', err);
    }
  }, [id]);

  const fetchLocations = useCallback(async () => {
    try {
      const l = await api.listLocations(id);
      setLocations(l);
    } catch (err) {
      console.error('Failed to load locations:', err);
    }
  }, [id]);

  const fetchStyleLock = useCallback(async () => {
    try {
      const s = await api.getStyleLock(id);
      setStyleLock(s);
    } catch (err) {
      console.error('Failed to load style lock:', err);
    }
  }, [id]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([
        fetchProject(), fetchScenes(), fetchShots(), fetchScript(),
        fetchCharacters(), fetchLocations(), fetchStyleLock(),
      ]);
      setLoading(false);
    };
    load();
  }, [fetchProject, fetchScenes, fetchShots, fetchScript, fetchCharacters, fetchLocations, fetchStyleLock]);

  // ─── Socket.IO Connection ─────────────────────────────────
  useEffect(() => {
    if (id) {
      joinProject(id);
      return () => leaveProject(id);
    }
  }, [id]);

  // ─── Script Handlers ───────────────────────────────────────

  const handleScriptUpload = async (file) => {
    setScriptUploading(true);
    setError(null);
    try {
      const result = await api.uploadScript(id, file);
      setScript({
        id: result.script.id,
        filename: result.script.filename,
        format: result.script.format,
        sceneCount: result.script.sceneCount,
      });
      setScenes(result.scenes);
      setActiveTab('scenes');
      await fetchProject();
    } catch (err) {
      setError(err.message);
    } finally {
      setScriptUploading(false);
    }
  };

  const handleScriptSaved = async (result) => {
    setScript({
      id: result.script.id,
      filename: result.script.filename,
      format: result.script.format,
      sceneCount: result.script.sceneCount,
    });
    setScenes(result.scenes);
    setActiveTab('scenes');
    await fetchProject();
  };

  // ─── Scene Handlers ────────────────────────────────────────

  const handleUpdateScene = async (sceneId, data) => {
    try {
      await api.updateScene(id, sceneId, data);
      await fetchScenes();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteScene = async (sceneId) => {
    try {
      await api.deleteScene(id, sceneId);
      await fetchScenes();
      await fetchShots();
      await fetchProject();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGenerateShots = async (sceneId) => {
    setGeneratingSceneId(sceneId);
    setError(null);
    try {
      await api.generateShotsForScene(id, sceneId, {
        shotsPerScene: 3,
        style: styleLock?.stylePrompt || project?.style || '',
      });
      await fetchScenes();
      await fetchShots();
      await fetchProject();
      setActiveTab('shots');
    } catch (err) {
      setError(err.message);
    } finally {
      setGeneratingSceneId(null);
    }
  };

  // ─── Shot/Image Handlers ───────────────────────────────────

  const handleGenerateImage = async (shotId) => {
    setGeneratingImageId(shotId);
    setError(null);
    try {
      const updated = await api.generateShotImage(id, shotId);
      setShots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (err) {
      setError(err.message);
    } finally {
      setGeneratingImageId(null);
    }
  };

  const handleGenerateAllImages = async () => {
    setGeneratingAll(true);
    setError(null);
    try {
      const results = await api.generateAllImages(id);
      setShots(results);
    } catch (err) {
      setError(err.message);
    } finally {
      setGeneratingAll(false);
    }
  };

  // ─── Project Handlers ──────────────────────────────────────

  const handleSaveTitle = async () => {
    if (titleDraft.trim() && titleDraft !== project?.title) {
      try {
        const updated = await api.updateProject(id, { title: titleDraft.trim() });
        setProject(updated);
      } catch (err) {
        setError(err.message);
      }
    }
    setEditingTitle(false);
  };

  const handleDeleteProject = async () => {
    if (!window.confirm('Delete this project and all its data? This cannot be undone.')) return;
    try {
      await api.deleteProject(id);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  // ─── Character Handlers ────────────────────────────────────

  const handleCreateCharacter = async (data) => {
    try {
      await api.createCharacter(id, data);
      await fetchCharacters();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateCharacter = async (charId, data) => {
    try {
      await api.updateCharacter(id, charId, data);
      await fetchCharacters();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteCharacter = async (charId) => {
    try {
      await api.deleteCharacter(id, charId);
      await fetchCharacters();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUploadCharacterImage = async (charId, file) => {
    setError(null);
    try {
      await api.uploadCharacterImage(id, charId, file);
      await fetchCharacters();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGenerateRefSheet = async (charId) => {
    setGeneratingRefId(charId);
    setError(null);
    try {
      await api.generateRefSheet(id, charId);
      await fetchCharacters();
    } catch (err) {
      setError(err.message);
    } finally {
      setGeneratingRefId(null);
    }
  };

  // ─── Advanced Image Generation Handler ───────────────────
  const handleGenerateImageAdvanced = async (payload) => {
    setGeneratingImage(true);
    setError(null);
    try {
      const result = await api.generateImageAdvanced(id, payload);
      // Refresh characters if a character was bound (image may have been saved)
      if (payload.charId) {
        await fetchCharacters();
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setGeneratingImage(false);
    }
  };

  // ─── Character/Location Suggestion Handlers ─────────────────

  const handleSuggestEntities = async () => {
    setSuggestingEntities(true);
    setError(null);
    try {
      const result = await api.suggestEntities(id);
      setSuggestions(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSuggestingEntities(false);
    }
  };

  const handleApproveSuggestions = async (chars, locs) => {
    setError(null);
    try {
      await api.batchCreateFromSuggestions(id, { characters: chars, locations: locs });
      await Promise.all([fetchCharacters(), fetchLocations(), fetchScenes()]);
      setSuggestions(null); // Clear suggestions after approval
    } catch (err) {
      setError(err.message);
    }
  };

  // ─── Location Handlers ─────────────────────────────────────

  const handleCreateLocation = async (data) => {
    try {
      await api.createLocation(id, data);
      await fetchLocations();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateLocation = async (locId, data) => {
    try {
      await api.updateLocation(id, locId, data);
      await fetchLocations();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteLocation = async (locId) => {
    try {
      await api.deleteLocation(id, locId);
      await fetchLocations();
    } catch (err) {
      setError(err.message);
    }
  };

  // ─── Style Lock Handlers ───────────────────────────────────

  const handleSetStyleLock = async (data) => {
    setStyleLockLoading(true);
    setError(null);
    try {
      const result = await api.setStyleLock(id, data);
      setStyleLock(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setStyleLockLoading(false);
    }
  };

  const handleRemoveStyleLock = async () => {
    try {
      await api.removeStyleLock(id);
      setStyleLock(null);
    } catch (err) {
      setError(err.message);
    }
  };

  // ─── Phase 3: Shot Editor & Reorder Handlers ─────────────

  const handleEditShot = (shot) => {
    setEditingShot(shot);
    setShotEditorOpen(true);
  };

  const handleSaveShotEdit = async (shotId, data) => {
    try {
      await api.updateShot(id, shotId, data);
      await fetchShots();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReorderShots = async (orderedIds) => {
    try {
      // Optimistic update
      const reordered = orderedIds.map((sid, i) => {
        const shot = shots.find((s) => s.id === sid);
        return shot ? { ...shot, sortOrder: i } : shot;
      }).filter(Boolean);
      setShots(reordered);
      await api.reorderShots(id, orderedIds);
    } catch (err) {
      setError(err.message);
      await fetchShots(); // revert on error
    }
  };

  const handleSuggestCamera = async (shotDescription) => {
    setSuggestingCamera(true);
    try {
      const suggestion = await api.suggestCamera(id, shotDescription);
      return suggestion;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setSuggestingCamera(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────

  if (loading) {
    return (
      <Group justify="center" py="xl">
        <Loader size="lg" />
      </Group>
    );
  }

  if (!project) {
    return (
      <Alert color="red" variant="light">
        Project not found. <Button variant="subtle" onClick={() => navigate('/')}>Go Home</Button>
      </Alert>
    );
  }

  return (
    <Stack gap="md">
      {/* Header */}
      <Group justify="space-between" align="center">
        <Group gap="sm" align="center">
          {editingTitle ? (
            <Group gap="xs">
              <TextInput
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                size="lg"
                autoFocus
              />
              <Button size="sm" variant="light" onClick={handleSaveTitle}>Save</Button>
              <Button size="sm" variant="subtle" onClick={() => { setEditingTitle(false); setTitleDraft(project.title); }}>Cancel</Button>
            </Group>
          ) : (
            <Title order={2} style={{ cursor: 'pointer' }} onClick={() => setEditingTitle(true)}>
              {project.title}
            </Title>
          )}
          <Badge color={project.status === 'draft' ? 'gray' : project.status === 'active' ? 'green' : 'blue'}>
            {project.status}
          </Badge>
          {styleLock && (
            <Badge color="violet" variant="dot" size="sm">
              {styleLock.styleName}
            </Badge>
          )}
        </Group>
        <Group gap="xs">
          <Text size="sm" c="dimmed">
            {project.sceneCount || 0} scenes · {project.shotCount || 0} shots
          </Text>
          <Button size="xs" variant="subtle" color="red" onClick={handleDeleteProject}>Delete Project</Button>
        </Group>
      </Group>

      {error && (
        <Alert color="red" variant="light" withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="script">
            Script {script ? '✓' : ''}
          </Tabs.Tab>
          <Tabs.Tab value="scenes">
            Scenes ({scenes.length})
          </Tabs.Tab>
          <Tabs.Tab value="consistency">
            Style & Characters
          </Tabs.Tab>
          <Tabs.Tab value="shots">
            Shots ({shots.length})
          </Tabs.Tab>
          <Tabs.Tab value="assistant">
            AI Assistant
          </Tabs.Tab>
          <Tabs.Tab value="export">
            Export & Share
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="script" pt="md">
          <Stack gap="lg">
            <ScriptCreator
              projectId={id}
              existingScript={script}
              onScriptSaved={handleScriptSaved}
              onGenerating={setScriptGenerating}
            />

            <Divider
              label="Or upload an existing screenplay file"
              labelPosition="center"
              my="sm"
            />

            <Collapse in={!scriptGenerating}>
              <ScriptUpload
                onUpload={handleScriptUpload}
                loading={scriptUploading}
                existingScript={script}
              />
            </Collapse>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="scenes" pt="md">
          <SceneList
            scenes={scenes}
            onUpdateScene={handleUpdateScene}
            onDeleteScene={handleDeleteScene}
            onGenerateShots={handleGenerateShots}
            generatingSceneId={generatingSceneId}
          />
        </Tabs.Panel>

        <Tabs.Panel value="consistency" pt="md">
          <Stack gap="md">
            <SuggestionPanel
              projectId={id}
              hasScript={!!script}
              onSuggestEntities={handleSuggestEntities}
              onApproveSuggestions={handleApproveSuggestions}
              suggestions={suggestions}
              suggesting={suggestingEntities}
              existingCharacters={characters}
              existingLocations={locations}
            />
            <Grid gutter="md">
              <Grid.Col span={{ base: 12, md: 4 }}>
                <StyleLockPanel
                  styleLock={styleLock}
                  onSetStyleLock={handleSetStyleLock}
                  onRemoveStyleLock={handleRemoveStyleLock}
                  loading={styleLockLoading}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <CharacterPanel
                  characters={characters}
                  onCreateCharacter={handleCreateCharacter}
                  onUpdateCharacter={handleUpdateCharacter}
                  onDeleteCharacter={handleDeleteCharacter}
                  onGenerateRefSheet={handleGenerateRefSheet}
                  onUploadImage={handleUploadCharacterImage}
                  generatingRefId={generatingRefId}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <LocationPanel
                  locations={locations}
                  onCreateLocation={handleCreateLocation}
                  onUpdateLocation={handleUpdateLocation}
                  onDeleteLocation={handleDeleteLocation}
                />
              </Grid.Col>
            </Grid>
            <ImageGenPanel
              characters={characters}
              projectId={id}
              onGenerate={handleGenerateImageAdvanced}
              generating={generatingImage}
            />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="shots" pt="md">
          <Stack gap="md">
            <Group justify="space-between">
              <Group gap="xs" align="center">
                <Text size="sm" c="dimmed">{shots.length} shots</Text>
                <Badge
                  size="xs"
                  variant={shotViewMode === 'grid' ? 'filled' : 'light'}
                  color="grape"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setShotViewMode('grid')}
                >
                  Grid
                </Badge>
                <Badge
                  size="xs"
                  variant={shotViewMode === 'board' ? 'filled' : 'light'}
                  color="grape"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setShotViewMode('board')}
                >
                  Board
                </Badge>
              </Group>
              <Group gap="xs">
                <Button
                  size="xs"
                  variant="outline"
                  color="grape"
                  onClick={() => navigate(`/project/${id}/video`)}
                >
                  Video Lab
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  color="grape"
                  onClick={handleGenerateAllImages}
                  loading={generatingAll}
                  disabled={shots.length === 0}
                >
                  Generate All Images
                </Button>
              </Group>
            </Group>
            {shotViewMode === 'grid' ? (
              <DraggableShotGrid
                shots={shots}
                onReorder={handleReorderShots}
                onGenerateImage={handleGenerateImage}
                onEditShot={handleEditShot}
                generatingImageId={generatingImageId}
              />
            ) : (
              <BoardView
                scenes={scenes}
                shots={shots}
                onEditShot={handleEditShot}
                onGenerateImage={handleGenerateImage}
                generatingImageId={generatingImageId}
              />
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="assistant" pt="md">
          <WritingAssistant projectId={id} />
        </Tabs.Panel>

        <Tabs.Panel value="export" pt="md">
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <ExportPanel
                projectId={id}
                shotCount={shots.length}
                sceneCount={scenes.length}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <SharePanel projectId={id} />
            </Grid.Col>
          </Grid>
        </Tabs.Panel>
      </Tabs>

      {/* Shot Editor Drawer */}
      <ShotEditorPanel
        shot={editingShot}
        opened={shotEditorOpen}
        onClose={() => { setShotEditorOpen(false); setEditingShot(null); }}
        onSave={handleSaveShotEdit}
        onSuggestCamera={handleSuggestCamera}
        suggesting={suggestingCamera}
      />
    </Stack>
  );
}
