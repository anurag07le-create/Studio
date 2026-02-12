/**
 * scriptParser.js — Unified script parser
 * Supports: PDF, FDX (Final Draft), Fountain, Plain Text
 * Output: { title, author, format, scenes[], characters[], sceneCharacters: {} }
 */
const pdfParse = require('pdf-parse');
const { XMLParser } = require('fast-xml-parser');
const { Fountain } = require('fountain-js');

/**
 * Parse a script buffer into a structured format.
 * @param {Buffer} buffer - File buffer
 * @param {string} format - 'pdf' | 'fdx' | 'fountain' | 'txt'
 * @param {string} [filename] - Original filename
 * @returns {Promise<{ title, author, format, scenes[] }>}
 */
async function parseScript(buffer, format, filename = '') {
  switch (format.toLowerCase()) {
    case 'pdf':
      return _parsePDF(buffer, filename);
    case 'fdx':
      return _parseFDX(buffer, filename);
    case 'fountain':
    case 'ftn':
      return _parseFountain(buffer, filename);
    case 'txt':
    case 'text':
    default:
      return _parsePlainText(buffer, filename);
  }
}

/**
 * Detect format from filename extension.
 */
function detectFormat(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  const formatMap = {
    pdf: 'pdf',
    fdx: 'fdx',
    fountain: 'fountain',
    ftn: 'fountain',
    txt: 'txt',
    text: 'txt',
  };
  return formatMap[ext] || 'txt';
}

// ─── PDF Parser ───────────────────────────────────────────────
async function _parsePDF(buffer, filename) {
  const data = await pdfParse(buffer);
  const text = data.text || '';
  return _extractScenesFromText(text, 'pdf', filename);
}

// ─── FDX (Final Draft XML) Parser ─────────────────────────────
function _parseFDX(buffer, filename) {
  const xmlText = buffer.toString('utf-8');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
  });
  const doc = parser.parse(xmlText);

  const fdx = doc.FinalDraft || doc['FinalDraft'];
  if (!fdx) {
    throw new Error('Invalid FDX file: no FinalDraft root element');
  }

  const content = fdx.Content || {};
  let paragraphs = content.Paragraph || [];
  if (!Array.isArray(paragraphs)) paragraphs = [paragraphs];

  // Extract title/author from TitlePage if present
  let title = _extractFilenameTitle(filename);
  let author = '';
  const titlePage = fdx.TitlePage;
  if (titlePage) {
    let tpContent = titlePage.Content?.Paragraph || [];
    if (!Array.isArray(tpContent)) tpContent = [tpContent];
    for (const p of tpContent) {
      const pType = (p['@_Type'] || '').toLowerCase();
      const pText = _fdxParagraphText(p);
      if (pType.includes('title') && pText) title = pText;
      if (pType.includes('author') && pText) author = pText;
    }
  }

  const scenes = [];
  let currentScene = null;
  const globalCharacters = new Set();
  const sceneCharacterSets = [];
  let currentSceneChars = new Set();

  for (const p of paragraphs) {
    const pType = (p['@_Type'] || '').toLowerCase();
    const text = _fdxParagraphText(p);

    if (pType === 'scene heading' || pType === 'slug line') {
      if (currentScene) {
        scenes.push(currentScene);
        sceneCharacterSets.push(currentSceneChars);
      }
      const parsed = _parseSceneHeading(text);
      currentScene = {
        heading: text,
        location: parsed.location,
        timeOfDay: parsed.timeOfDay,
        description: '',
        dialogue: '',
        notes: '',
      };
      currentSceneChars = new Set();
    } else if (currentScene) {
      if (pType === 'action' || pType === 'narrative') {
        currentScene.description += (currentScene.description ? '\n' : '') + text;
      } else if (pType === 'character') {
        // FDX explicitly marks character paragraphs — extract the name
        const charName = text.replace(/\s*\(.*\)\s*$/, '').trim(); // Remove (V.O.), (O.S.)
        if (charName) {
          globalCharacters.add(charName);
          currentSceneChars.add(charName);
        }
        currentScene.dialogue += (currentScene.dialogue ? '\n' : '') + `[${pType}] ${text}`;
      } else if (pType === 'dialogue' || pType === 'parenthetical') {
        currentScene.dialogue += (currentScene.dialogue ? '\n' : '') + `[${pType}] ${text}`;
      } else if (pType === 'transition') {
        currentScene.notes += (currentScene.notes ? '\n' : '') + text;
      }
    }
  }
  if (currentScene) {
    scenes.push(currentScene);
    sceneCharacterSets.push(currentSceneChars);
  }

  // Build sceneCharacters map
  const sceneCharacters = {};
  sceneCharacterSets.forEach((charSet, idx) => {
    if (charSet.size > 0) {
      sceneCharacters[idx] = [...charSet];
    }
  });

  return {
    title,
    author,
    format: 'fdx',
    scenes,
    characters: [...globalCharacters],
    sceneCharacters,
  };
}

