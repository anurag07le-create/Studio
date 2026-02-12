/**
 * sceneBreakdownService.js — AI-powered scene analysis and shot generation
 * Uses Gemini to break down scenes into actionable shot lists
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');

const retry = async (fn, attempts = 2, delayMs = 400) => {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastErr;
};

/**
 * Generate a shot list from a scene.
 * @param {Object} scene - { heading, location, timeOfDay, description, dialogue }
 * @param {string} style - Visual style description
 * @param {number} [shotsPerScene=3] - Number of shots to generate
 * @param {string} [projectContext] - Optional project-level context (title, other scenes)
 * @param {Array} [sceneCharacters=[]] - Characters that appear in this scene (from scene_characters table)
 * @returns {Promise<Array>} Array of shot objects
 */
async function generateShotList(scene, style, shotsPerScene = 3, projectContext = '', sceneCharacters = []) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_TEXT_MODEL || 'gemini-3-pro-preview';

  if (!apiKey || apiKey.trim() === '' || apiKey.startsWith('your_')) {
    return _fallbackShots(scene, shotsPerScene);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const gemini = genAI.getGenerativeModel({ model });

  const sceneText = [
    scene.heading && `Scene Heading: ${scene.heading}`,
    scene.location && `Location: ${scene.location}`,
    scene.timeOfDay && `Time: ${scene.timeOfDay}`,
    scene.description && `Action/Description:\n${scene.description}`,
    scene.dialogue && `Dialogue:\n${scene.dialogue}`,
    scene.notes && `Notes:\n${scene.notes}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  // Build character context if available
  const charContext = sceneCharacters.length > 0
    ? `\nSCENE CHARACTERS:\n${sceneCharacters.map(c => {
        const desc = c.description ? ` - ${c.description}` : '';
        return `- ${c.name}${desc}`;
      }).join('\n')}\n`
    : '';

  const charInstruction = sceneCharacters.length > 0
    ? `\n- For each shot, include a "characters" field (array of character names from the scene characters list) indicating which characters are visible in that shot.
- The "heroSubject" in shot 1 must describe the PRIMARY character in detail using the character descriptions above.`
    : `\n- Shot 1 MUST include a "heroSubject" field with detailed character description.`;

  const charJsonField = sceneCharacters.length > 0
    ? `\n    "characters": ["CharName1", "CharName2"],`
    : '';

  const prompt = `
Role: Expert cinematographer and storyboard artist.
Task: Break down the following screenplay scene into exactly ${shotsPerScene} cinematic shots.

${projectContext ? `Project Context: ${projectContext}\n` : ''}
Visual Style: ${style || 'Cinematic, professional lighting, high production value'}

SCENE:
${sceneText}
${charContext}
For each shot, provide:
1. A detailed image generation prompt (English, safe content, no text/captions)
2. Description of camera angle and movement
3. Suggested duration (4, 6, or 8 seconds)
4. Brief shot description
5. 2-3 sentence narrative of the shot's role in the scene
6. Mood/atmosphere keyword

IMPORTANT:
- Shots must flow sequentially and tell the scene's story
- Maintain visual consistency across shots
- Include camera angles: wide, medium, close-up, over-the-shoulder, etc.
- Include camera movements: pan, tilt, dolly, tracking, static, etc.${charInstruction}

Output ONLY a raw JSON array (no markdown fences):
[
  {
    "shotNumber": 1,
    "prompt": "Detailed image generation prompt...",
    "description": "Brief shot description",
    "shotStory": "2-3 sentence narrative...",
    "cameraAngle": "wide/medium/close-up/etc",
    "cameraMovement": "static/pan left/dolly in/etc",
    "duration": 6,
    "mood": "tense/calm/joyful/etc",${charJsonField}
    "heroSubject": "Only in shot 1 - detailed character description..."
  }
]
`;

  try {
    const result = await retry(() => gemini.generateContent(prompt));
    const response = await result.response;
    let text = response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const shots = JSON.parse(text);
    if (!Array.isArray(shots) || shots.length === 0) {
      throw new Error('Invalid response: not an array of shots');
    }

    // Normalize
    return shots.map((s, idx) => ({
      shotNumber: s.shotNumber || idx + 1,
      prompt: s.prompt || '',
      description: s.description || `Shot ${idx + 1}`,
      shotStory: s.shotStory || '',
      cameraAngle: s.cameraAngle || 'medium',
      cameraMovement: s.cameraMovement || 'static',
      duration: [4, 6, 8].includes(s.duration) ? s.duration : 6,
      mood: s.mood || '',
      heroSubject: idx === 0 ? (s.heroSubject || '') : undefined,
      characters: Array.isArray(s.characters) ? s.characters : [],
    }));
  } catch (err) {
    console.error('Error generating shot list:', err.message);
    return _fallbackShots(scene, shotsPerScene);
  }
}

/**
 * Use AI to break down raw parsed scenes (enrich with analysis).
 * @param {Array} scenes - Array of raw parsed scene objects
 * @param {string} style - Visual style
 * @returns {Promise<Array>} Enriched scene objects
 */
async function breakdownScenes(scenes, style) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_TEXT_MODEL || 'gemini-3-pro-preview';

  if (!apiKey || apiKey.trim() === '' || apiKey.startsWith('your_')) {
    // No AI available — return scenes as-is with basic numbering
    return scenes.map((s, idx) => ({
      ...s,
      sceneNumber: idx + 1,
      sortOrder: idx,
    }));
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const gemini = genAI.getGenerativeModel({ model });

  const sceneSummaries = scenes
    .map(
      (s, i) =>
        `Scene ${i + 1}:\n  Heading: ${s.heading || 'N/A'}\n  Location: ${s.location || 'N/A'}\n  Time: ${s.timeOfDay || 'N/A'}\n  Description: ${(s.description || '').substring(0, 300)}...\n  Dialogue: ${(s.dialogue || '').substring(0, 200)}...`
    )
    .join('\n\n');

  const prompt = `
Role: Script supervisor and story analyst.
Task: Analyze the following ${scenes.length} screenplay scenes and provide enriched metadata for each.

SCENES:
${sceneSummaries}

For each scene, provide:
1. A cleaned-up heading (fix formatting if needed)
2. Identified location
3. Time of day
4. A concise 1-2 sentence description of the scene's purpose
5. Any notes about mood, pacing, or production

Output ONLY a raw JSON array (no markdown fences):
[
  {
    "sceneNumber": 1,
    "heading": "INT. COFFEE SHOP - NIGHT",
    "location": "Coffee Shop",
    "timeOfDay": "Night",
    "description": "Brief scene purpose...",
    "notes": "Production notes..."
  }
]
`;

  try {
    const result = await retry(() => gemini.generateContent(prompt));
    const response = await result.response;
    let text = response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const enriched = JSON.parse(text);
    if (!Array.isArray(enriched)) throw new Error('Not an array');

    // Merge AI enrichment with original scene data
    return scenes.map((original, idx) => {
      const ai = enriched[idx] || {};
      return {
        heading: ai.heading || original.heading,
        location: ai.location || original.location,
        timeOfDay: ai.timeOfDay || original.timeOfDay,
        description: original.description, // keep original full description
        dialogue: original.dialogue,
        notes: ai.notes || original.notes,
        sceneNumber: ai.sceneNumber || idx + 1,
        sortOrder: idx,
      };
    });
  } catch (err) {
    console.error('Error breaking down scenes:', err.message);
    return scenes.map((s, idx) => ({
      ...s,
      sceneNumber: idx + 1,
      sortOrder: idx,
    }));
  }
}

function _fallbackShots(scene, count) {
  const shots = [];
  for (let i = 0; i < count; i++) {
    shots.push({
      shotNumber: i + 1,
      prompt: `${scene.heading || 'Scene'} - Shot ${i + 1}. ${(scene.description || '').substring(0, 200)}`,
      description: `Shot ${i + 1} of ${scene.heading || 'scene'}`,
      shotStory: '',
      cameraAngle: i === 0 ? 'wide' : i === count - 1 ? 'close-up' : 'medium',
      cameraMovement: 'static',
      duration: 6,
      mood: '',
      heroSubject: i === 0 ? 'Main character' : undefined,
    });
  }
  return shots;
}

module.exports = { generateShotList, breakdownScenes };
