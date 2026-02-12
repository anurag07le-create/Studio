/**
 * hunyuanProvider.js — Hunyuan video generation via PiAPI
 *
 * API:  POST https://api.piapi.ai/api/v1/task
 * Model: "Qubico/hunyuan"
 * Task types: txt2video (default), fast-txt2video, img2video-concat, img2video-replace
 * Supports image-to-video via `image` field
 */
const path = require('path');
const { log } = require('../../utils/logger');
const piApi = require('./piApiProvider');

const outputDir = path.join(__dirname, '../../../output/clips');

/**
 * Generate a single clip using Hunyuan.
 * @param {object} params
 * @param {string} params.prompt
 * @param {string|null} params.firstFrameUrl  - Start frame image URL/data URI
 * @param {string|null} params.lastFrameUrl   - (Not supported — ignored)
 * @param {number} params.durationSeconds     - Duration in seconds
 * @param {object} [params.options]           - Provider-specific options
 * @param {string} [params.options.task_type]    - 'txt2video', 'fast-txt2video', 'img2video-concat', or 'img2video-replace' (default: 'txt2video')
 * @param {string} [params.options.aspect_ratio] - '16:9', '9:16', or '1:1' (default: '16:9')
 * @returns {{ localPath: string, remoteUrl: string }}
 */
exports.generateClip = async ({ prompt, firstFrameUrl, lastFrameUrl, durationSeconds, options = {} }) => {
  const apiKey = process.env.PIAPI_KEY;
  if (!apiKey) throw new Error('PIAPI_KEY is required for Hunyuan provider');

  // Resolve task type
  let taskType = options.task_type || 'txt2video';

  // Auto-switch to img2video-concat if image provided and task_type is text-only
  const textOnlyTypes = ['txt2video', 'fast-txt2video'];
  if (firstFrameUrl && textOnlyTypes.includes(taskType)) {
    taskType = 'img2video-concat';
  }

  const aspectRatio = options.aspect_ratio || '16:9';

  const input = {
    prompt,
    aspect_ratio: aspectRatio,
  };

  // Add image for image-to-video task types
  if (firstFrameUrl && (taskType === 'img2video-concat' || taskType === 'img2video-replace')) {
    input.image = firstFrameUrl;
  }

  const body = {
    model: 'Qubico/hunyuan',
    task_type: taskType,
    input,
    config: { service_mode: 'public' },
  };

  log('hunyuan_generate_start', {
    taskType,
    aspectRatio,
    hasImage: !!firstFrameUrl,
  });

  const taskId = await piApi.createTask(apiKey, body);
  const result = await piApi.pollTask(apiKey, taskId);
  const videoUrl = piApi.extractVideoUrl(result);

  if (!videoUrl) {
    throw new Error(`Hunyuan: No video URL in completed task ${taskId}`);
  }

  const localPath = await piApi.downloadVideo(videoUrl, outputDir, 'clip_hunyuan');
  log('hunyuan_generate_complete', { taskId, localPath });

  return { localPath, remoteUrl: videoUrl };
};
