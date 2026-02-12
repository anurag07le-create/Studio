/**
 * V2 API client — Project-based endpoints
 */
import { v2 } from './apiClient';

// ─── Projects ─────────────────────────────────────────────────
export const createProject = (data) => v2.post('/projects', data);
export const listProjects = () => v2.get('/projects');
export const getProject = (id) => v2.get(`/projects/${id}`);
export const updateProject = (id, data) => v2.put(`/projects/${id}`, data);
export const deleteProject = (id) => v2.del(`/projects/${id}`);

// ─── Scripts ──────────────────────────────────────────────────
export const uploadScript = (projectId, file) => {
  const formData = new FormData();
  formData.append('script', file);
  return v2.upload(`/projects/${projectId}/script`, formData);
};
export const getScript = (projectId) => v2.get(`/projects/${projectId}/script`);
export const deleteScript = (projectId) => v2.del(`/projects/${projectId}/script`);
export const suggestEntities = (projectId) => v2.post(`/projects/${projectId}/script/suggest-entities`);
export const generateScript = (projectId, opts) => v2.post(`/projects/${projectId}/script/generate`, opts);
export const saveScriptText = (projectId, data) => v2.post(`/projects/${projectId}/script/save-text`, data);

// ─── Scenes ───────────────────────────────────────────────────
export const listScenes = (projectId) => v2.get(`/projects/${projectId}/scenes`);
export const getScene = (projectId, sceneId) => v2.get(`/projects/${projectId}/scenes/${sceneId}`);
export const createScene = (projectId, data) => v2.post(`/projects/${projectId}/scenes`, data);
export const updateScene = (projectId, sceneId, data) => v2.put(`/projects/${projectId}/scenes/${sceneId}`, data);
export const deleteScene = (projectId, sceneId) => v2.del(`/projects/${projectId}/scenes/${sceneId}`);
export const reorderScenes = (projectId, orderedIds) => v2.put(`/projects/${projectId}/scenes/reorder`, { orderedIds });
export const generateShotsForScene = (projectId, sceneId, opts = {}) =>
  v2.post(`/projects/${projectId}/scenes/${sceneId}/generate-shots`, opts);

// ─── Shots ────────────────────────────────────────────────────
export const listShots = (projectId, sceneId) =>
  sceneId
    ? v2.get(`/projects/${projectId}/scenes/${sceneId}/shots`)
    : v2.get(`/projects/${projectId}/shots`);
export const getShot = (projectId, shotId) => v2.get(`/projects/${projectId}/shots/${shotId}`);
export const updateShot = (projectId, shotId, data) => v2.put(`/projects/${projectId}/shots/${shotId}`, data);
export const deleteShot = (projectId, shotId) => v2.del(`/projects/${projectId}/shots/${shotId}`);
export const generateShotImage = (projectId, shotId, opts = {}) =>
  v2.post(`/projects/${projectId}/shots/${shotId}/generate-image`, opts);
export const generateAllImages = (projectId, sceneId, opts = {}) =>
  sceneId
    ? v2.post(`/projects/${projectId}/scenes/${sceneId}/shots/generate-all-images`, opts)
    : v2.post(`/projects/${projectId}/shots/generate-all-images`, opts);

// ─── Phase 2: Consistency Engine ─────────────────────────────

// Characters
export const listCharacters = (projectId) => v2.get(`/projects/${projectId}/consistency/characters`);
export const createCharacter = (projectId, data) => v2.post(`/projects/${projectId}/consistency/characters`, data);
export const updateCharacter = (projectId, charId, data) => v2.put(`/projects/${projectId}/consistency/characters/${charId}`, data);
export const deleteCharacter = (projectId, charId) => v2.del(`/projects/${projectId}/consistency/characters/${charId}`);
export const uploadCharacterImage = (projectId, charId, file) => {
  const formData = new FormData();
  formData.append('image', file);
  return v2.upload(`/projects/${projectId}/consistency/characters/${charId}/upload-image`, formData);
};
export const generateRefSheet = (projectId, charId) => v2.post(`/projects/${projectId}/consistency/characters/${charId}/generate-ref-sheet`);
export const extractCharacter = (projectId, data) => v2.post(`/projects/${projectId}/consistency/characters/extract`, data);

