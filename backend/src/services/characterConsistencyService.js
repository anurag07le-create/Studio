/**
 * characterConsistencyService.js
 * AI-powered character consistency: reference sheet generation, consistency prompts
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');

const getModel = (modelName) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.startsWith('your_')) {
    throw new Error('No valid GEMINI_API_KEY found');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName || process.env.GEMINI_TEXT_MODEL || 'gemini-3-pro-preview' });
};

/**
 * Generate a character reference sheet image (multi-view turnaround)
 * Returns a base64 data URL of the reference sheet
 */
async function generateReferenceSheet(character, stylePrompt = '') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.startsWith('your_')) {
    return null;
  }

  const imageModel = process.env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview';
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: imageModel });

  const traitsDesc = character.traits
    ? Object.entries(character.traits)
        .filter(([_, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
    : '';

  const prompt = `
    Role: Character design artist creating a reference sheet.
    Task: Create a character reference sheet showing the same character from 3 angles:
    front view (center), 3/4 view (left), and side profile (right).
    All three views must show the EXACT SAME character with identical features.

    Character: ${character.name}
    Description: ${character.description || 'No additional description'}
    ${traitsDesc ? `Physical traits: ${traitsDesc}` : ''}
    ${stylePrompt ? `Art style: ${stylePrompt}` : 'Art style: Clean digital illustration, character design sheet'}

    Layout: Three views side by side on a clean white/light gray background.
    Label each view. Professional character sheet format.
    Constraints: no text overlays except view labels, clean composition, full body visible in all views.
  `;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: { aspectRatio: '16:9' },
      },
    });

    const candidates = result?.response?.candidates || [];
    for (const candidate of candidates) {
      const parts = candidate.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          return `data:${mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
  } catch (err) {
    console.error('Error generating reference sheet:', err.message);
  }
  return null;
}

/**
 * Generate a character reference sheet from an uploaded reference image
 * Uses the image as the basis for a multi-view turnaround sheet
 */
async function generateRefSheetFromImage(character, base64Image, mimeType = 'image/jpeg', stylePrompt = '') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.startsWith('your_')) {
    return null;
  }

  const imageModel = process.env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview';
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: imageModel });

  const traitsDesc = character.traits
    ? Object.entries(character.traits)
        .filter(([_, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
    : '';

  const prompt = `Create a professional character reference sheet based strictly on the uploaded reference image. Use a clean, neutral plain background and present the sheet as a technical model turnaround while matching the exact visual style of the reference (same realism level, rendering approach, texture, color treatment, and overall aesthetic).

Arrange the composition into two horizontal rows.
Top row: four full-body standing views placed side-by-side in this order: front view, left profile view (facing left), right profile view (facing right), back view.
Bottom row: three highly detailed close-up portraits aligned beneath the full-body row in this order: front portrait, left profile portrait (facing left), right profile portrait (facing right).

Maintain perfect identity consistency across every panel. Keep the subject in a relaxed A-pose with consistent scale and alignment between views, accurate anatomy, and clear silhouette.
Ensure even spacing and clean panel separation, with uniform framing and consistent head height across the full-body lineup and consistent facial scale across the portraits.
Lighting should be consistent across all panels (same direction, intensity, and softness), with natural, controlled shadows that preserve detail without dramatic mood shifts.
Output a crisp, print-ready reference sheet look, sharp details.

Character name: ${character.name}
${character.description ? `Description: ${character.description}` : ''}
${traitsDesc ? `Physical traits: ${traitsDesc}` : ''}
${stylePrompt ? `Art style: ${stylePrompt}` : ''}`;

  try {
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
          { text: prompt },
        ],
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: { aspectRatio: '16:9' },
      },
    });

    const candidates = result?.response?.candidates || [];
    for (const candidate of candidates) {
      const parts = candidate.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const outMime = part.inlineData.mimeType || 'image/png';
          return `data:${outMime};base64,${part.inlineData.data}`;
        }
      }
    }
  } catch (err) {
    console.error('Error generating reference sheet from image:', err.message);
  }
  return null;
}

/**
 * Extract character traits from a scene description using AI
 */
async function extractCharacterFromScene(sceneDescription, characterName) {
  try {
    const model = getModel();
    const prompt = `
      Analyze this scene description and extract physical traits for the character "${characterName}".

      Scene: ${sceneDescription}

      Output ONLY a raw JSON object (no markdown):
      {
        "name": "${characterName}",
        "description": "A concise 1-2 sentence description of the character's appearance",
        "traits": {
          "hair": "color and style",
          "skin": "skin tone/color",
          "clothing": "what they're wearing",
          "distinguishing_features": "unique visual features",
          "age_range": "estimated age range",
          "build": "body type"
        }
      }
      Fill in only what can be inferred. Use null for unknown traits.
    `;

    const result = await model.generateContent(prompt);
    let text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (err) {
    console.error('Error extracting character:', err.message);
    return { name: characterName, description: '', traits: {} };
  }
}

/**
 * Build consistency prompt fragment for a character
 * Used to prepend to image generation prompts
 */
function buildConsistencyPrompt(characters, locations, styleLock) {
  const parts = [];

  if (styleLock) {
    parts.push(`MANDATORY ART STYLE: ${styleLock.stylePrompt}.`);
    if (styleLock.extractedTraits) {
      const traits = styleLock.extractedTraits;
      if (traits.palette) parts.push(`Color palette: ${traits.palette}.`);
      if (traits.medium) parts.push(`Medium: ${traits.medium}.`);
      if (traits.lighting_style) parts.push(`Lighting: ${traits.lighting_style}.`);
    }
  }

  if (characters && characters.length > 0) {
    for (const char of characters) {
      let charDesc = `CHARACTER "${char.name}": ${char.description || ''}`;
      if (char.traits) {
        const traitParts = Object.entries(char.traits)
          .filter(([_, v]) => v && v !== 'null')
          .map(([k, v]) => `${k}: ${v}`);
        if (traitParts.length > 0) {
          charDesc += ` (${traitParts.join(', ')})`;
        }
      }
      charDesc += '. This character MUST look identical in every shot.';
      parts.push(charDesc);
    }
  }

  if (locations && locations.length > 0) {
    for (const loc of locations) {
      let locDesc = `LOCATION "${loc.name}": ${loc.description || ''}`;
      if (loc.traits) {
        const traitParts = Object.entries(loc.traits)
          .filter(([_, v]) => v && v !== 'null')
          .map(([k, v]) => `${k}: ${v}`);
        if (traitParts.length > 0) {
          locDesc += ` (${traitParts.join(', ')})`;
        }
      }
      parts.push(locDesc);
    }
  }

  return parts.join('\n');
}

module.exports = {
  generateReferenceSheet,
  generateRefSheetFromImage,
  extractCharacterFromScene,
  buildConsistencyPrompt,
};
