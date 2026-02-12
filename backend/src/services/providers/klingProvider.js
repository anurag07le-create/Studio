/**
 * klingProvider.js — Kling 3.0 Omni video generation via PiAPI
 *
 * API:  POST https://api.piapi.ai/api/v1/task
 * Model: "kling", task_type: "omni_video_generation"
 * Supports image-to-video via `images` array + @image_1 prompt reference
 */
const path = require('path');
const { log } = require('../../utils/logger');
const piApi = require('./piApiProvider');

const dataDir = path.join(__dirname, '../../../data');
const videoDir = path.join(dataDir, 'videos');

/**
 * Generate a single clip using Kling 3.0 Omni.
 * @param {object} params
 * @param {string} params.prompt
 * @param {string|null} params.firstFrameUrl  - Data URI or HTTP URL of the start image
 * @param {string|null} params.lastFrameUrl   - (Not supported by Kling Omni — ignored)
 * @param {number} params.durationSeconds     - 3-15 seconds
 * @param {string} [params.model]             - Unused (always "kling")
 * @param {object} [params.options]           - Provider-specific options
 * @param {string} [params.options.resolution]    - '720p' or '1080p' (default: '1080p')
 * @param {string} [params.options.aspect_ratio]  - '16:9', '9:16', or '1:1' (default: '16:9')
 * @param {boolean} [params.options.enable_audio] - Enable audio (default: true)
 * @param {Array} [params.options.multi_shots]    - Multi-shot array: [{ prompt, duration }] (max 6 shots, total ≤15s)
 * @returns {{ video_path: string, provider: 'kling' }}
 */
exports.generateClip = async ({ prompt, firstFrameUrl, lastFrameUrl, durationSeconds, options = {} }) => {
  const apiKey = process.env.PIAPI_KEY;
  if (!apiKey) throw new Error('PIAPI_KEY is required for Kling provider');

  // Resolve configurable options with defaults
  const resolution = options.resolution || '1080p';
  const aspectRatio = options.aspect_ratio || '16:9';
  const enableAudio = options.enable_audio !== undefined ? options.enable_audio : true;

  // Build input
  const input = {
    version: '3.0',
    resolution,
    aspect_ratio: aspectRatio,
    enable_audio: enableAudio,
  };

  // Multi-shots mode (Kling 3.0 exclusive)
  if (options.multi_shots && Array.isArray(options.multi_shots) && options.multi_shots.length > 0) {
    // Validate constraints
    if (options.multi_shots.length > 6) {
      throw new Error('Kling multi_shots supports a maximum of 6 shots');
    }
    const totalDuration = options.multi_shots.reduce((sum, s) => sum + (s.duration || 3), 0);
    if (totalDuration > 15) {
      throw new Error(`Kling multi_shots total duration (${totalDuration}s) exceeds 15-second maximum`);
    }

    input.multi_shots = options.multi_shots.map(s => ({
      prompt: s.prompt || '',
      duration: Math.max(1, Math.min(14, s.duration || 3)),
    }));

    // Image support in multi-shot mode
    if (firstFrameUrl) {
      input.images = [firstFrameUrl];
      // Prepend @image_1 to first shot prompt
      if (input.multi_shots[0]) {
        input.multi_shots[0].prompt = `@image_1 ${input.multi_shots[0].prompt}`;
      }
    }

    log('kling_generate_start', { mode: 'multi_shots', shots: input.multi_shots.length, totalDuration, hasImage: !!firstFrameUrl });
  } else {
    // Single-shot mode (original behavior)
    const duration = Math.max(3, Math.min(15, durationSeconds || 5));
    input.prompt = firstFrameUrl ? `@image_1 ${prompt}` : prompt;
    input.duration = duration;

    if (firstFrameUrl) {
      input.images = [firstFrameUrl];
    }

    log('kling_generate_start', { mode: 'single', duration, hasImage: !!firstFrameUrl });
  }

  const body = {
    model: 'kling',
    task_type: 'omni_video_generation',
    input,
    config: { service_mode: 'public' },
  };

  const taskId = await piApi.createTask(apiKey, body);
  const result = await piApi.pollTask(apiKey, taskId);
  const videoUrl = piApi.extractVideoUrl(result);

  if (!videoUrl) {
    throw new Error(`Kling: No video URL in completed task ${taskId}`);
  }

  const videoPath = await piApi.downloadVideo(videoUrl, videoDir, 'clip_kling');
  log('kling_generate_complete', { taskId, videoPath });

  return { video_path: videoPath, provider: 'kling' };
};