function _fdxParagraphText(p) {
  let texts = p.Text || [];
  if (!Array.isArray(texts)) texts = [texts];
  return texts
    .map((t) => (typeof t === 'string' ? t : t['#text'] || ''))
    .join('')
    .trim();
}

// ─── Fountain Parser ──────────────────────────────────────────
function _parseFountain(buffer, filename) {
  const text = buffer.toString('utf-8');
  const f = new Fountain();
  const parsed = f.parse(text);

  const title = parsed.title || _extractFilenameTitle(filename);
  const author = '';
  const scenes = [];

  // fountain-js produces HTML, not tokens. Parse from HTML or fall back to regex on raw text.
  const htmlScript = parsed.html?.script || '';
  if (htmlScript) {
    // Split by <h3> scene heading tags
    const parts = htmlScript.split(/<h3[^>]*>/);
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const headingEnd = part.indexOf('</h3>');
      const heading = headingEnd >= 0 ? part.substring(0, headingEnd).replace(/<[^>]+>/g, '').trim() : '';
      const rest = headingEnd >= 0 ? part.substring(headingEnd + 5) : part;

      // Extract text from remaining HTML
      const description = rest
        .replace(/<h4[^>]*>.*?<\/h4>/g, '') // remove section headings
        .replace(/<[^>]+>/g, '\n')           // replace tags with newlines
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      const parsedHeading = _parseSceneHeading(heading);
      scenes.push({
        heading,
        location: parsedHeading.location,
        timeOfDay: parsedHeading.timeOfDay,
        description,
        dialogue: '',
        notes: '',
      });
    }
  }

  // Fallback: if HTML parsing found nothing, try regex on raw text
  if (scenes.length === 0) {
    const fallback = _extractScenesFromText(text, 'fountain', filename);
    return { ...fallback, title, author };
  }

  // Extract characters from dialogue in fountain HTML (<h4> tags are character cues)
  const globalCharacters = new Set();
  const sceneCharacters = {};
  const charRegex = /<h4[^>]*>(.*?)<\/h4>/g;
  // Re-parse to map characters to scenes
  const parts2 = htmlScript.split(/<h3[^>]*>/);
  for (let i = 1; i < parts2.length; i++) {
    const sceneChars = new Set();
    let match;
    const partText = parts2[i];
    while ((match = charRegex.exec(partText)) !== null) {
      const charName = match[1].replace(/<[^>]+>/g, '').replace(/\s*\(.*\)\s*$/, '').trim();
      if (charName) {
        globalCharacters.add(charName);
        sceneChars.add(charName);
      }
    }
    charRegex.lastIndex = 0; // reset regex
    if (sceneChars.size > 0) {
      sceneCharacters[i - 1] = [...sceneChars];
    }
  }

  return {
    title,
    author,
    format: 'fountain',
    scenes,
    characters: [...globalCharacters],
    sceneCharacters,
  };
}

// ─── Plain Text Parser ────────────────────────────────────────
function _parsePlainText(buffer, filename) {
  const text = buffer.toString('utf-8');
  return _extractScenesFromText(text, 'txt', filename);
}

