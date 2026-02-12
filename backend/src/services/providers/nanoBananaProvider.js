/**
 * nanoBananaProvider.js — Nano Banana (Google Gemini 2.5 Flash Image) via PiAPI
 * Model: gemini, task_type: gemini-2.5-flash-image
 * Supports up to 4 input images for image-to-image
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
 * @param {number} [params.options.num_images] - Default 1
 * @param {string} [params.options.output_format] - 'png' or 'jpeg'
 * @param {string[]} [params.options.images] - Array of input image URLs (up to 4)
 * @returns {{ imageUrl: string }}
 */
exports.generateImage = async ({ prompt, options = {} }) => {
  const apiKey = process.env.PIAPI_KEY;
  if (!apiKey) throw new Error('PIAPI_KEY is required for Nano Banana provider');

  const input = { prompt };

  if (options.num_images) input.num_images = options.num_images;
  if (options.output_format) input.output_format = options.output_format;
  if (options.images && options.images.length > 0) input.images = options.images;

  const body = {
    model: 'gemini',
    task_type: 'gemini-2.5-flash-image',
    input,
    config: { service_mode: 'public' },
  };

  log('nano_banana_start', { numImages: options.num_images || 1, hasInputImages: !!(options.images && options.images.length) });

  const taskId = await piApi.createTask(apiKey, body);
  const result = await piApi.pollTask(apiKey, taskId);
  const imageUrl = extractImageUrl(result);

  if (!imageUrl) throw new Error(`Nano Banana: No image URL in completed task ${taskId}`);

  log('nano_banana_complete', { taskId });
  return { imageUrl };
};
