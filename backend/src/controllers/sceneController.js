/**
 * sceneController.js — Scene CRUD + shot generation + scene-character mapping
 */
const sceneStore = require('../services/sceneStore');
const shotStore = require('../services/shotStore');
const projectStore = require('../services/projectStore');
const sceneCharacterStore = require('../services/sceneCharacterStore');
const { generateShotList } = require('../services/sceneBreakdownService');

exports.listScenes = (req, res) => {
  try {
    const scenes = sceneStore.listScenesByProject(req.params.pid);
    // Include shot count and character data for each scene
    const enriched = scenes.map((s) => {
      const shots = shotStore.listShotsByScene(req.params.pid, s.id);
      let characters = [];
      try {
        characters = sceneCharacterStore.listCharactersByScene(s.id).map(c => ({
          id: c.id, name: c.name, source: c.mappingSource,
        }));
      } catch (e) {
        // scene_characters table may not exist yet
      }
      return { ...s, shotCount: shots.length, characters };
    });
    res.json(enriched);
  } catch (err) {
    console.error('Error listing scenes:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getScene = (req, res) => {
  try {
    const scene = sceneStore.getScene(req.params.id);
    if (!scene) return res.status(404).json({ error: 'Scene not found' });
    const shots = shotStore.listShotsByScene(scene.projectId, scene.id);
    res.json({ ...scene, shots });
  } catch (err) {
    console.error('Error getting scene:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.createScene = (req, res) => {
  try {
    const { pid } = req.params;
    const project = projectStore.getProject(pid);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const scene = sceneStore.createScene({
      projectId: pid,
      ...req.body,
    });
    res.status(201).json(scene);
  } catch (err) {
    console.error('Error creating scene:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateScene = (req, res) => {
  try {
    const scene = sceneStore.updateScene(req.params.id, req.body);
    if (!scene) return res.status(404).json({ error: 'Scene not found' });
    res.json(scene);
  } catch (err) {
    console.error('Error updating scene:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.reorderScenes = (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'orderedIds must be an array' });
    }
    const scenes = sceneStore.reorderScenes(req.params.pid, orderedIds);
    res.json(scenes);
  } catch (err) {
    console.error('Error reordering scenes:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteScene = (req, res) => {
  try {
    sceneStore.deleteScene(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    console.error('Error deleting scene:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.generateShots = async (req, res) => {
  try {
    const scene = sceneStore.getScene(req.params.id);
    if (!scene) return res.status(404).json({ error: 'Scene not found' });

    const project = projectStore.getProject(scene.projectId);
    const shotsPerScene = req.body.shotsPerScene || 3;
    const style = req.body.style || project?.style || '';

    // Load scene characters for context
    let sceneCharacters = [];
    try {
      sceneCharacters = sceneCharacterStore.listCharactersByScene(scene.id);
    } catch (e) {
      // scene_characters table may not exist yet
    }

    // Delete existing shots for this scene before regenerating
    shotStore.deleteShotsByScene(scene.id);

    // Generate shots via AI (pass scene characters for per-shot character assignment)
    const shotList = await generateShotList(scene, style, shotsPerScene, project?.title || '', sceneCharacters);

    // Save to DB
    const shots = shotStore.batchCreateShots(
      scene.projectId,
      scene.id,
      shotList.map((s, idx) => ({
        shotNumber: s.shotNumber || idx + 1,
        prompt: s.prompt,
        description: s.description,
        shotStory: s.shotStory,
        cameraAngle: s.cameraAngle,
        cameraMovement: s.cameraMovement,
        duration: s.duration,
        mood: s.mood,
        heroSubject: s.heroSubject || null,
        sortOrder: idx,
      }))
    );

    // If scene has characters, resolve shot character names → IDs and assign to shots
    if (sceneCharacters.length > 0) {
      for (let i = 0; i < shots.length; i++) {
        const shotCharNames = shotList[i]?.characters || [];
        if (shotCharNames.length > 0) {
          const charIds = shotCharNames
            .map(name => sceneCharacters.find(c =>
              c.name.toUpperCase() === name.toUpperCase()
            )?.id)
            .filter(Boolean);
          if (charIds.length > 0) {
            shotStore.updateShot(shots[i].id, { characterRefs: JSON.stringify(charIds) });
            shots[i].characterRefs = JSON.stringify(charIds);
          }
        }
      }
    }

    res.json(shots);
  } catch (err) {
    console.error('Error generating shots:', err);
    res.status(500).json({ error: err.message });
  }
};

// ═══════════════════════ SCENE-CHARACTER MAPPING ═══════════════

exports.listSceneCharacters = (req, res) => {
  try {
    const characters = sceneCharacterStore.listCharactersByScene(req.params.id);
    res.json(characters);
  } catch (err) {
    console.error('Error listing scene characters:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.addSceneCharacter = (req, res) => {
  try {
    const { characterRefId } = req.body;
    if (!characterRefId) return res.status(400).json({ error: 'characterRefId is required' });
    const link = sceneCharacterStore.linkCharacterToScene(req.params.id, characterRefId, 'manual');
    res.status(201).json(link);
  } catch (err) {
    console.error('Error adding scene character:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.removeSceneCharacter = (req, res) => {
  try {
    sceneCharacterStore.unlinkCharacterFromScene(req.params.id, req.params.charId);
    res.json({ removed: true });
  } catch (err) {
    console.error('Error removing scene character:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.autoMapCharacters = (req, res) => {
  try {
    const result = sceneCharacterStore.autoMapCharactersToScenes(req.params.pid);
    const locResult = sceneCharacterStore.autoMapLocationsToScenes(req.params.pid);
    res.json({
      characterMappings: result.mapped,
      locationMappings: locResult.mapped,
    });
  } catch (err) {
    console.error('Error auto-mapping characters:', err);
    res.status(500).json({ error: err.message });
  }
};
