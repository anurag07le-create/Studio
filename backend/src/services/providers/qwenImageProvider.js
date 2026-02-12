/**
 * qwenImageProvider.js — Qwen Image (Alibaba) via PiAPI
 * Model: qwen-image
 * Task types: txt2img, image-edit
 * Supports 26+ languages for text rendering
 */
const { log } = require('../../utils/logger');
const piApi = require('./piApiProvider');

const extractImageUrl = (result) => {
  if (!result) return null;
  const output = result.output || result.data?.output || {};
  if (output.image_url) return output.image_url;
  if (output.image_urls && output.image_urls.length > 0) return output.image_urls[0];
  if (typeof output === 'string' && output.startsWith('http')) return output;
  return null;
};

/**
 * @param {object} params
 * @param {string} params.prompt
 * @param {object} [params.options]
 * @param {string} [params.options.task_type] - 'txt2img' (default) or 'image-edit'
 * @param {string} [params.options.image] - Input image URL for image editing
 * @param {number} [params.options.width]
 * @param {number} [params.options.height]
 * @param {number} [params.options.seed]
 * @param {number} [params.options.steps]
 * @returns {{ imageUrl: string }}
 */
exports.generateImage = async ({ prompt, options = {} }) => {
  const apiKey = process.env.PIAPI_KEY;
  if (!apiKey) throw new Error('PIAPI_KEY is required for Qwen Image provider');

  const taskType = options.task_type || 'txt2img';
  const input = { prompt };

  if (taskType === 'txt2img') {
    if (options.width) input.width = options.width;
    if (options.height) input.height = options.height;
  }

  if (taskType === 'image-edit' && options.image) {
    input.image = options.image;
  }

  if (options.seed !== undefined) input.seed = options.seed;
  if (options.steps) input.steps = options.steps;

  const body = {
    model: 'qwen-image',
    task_type: taskType,
    input,
    config: { service_mode: 'public' },
  };

  log('qwen_image_start', { taskType, hasImage: !!options.image });

  const taskId = await piApi.createTask(apiKey, body);
  const result = await piApi.pollTask(apiKey, taskId);
  const imageUrl = extractImageUrl(result);

  if (!imageUrl) throw new Error(`Qwen Image: No image URL in completed task ${taskId}`);

  log('qwen_image_complete', { taskId, taskType });
  return { imageUrl };
};
