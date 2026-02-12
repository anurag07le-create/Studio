/**
 * characterSuggestionService.js — AI-powered character & location suggestion from scripts
 * Analyzes parsed script data and generates rich character/location descriptions using Gemini
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');

const retry = async (fn, attempts = 2, delayMs = 500) => {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
};

/**
 * Suggest characters from a parsed script with AI-enriched descriptions and traits.
 * @param {string[]} characterNames - Character names extracted from dialogue
 * @param {Array} scenes - Parsed scene objects
 * @param {Object} sceneCharacters - Map of sceneIndex → [charNames]
 * @param {string} stylePrompt - Visual style description for the project
 * @returns {Promise<Array>} Array of suggested character objects
 */
async function suggestCharactersFromScript(characterNames, scenes, sceneCharacters = {}, stylePrompt = '') {
  if (!characterNames || characterNames.length === 0) {
    return [];
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_TEXT_MODEL || 'gemini-3-pro-preview';

  if (!apiKey || apiKey.trim() === '' || apiKey.startsWith('your_')) {
    // No AI — return basic suggestions from names
    return characterNames.map(name => ({
      name,
      description: '',
      traits: {},
      appearsInScenes: _findScenesForCharacter(name, sceneCharacters),
    }));
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const gemini = genAI.getGenerativeModel({ model });

  // Build scene summaries (capped for token efficiency)
  const sceneSummaries = scenes.map((s, i) => {
    const chars = sceneCharacters[i] ? sceneCharacters[i].join(', ') : 'none detected';
    return `Scene ${i + 1}: ${s.heading || 'Untitled'}\n  Characters: ${chars}\n  Description: ${(s.description || '').substring(0, 200)}\n  Dialogue: ${(s.dialogue || '').substring(0, 200)}`;
  }).join('\n\n');

  const prompt = `
Role: Expert script supervisor and character analyst.
Task: Analyze the following screenplay and provide detailed character descriptions for each detected character.

DETECTED CHARACTER NAMES: ${characterNames.join(', ')}

SCREENPLAY SCENES:
${sceneSummaries}

${stylePrompt ? `VISUAL STYLE: ${stylePrompt}` : ''}

For each character, provide:
1. Full name (cleaned from the ALL-CAPS version)
2. A detailed physical appearance description (2-3 sentences) suitable for image generation
3. Character traits as structured JSON for visual consistency
4. List of scene indices (0-based) where the character appears

Output ONLY a raw JSON array (no markdown fences):
[
  {
    "name": "Character Name",
    "description": "Detailed physical appearance description...",
    "traits": {
      "hair": "Color, style, length",
      "skin": "Skin tone",
      "build": "Body type, height",
      "clothing": "Typical outfit",
      "age_range": "Estimated age range",
      "distinguishing_features": "Unique visual features"
    },
    "appearsInScenes": [0, 2, 5]
  }
]

IMPORTANT:
- Focus on VISUAL/PHYSICAL descriptions, not personality traits
- Descriptions should be consistent and specific enough for AI image generation
- Include ALL detected characters, even minor ones
- Use the scene context to infer appearance details
`;

  try {
    const result = await retry(() => gemini.generateContent(prompt));
    const response = await result.response;
    let text = response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const suggestions = JSON.parse(text);
    if (!Array.isArray(suggestions)) throw new Error('Not an array');

    // Merge with detected scene appearances
    return suggestions.map(s => ({
      name: s.name || 'Unknown',
      description: s.description || '',
      traits: s.traits || {},
      appearsInScenes: s.appearsInScenes || _findScenesForCharacter(s.name, sceneCharacters),
    }));
  } catch (err) {
    console.error('Error suggesting characters:', err.message);
    // Fallback: return basic suggestions
    return characterNames.map(name => ({
      name: _titleCase(name),
      description: '',
      traits: {},
      appearsInScenes: _findScenesForCharacter(name, sceneCharacters),
    }));
  }
}

/**
 * Suggest locations from parsed scenes with AI-enriched descriptions.
 * @param {Array} scenes - Parsed scene objects
 * @param {string} stylePrompt - Visual style description
 * @returns {Promise<Array>} Array of suggested location objects
 */
async function suggestLocationsFromScript(scenes, stylePrompt = '') {
  // Deduplicate locations
  const locationMap = {}; // name → { sceneIndices }
  scenes.forEach((scene, idx) => {
    const loc = (scene.location || '').trim();
    if (!loc) return;
    const key = loc.toUpperCase();
    if (!locationMap[key]) {
      locationMap[key] = { name: loc, sceneIndices: [] };
    }
    locationMap[key].sceneIndices.push(idx);
  });

  const uniqueLocations = Object.values(locationMap);
  if (uniqueLocations.length === 0) return [];

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_TEXT_MODEL || 'gemini-3-pro-preview';

  if (!apiKey || apiKey.trim() === '' || apiKey.startsWith('your_')) {
    return uniqueLocations.map(loc => ({
      name: _titleCase(loc.name),
      description: '',
      traits: {},
      appearsInScenes: loc.sceneIndices,
    }));
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const gemini = genAI.getGenerativeModel({ model });

  // Build scene context for locations
  const locationContext = uniqueLocations.map(loc => {
    const sceneSamples = loc.sceneIndices.slice(0, 3).map(idx => {
      const s = scenes[idx];
      const intExt = s.heading?.match(/^\s*(INT|EXT|INT\/EXT)/i)?.[1] || '';
      const time = s.timeOfDay || '';
      return `${intExt}. ${loc.name} - ${time}: ${(s.description || '').substring(0, 150)}`;
    }).join('\n  ');
    return `Location: ${loc.name} (appears in ${loc.sceneIndices.length} scenes)\n  ${sceneSamples}`;
  }).join('\n\n');

  const prompt = `
Role: Expert production designer and location scout.
Task: Provide detailed visual descriptions for each unique location in this screenplay.

LOCATIONS:
${locationContext}

${stylePrompt ? `VISUAL STYLE: ${stylePrompt}` : ''}

For each location, provide:
1. A clean name
2. A detailed visual description (2-3 sentences) suitable for AI image generation
3. Environment traits as structured JSON
4. List of scene indices (0-based) where it appears

Output ONLY a raw JSON array (no markdown fences):
[
  {
    "name": "Coffee Shop",
    "description": "A cozy neighborhood coffee shop with exposed brick walls...",
    "traits": {
      "architecture": "Style, materials, size",
      "lighting": "Natural/artificial, quality",
      "color_palette": "Dominant colors",
      "atmosphere": "Mood, energy",
      "props": "Notable objects, furniture"
    },
    "appearsInScenes": [0, 4]
  }
]

IMPORTANT:
- Focus on VISUAL descriptions, not story significance
- Make descriptions specific enough for consistent AI image generation
- Maintain INT/EXT context in the description
`;

  try {
    const result = await retry(() => gemini.generateContent(prompt));
    const response = await result.response;
    let text = response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const suggestions = JSON.parse(text);
    if (!Array.isArray(suggestions)) throw new Error('Not an array');

    return suggestions.map((s, i) => ({
      name: s.name || uniqueLocations[i]?.name || 'Unknown',
      description: s.description || '',
      traits: s.traits || {},
      appearsInScenes: s.appearsInScenes || uniqueLocations[i]?.sceneIndices || [],
    }));
  } catch (err) {
    console.error('Error suggesting locations:', err.message);
    return uniqueLocations.map(loc => ({
      name: _titleCase(loc.name),
      description: '',
      traits: {},
      appearsInScenes: loc.sceneIndices,
    }));
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function _findScenesForCharacter(name, sceneCharacters) {
  const results = [];
  const upperName = name.toUpperCase();
  for (const [idx, chars] of Object.entries(sceneCharacters)) {
    if (chars.some(c => c.toUpperCase() === upperName)) {
      results.push(parseInt(idx));
    }
  }
  return results;
}

function _titleCase(str) {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

module.exports = {
  suggestCharactersFromScript,
  suggestLocationsFromScript,
};