// Batch Operations
export const batchCreateFromSuggestions = (projectId, data) => v2.post(`/projects/${projectId}/consistency/batch-create`, data);

// Advanced Image Generation
export const generateImageAdvanced = (projectId, data) => v2.post(`/projects/${projectId}/consistency/generate-image`, data);

// Locations
export const listLocations = (projectId) => v2.get(`/projects/${projectId}/consistency/locations`);
export const createLocation = (projectId, data) => v2.post(`/projects/${projectId}/consistency/locations`, data);
export const updateLocation = (projectId, locId, data) => v2.put(`/projects/${projectId}/consistency/locations/${locId}`, data);
export const deleteLocation = (projectId, locId) => v2.del(`/projects/${projectId}/consistency/locations/${locId}`);

// Style Lock
export const getStyleLock = (projectId) => v2.get(`/projects/${projectId}/consistency/style`);
export const setStyleLock = (projectId, data) => v2.post(`/projects/${projectId}/consistency/style`, data);
export const updateStyleLockData = (projectId, data) => v2.put(`/projects/${projectId}/consistency/style`, data);
export const removeStyleLock = (projectId) => v2.del(`/projects/${projectId}/consistency/style`);
export const analyzeStyle = (projectId, data) => v2.post(`/projects/${projectId}/consistency/style/analyze`, data);
export const getStylePresets = (projectId) => v2.get(`/projects/${projectId}/consistency/style/presets`);

// ─── Phase 3: Assistant + Camera ─────────────────────────────

export const startWriting = (projectId, data) => v2.post(`/projects/${projectId}/assistant/write`, data);
export const improveDialogue = (projectId, data) => v2.post(`/projects/${projectId}/assistant/improve-dialogue`, data);
export const suggestCamera = (projectId, shotDescription, sceneContext) =>
  v2.post(`/projects/${projectId}/assistant/suggest-camera`, { shotDescription, sceneContext });
export const getCameraPresets = (projectId) => v2.get(`/projects/${projectId}/assistant/camera-presets`);
export const reorderShots = (projectId, orderedIds, sceneId) =>
  sceneId
    ? v2.put(`/projects/${projectId}/scenes/${sceneId}/shots/reorder`, { orderedIds })
    : v2.put(`/projects/${projectId}/shots/reorder`, { orderedIds });

// ─── Video Generation ────────────────────────────────────────
export const generateVideo = (projectId, opts = {}) => v2.post(`/projects/${projectId}/shots/generate-video`, opts);

// ─── Standalone Video Generation ─────────────────────────────
export const generateStandaloneVideo = (data) => v2.post('/video/generate', data);

// ─── Standalone Image Generation (Flux via PiAPI) ────────────
export const generateStandaloneImage = (data) => v2.post('/image/generate', data);

// ─── Phase 4: Export & Collaboration ─────────────────────────

// Exports
export const exportPDF = (projectId, settings = {}) => v2.post(`/projects/${projectId}/export/pdf`, settings);
export const exportPNG = (projectId) => v2.post(`/projects/${projectId}/export/png`);
export const exportJSON = (projectId) => v2.post(`/projects/${projectId}/export/json`);
export const importProject = (data) => v2.post('/projects/import', { data });
export const listExports = (projectId) => v2.get(`/projects/${projectId}/export`);

// Collaborators
export const listCollaborators = (projectId) => v2.get(`/projects/${projectId}/collaborators`);
export const inviteCollaborator = (projectId, email, role) => v2.post(`/projects/${projectId}/collaborators`, { email, role });
export const updateCollaboratorRole = (projectId, collabId, role) => v2.put(`/projects/${projectId}/collaborators/${collabId}`, { role });
export const removeCollaborator = (projectId, collabId) => v2.del(`/projects/${projectId}/collaborators/${collabId}`);
