/**
 * writingAssistantService.js — AI writing assistant for screenplay and shot improvement
 * Uses Gemini streaming for real-time response delivery
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { emitAssistantChunk, emitScriptChunk } = require('./socketService');

const getModel = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.startsWith('your_')) {
    throw new Error('No valid GEMINI_API_KEY found');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: process.env.GEMINI_TEXT_MODEL || 'gemini-3-pro-preview',
  });
};

/**
 * Generate or improve a screenplay/scene
 * Streams chunks back via Socket.IO
 */
async function generateScreenplay(projectId, { prompt, context, existingText }) {
  const model = getModel();
  const systemPrompt = `
    You are an expert screenwriter and cinematographer.
    You write in standard screenplay format (Fountain notation).
    Keep descriptions vivid but concise. Focus on visual storytelling.
    ${context ? `Project context: ${context}` : ''}
  `;

  const userPrompt = existingText
    ? `Continue or improve this screenplay:\n\n${existingText}\n\nUser request: ${prompt}`
    : `Write a screenplay scene based on: ${prompt}`;

  try {
    const result = await model.generateContentStream([
      { text: systemPrompt },
      { text: userPrompt },
    ]);

    let fullText = '';
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        fullText += text;
        emitAssistantChunk(projectId, { type: 'chunk', text, done: false });
      }
    }
    emitAssistantChunk(projectId, { type: 'done', text: '', fullText, done: true });
    return fullText;
  } catch (err) {
    emitAssistantChunk(projectId, { type: 'error', error: err.message, done: true });
    throw err;
  }
}

/**
 * Improve dialogue for a scene
 */
async function improveDialogue(projectId, { sceneDescription, dialogue, style }) {
  const model = getModel();
  const prompt = `
    You are an expert dialogue writer for film.

    Scene: ${sceneDescription}
    Current dialogue: ${dialogue || 'None yet'}
    Style direction: ${style || 'Natural, cinematic'}

    Task: Write or improve the dialogue for this scene.
    Make it sound natural, emotionally resonant, and serve the visual story.
    Output the dialogue in screenplay format (CHARACTER NAME in caps, followed by dialogue).
  `;

  try {
    const result = await model.generateContentStream(prompt);
    let fullText = '';
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        fullText += text;
        emitAssistantChunk(projectId, { type: 'chunk', text, done: false });
      }
    }
    emitAssistantChunk(projectId, { type: 'done', text: '', fullText, done: true });
    return fullText;
  } catch (err) {
    emitAssistantChunk(projectId, { type: 'error', error: err.message, done: true });
    throw err;
  }
}

/**
 * Suggest camera movement for a shot based on scene context
 */
async function suggestCameraMovement(shotDescription, sceneContext) {
  const model = getModel();
  const prompt = `
    You are an expert cinematographer.

    Scene context: ${sceneContext || 'Not provided'}
    Shot description: ${shotDescription}

    Suggest the best camera movement for this shot.

    Output ONLY a raw JSON object (no markdown):
    {
      "cameraAngle": "e.g., Low Angle, Eye Level, Bird's Eye",
      "cameraMovement": "e.g., Slow dolly in, Pan left to right, Static",
      "reasoning": "Brief explanation of why this works",
      "duration": 6
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (err) {
    console.error('Error suggesting camera:', err.message);
    return {
      cameraAngle: 'Eye Level',
      cameraMovement: 'Static',
      reasoning: 'Default suggestion',
      duration: 6,
    };
  }
}

/**
 * Generate a complete screenplay from a story concept.
 * Streams chunks back via Socket.IO 'script:generate' events.
 */
async function generateFullScreenplay(projectId, { prompt, genre, tone, length }) {
  const model = getModel();

  const lengthGuide = {
    short: '5-10 scenes, approximately 8-15 pages, suitable for a short film',
    medium: '10-20 scenes, approximately 15-40 pages, suitable for a medium-length film',
    feature: '20-40 scenes, approximately 40-120 pages, suitable for a feature film',
  };

  const systemPrompt = `You are a professional screenwriter. Write a COMPLETE screenplay in standard Fountain notation.

GENRE: ${genre || 'Drama'}
TONE: ${tone || 'Neutral'}
LENGTH TARGET: ${lengthGuide[length] || lengthGuide.medium}

FOUNTAIN FORMAT RULES:
- Title Page: Title:, Credit:, Author: at the very top
- Scene headings: INT. or EXT. followed by LOCATION - TIME OF DAY (all caps)
- Action lines: Regular paragraphs describing what we see
- Character names: ALL CAPS on their own line before dialogue
- Dialogue: Text on the line(s) after the character name
- Parentheticals: (whispered), (angry) etc. in parentheses before dialogue
- Transitions: CUT TO:, FADE IN:, FADE OUT.

Write a complete, well-structured screenplay with:
- A clear three-act structure
- Distinct, named characters with consistent voices
- Vivid scene descriptions suitable for storyboarding
- Every scene beginning with a proper INT./EXT. heading
- Natural, cinematic dialogue
- Visual storytelling emphasis

Do NOT include markdown formatting. Output pure Fountain screenplay text only.`;

  const userPrompt = `Write a complete ${genre || 'drama'} screenplay based on this concept:\n\n${prompt}`;

  try {
    const result = await model.generateContentStream([
      { text: systemPrompt },
      { text: userPrompt },
    ]);

    let fullText = '';
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        fullText += text;
        emitScriptChunk(projectId, { type: 'chunk', text, done: false });
      }
    }
    emitScriptChunk(projectId, { type: 'done', text: '', fullText, done: true });
    return fullText;
  } catch (err) {
    emitScriptChunk(projectId, { type: 'error', error: err.message, done: true });
    throw err;
  }
}

module.exports = { generateScreenplay, generateFullScreenplay, improveDialogue, suggestCameraMovement };
