/**
 * shotController.js — Shot CRUD + image generation + video generation
 * Phase 2+: Per-shot character consistency with multi-reference images and cross-scene chaining
 */
const shotStore = require('../services/shotStore');
const sceneStore = require('../services/sceneStore');
const projectStore = require('../services/projectStore');
const imageGenService = require('../services/imageGenService');
const characterRefStore = require('../services/characterRefStore');
const locationRefStore = require('../services/locationRefStore');
const styleLockStore = require('../services/styleLockStore');
const { buildConsistencyPrompt } = require('../services/characterConsistencyService');
const { buildCharacterImageCache, buildLocationImageCache, updateCacheAfterGeneration } = require('../services/characterImageCache');
const videoService = require('../services/videoService');

// Helper: Build per-shot consistency prompt with ONLY this shot's characters
function _buildShotConsistencyPrompt(shotCharacters, shotLocation, styleLock) {
  const parts = [];

  if (shotCharacters.length > 0) {
    parts.push('═══ CHARACTER CONSISTENCY (THIS SHOT) ═══');
    parts.push(`ONLY these ${shotCharacters.length} character(s) appear in this shot:`);
    for (const char of shotCharacters) {
      parts.push(`• ${char.name}: ${char.description || 'No description'}`);
      if (char.traits && typeof char.traits === 'object') {
        const traitStr = Object.entries(char.traits)
          .filter(([, v]) => v)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        if (traitStr) parts.push(`  Traits: ${traitStr}`);
      }
    }
    parts.push('Each character MUST look IDENTICAL to their reference image.');
  }

  if (shotLocation) {
    parts.push('═══ LOCATION ═══');
    parts.push(`Setting: ${shotLocation.name}: ${shotLocation.description || ''}`);
  }

  if (styleLock?.stylePrompt) {
    parts.push('═══ STYLE LOCK ═══');
    parts.push(styleLock.stylePrompt);
  }

  return parts.length > 0 ? parts.join('\n') : '';
}