// ─── Shared: Extract scenes from raw text using regex ─────────
function _extractScenesFromText(text, format, filename) {
  const title = _extractFilenameTitle(filename);
  const lines = text.split(/\r?\n/);
  const scenes = [];
  let currentScene = null;
  const globalCharacters = new Set();
  const sceneCharacterSets = []; // parallel to scenes array
  let currentSceneChars = new Set();

  // Scene heading patterns:
  // INT. / EXT. / INT/EXT. / I/E.
  // SCENE 1 / Scene 1 / SCENE:
  const sceneHeadingRegex = /^\s*(INT\.|EXT\.|INT\/EXT\.|I\/E\.|SCENE\s*\d*\s*[:\-]?)/i;
  const characterNameRegex = /^[A-Z][A-Z\s.]{1,28}[A-Z]$/; // ALL CAPS, 2-30 chars

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (sceneHeadingRegex.test(trimmed)) {
      if (currentScene) {
        scenes.push(currentScene);
        sceneCharacterSets.push(currentSceneChars);
      }
      const parsed = _parseSceneHeading(trimmed);
      currentScene = {
        heading: trimmed,
        location: parsed.location,
        timeOfDay: parsed.timeOfDay,
        description: '',
        dialogue: '',
        notes: '',
      };
      currentSceneChars = new Set();
    } else if (currentScene) {
      // Heuristic: ALL CAPS short line → character name (dialogue coming)
      // Indented or after character → dialogue
      if (characterNameRegex.test(trimmed) && trimmed.length < 30) {
        // Filter out common non-character ALL-CAPS words
        const nonCharWords = new Set([
          'FADE IN', 'FADE OUT', 'CUT TO', 'DISSOLVE TO', 'SMASH CUT',
          'MATCH CUT', 'INTERCUT', 'CONTINUOUS', 'LATER', 'MOMENTS LATER',
          'THE END', 'TITLE CARD', 'SUPER', 'MONTAGE', 'END MONTAGE',
          'FLASHBACK', 'END FLASHBACK', 'BACK TO SCENE', 'CONTINUED',
          'MORE', 'CONT', 'PRE LAP', 'VOICE OVER',
        ]);
        const cleaned = trimmed.replace(/\s*\(.*\)\s*$/, '').trim(); // Remove (V.O.), (O.S.), (CONT'D)
        if (!nonCharWords.has(cleaned) && cleaned.length >= 2) {
          globalCharacters.add(cleaned);
          currentSceneChars.add(cleaned);
        }
        currentScene.dialogue += (currentScene.dialogue ? '\n' : '') + trimmed + ':';
      } else {
        currentScene.description += (currentScene.description ? '\n' : '') + trimmed;
      }
    } else {
      // Before first scene heading, treat as description of implicit scene
      if (!currentScene) {
        currentScene = {
          heading: 'SCENE 1',
          location: '',
          timeOfDay: '',
          description: trimmed,
          dialogue: '',
          notes: '',
        };
        currentSceneChars = new Set();
      }
    }
  }
  if (currentScene) {
    scenes.push(currentScene);
    sceneCharacterSets.push(currentSceneChars);
  }

  // If no scenes were found, create one scene with all text
  if (scenes.length === 0) {
    scenes.push({
      heading: 'SCENE 1',
      location: '',
      timeOfDay: '',
      description: text.trim().substring(0, 2000),
      dialogue: '',
      notes: '',
    });
    sceneCharacterSets.push(new Set());
  }

  // Build sceneCharacters map: { sceneIndex: [charNames] }
  const sceneCharacters = {};
  sceneCharacterSets.forEach((charSet, idx) => {
    if (charSet.size > 0) {
      sceneCharacters[idx] = [...charSet];
    }
  });

  return {
    title,
    author: '',
    format,
    scenes,
    characters: [...globalCharacters],
    sceneCharacters,
  };
}

// ─── Helpers ──────────────────────────────────────────────────

function _parseSceneHeading(heading) {
  // "INT. COFFEE SHOP - NIGHT" → { location: "COFFEE SHOP", timeOfDay: "NIGHT" }
  const cleaned = heading
    .replace(/^\s*(INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s*/i, '')
    .trim();
  const parts = cleaned.split(/\s*[-–—]\s*/);
  const location = parts[0]?.trim() || '';
  const timeOfDay = parts[1]?.trim() || '';
  return { location, timeOfDay };
}

function _extractFilenameTitle(filename) {
  if (!filename) return 'Untitled Script';
  return filename
    .replace(/\.[^/.]+$/, '') // remove extension
    .replace(/[_-]/g, ' ')   // replace separators
    .trim() || 'Untitled Script';
}

module.exports = { parseScript, detectFormat };
