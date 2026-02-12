/**
 * lumaProvider.js — Luma Ray-v2 (Dream Machine) video generation via PiAPI
 *
 * API:  POST https://api.piapi.ai/api/v1/task
 * Model: "luma", task_type: "video_generation"
 * Supports image-to-video via key_frames.frame0/frame1
 */
const path = require('path');
const { log } = require('../../utils/logger');
const piApi = require('./piApiProvider');

const dataDir = path.join(__dirname, '../../../data');
const videoDir = path.join(dataDir, 'videos');

/**
 * Generate a single clip using Luma Ray-v2.
 * @param {object} params
 * @param {string} params.prompt
 * @param {string|null} params.firstFrameUrl  - Start frame image URL/data URI
 * @param {string|null} params.lastFrameUrl   - End frame image URL/data URI
 * @param {number} params.durationSeconds     - 5 or 10 seconds
 * @param {string} [params.model]             - Unused (always "ray-v2")
 * @param {object} [params.options]           - Provider-specific options
 * @param {string} [params.options.aspect_ratio]  - '1:1','16:9','9:16','4:3','3:4','21:9','9:21' (default: '16:9')
 * @param {number} [params.options.duration]      - 5 or 10 (overrides auto-logic)
 * @param {boolean} [params.options.loop]         - Loop the video (default: false)
 * @param {string} [params.options.resolution]    - '540p' or '720p'
 * @returns {{ video_path: string, provider: 'luma' }}
 */
exports.generateClip = async ({ prompt, firstFrameUrl, lastFrameUrl, durationSeconds, options = {} }) => {
  const apiKey = process.env.PIAPI_KEY;
  if (!apiKey) throw new Error('PIAPI_KEY is required for Luma provider');

  // Duration: use explicit option, else auto-logic
  let duration;
  if (options.duration && (options.duration === 5 || options.duration === 10)) {
    duration = options.duration;
  } else {
    duration = firstFrameUrl ? 5 : (durationSeconds >= 8 ? 10 : 5);
  }

  const aspectRatio = options.aspect_ratio || '16:9';

  const input = {
    prompt,
    model_name: 'ray-v2',
    duration,
    aspect_ratio: aspectRatio,
  };

  // Optional loop
  if (options.loop === true) {
    input.loop = true;
  }

  // Optional resolution
  if (options.resolution && ['540p', '720p'].includes(options.resolution)) {
    input.resolution = options.resolution;
  }

  // Add key_frames for image-to-video
  if (firstFrameUrl || lastFrameUrl) {
    input.key_frames = {};
    if (firstFrameUrl) {
      input.key_frames.frame0 = { type: 'image', url: firstFrameUrl };
    }
    if (lastFrameUrl) {
      input.key_frames.frame1 = { type: 'image', url: lastFrameUrl };
    }
  }

  const body = {
    model: 'luma',
    task_type: 'video_generation',
    input,
    config: { service_mode: 'public' },
  };

  log('luma_generate_start', { duration, aspectRatio, loop: !!options.loop, hasStartFrame: !!firstFrameUrl, hasEndFrame: !!lastFrameUrl });

  const taskId = await piApi.createTask(apiKey, body);
  const result = await piApi.pollTask(apiKey, taskId);
  const videoUrl = piApi.extractVideoUrl(result);

  if (!videoUrl) {
    throw new Error(`Luma: No video URL in completed task ${taskId}`);
  }

  const videoPath = await piApi.downloadVideo(videoUrl, videoDir, 'clip_luma');
  log('luma_generate_complete', { taskId, videoPath });

  return { video_path: videoPath, provider: 'luma' };
};
