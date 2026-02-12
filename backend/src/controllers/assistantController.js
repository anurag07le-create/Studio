/**
 * assistantController.js — AI writing assistant endpoints
 */
const { generateScreenplay, improveDialogue, suggestCameraMovement } = require('../services/writingAssistantService');
const db = require('../db/connection');

exports.startWriting = async (req, res) => {
  try {
    const { prompt, context, existingText } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    // Fire and forget — response comes via Socket.IO
    generateScreenplay(req.params.pid, { prompt, context, existingText });
    res.json({ status: 'started', message: 'Streaming response via Socket.IO' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.improveDialogueHandler = async (req, res) => {
  try {
    const { sceneDescription, dialogue, style } = req.body;
    if (!sceneDescription) return res.status(400).json({ error: 'sceneDescription is required' });

    improveDialogue(req.params.pid, { sceneDescription, dialogue, style });
    res.json({ status: 'started', message: 'Streaming response via Socket.IO' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.suggestCamera = async (req, res) => {
  try {
    const { shotDescription, sceneContext } = req.body;
    if (!shotDescription) return res.status(400).json({ error: 'shotDescription is required' });

    const suggestion = await suggestCameraMovement(shotDescription, sceneContext);
    res.json(suggestion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCameraPresets = (req, res) => {
  try {
    const presets = db.prepare('SELECT * FROM camera_presets ORDER BY name').all();
    res.json(presets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
