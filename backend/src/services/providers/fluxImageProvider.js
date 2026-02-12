/**
 * fluxImageProvider.js — Flux image generation via PiAPI
 * Supports: txt2img, img2img, fill-inpaint, fill-outpaint, redux-variation
 * Models: Qubico/flux1-dev, Qubico/flux1-schnell, Qubico/flux1-dev-advanced
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
 * Generate image using Flux.
 * @param {object} params
 * @param {string} params.prompt
 * @param {object} [params.options]
 * @param {string} [params.options.model] - 'Qubico/flux1-dev' (default), 'Qubico/flux1-schnell', 'Qubico/flux1-dev-advanced'
 * @param {string} [params.options.task_type] - 'txt2img' (default), 'img2img', 'fill-inpaint', 'fill-outpaint', 'redux-variation'
 * @param {number} [params.options.width] - Default 1024
 * @param {number} [params.options.height] - Default 1024
 * @param {string} [params.options.image] - Input image URL for img2img/inpaint/outpaint/redux
 * @param {string} [params.options.negative_prompt]
 * @param {number} [params.options.guidance_scale] - 1.5-5
 * @param {number} [params.options.denoise] - 0-1, default 0.7 (for img2img)
 * @param {number} [params.options.batch_size] - 1-4 (schnell only)
 * @param {object} [params.options.outpaint_settings] - { left, right, top, bottom } for fill-outpaint
 * @returns {{ imageUrl: string }}
 */
exports.generateImage = async ({ prompt, options = {} }) => {
  const apiKey = process.env.PIAPI_KEY;
  if (!apiKey) throw new Error('PIAPI_KEY is required for Flux provider');

  const model = options.model || 'Qubico/flux1-dev';
  const taskType = options.task_type || 'txt2img';

  const input = { prompt };

  // Add dimensions for txt2img
  if (taskType === 'txt2img') {
    input.width = options.width || 1024;
    input.height = options.height || 1024;
  }

  // Add image for img2img/inpaint/outpaint/redux
  if (options.image && ['img2img', 'fill-inpaint', 'fill-outpaint', 'redux-variation'].includes(taskType)) {
    input.image = options.image;
  }

  // Optional params
  if (options.negative_prompt) input.negative_prompt = options.negative_prompt;
  if (options.guidance_scale !== undefined) input.guidance_scale = options.guidance_scale;
  if (options.denoise !== undefined) input.denoise = options.denoise;
  if (options.batch_size && model === 'Qubico/flux1-schnell') input.batch_size = options.batch_size;

  // Outpaint settings
  if (taskType === 'fill-outpaint' && options.outpaint_settings) {
    input.custom_settings = [{
      setting_type: 'outpaint',
      outpaint_left: options.outpaint_settings.left || 0,
      outpaint_right: options.outpaint_settings.right || 0,
      outpaint_top: options.outpaint_settings.top || 0,
      outpaint_bottom: options.outpaint_settings.bottom || 0,
    }];
  }

  const body = {
    model,
    task_type: taskType,
    input,
    config: { service_mode: 'public' },
  };

  log('flux_generate_start', { model, taskType, hasImage: !!options.image });

  const taskId = await piApi.createTask(apiKey, body);
  const result = await piApi.pollTask(apiKey, taskId);
  const imageUrl = extractImageUrl(result);

  if (!imageUrl) {
    throw new Error(`Flux: No image URL in completed task ${taskId}`);
  }

  log('flux_generate_complete', { taskId, model, taskType });
  return { imageUrl };
};
