// StoryGenApp/backend/src/services/videoService.js

const fs = require('fs');
const path = require('path');
const { fetch } = require('undici');
const { log } = require('../utils/logger');
const { analyzeShotTransition } = require('./llmService');
const videoLogStore = require('./videoLogStore');
const { emitProgress } = require('./socketService');

// Provider registry
const vertexProvider = require('./providers/vertexProvider');
const klingProvider = require('./providers/klingProvider');
const lumaProvider = require('./providers/lumaProvider');
const hailuoProvider = require('./providers/hailuoProvider');
const wanProvider = require('./providers/wanProvider');
const hunyuanProvider = require('./providers/hunyuanProvider');
const veo3PiapiProvider = require('./providers/veo3PiapiProvider');
const skyreelsProvider = require('./providers/skyreelsProvider');
const framepackProvider = require('./providers/framepackProvider');

const PROVIDERS = {
  vertex: vertexProvider,
  kling: klingProvider,
  luma: lumaProvider,
  hailuo: hailuoProvider,
  wan: wanProvider,
  hunyuan: hunyuanProvider,
  veo3_piapi: veo3PiapiProvider,
  skyreels: skyreelsProvider,
  framepack: framepackProvider,
};

const dataDir = path.join(__dirname, '../../data');
const videoDir = path.join(dataDir, 'videos');
const tempImgDir = path.join(dataDir, 'temp_images');
const ensureDirs = () => {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });
  if (!fs.existsSync(tempImgDir)) fs.mkdirSync(tempImgDir, { recursive: true });
};

/**
 * Compress a base64 data URI and upload to PiAPI's ephemeral storage.
 * PiAPI providers only accept HTTP URLs (not base64 data URIs) and
 * reject huge payloads ("task input is too large").
 *
 * Flow:
 *  1. Detect if input is a base64 data URI (pass through HTTP URLs)
 *  2. Compress with sharp: resize to 720px max, JPEG quality 75
 *  3. Upload to PiAPI ephemeral storage → get back a public HTTP URL
 *  4. Return the URL for use in PiAPI task requests
 *
 * @param {string|null} dataUri - A data URI, HTTP URL, or null
 * @returns {Promise<string|null>} Public HTTP URL or null
 */
const compressAndUploadImage = async (dataUri) => {
  if (!dataUri) return null;
  // Already an HTTP URL — pass through
  if (dataUri.startsWith('http://') || dataUri.startsWith('https://')) return dataUri;

  const match = /^data:image\/(\w+);base64,(.+)$/.exec(dataUri);
  if (!match) return dataUri; // not a data URI — pass through

  const apiKey = process.env.PIAPI_KEY;
  if (!apiKey) {
    console.error('PIAPI_KEY not set — cannot upload image to PiAPI ephemeral storage');
    return dataUri; // fallback: return original (may fail downstream)
  }

  try {
    const sharp = require('sharp');
    const inputBuffer = Buffer.from(match[2], 'base64');
    const originalSize = inputBuffer.length;

    // Resize to max 720px on longest side, convert to JPEG quality 75
    const compressedBuffer = await sharp(inputBuffer)
      .resize(720, 720, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer();

    const compressedBase64 = compressedBuffer.toString('base64');
    log('image_compressed', {
      originalSize: `${(originalSize / 1024).toFixed(0)}KB`,
      compressedSize: `${(compressedBuffer.length / 1024).toFixed(0)}KB`,
      ratio: `${((1 - compressedBuffer.length / originalSize) * 100).toFixed(0)}% reduction`,
    });

    // Upload to PiAPI ephemeral storage (files auto-delete after 24h)
    const fileName = `frame_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`;
    const uploadRes = await fetch('https://upload.theapi.app/api/ephemeral_resource', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        file_name: fileName,
        file_data: compressedBase64,
      }),
    });

    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      throw new Error(`PiAPI upload failed: ${uploadRes.status} ${text}`);
    }

    const uploadJson = await uploadRes.json();
    if (uploadJson.code !== 200 || !uploadJson.data?.url) {
      throw new Error(`PiAPI upload error: ${uploadJson.message || JSON.stringify(uploadJson)}`);
    }

    const publicUrl = uploadJson.data.url;
    log('image_uploaded_piapi', { fileName, publicUrl, size: `${(compressedBuffer.length / 1024).toFixed(0)}KB` });
    return publicUrl;

  } catch (err) {
    console.error('Image compress/upload failed, using data URI fallback:', err.message);
    return dataUri; // fallback: return original (may fail downstream but worth trying)
  }
};

