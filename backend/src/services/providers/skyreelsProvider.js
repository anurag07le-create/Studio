/**
 * skyreelsProvider.js — SkyReels video generation via PiAPI
 *
 * API:  POST https://api.piapi.ai/api/v1/task
 * Model: "Qubico/skyreels"
 * Task type: img2video only (requires image)
 * Requires firstFrameUrl — throws error if not provided
 */
const path = require('path');
const { log } = require('../../utils/logger');
const piApi = require('./piApiProvider');

const outputDir = path.join(__dirname, '../../../output/clips');

/**
 * Generate a single clip using SkyReels (image-to-video only).
 * @param {object} params
 * @param {string} params.prompt
 * @param {string} params.firstFrameUrl       - Start frame image URL/data URI (REQUIRED)
 * @param {string|null} params.lastFrameUrl   - (Not supported — ignored)
 * @param {number} params.durationSeconds     - Duration in seconds
 * @param {object} [params.options]           - Provider-specific options
 * @param {string} [params.options.aspect_ratio]    - '16:9', '9:16', or '1:1' (default: '16:9')
 * @param {number} [params.options.guidance_scale]  - Guidance scale 0-10 (default: 3.5)
 * @param {string} [params.options.negative_prompt] - Negative prompt (optional)
 * @returns {{ localPath: string, remoteUrl: string }}
 */
exports.generateClip = async ({ prompt, firstFrameUrl, lastFrameUrl, durationSeconds, options = {} }) => {
  const apiKey = process.env.PIAPI_KEY;
  if (!apiKey) throw new Error('PIAPI_KEY is required for SkyReels provider');

  // SkyReels is img2video only — image is required
  if (!firstFrameUrl) {
    throw new Error('SkyReels requires firstFrameUrl — this provider only supports img2video');
  }

  const aspectRatio = options.aspect_ratio || '16:9';
  const guidanceScale = options.guidance_scale !== undefined ? options.guidance_scale : 3.5;

  const input = {
    prompt,
    image: firstFrameUrl,
    aspect_ratio: aspectRatio,
    guidance_scale: guidanceScale,
  };

  // Add negative prompt if provided
  if (options.negative_prompt) {
    input.negative_prompt = options.negative_prompt;
  }

  const body = {
    model: 'Qubico/skyreels',
    task_type: 'img2video',
    input,
    config: { service_mode: 'public' },
  };

  log('skyreels_generate_start', {
    aspectRatio,
    guidanceScale,
    hasNegativePrompt: !!options.negative_prompt,
  });

  const taskId = await piApi.createTask(apiKey, body);
  const result = await piApi.pollTask(apiKey, taskId);
  const videoUrl = piApi.extractVideoUrl(result);

  if (!videoUrl) {
    throw new Error(`SkyReels: No video URL in completed task ${taskId}`);
  }

  const localPath = await piApi.downloadVideo(videoUrl, outputDir, 'clip_skyreels');
  log('skyreels_generate_complete', { taskId, localPath });

  return { localPath, remoteUrl: videoUrl };
};