exports.listShots = (req, res) => {
  try {
    const { pid, sceneId } = req.params;
    const shots = sceneId
      ? shotStore.listShotsByScene(pid, sceneId)
      : shotStore.listShotsByProject(pid);
    res.json(shots);
  } catch (err) {
    console.error('Error listing shots:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getShot = (req, res) => {
  try {
    const shot = shotStore.getShot(req.params.id);
    if (!shot) return res.status(404).json({ error: 'Shot not found' });
    res.json(shot);
  } catch (err) {
    console.error('Error getting shot:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateShot = (req, res) => {
  try {
    const shot = shotStore.updateShot(req.params.id, req.body);
    if (!shot) return res.status(404).json({ error: 'Shot not found' });
    res.json(shot);
  } catch (err) {
    console.error('Error updating shot:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.reorderShots = (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'orderedIds must be an array' });
    }
    const shots = shotStore.reorderShots(req.params.sceneId, orderedIds);
    res.json(shots);
  } catch (err) {
    console.error('Error reordering shots:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteShot = (req, res) => {
  try {
    shotStore.deleteShot(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    console.error('Error deleting shot:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Generate image for a single shot — per-shot character-aware.
 */
exports.generateImage = async (req, res) => {
  try {
    const shot = shotStore.getShot(req.params.id);
    if (!shot) return res.status(404).json({ error: 'Shot not found' });

    const project = projectStore.getProject(shot.projectId);
    const styleLock = styleLockStore.getByProject(shot.projectId);
    const style = styleLock?.stylePrompt || req.body.style || project?.style || '';

    // Parse this shot's character and location refs
    const shotCharacterIds = shot.characterRefs ? JSON.parse(shot.characterRefs) : [];
    const shotLocationId = shot.locationRef;

    // Load character data for this shot
    let shotCharacters = [];
    if (shotCharacterIds.length > 0) {
      shotCharacters = shotCharacterIds.map(id => characterRefStore.getById(id)).filter(Boolean);
    }

    // If no per-shot characters, fallback to all project characters
    if (shotCharacters.length === 0) {
      shotCharacters = characterRefStore.listByProject(shot.projectId);
    }

    // Load location
    const shotLocation = shotLocationId ? locationRefStore.getById(shotLocationId) : null;
    const allLocations = shotLocation ? [shotLocation] : locationRefStore.listByProject(shot.projectId);

    // Build consistency prompt with only this shot's characters
    const consistencyPrefix = _buildShotConsistencyPrompt(shotCharacters, shotLocation, styleLock);
    const enhancedPrompt = consistencyPrefix
      ? `${consistencyPrefix}\n\nSHOT: ${shot.prompt}`
      : shot.prompt;

    // Build reference images from character cache
    const charCache = buildCharacterImageCache(shot.projectId);
    const locCache = buildLocationImageCache(shot.projectId);
    const referenceImages = [];

    // Add character reference images (only for THIS shot's characters)
    const charIds = shotCharacterIds.length > 0 ? shotCharacterIds : shotCharacters.map(c => c.id);
    for (const charId of charIds) {
      if (charCache[charId]) {
        referenceImages.push(charCache[charId]);
      }
    }

    // Add location reference image
    if (shotLocation && locCache[shotLocation.id]) {
      referenceImages.push(locCache[shotLocation.id]);
    }

    // Get hero subject from first shot in the scene
    const sceneShots = shotStore.listShotsByScene(shot.projectId, shot.sceneId);
    const firstShot = sceneShots[0];
    const heroSubject = firstShot?.heroSubject || '';

    // Previous shot's prompt for style continuity
    const shotIndex = sceneShots.findIndex((s) => s.id === shot.id);
    const previousStyleHint = shotIndex > 0 ? sceneShots[shotIndex - 1]?.prompt || '' : '';

    console.log(`[ShotGen] Shot ${shot.id}: ${referenceImages.length} refs (${shotCharacters.length} chars)`);

    const imageUrl = await imageGenService.generateImage(enhancedPrompt, {
      previousStyleHint,
      styleOverride: style,
      referenceImages,
      heroSubject,
      consistencyPrefix: '',
    });

    // Update shot with generated image
    const updated = shotStore.updateShot(shot.id, { imageUrl });
    res.json(updated);
  } catch (err) {
    console.error('Error generating image:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Generate images for all shots — batch with cross-scene character chaining.
 */
exports.generateAllImages = async (req, res) => {
  try {
    const { pid, sceneId } = req.params;
    const shots = sceneId
      ? shotStore.listShotsByScene(pid, sceneId)
      : shotStore.listShotsByProject(pid);

    if (shots.length === 0) {
      return res.status(400).json({ error: 'No shots to generate images for' });
    }

    const project = projectStore.getProject(pid);
    const styleLock = styleLockStore.getByProject(pid);
    const style = styleLock?.stylePrompt || req.body.style || project?.style || '';

    // Build image caches ONCE for the entire batch
    const charCache = buildCharacterImageCache(pid);
    const locCache = buildLocationImageCache(pid);
    const allCharacters = characterRefStore.listByProject(pid);
    const allLocations = locationRefStore.listByProject(pid);

    const results = [];

    for (let i = 0; i < shots.length; i++) {
      const shot = shots[i];

      // Parse this shot's character refs
      const shotCharacterIds = shot.characterRefs ? JSON.parse(shot.characterRefs) : [];

      // Get this shot's characters (or fall back to all project characters)
      let shotCharacters;
      if (shotCharacterIds.length > 0) {
        shotCharacters = shotCharacterIds.map(id => characterRefStore.getById(id)).filter(Boolean);
      } else {
        shotCharacters = allCharacters;
      }

      // Get this shot's location
      const shotLocation = shot.locationRef ? locationRefStore.getById(shot.locationRef) : null;

      // Build per-shot consistency prompt
      const consistencyPrefix = _buildShotConsistencyPrompt(shotCharacters, shotLocation, styleLock);
      const enhancedPrompt = consistencyPrefix
        ? `${consistencyPrefix}\n\nSHOT: ${shot.prompt}`
        : shot.prompt;

      // Build reference images from cache
      const referenceImages = [];
      const charIds = shotCharacterIds.length > 0 ? shotCharacterIds : allCharacters.map(c => c.id);
      for (const charId of charIds) {
        if (charCache[charId]) {
          referenceImages.push(charCache[charId]);
        }
      }
      if (shotLocation && locCache[shotLocation.id]) {
        referenceImages.push(locCache[shotLocation.id]);
      }

      const previousStyleHint = i > 0 ? shots[i - 1]?.prompt || '' : '';
      const heroSubject = shots[0]?.heroSubject || '';

      console.log(`[BatchGen] Shot ${i + 1}/${shots.length}: ${referenceImages.length} refs (${shotCharacters.length} chars)`);

      try {
        const imageUrl = await imageGenService.generateImage(enhancedPrompt, {
          previousStyleHint,
          styleOverride: style,
          referenceImages,
          heroSubject: i === 0 ? heroSubject : '',
        });

        // Update character cache with generated image (cross-scene chaining)
        if (imageUrl.startsWith('data:') && shotCharacterIds.length > 0) {
          const imageBase64 = imageUrl.split(',')[1];
          updateCacheAfterGeneration(charCache, shotCharacterIds, imageBase64);
        }

        const updated = shotStore.updateShot(shot.id, { imageUrl });
        results.push(updated);
      } catch (err) {
        console.error(`Error generating image for shot ${shot.id}:`, err);
        results.push({ ...shot, error: err.message });
      }
    }

    res.json(results);
  } catch (err) {
    console.error('Error generating all images:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Generate a video from all project shots that have images.
 * Returns 202 immediately and runs generation in the background,
 * sending progress via Socket.IO.
 */
exports.generateVideo = async (req, res) => {
  try {
    const { pid } = req.params;
    const project = projectStore.getProject(pid);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Get all shots for the project, sorted by sortOrder
    const allShots = shotStore.listShotsByProject(pid);
    const shotsWithImages = allShots.filter(s => s.imageUrl && s.imageUrl.startsWith('data:'));

    if (shotsWithImages.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 shots with generated images to create a video.' });
    }

    // Map to the storyboard format expected by videoService
    const storyboard = shotsWithImages.map((shot, idx) => ({
      shot: `Shot ${shot.shotNumber || idx + 1}`,
      description: shot.description || shot.prompt || '',
      prompt: shot.prompt || shot.description || '',
      imageUrl: shot.imageUrl,
      duration: shot.duration || 6,
      cameraAngle: shot.cameraAngle || '',
      cameraMovement: shot.cameraMovement || '',
    }));

    // Read provider/model selection from request body
    const { provider, model } = req.body || {};

    // Return 202 immediately — video generates in background
    res.status(202).json({
      message: 'Video generation started',
      shotCount: storyboard.length,
      provider: provider || process.env.DEFAULT_VIDEO_PROVIDER || 'vertex',
    });

    // Run video generation in background (errors logged via videoLogStore + socket)
    videoService.generateFullVideoFromShots(storyboard, pid, { provider, model }).catch((err) => {
      console.error(`[VideoGen] Background video generation failed for project ${pid}:`, err);
    });

  } catch (err) {
    console.error('Error starting video generation:', err);
    res.status(500).json({ error: err.message });
  }
};
