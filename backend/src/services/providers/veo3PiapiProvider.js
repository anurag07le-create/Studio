/**
 * veo3PiapiProvider.js — Veo 3 / Veo 3.1 video generation via PiAPI
 *
 * API:  POST https://api.piapi.ai/api/v1/task
 * Model: "veo3" (Veo 3) or "veo3.1" (Veo 3.1)
 * Task types: veo3-video, veo3-video-fast, veo3.1-video, veo3.1-video-fast
 * Supports image-to-video via `image_url` field
 */
const path = require('path');
const { log } = require('../../utils/logger');
const piApi = require('./piApiProvider');

const outputDir = path.join(__dirname, '../../../output/clips');

/**
 * Generate a single clip using Veo 3 or Veo 3.1.
 * @param {object} params
 * @param {string} params.prompt
 * @param {string|null} params.firstFrameUrl  - Start frame image URL/data URI
 * @param {string|null} params.lastFrameUrl   - (Not supported — ignored)
 * @param {number} params.durationSeconds     - Duration in seconds
 * @param {object} [params.options]           - Provider-specific options
 * @param {string} [params.options.model_version]  - 'veo3' or 'veo3.1' (default: 'veo3')
 * @param {string} [params.options.speed]          - 'standard' or 'fast' (default: 'standard')
 * @param {string} [params.options.aspect_ratio]   - '16:9' or '9:16' (default: '16:9')
 * @param {string} [params.options.duration]       - '4s', '6s', or '8s' (default: '8s')
 * @param {string} [params.options.resolution]     - '720p' or '1080p' (default: '720p')
 * @param {boolean} [params.options.generate_audio] - Enable audio generation (default: false)
 * @returns {{ localPath: string, remoteUrl: string }}
 */
exports.generateClip = async ({ prompt, firstFrameUrl, lastFrameUrl, durationSeconds, options = {} }) => {
  const apiKey = process.env.PIAPI_KEY;
  if (!apiKey) throw new Error('PIAPI_KEY is required for Veo3 provider');

  // Resolve options with defaults
  const modelVersion = options.model_version || 'veo3';
  const speed = options.speed || 'standard';
  const aspectRatio = options.aspect_ratio || '16:9';
  const duration = options.duration || '8s';
  const resolution = options.resolution || '720p';
  const generateAudio = options.generate_audio !== undefined ? options.generate_audio : false;

  // Build task_type from model_version and speed
  // e.g. 'veo3-video', 'veo3-video-fast', 'veo3.1-video', 'veo3.1-video-fast'
  const taskType = speed === 'fast'
    ? `${modelVersion}-video-fast`
    : `${modelVersion}-video`;

  const input = {
    prompt,
    aspect_ratio: aspectRatio,
    duration,
    resolution,
    generate_audio: generateAudio,
  };

  // Add image for image-to-video
  if (firstFrameUrl) {
    input.image_url = firstFrameUrl;
  }

  const body = {
    model: modelVersion,
    task_type: taskType,
    input,
    config: { service_mode: 'public' },
  };

  log('veo3_generate_start', {
    modelVersion,
    taskType,
    aspectRatio,
    duration,
    resolution,
    generateAudio,
    hasImage: !!firstFrameUrl,
  });

  const taskId = await piApi.createTask(apiKey, body);
  const result = await piApi.pollTask(apiKey, taskId);
  const videoUrl = piApi.extractVideoUrl(result);

  if (!videoUrl) {
    throw new Error(`Veo3: No video URL in completed task ${taskId}`);
  }

  const localPath = await piApi.downloadVideo(videoUrl, outputDir, 'clip_veo3');
  log('veo3_generate_complete', { taskId, localPath });

  return { localPath, remoteUrl: videoUrl };
};