// Helper to read image bytes (from URL or Base64 data URI) — used by Vertex provider
const readImageBytes = async (imageUrl) => {
  if (!imageUrl) return null;

  const DATA_URL_REGEX = /^data:(.+?);base64,(.+)$/;
  const dataMatch = DATA_URL_REGEX.exec(imageUrl);

  if (dataMatch) {
    return { bytesBase64Encoded: dataMatch[2], mimeType: dataMatch[1] || 'image/png' };
  }

  if (imageUrl.startsWith('http')) {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Failed to fetch image from URL: ${imageUrl}, Status: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    return { bytesBase64Encoded: buffer.toString('base64'), mimeType: res.headers.get('content-type') || 'image/png' };
  }

  if (fs.existsSync(imageUrl)) {
    const buffer = await fs.promises.readFile(imageUrl);
    const ext = path.extname(imageUrl).toLowerCase();
    let mimeType = 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    if (ext === '.webp') mimeType = 'image/webp';
    if (ext === '.gif') mimeType = 'image/gif';
    return { bytesBase64Encoded: buffer.toString('base64'), mimeType };
  }

  throw new Error(`Unsupported image URL/path format: ${imageUrl}`);
};

/**
 * Generate a single clip using the specified provider.
 * Dispatches to the correct provider based on params.provider.
 */
const generateClipDirectly = async (params) => {
  const providerName = params.provider || process.env.DEFAULT_VIDEO_PROVIDER || 'vertex';
  const provider = PROVIDERS[providerName];

  if (!provider) {
    throw new Error(`Unknown video provider: ${providerName}. Available: ${Object.keys(PROVIDERS).join(', ')}`);
  }

  log('generate_clip_dispatch', { provider: providerName, duration: params.duration_seconds });

  // Vertex requires pre-processed image bytes; PiAPI providers take raw URLs
  if (providerName === 'vertex') {
    const firstFrame = await readImageBytes(params.first_frame_url);
    const lastFrame = await readImageBytes(params.last_frame_url);

    return await provider.generateClip({
      prompt: params.prompt,
      firstFrame,
      lastFrame,
      durationSeconds: params.duration_seconds,
      model: params.model,
      options: params.options || {},
    });
  }

  // PiAPI providers — compress + upload base64 data URIs to PiAPI ephemeral storage.
  // PiAPI only accepts HTTP URLs (not data URIs) and rejects large payloads.
  const firstFrameUrl = await compressAndUploadImage(params.first_frame_url);
  const lastFrameUrl = await compressAndUploadImage(params.last_frame_url);

  return await provider.generateClip({
    prompt: params.prompt,
    firstFrameUrl,
    lastFrameUrl,
    durationSeconds: params.duration_seconds,
    model: params.model,
    options: params.options || {},
  });
};

/**
 * Generate a full video from a storyboard using "Interpolation Chain" (Slide Window).
 * 1. Analyze pairs (Shot A -> Shot B) to get transition prompt & duration.
 * 2. Generate clips in parallel.
 * 3. Stitch clips.
 *
 * @param {Array} storyboard - Array of shot objects
 * @param {string} projectId - Project ID for Socket.IO progress
 * @param {object} [options] - { provider, model }
 */
