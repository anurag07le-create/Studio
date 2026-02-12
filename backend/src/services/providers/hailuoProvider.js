/**
 * hailuoProvider.js — Hailuo (MiniMax) video generation via PiAPI
 *
 * API:  POST https://api.piapi.ai/api/v1/task
 * Model: "hailuo", task_type: "video_generation"
 * v2.3 models: "v2.3" (standard), "v2.3-fast" (fast)
 * Legacy models: "t2v-01", "i2v-01", "t2v-01-director", "i2v-01-director"
 */
const path = require('path');
const { log } = require('../../utils/logger');
const piApi = require('./piApiProvider');

const dataDir = path.join(__dirname, '../../../data');
const videoDir = path.join(dataDir, 'videos');

/**
 * Generate a single clip using Hailuo (MiniMax).
 * @param {object} params
 * @param {string} params.prompt
 * @param {string|null} params.firstFrameUrl  - Start frame image URL/data URI
 * @param {string|null} params.lastFrameUrl   - (Not supported by Hailuo — ignored)
 * @param {number} params.durationSeconds     - (Hailuo uses default duration)
 * @param {string} [params.model]             - Unused
 * @param {object} [params.options]           - Provider-specific options
 * @param {string} [params.options.model]         - Model: 'v2.3','v2.3-fast' or legacy 't2v-01','i2v-01',etc.
 * @param {boolean} [params.options.expand_prompt] - Expand prompt (default: true)
 * @param {number} [params.options.duration]      - Duration: 6 or 10 (default: 6)
 * @param {string} [params.options.resolution]    - Resolution: '768' or '1080' (default: '768')
 * @param {string} [params.options.camera_command] - Camera command for legacy director models
 * @returns {{ video_path: string, provider: 'hailuo' }}
 */
exports.generateClip = async ({ prompt, firstFrameUrl, lastFrameUrl, durationSeconds, options = {} }) => {
  const apiKey = process.env.PIAPI_KEY;
  if (!apiKey) throw new Error('PIAPI_KEY is required for Hailuo provider');

  // Model selection: explicit option > default 'v2.3'
  let modelName = options.model || 'v2.3';

  // Expand prompt: configurable, default true
  const expandPrompt = options.expand_prompt !== undefined ? options.expand_prompt : true;

  // Duration and resolution for v2.3 models
  const duration = options.duration || 6;
  const resolution = options.resolution || '768';

  // Build prompt with optional camera command for legacy director models
  let finalPrompt = prompt;
  if (options.camera_command && modelName.includes('director')) {
    finalPrompt = `[${options.camera_command}] ${prompt}`;
  }

  const input = {
    prompt: finalPrompt,
    model: modelName,
    expand_prompt: expandPrompt,
  };

  // Add v2.3 specific params
  if (modelName.startsWith('v2.3')) {
    input.duration = duration;
    input.resolution = parseInt(resolution) || 768;
  }

  // Add image for image-to-video
  if (firstFrameUrl) {
    input.image_url = firstFrameUrl;
  }

  const body = {
    model: 'hailuo',
    task_type: 'video_generation',
    input,
    config: { service_mode: 'public' },
  };

  log('hailuo_generate_start', { modelName, expandPrompt, duration, resolution, hasImage: !!firstFrameUrl });

  const taskId = await piApi.createTask(apiKey, body);
  const result = await piApi.pollTask(apiKey, taskId);
  const videoUrl = piApi.extractVideoUrl(result);

  if (!videoUrl) {
    throw new Error(`Hailuo: No video URL in completed task ${taskId}`);
  }

  const videoPath = await piApi.downloadVideo(videoUrl, videoDir, 'clip_hailuo');
  log('hailuo_generate_complete', { taskId, videoPath });

  return { video_path: videoPath, provider: 'hailuo' };
};
