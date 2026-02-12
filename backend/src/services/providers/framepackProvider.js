/**
 * framepackProvider.js — Framepack img2video via PiAPI
 * Model: Qubico/framepack, task_type: img2video
 * Specialized for long video generation from static images (10-30s)
 */
const path = require('path');
const { log } = require('../../utils/logger');
const piApi = require('./piApiProvider');

const dataDir = path.join(__dirname, '../../../data');
const videoDir = path.join(dataDir, 'videos');

/**
 * @param {object} params
 * @param {string} params.prompt
 * @param {string|null} params.firstFrameUrl - Required start image
 * @param {string|null} params.lastFrameUrl - Optional end image
 * @param {number} [params.durationSeconds] - 10-30, default 10
 * @param {object} [params.options]
 * @param {string} [params.options.negative_prompt]
 * @returns {{ video_path: string, provider: 'framepack' }}
 */
exports.generateClip = async ({ prompt, firstFrameUrl, lastFrameUrl, durationSeconds, options = {} }) => {
  const apiKey = process.env.PIAPI_KEY;
  if (!apiKey) throw new Error('PIAPI_KEY is required for Framepack provider');

  if (!firstFrameUrl) {
    throw new Error('Framepack requires a start image (firstFrameUrl). This is an image-to-video only model.');
  }

  const duration = Math.max(10, Math.min(30, durationSeconds || 10));

  const input = {
    prompt,
    start_image: firstFrameUrl,
    duration,
  };

  if (lastFrameUrl) input.end_image = lastFrameUrl;
  if (options.negative_prompt) input.negative_prompt = options.negative_prompt;

  const body = {
    model: 'Qubico/framepack',
    task_type: 'img2video',
    input,
    config: { service_mode: 'public' },
  };

  log('framepack_generate_start', { duration, hasEndImage: !!lastFrameUrl });

  const taskId = await piApi.createTask(apiKey, body);
  const result = await piApi.pollTask(apiKey, taskId);
  const videoUrl = piApi.extractVideoUrl(result);

  if (!videoUrl) throw new Error(`Framepack: No video URL in completed task ${taskId}`);

  const videoPath = await piApi.downloadVideo(videoUrl, videoDir, 'clip_framepack');
  log('framepack_generate_complete', { taskId, videoPath });

  return { video_path: videoPath, provider: 'framepack' };
};