exports.generateFullVideoFromShots = async (storyboard, projectId, options = {}) => {
  ensureDirs();
  const startTime = Date.now();
  const providerName = options.provider || process.env.DEFAULT_VIDEO_PROVIDER || 'vertex';

  // Helper to emit progress if projectId is provided
  const progress = (data) => {
    if (projectId) emitProgress(projectId, data);
  };

  const logId = videoLogStore.createLog(storyboard);
  log('video_generation_start', { shot_count: storyboard.length, logId, projectId, provider: providerName });

  if (!storyboard || storyboard.length < 2) {
    const error = "Need at least 2 shots to generate a video sequence.";
    videoLogStore.updateLog(logId, { status: 'error', errorMessage: error });
    progress({ phase: 'Error', percent: 0, message: error });
    throw new Error(error);
  }

  try {
    // --- PHASE 1: PLAN (Analyze Transitions) ---
    progress({ phase: 'Analyzing transitions', percent: 5, message: `Planning transitions for ${storyboard.length} shots (${providerName})...` });

    const transitionPlans = [];
    const totalPairs = storyboard.length - 1;
    for (let i = 0; i < totalPairs; i++) {
      const shotA = storyboard[i];
      const shotB = storyboard[i + 1];

      log('analyzing_transition', { from: shotA.shot, to: shotB.shot });
      progress({ phase: 'Analyzing transitions', percent: 5 + Math.round((i / totalPairs) * 10), message: `Analyzing transition ${i + 1}/${totalPairs}: Shot ${shotA.shot} → ${shotB.shot}` });

      try {
        const analysis = await analyzeShotTransition(shotA, shotB);
        transitionPlans.push({
          index: i,
          shotA: { shot: shotA.shot, description: shotA.description, imageUrl: shotA.imageUrl },
          shotB: { shot: shotB.shot, description: shotB.description, imageUrl: shotB.imageUrl },
          prompt: analysis.transition_prompt,
          duration: analysis.duration,
        });
      } catch (e) {
        console.error(`Failed to analyze transition for shots ${shotA.shot}->${shotB.shot}`, e);
        transitionPlans.push({
          index: i,
          shotA: { shot: shotA.shot, description: shotA.description, imageUrl: shotA.imageUrl },
          shotB: { shot: shotB.shot, description: shotB.description, imageUrl: shotB.imageUrl },
          prompt: 'Cinematic transition, smooth camera movement.',
          duration: 6,
        });
      }
    }

    // Add a closing clip for the final shot (no trailing frame)
    const closingShot = storyboard[storyboard.length - 1];
    const parsedClosingDuration = parseInt(closingShot.duration, 10);
    const validDurations = [4, 6, 8];
    const closingDuration = validDurations.includes(parsedClosingDuration) ? parsedClosingDuration : 6;
    const closingPrompt = `${closingShot.prompt || closingShot.description || 'Final lingering shot.'} Hold on the final frame with a gentle cinematic finish.`;
    transitionPlans.push({
      index: transitionPlans.length,
      shotA: { shot: closingShot.shot, description: closingShot.description, imageUrl: closingShot.imageUrl },
      shotB: null,
      prompt: closingPrompt,
      duration: closingDuration,
      isClosing: true,
    });

    log('transition_plans_ready', { count: transitionPlans.length });
    videoLogStore.updateLog(logId, { status: 'generating', transitionPlans });
    progress({ phase: 'Generating clips', percent: 15, message: `Transition plans ready. Generating ${transitionPlans.length} clips with ${providerName}...` });

    // --- PHASE 2: GENERATE (Parallel Execution) ---
    const totalClips = transitionPlans.length;
    let completedClips = 0;

    const generatePromises = transitionPlans.map(async (plan) => {
      const { index, shotA, shotB, prompt, duration } = plan;

      try {
        log('generating_clip_start', { index, duration, closing: !!plan.isClosing, provider: providerName });

        const result = await generateClipDirectly({
          prompt,
          duration_seconds: duration,
          first_frame_url: shotA.imageUrl,
          last_frame_url: shotB ? shotB.imageUrl : null,
          provider: providerName,
          model: options.model,
        });

        completedClips++;
        progress({ phase: 'Generating clips', percent: 15 + Math.round((completedClips / totalClips) * 70), message: `Clip ${completedClips}/${totalClips} complete (${result.provider})` });

        let videoPath = null;
        if (result.video_path) {
          videoPath = result.video_path;
        } else if (result.video_uri) {
          console.warn(`GCS URI returned: ${result.video_uri}.`);
          throw new Error('GCS URI returned, direct download not fully supported.');
        }

        return { index, videoPath, prompt, duration, provider: result.provider || providerName };
      } catch (e) {
        console.error(`Error generating clip for index ${index}:`, e);
        throw e;
      }
    });

    const clipResults = await Promise.all(generatePromises);
    clipResults.sort((a, b) => a.index - b.index);
    const videoFiles = clipResults.map(r => r.videoPath);

    videoLogStore.updateLog(logId, { status: 'stitching', clipResults });
    progress({ phase: 'Stitching video', percent: 90, message: 'All clips generated. Stitching final video...' });

    // --- PHASE 3: STITCH (Assembly) ---
    log('stitching_videos', { files: videoFiles });

    const outputName = `full_story_${Date.now()}.mp4`;
    const outputPath = path.join(videoDir, outputName);

    const concatListPath = path.join(videoDir, `concat_list_${Date.now()}.txt`);
    const concatContent = videoFiles.filter(Boolean).map(f => `file '${f}'`).join('\n');
    if (!concatContent) {
      throw new Error('No video files to stitch.');
    }
    await fs.promises.writeFile(concatListPath, concatContent);

    const ffmpeg = require('fluent-ffmpeg');
    const ffmpegPath = require('ffmpeg-static');
    if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatListPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions(['-c', 'copy'])
        .on('end', () => {
          log('ffmpeg_stitch_complete', { outputPath });
          resolve();
        })
        .on('error', (err) => {
          log('ffmpeg_stitch_error', { error: err.message });
          reject(err);
        })
        .save(outputPath);
    });

    const finalVideoUrl = `http://localhost:${process.env.PORT || 3005}/videos/${outputName}`;
    const duration = Date.now() - startTime;

    videoLogStore.updateLog(logId, {
      status: 'completed',
      finalVideoUrl,
      duration,
    });

    log('full_video_complete', { output: outputPath, logId, duration, provider: providerName });
    progress({ phase: 'Complete', percent: 100, message: 'Video generation complete!', videoUrl: finalVideoUrl });
    return finalVideoUrl;

  } catch (error) {
    const duration = Date.now() - startTime;
    videoLogStore.updateLog(logId, {
      status: 'error',
      errorMessage: error.message,
      duration,
    });
    progress({ phase: 'Error', percent: 0, message: error.message });
    throw error;
  }
};

