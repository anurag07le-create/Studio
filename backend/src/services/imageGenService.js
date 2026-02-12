const { GoogleGenerativeAI } = require("@google/generative-ai");

const BASE_IMAGE_STYLE = process.env.GEMINI_IMAGE_STYLE || "Cinematic neon-noir, teal-magenta palette, volumetric rain and fog, soft bloom, anamorphic lens, shallow depth of field, subtle film grain, 16:9 composition";

/**
 * Generate a storyboard frame image using Gemini.
 *
 * Supports two calling conventions for backward compatibility:
 *   1. Legacy: generateImage(prompt, previousStyleHint, styleOverride, referenceImageBase64, heroSubject)
 *   2. New:    generateImage(prompt, options)
 *
 * Options object:
 *   - previousStyleHint: prompt of previous shot for style continuity
 *   - styleOverride: custom style description
 *   - referenceImages: [{ base64, mimeType, label, type }] - multiple reference images
 *   - heroSubject: detailed character description for primary character
 *   - consistencyPrefix: pre-built consistency prompt text
 */
exports.generateImage = async (prompt, optionsOrStyleHint = "", styleOverride, referenceImageBase64 = null, heroSubject = "") => {
  // Detect calling convention
  let options;
  if (typeof optionsOrStyleHint === 'object' && optionsOrStyleHint !== null) {
    // New-style call
    options = optionsOrStyleHint;
  } else {
    // Legacy call — convert to options
    options = {
      previousStyleHint: optionsOrStyleHint || '',
      styleOverride: styleOverride || '',
      referenceImages: [],
      heroSubject: heroSubject || '',
    };
    // Convert single reference image to array
    if (referenceImageBase64) {
      options.referenceImages = [{
        base64: referenceImageBase64,
        mimeType: 'image/png',
        label: 'Main character',
        type: 'character',
      }];
    }
  }

  const {
    previousStyleHint = '',
    styleOverride: styleOvr = '',
    referenceImages = [],
    heroSubject: hero = '',
    consistencyPrefix = '',
  } = options;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey.startsWith("your_")) {
    console.log("No valid GEMINI_API_KEY found. Using placeholder image.");
    const encodedPrompt = encodeURIComponent(prompt.substring(0, 50) + "...");
    return `https://placehold.co/600x400/222/FFF?text=${encodedPrompt}`;
  }

  const imageModel = process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image-preview";
  const appliedStyle = (styleOvr || styleOverride || '').trim() || BASE_IMAGE_STYLE;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: imageModel });

  // Build character consistency instruction
  const heroInstruction = hero
    ? `CRITICAL - Main Character Description (MUST match exactly): ${hero}.`
    : "";

  // Style continuity
  const styleGlue = previousStyleHint
    ? `Maintain exact style continuity with previous shot.`
    : "Establish the base look; following shots must keep this style.";

  const imagePrompt = `
    Role: Cinematic frame artist.
    Goal: Render a single storyboard frame that matches the shared style and camera feel.
    ${consistencyPrefix ? consistencyPrefix + '\n' : ''}
    ${heroInstruction}
    Style: ${appliedStyle}.
    Continuity: ${styleGlue}
    Frame description: ${prompt}.
    Constraints: no text, no captions, 16:9, high fidelity. All characters MUST look identical to their reference images if provided.
  `;

  // Build content parts — include ALL reference images
  const contentParts = [];

  if (referenceImages.length > 0) {
    for (const ref of referenceImages) {
      if (!ref.base64) continue;
      contentParts.push({
        inlineData: {
          mimeType: ref.mimeType || "image/png",
          data: ref.base64,
        },
      });
      const refType = ref.type === 'location' ? 'location/setting' : 'character';
      contentParts.push({
        text: `Reference image above shows ${ref.label || 'a reference'}. This ${refType} MUST look identical in the generated image.`,
      });
    }
    contentParts.push({
      text: `Generate a new image where ALL referenced characters and locations (identical appearance, clothing, colors, architecture) appear as described below:\n\n${imagePrompt}`,
    });
  } else {
    contentParts.push({ text: imagePrompt });
  }

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: contentParts,
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    });

    const candidates = result?.response?.candidates || [];
    for (const candidate of candidates) {
      const parts = candidate.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const mimeType = part.inlineData.mimeType || "image/png";
          const base64 = part.inlineData.data;
          console.log(`Image generated successfully via Gemini (${referenceImages.length} refs).`);
          return `data:${mimeType};base64,${base64}`;
        }
      }
    }

    console.log("Gemini did not return inline image data; using placeholder.");
  } catch (error) {
    console.error("Error generating image with Gemini:", error);
    console.log("Falling back to placeholder.");
  }

  // Fallback Placeholder
  const encodedPrompt = encodeURIComponent(prompt.substring(0, 50) + "...");
  return `https://placehold.co/600x400/222/FFF?text=${encodedPrompt}`;
};
