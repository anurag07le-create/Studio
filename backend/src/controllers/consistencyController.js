/**
 * consistencyController.js
 * Handles character refs, location refs, and style lock CRUD + AI operations
 */
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const characterRefStore = require('../services/characterRefStore');
const locationRefStore = require('../services/locationRefStore');
const styleLockStore = require('../services/styleLockStore');
const sceneCharacterStore = require('../services/sceneCharacterStore');
const { generateReferenceSheet, generateRefSheetFromImage, extractCharacterFromScene } = require('../services/characterConsistencyService');
const { analyzeStyleFromImage, getStylePreset, listStylePresets } = require('../services/styleAnalysisService');

// ═══════════════════════ CHARACTER REFS ═══════════════════════

exports.listCharacters = (req, res) => {
  try {
    const characters = characterRefStore.listByProject(req.params.pid);
    res.json(characters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCharacter = (req, res) => {
  try {
    const character = characterRefStore.getById(req.params.charId);
    if (!character) return res.status(404).json({ error: 'Character not found' });
    res.json(character);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createCharacter = (req, res) => {
  try {
    const { name, description, traits } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const character = characterRefStore.create({
      projectId: req.params.pid,
      name,
      description,
      traits,
    });
    res.status(201).json(character);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateCharacter = (req, res) => {
  try {
    const updated = characterRefStore.update(req.params.charId, req.body);
    if (!updated) return res.status(404).json({ error: 'Character not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteCharacter = (req, res) => {
  try {
    characterRefStore.remove(req.params.charId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.generateRefSheet = async (req, res) => {
  try {
    const character = characterRefStore.getById(req.params.charId);
    if (!character) return res.status(404).json({ error: 'Character not found' });

    const styleLock = styleLockStore.getByProject(req.params.pid);
    const stylePrompt = styleLock?.stylePrompt || '';

    let refImageUrl;
    // If character has an uploaded image, use it as reference for the turnaround sheet
    if (character.uploadedImageUrl) {
      const imagePath = path.join(__dirname, '../../data', character.uploadedImageUrl.replace(/^\//, ''));
      if (fs.existsSync(imagePath)) {
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
        refImageUrl = await generateRefSheetFromImage(character, base64Image, mimeType, stylePrompt);
      }
    }

    // Fallback to text-only generation
    if (!refImageUrl) {
      refImageUrl = await generateReferenceSheet(character, stylePrompt);
    }

    if (!refImageUrl) {
      return res.status(500).json({ error: 'Failed to generate reference sheet' });
    }

    const updated = characterRefStore.update(character.id, { referenceImageUrl: refImageUrl });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.uploadCharacterImage = async (req, res) => {
  try {
    const { charId } = req.params;
    const character = characterRefStore.getById(charId);
    if (!character) return res.status(404).json({ error: 'Character not found' });

    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded. Send a file with field name "image".' });
    }

    // Save file to disk
    const ext = path.extname(req.file.originalname).toLowerCase() || '.png';
    const filename = `${uuidv4()}${ext}`;
    const uploadDir = path.join(__dirname, '../../data/character-uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, req.file.buffer);

    const uploadedImageUrl = `/character-uploads/${filename}`;
    const updated = characterRefStore.update(charId, { uploadedImageUrl });
    res.json(updated);
  } catch (err) {
    console.error('Error uploading character image:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Advanced prompt-based image generation with full Gemini settings
 */
exports.generateImageAdvanced = async (req, res) => {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey.startsWith('your_')) {
      return res.status(500).json({ error: 'No valid GEMINI_API_KEY configured' });
    }

    const {
      prompt,
      negativePrompt,
      // Image config
      aspectRatio = '1:1',
      imageSize = '1K',
      personGeneration = 'allow_adult',
      // Generation config
      temperature,
      topP,
      topK,
      seed,
      // Model selection
      model: modelName,
      // Reference image (base64)
      referenceImageBase64,
      referenceImageMimeType = 'image/jpeg',
      // Character context
      charId,
      // Safety
      safetyLevel = 'default',
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    // Build the full prompt with character context if charId provided
    let fullPrompt = prompt;
    if (charId) {
      const character = characterRefStore.getById(charId);
      if (character) {
        const traitsDesc = character.traits
          ? Object.entries(character.traits).filter(([_, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ')
          : '';
        fullPrompt = `Character: ${character.name}. ${character.description || ''} ${traitsDesc ? `(${traitsDesc})` : ''}\n\n${prompt}`;
      }
    }

    // Add negative prompt if provided
    if (negativePrompt) {
      fullPrompt += `\n\nDO NOT include: ${negativePrompt}`;
    }

    // Add style lock context if exists
    const styleLock = styleLockStore.getByProject(req.params.pid);
    if (styleLock?.stylePrompt) {
      fullPrompt = `Art style: ${styleLock.stylePrompt}.\n\n${fullPrompt}`;
    }

    const selectedModel = modelName || process.env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview';
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: selectedModel });

    // Build generation config
    // Note: personGeneration is only valid for the Imagen generateImages API,
    // NOT for the Gemini generateContent API.
    // imageSize is only supported by gemini-3-pro-image-preview, not gemini-2.5-flash-image.
    const imageConfig = { aspectRatio };
    if (selectedModel.includes('3-pro') && imageSize) {
      imageConfig.imageSize = imageSize;
    }

    const generationConfig = {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig,
    };

    // Add optional sampling params
    if (temperature !== undefined && temperature !== null) generationConfig.temperature = parseFloat(temperature);
    if (topP !== undefined && topP !== null) generationConfig.topP = parseFloat(topP);
    if (topK !== undefined && topK !== null) generationConfig.topK = parseInt(topK);
    if (seed !== undefined && seed !== null) generationConfig.seed = parseInt(seed);

    // Build safety settings
    const safetySettings = [];
    const categories = [
      'HARM_CATEGORY_HATE_SPEECH',
      'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      'HARM_CATEGORY_DANGEROUS_CONTENT',
      'HARM_CATEGORY_HARASSMENT',
    ];
    if (safetyLevel !== 'default') {
      const thresholdMap = {
        strict: 'BLOCK_LOW_AND_ABOVE',
        moderate: 'BLOCK_MEDIUM_AND_ABOVE',
        lenient: 'BLOCK_ONLY_HIGH',
        off: 'OFF',
      };
      const threshold = thresholdMap[safetyLevel] || 'BLOCK_MEDIUM_AND_ABOVE';
      categories.forEach(category => {
        safetySettings.push({ category, threshold });
      });
    }

    // Build content parts
    const parts = [];
    if (referenceImageBase64) {
      parts.push({
        inlineData: {
          mimeType: referenceImageMimeType,
          data: referenceImageBase64,
        },
      });
    }
    parts.push({ text: fullPrompt });

    const requestBody = {
      contents: [{ role: 'user', parts }],
      generationConfig,
    };
    if (safetySettings.length > 0) {
      requestBody.safetySettings = safetySettings;
    }

    console.log(`[AdvancedGen] Model: ${selectedModel}, Aspect: ${aspectRatio}, Size: ${imageSize}, Temp: ${temperature || 'default'}`);

    const result = await model.generateContent(requestBody);

    const candidates = result?.response?.candidates || [];
    const images = [];
    let responseText = '';

    for (const candidate of candidates) {
      const candidateParts = candidate.content?.parts || [];
      for (const part of candidateParts) {
        if (part.inlineData?.data) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          images.push(`data:${mimeType};base64,${part.inlineData.data}`);
        }
        if (part.text) {
          responseText += part.text;
        }
      }
    }

    if (images.length === 0) {
      // Check for safety blocks
      const blockReason = result?.response?.promptFeedback?.blockReason;
      if (blockReason) {
        return res.status(422).json({ error: `Generation blocked: ${blockReason}. Try adjusting your prompt or safety settings.` });
      }
      return res.status(500).json({ error: 'No images were generated. Try a different prompt.' });
    }

    // If charId provided, save the first image as the character's uploaded image
    if (charId && images[0]) {
      const base64Data = images[0].split(',')[1];
      const mimeMatch = images[0].match(/data:image\/(.*?);/);
      const ext = mimeMatch ? `.${mimeMatch[1].replace('jpeg', 'jpg')}` : '.png';
      const filename = `${uuidv4()}${ext}`;
      const uploadDir = path.join(__dirname, '../../data/character-uploads');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(path.join(uploadDir, filename), Buffer.from(base64Data, 'base64'));
      characterRefStore.update(charId, { uploadedImageUrl: `/character-uploads/${filename}` });
    }

    res.json({
      images,
      text: responseText,
      model: selectedModel,
      settings: { aspectRatio, imageSize, personGeneration, temperature, topP, topK, seed },
    });
  } catch (err) {
    console.error('Error in advanced image generation:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.extractCharacter = async (req, res) => {
  try {
    const { sceneDescription, characterName } = req.body;
    if (!sceneDescription || !characterName) {
      return res.status(400).json({ error: 'sceneDescription and characterName are required' });
    }
    const extracted = await extractCharacterFromScene(sceneDescription, characterName);
    res.json(extracted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ═══════════════════════ LOCATION REFS ═══════════════════════

exports.listLocations = (req, res) => {
  try {
    const locations = locationRefStore.listByProject(req.params.pid);
    res.json(locations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getLocation = (req, res) => {
  try {
    const location = locationRefStore.getById(req.params.locId);
    if (!location) return res.status(404).json({ error: 'Location not found' });
    res.json(location);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createLocation = (req, res) => {
  try {
    const { name, description, traits } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const location = locationRefStore.create({
      projectId: req.params.pid,
      name,
      description,
      traits,
    });
    res.status(201).json(location);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateLocation = (req, res) => {
  try {
    const updated = locationRefStore.update(req.params.locId, req.body);
    if (!updated) return res.status(404).json({ error: 'Location not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteLocation = (req, res) => {
  try {
    locationRefStore.remove(req.params.locId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ═══════════════════════ STYLE LOCK ═══════════════════════

exports.getStyleLock = (req, res) => {
  try {
    const styleLock = styleLockStore.getByProject(req.params.pid);
    res.json(styleLock || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.setStyleLock = (req, res) => {
  try {
    const { styleName, stylePrompt, presetId, referenceImageUrl, extractedTraits } = req.body;

    // If a preset is selected, use its data
    if (presetId) {
      const preset = getStylePreset(presetId);
      if (!preset) return res.status(400).json({ error: `Unknown preset: ${presetId}` });
      const styleLock = styleLockStore.create({
        projectId: req.params.pid,
        styleName: preset.styleName,
        stylePrompt: preset.stylePrompt,
        extractedTraits: preset.extractedTraits,
      });
      return res.json(styleLock);
    }

    // Custom style
    if (!styleName || !stylePrompt) {
      return res.status(400).json({ error: 'styleName and stylePrompt are required (or use presetId)' });
    }
    const styleLock = styleLockStore.create({
      projectId: req.params.pid,
      styleName,
      stylePrompt,
      referenceImageUrl,
      extractedTraits,
    });
    res.json(styleLock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateStyleLock = (req, res) => {
  try {
    const styleLock = styleLockStore.getByProject(req.params.pid);
    if (!styleLock) return res.status(404).json({ error: 'No style lock set for this project' });
    const updated = styleLockStore.update(styleLock.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.removeStyleLock = (req, res) => {
  try {
    styleLockStore.remove(req.params.pid);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.analyzeStyle = async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 is required' });
    const analysis = await analyzeStyleFromImage(imageBase64);
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStylePresets = (req, res) => {
  res.json(listStylePresets());
};

// ═══════════════════════ BATCH OPERATIONS ═══════════════════════

/**
 * Batch create characters and locations from AI suggestions.
 * After creation, auto-maps characters/locations to scenes.
 */
exports.batchCreateFromSuggestions = (req, res) => {
  try {
    const { pid } = req.params;
    const { characters = [], locations = [] } = req.body;

    const createdCharacters = [];
    for (const char of characters) {
      const created = characterRefStore.create({
        projectId: pid,
        name: char.name,
        description: char.description || '',
        traits: char.traits || {},
      });
      createdCharacters.push(created);
    }

    const createdLocations = [];
    for (const loc of locations) {
      const created = locationRefStore.create({
        projectId: pid,
        name: loc.name,
        description: loc.description || '',
        traits: loc.traits || {},
      });
      createdLocations.push(created);
    }

    // Auto-map characters and locations to scenes
    let charMappings = { mapped: 0 };
    let locMappings = { mapped: 0 };
    try {
      charMappings = sceneCharacterStore.autoMapCharactersToScenes(pid);
      locMappings = sceneCharacterStore.autoMapLocationsToScenes(pid);
    } catch (err) {
      console.error('Auto-mapping warning:', err.message);
    }

    console.log(`[BatchCreate] Created ${createdCharacters.length} characters, ${createdLocations.length} locations. Mapped: ${charMappings.mapped} char-scenes, ${locMappings.mapped} loc-scenes`);

    res.json({
      characters: createdCharacters,
      locations: createdLocations,
      mappings: {
        characterScenes: charMappings.mapped,
        locationScenes: locMappings.mapped,
      },
    });
  } catch (err) {
    console.error('Error in batch create:', err);
    res.status(500).json({ error: err.message });
  }
};
