/**
 * scriptController.js — Script upload, parse, and management
 */
const projectStore = require('../services/projectStore');
const scriptStore = require('../services/scriptStore');
const sceneStore = require('../services/sceneStore');
const { parseScript, detectFormat } = require('../services/scriptParser');
const { breakdownScenes } = require('../services/sceneBreakdownService');
const { suggestCharactersFromScript, suggestLocationsFromScript } = require('../services/characterSuggestionService');
const { generateFullScreenplay } = require('../services/writingAssistantService');

exports.uploadScript = async (req, res) => {
  try {
    const { pid } = req.params;
    const project = projectStore.getProject(pid);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Send a file with field name "script".' });
    }

    const filename = req.file.originalname;
    const format = detectFormat(filename);
    const buffer = req.file.buffer;

    // Parse the script
    const parsedContent = await parseScript(buffer, format, filename);

    // Delete existing scripts for this project (one script per project for now)
    scriptStore.deleteScriptsByProject(pid);
    sceneStore.deleteScenesByProject(pid);

    // Save script
    const script = scriptStore.createScript({
      projectId: pid,
      filename,
      format,
      rawContent: buffer.toString('utf-8').substring(0, 100000), // cap raw storage
      parsedContent,
    });

    // Auto-create scenes from parsed content
    if (parsedContent.scenes && parsedContent.scenes.length > 0) {
      // Optionally enrich scenes with AI
      let enrichedScenes;
      try {
        enrichedScenes = await breakdownScenes(parsedContent.scenes, project.style);
      } catch (err) {
        console.error('AI scene breakdown failed, using raw scenes:', err.message);
        enrichedScenes = parsedContent.scenes.map((s, idx) => ({
          ...s,
          sceneNumber: idx + 1,
          sortOrder: idx,
        }));
      }

      sceneStore.batchCreateScenes(
        pid,
        script.id,
        enrichedScenes.map((s, idx) => ({
          sceneNumber: s.sceneNumber || idx + 1,
          heading: s.heading || `Scene ${idx + 1}`,
          location: s.location || '',
          timeOfDay: s.timeOfDay || '',
          description: s.description || '',
          dialogue: s.dialogue || '',
          notes: s.notes || '',
          sortOrder: s.sortOrder ?? idx,
        }))
      );
    }

    // Update project title from script if it was 'Untitled'
    if (parsedContent.title && project.title === 'Untitled Project') {
      projectStore.updateProject(pid, { title: parsedContent.title });
    }

    const scenes = sceneStore.listScenesByProject(pid);

    res.status(201).json({
      script: {
        id: script.id,
        filename: script.filename,
        format: script.format,
        title: parsedContent.title,
        author: parsedContent.author,
        sceneCount: parsedContent.scenes?.length || 0,
      },
      scenes,
    });
  } catch (err) {
    console.error('Error uploading script:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getScript = (req, res) => {
  try {
    const { pid } = req.params;
    const script = scriptStore.getScriptByProject(pid);
    if (!script) return res.status(404).json({ error: 'No script found for this project' });
    // Include sceneCount from the scenes table, exclude heavy fields
    const scenes = sceneStore.listScenesByProject(pid);
    const { rawContent, parsedContent, ...lightweight } = script;
    res.json({ ...lightweight, sceneCount: scenes.length });
  } catch (err) {
    console.error('Error getting script:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteScript = (req, res) => {
  try {
    const { pid } = req.params;
    scriptStore.deleteScriptsByProject(pid);
    // Also delete scenes and shots that came from the script
    sceneStore.deleteScenesByProject(pid);
    res.json({ deleted: true });
  } catch (err) {
    console.error('Error deleting script:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Suggest characters and locations from the uploaded script using AI.
 * Returns enriched descriptions for user approval.
 */
exports.suggestEntities = async (req, res) => {
  try {
    const { pid } = req.params;
    const project = projectStore.getProject(pid);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const script = scriptStore.getScriptByProject(pid);
    if (!script) return res.status(404).json({ error: 'No script found. Upload a script first.' });

    // Parse parsedContent (stored as JSON string)
    let parsedContent;
    try {
      parsedContent = typeof script.parsedContent === 'string'
        ? JSON.parse(script.parsedContent)
        : script.parsedContent;
    } catch (e) {
      return res.status(500).json({ error: 'Could not parse script content' });
    }

    let characterNames = parsedContent.characters || [];
    let sceneCharacters = parsedContent.sceneCharacters || {};
    const scenes = parsedContent.scenes || [];
    const stylePrompt = project.style || '';

    // Fallback: if characters weren't extracted (old parsed data), extract from scene dialogue on-the-fly
    if (characterNames.length === 0 && scenes.length > 0) {
      console.log('[SuggestEntities] No characters in parsedContent, extracting from scene dialogue...');
      const NON_CHARACTER_WORDS = new Set([
        'FADE IN', 'FADE OUT', 'CUT TO', 'DISSOLVE TO', 'SMASH CUT',
        'TITLE CARD', 'SUPER', 'INTERCUT', 'CONTINUED', 'MORE',
        'CONT', 'MONTAGE', 'FLASHBACK', 'END', 'THE END',
        'SCENE', 'INT', 'EXT', 'ANGLE ON', 'CLOSE ON', 'BACK TO',
        'LATER', 'MOMENTS LATER', 'CONTINUOUS', 'SAME', 'NIGHT', 'DAY',
        'MORNING', 'EVENING', 'AFTERNOON', 'DAWN', 'DUSK',
        'V.O', 'O.S', 'O.C', 'CONT\'D', 'PRE-LAP',
        'SEGMENT TITLE', 'METADATA', 'TITLE PAGE',
      ]);

      const globalCharSet = new Set();
      const sceneCharsMap = {};

      scenes.forEach((scene, idx) => {
        const sceneChars = new Set();
        // Parse dialogue text for character names (ALL CAPS lines before dialogue)
        const dialogue = scene.dialogue || '';
        const description = scene.description || '';
        const combinedText = dialogue + '\n' + description;

        const lines = combinedText.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          let candidate = null;

          // Pattern 1: Standalone ALL CAPS line (classic screenplay format)
          // Strip parenthetical extensions like (V.O.), (O.S.), (CONT'D)
          const cleaned = trimmed.replace(/\s*\(.*?\)\s*$/, '').trim();
          if (cleaned.length >= 2 && cleaned.length <= 30 && /^[A-Z][A-Z\s.'-]+$/.test(cleaned)) {
            candidate = cleaned;
          }

          // Pattern 2: "CHARNAME:" or "CHARNAME (desc):" at start of line (inline dialogue)
          if (!candidate) {
            const inlineMatch = trimmed.match(/^([A-Z][A-Z\s.'-]{1,28}?)\s*(?:\(.*?\))?\s*:/);
            if (inlineMatch) {
              candidate = inlineMatch[1].trim();
            }
          }

          if (candidate && candidate.length >= 2) {
            const upper = candidate.toUpperCase();
            if (!NON_CHARACTER_WORDS.has(upper) && !upper.startsWith('FADE') && !upper.startsWith('CUT')
                && !upper.startsWith('CLOSE') && !upper.startsWith('VISUAL') && !upper.startsWith('LOGO')
                && !upper.startsWith('END') && !upper.startsWith('VOICEOVER') && upper !== 'SUPER'
                && upper !== 'DURATION' && upper !== 'STRESS' && upper !== 'HUMOR' && upper !== 'WOW'
                && upper !== 'WARMTH' && upper !== 'FORMAT' && upper !== 'LANGUAGE' && upper !== 'SETTING'
                && upper !== 'CHARACTERS' && upper !== 'DATE' && upper !== 'STATUS') {
              sceneChars.add(candidate);
              globalCharSet.add(candidate);
            }
          }
        }
        if (sceneChars.size > 0) {
          sceneCharsMap[idx] = [...sceneChars];
        }
      });

      characterNames = [...globalCharSet];
      sceneCharacters = sceneCharsMap;
      console.log(`[SuggestEntities] Extracted ${characterNames.length} characters: ${characterNames.join(', ')}`);

      // Update parsedContent in DB so we don't have to re-extract next time
      try {
        parsedContent.characters = characterNames;
        parsedContent.sceneCharacters = sceneCharacters;
        const updateStmt = require('../db/connection').prepare(
          'UPDATE scripts SET parsedContent = ? WHERE projectId = ?'
        );
        updateStmt.run(JSON.stringify(parsedContent), pid);
        console.log('[SuggestEntities] Updated parsedContent with extracted characters');
      } catch (e) {
        console.warn('[SuggestEntities] Failed to update parsedContent:', e.message);
      }
    }

    console.log(`[SuggestEntities] Found ${characterNames.length} characters in script: ${characterNames.join(', ')}`);

    // Run character and location suggestions in parallel
    const [suggestedCharacters, suggestedLocations] = await Promise.all([
      suggestCharactersFromScript(characterNames, scenes, sceneCharacters, stylePrompt),
      suggestLocationsFromScript(scenes, stylePrompt),
    ]);

    res.json({
      suggestedCharacters,
      suggestedLocations,
      scriptCharacters: characterNames,
      sceneCharacterMap: sceneCharacters,
    });
  } catch (err) {
    console.error('Error suggesting entities:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Generate a full screenplay from a story concept using AI.
 * Fire-and-forget — response streams via Socket.IO 'script:generate' events.
 */
exports.generateScript = async (req, res) => {
  try {
    const { pid } = req.params;
    const project = projectStore.getProject(pid);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { prompt, genre, tone, length } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    // Fire and forget — response comes via Socket.IO
    generateFullScreenplay(pid, { prompt, genre, tone, length }).catch((err) => {
      console.error(`[ScriptGen] Background screenplay generation failed for project ${pid}:`, err.message);
    });
    res.json({ status: 'started', message: 'Streaming screenplay via Socket.IO script:generate events' });
  } catch (err) {
    console.error('Error starting script generation:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Save raw screenplay text and parse it into scenes.
 * Same pipeline as uploadScript but accepts text from the request body.
 */
exports.saveScriptText = async (req, res) => {
  try {
    const { pid } = req.params;
    const project = projectStore.getProject(pid);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { text, title } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'text is required' });

    const buffer = Buffer.from(text, 'utf-8');
    const format = 'txt';
    const filename = `${title || 'AI Generated Script'}.txt`;

    // Parse the script using existing parser
    const parsedContent = await parseScript(buffer, format, filename);

    // Override title if provided
    if (title) {
      parsedContent.title = title;
    }

    // Delete existing scripts for this project (one script per project)
    scriptStore.deleteScriptsByProject(pid);
    sceneStore.deleteScenesByProject(pid);

    // Save script
    const script = scriptStore.createScript({
      projectId: pid,
      filename,
      format,
      rawContent: text.substring(0, 100000),
      parsedContent,
    });

    // Auto-create scenes from parsed content
    if (parsedContent.scenes && parsedContent.scenes.length > 0) {
      let enrichedScenes;
      try {
        enrichedScenes = await breakdownScenes(parsedContent.scenes, project.style);
      } catch (err) {
        console.error('AI scene breakdown failed, using raw scenes:', err.message);
        enrichedScenes = parsedContent.scenes.map((s, idx) => ({
          ...s,
          sceneNumber: idx + 1,
          sortOrder: idx,
        }));
      }

      sceneStore.batchCreateScenes(
        pid,
        script.id,
        enrichedScenes.map((s, idx) => ({
          sceneNumber: s.sceneNumber || idx + 1,
          heading: s.heading || `Scene ${idx + 1}`,
          location: s.location || '',
          timeOfDay: s.timeOfDay || '',
          description: s.description || '',
          dialogue: s.dialogue || '',
          notes: s.notes || '',
          sortOrder: s.sortOrder ?? idx,
        }))
      );
    }

    // Update project title from script if it was 'Untitled'
    if (parsedContent.title && project.title === 'Untitled Project') {
      projectStore.updateProject(pid, { title: parsedContent.title });
    }

    const scenes = sceneStore.listScenesByProject(pid);

    res.status(201).json({
      script: {
        id: script.id,
        filename: script.filename,
        format: script.format,
        title: parsedContent.title,
        author: parsedContent.author,
        sceneCount: parsedContent.scenes?.length || 0,
      },
      scenes,
    });
  } catch (err) {
    console.error('Error saving script text:', err);
    res.status(500).json({ error: err.message });
  }
};
