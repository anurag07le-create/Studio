/**
 * styleAnalysisService.js
 * AI-powered style analysis: extract style traits from reference images, build style prompts
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Analyze an image to extract its visual style traits
 * @param {string} imageBase64 - base64 data URL or raw base64
 * @returns {Promise<{styleName, stylePrompt, extractedTraits}>}
 */
async function analyzeStyleFromImage(imageBase64) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.startsWith('your_')) {
    throw new Error('No valid GEMINI_API_KEY found');
  }

  const textModel = process.env.GEMINI_TEXT_MODEL || 'gemini-3-pro-preview';
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: textModel });

  // Extract base64 data from data URL if needed
  let mimeType = 'image/png';
  let data = imageBase64;
  if (imageBase64.startsWith('data:')) {
    mimeType = imageBase64.split(';')[0].split(':')[1];
    data = imageBase64.split(',')[1];
  }

  const prompt = `
    Analyze the art style of this image in detail.

    Output ONLY a raw JSON object (no markdown):
    {
      "styleName": "A short 2-4 word style name (e.g., 'Cyberpunk Neon Noir', 'Watercolor Pastoral', 'Anime Cell-Shaded')",
      "stylePrompt": "A detailed prompt describing this exact style, suitable for reproducing it in AI image generation. Include: art medium, color palette, lighting quality, texture/grain, composition style, and mood. 2-3 sentences.",
      "extractedTraits": {
        "palette": "Dominant colors and overall color mood",
        "medium": "Art medium/technique (e.g., 'digital painting', 'oil on canvas', 'watercolor')",
        "lighting_style": "Type of lighting (e.g., 'neon backlighting', 'golden hour', 'studio lighting')",
        "texture": "Surface quality (e.g., 'film grain', 'smooth digital', 'brush strokes visible')",
        "mood": "Overall emotional tone"
      }
    }
  `;

  try {
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data } },
          { text: prompt },
        ],
      }],
    });

    let text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (err) {
    console.error('Error analyzing style:', err.message);
    return {
      styleName: 'Custom Style',
      stylePrompt: 'A custom visual style based on the reference image.',
      extractedTraits: {},
    };
  }
}

/**
 * Build a style lock prompt from a preset name
 */
function getStylePreset(presetName) {
  const presets = {
    'cyberpunk-neon': {
      styleName: 'Cyberpunk Neon',
      stylePrompt: 'Cinematic neon-noir, teal-magenta palette, volumetric rain and fog, soft bloom, anamorphic lens, shallow depth of field, film grain, 16:9 composition.',
      extractedTraits: { palette: 'Teal, magenta, electric blue', medium: 'Digital cinema', lighting_style: 'Neon backlighting with fog diffusion', texture: 'Film grain', mood: 'Dark, atmospheric, tech-noir' },
    },
    'studio-ghibli': {
      styleName: 'Studio Ghibli',
      stylePrompt: 'Warm hand-painted watercolor anime style, soft pastel colors, lush detailed backgrounds, gentle lighting, whimsical atmosphere, Studio Ghibli inspired aesthetic.',
      extractedTraits: { palette: 'Warm pastels, greens, sky blues', medium: 'Watercolor anime', lighting_style: 'Soft diffused daylight', texture: 'Painterly brush strokes', mood: 'Warm, nostalgic, wonder' },
    },
    'noir-detective': {
      styleName: 'Film Noir',
      stylePrompt: 'Classic black and white film noir, high contrast shadows, Venetian blind lighting, dramatic chiaroscuro, 1940s aesthetic, smoky atmosphere, grain texture.',
      extractedTraits: { palette: 'Black, white, gray tones', medium: 'Black and white photography', lighting_style: 'Hard shadows, venetian blind patterns', texture: 'Heavy film grain', mood: 'Mysterious, suspenseful, moody' },
    },
    'watercolor-storybook': {
      styleName: 'Watercolor Storybook',
      stylePrompt: 'Delicate watercolor illustration, soft edges bleeding into white paper, muted earth tones with pops of warm color, hand-drawn feel, storybook illustration aesthetic.',
      extractedTraits: { palette: 'Earth tones, muted warm colors', medium: 'Watercolor on textured paper', lighting_style: 'Soft ambient light', texture: 'Visible brush strokes, paper texture', mood: 'Gentle, whimsical, literary' },
    },
    'comic-book': {
      styleName: 'Comic Book',
      stylePrompt: 'Bold comic book art, thick ink outlines, flat vibrant colors with halftone dots, dynamic angles, Ben-Day dots shading, superhero aesthetic.',
      extractedTraits: { palette: 'Primary colors, bold contrasts', medium: 'Ink and digital coloring', lighting_style: 'Flat with dramatic shadows', texture: 'Halftone dots, clean lines', mood: 'Dynamic, energetic, bold' },
    },
    'photorealistic': {
      styleName: 'Photorealistic Cinema',
      stylePrompt: 'Ultra-photorealistic cinematic photography, natural lighting, 35mm film look, shallow depth of field, ARRI camera aesthetic, color-graded in warm tones.',
      extractedTraits: { palette: 'Natural colors, warm grade', medium: 'Photorealistic 35mm film', lighting_style: 'Natural/practical lighting', texture: 'Subtle film grain', mood: 'Cinematic, grounded, real' },
    },
    'pixel-art': {
      styleName: 'Pixel Art',
      stylePrompt: 'Detailed pixel art, 16-bit retro game aesthetic, limited color palette, clean pixel edges, dithering for gradients, nostalgic video game style.',
      extractedTraits: { palette: 'Limited retro game palette', medium: 'Pixel art, 16-bit', lighting_style: 'Flat with pixel shading', texture: 'Clean pixel edges, dithering', mood: 'Nostalgic, playful, retro' },
    },
    'oil-painting': {
      styleName: 'Classical Oil Painting',
      stylePrompt: 'Rich oil painting on canvas, visible brush strokes, Rembrandt-style chiaroscuro lighting, warm golden tones, classical fine art aesthetic, museum quality.',
      extractedTraits: { palette: 'Rich golds, deep browns, warm tones', medium: 'Oil on canvas', lighting_style: 'Chiaroscuro, dramatic', texture: 'Thick impasto brush strokes', mood: 'Grand, timeless, classical' },
    },
  };
  return presets[presetName] || null;
}

/**
 * List all available style presets
 */
function listStylePresets() {
  return [
    { id: 'cyberpunk-neon', name: 'Cyberpunk Neon', description: 'Neon-lit futuristic noir' },
    { id: 'studio-ghibli', name: 'Studio Ghibli', description: 'Warm hand-painted anime' },
    { id: 'noir-detective', name: 'Film Noir', description: 'Classic black & white suspense' },
    { id: 'watercolor-storybook', name: 'Watercolor Storybook', description: 'Delicate illustrated pages' },
    { id: 'comic-book', name: 'Comic Book', description: 'Bold superhero ink style' },
    { id: 'photorealistic', name: 'Photorealistic Cinema', description: 'Ultra-real 35mm film look' },
    { id: 'pixel-art', name: 'Pixel Art', description: 'Retro 16-bit game aesthetic' },
    { id: 'oil-painting', name: 'Classical Oil Painting', description: 'Museum-quality canvas art' },
  ];
}

module.exports = {
  analyzeStyleFromImage,
  getStylePreset,
  listStylePresets,
};