/**
 * Generate a single standalone clip (no storyboard, no stitching).
 * Used by the standalone video generation endpoint.
 *
 * @param {object} params
 * @param {string} params.prompt           - Text prompt
 * @param {string} params.provider         - Provider name ('kling','luma','hailuo','vertex')
 * @param {object} [params.options]        - Provider-specific options (resolution, aspect_ratio, multi_shots, etc.)
 * @param {function} [params.progressCallback] - Progress callback: (data) => void
 * @returns {{ video_path: string, provider: string, videoUrl: string }}
 */
exports.generateStandaloneClip = async ({ prompt, provider, options = {}, progressCallback }) => {
  ensureDirs();
  const startTime = Date.now();
  const providerName = provider || process.env.DEFAULT_VIDEO_PROVIDER || 'vertex';

  const progress = progressCallback || (() => {});

  log('standalone_clip_start', { provider: providerName, hasMultiShots: !!options.multi_shots });
  progress({ phase: 'Starting', percent: 5, message: `Starting video generation with ${providerName}...` });

  try {
    progress({ phase: 'Generating', percent: 15, message: `Generating clip with ${providerName}... This may take a few minutes.` });

    const result = await generateClipDirectly({
      prompt,
      duration_seconds: options.duration || 5,
      first_frame_url: null,
      last_frame_url: null,
      provider: providerName,
      model: options.model,
      options,
    });

    if (!result.video_path) {
      throw new Error('No video file generated');
    }

    const videoFileName = path.basename(result.video_path);
    const videoUrl = `http://localhost:${process.env.PORT || 3005}/videos/${videoFileName}`;
    const duration = Date.now() - startTime;

    log('standalone_clip_complete', { provider: providerName, videoUrl, duration });
    progress({ phase: 'Complete', percent: 100, message: 'Video generation complete!', videoUrl });

    return { video_path: result.video_path, provider: result.provider || providerName, videoUrl };

  } catch (error) {
    const duration = Date.now() - startTime;
    log('standalone_clip_error', { provider: providerName, error: error.message, duration });
    progress({ phase: 'Error', percent: 0, message: error.message });
    throw error;
  }
};

// --- Backwards Compatibility Exports ---
exports.generateVideo = async (storyboard) => {
  return exports.generateFullVideoFromShots(storyboard);
};

exports.generateSequencedVideo = async (storyboard, segments) => {
  return exports.generateFullVideoFromShots(storyboard);
};

exports.generateVideosForSegments = async (storyboard, segments) => {
  return exports.generateFullVideoFromShots(storyboard);
};
