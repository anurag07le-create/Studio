/**
 * characterImageCache.js — In-memory cache for character/location reference images
 * Used during batch image generation to chain character appearances across scenes.
 * Priority: uploadedImageUrl > referenceImageUrl > generated shot image
 */
const characterRefStore = require('./characterRefStore');
const locationRefStore = require('./locationRefStore');
const shotStore = require('./shotStore');
const db = require('../db/connection');
const fs = require('fs');
const path = require('path');

/**
 * Build a character image cache for a project.
 * Returns { charId: { base64, mimeType, label, source } }
 */
function buildCharacterImageCache(projectId) {
  const characters = characterRefStore.listByProject(projectId);
  const cache = {};

  for (const char of characters) {
    // Priority 1: uploaded image (file on disk)
    if (char.uploadedImageUrl && !char.uploadedImageUrl.startsWith('data:')) {
      const filePath = path.join(__dirname, '../../data', char.uploadedImageUrl);
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
        cache[char.id] = {
          base64: buffer.toString('base64'),
          mimeType,
          label: `Character: ${char.name}`,
          type: 'character',
          source: 'uploaded',
        };
        continue;
      }
    }

    // Priority 1b: uploaded image (data URL)
    if (char.uploadedImageUrl?.startsWith('data:')) {
      const match = char.uploadedImageUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        cache[char.id] = {
          base64: match[2],
          mimeType: match[1],
          label: `Character: ${char.name}`,
          type: 'character',
          source: 'uploaded',
        };
        continue;
      }
    }

    // Priority 2: generated reference sheet
    if (char.referenceImageUrl?.startsWith('data:')) {
      const match = char.referenceImageUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        cache[char.id] = {
          base64: match[2],
          mimeType: match[1],
          label: `Character: ${char.name}`,
          type: 'character',
          source: 'refsheet',
        };
        continue;
      }
    }

    // Priority 3: Find a generated shot image where this character appears
    try {
      const stmt = db.prepare(`
        SELECT imageUrl FROM shots
        WHERE projectId = ? AND characterRefs LIKE ? AND imageUrl LIKE 'data:%'
        ORDER BY createdAt DESC LIMIT 1
      `);
      const shot = stmt.get(projectId, `%${char.id}%`);
      if (shot?.imageUrl) {
        const match = shot.imageUrl.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          cache[char.id] = {
            base64: match[2],
            mimeType: match[1],
            label: `Character: ${char.name}`,
            type: 'character',
            source: 'generated',
          };
        }
      }
    } catch (e) {
      // Ignore query errors
    }
  }

  return cache;
}

/**
 * Build a location image cache for a project.
 * Returns { locId: { base64, mimeType, label, source } }
 */
function buildLocationImageCache(projectId) {
  const locations = locationRefStore.listByProject(projectId);
  const cache = {};

  for (const loc of locations) {
    if (loc.referenceImageUrl?.startsWith('data:')) {
      const match = loc.referenceImageUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        cache[loc.id] = {
          base64: match[2],
          mimeType: match[1],
          label: `Location: ${loc.name}`,
          type: 'location',
          source: 'refimage',
        };
      }
    }
  }

  return cache;
}

/**
 * Update the cache after generating a shot image.
 * If a character's cached image source was 'generated', replace it with the newer image.
 */
function updateCacheAfterGeneration(cache, characterIds, imageBase64, mimeType = 'image/png') {
  for (const charId of characterIds) {
    if (!cache[charId] || cache[charId].source === 'generated') {
      const label = cache[charId]?.label || `Character: ${charId}`;
      cache[charId] = {
        base64: imageBase64,
        mimeType,
        label,
        type: 'character',
        source: 'generated',
      };
    }
  }
}

module.exports = {
  buildCharacterImageCache,
  buildLocationImageCache,
  updateCacheAfterGeneration,
};
