/**
 * wanProvider.js — Wan (WanX) video generation via PiAPI
 *
 * API:  POST https://api.piapi.ai/api/v1/task
 * Model: "Qubico/wanx"
 * Task types: txt2video-14b (default), txt2video-1.3b, img2video-14b
 * Supports image-to-video via `image` field
 */
const path = require('path');
const { log } = require('../../utils/logger');
const piApi = require('./piApiProvider');

const outputDir = path.join(__dirname, '../../../output/clips');

/**
 * Generate a single clip using Wan (WanX).
 * @param {object} params
 * @param {string} params.prompt
 * @param {string|null} params.firstFrameUrl  - Start frame image URL/data URI
 * @param {string|null} params.lastFrameUrl   - (Not supported — ignored)
 * @param {number} params.durationSeconds     - Duration in seconds
 * @param {object} [params.options]           - Provider-specific options
 * @param {string} [params.options.task_type]       - 'txt2video-14b', 'txt2video-1.3b', or 'img2video-14b' (default: 'txt2video-14b')
 * @param {string} [params.options.aspect_ratio]    - '16:9' or '9:16' (default: '16:9')
 * @param {string} [params.options.negative_prompt] - Negative prompt (optional)
 * @returns {{ localPath: string, remoteUrl: string }}
 */
exports.generateClip = async ({ prompt, firstFrameUrl, lastFrameUrl, durationSeconds, options = {} }) => {
  const apiKey = process.env.PIAPI_KEY;
  if (!apiKey) throw new Error('PIAPI_KEY is required for Wan provider');

  // Resolve task type
  let taskType = options.task_type || 'txt2video-14b';

  // Auto-switch to img2video if image provided and task_type not explicitly set
  if (firstFrameUrl && !options.task_type) {
    taskType = 'img2video-14b';
  }

  const aspectRatio = options.aspect_ratio || '16:9';

  const input = {
    prompt,
    aspect_ratio: aspectRatio,
  };

  // Add negative prompt if provided
  if (options.negative_prompt) {
    input.negative_prompt = options.negative_prompt;
  }

  // Add image for image-to-video
  if (firstFrameUrl && taskType === 'img2video-14b') {
    input.image = firstFrameUrl;
  }

  const body = {
    model: 'Qubico/wanx',
    task_type: taskType,
    input,
    config: { service_mode: 'public' },
  };

  log('wan_generate_start', {
    taskType,
    aspectRatio,
    hasImage: !!firstFrameUrl,
    hasNegativePrompt: !!options.negative_prompt,
  });

  const taskId = await piApi.createTask(apiKey, body);
  const result = await piApi.pollTask(apiKey, taskId);
  const videoUrl = piApi.extractVideoUrl(result);

  if (!videoUrl) {
    throw new Error(`Wan: No video URL in completed task ${taskId}`);
  }

  const localPath = await piApi.downloadVideo(videoUrl, outputDir, 'clip_wan');
  log('wan_generate_complete', { taskId, localPath });

  return { localPath, remoteUrl: videoUrl };
};
