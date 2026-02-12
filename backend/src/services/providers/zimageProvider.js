/**
 * zimageProvider.js — Z-Image Turbo (Alibaba) image generation via PiAPI
 * Model: Qubico/z-image, task_type: txt2img
 * Ultra-fast (~1s), bilingual text rendering (EN/CN)
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
 * @param {number} [params.options.width] - Default 1024
 * @param {number} [params.options.height] - Default 1024
 * @param {string} [params.options.negative_prompt]
 * @param {number} [params.options.batch_size] - Default 1
 * @param {number} [params.options.seed] - Default -1 (random)
 * @param {number} [params.options.flow_shift]
 * @returns {{ imageUrl: string }}
 */
exports.generateImage = async ({ prompt, options = {} }) => {
  const apiKey = process.env.PIAPI_KEY;
  if (!apiKey) throw new Error('PIAPI_KEY is required for Z-Image provider');

  const input = {
    prompt,
    width: options.width || 1024,
    height: options.height || 1024,
  };

  if (options.negative_prompt) input.negative_prompt = options.negative_prompt;
  if (options.batch_size) input.batch_size = options.batch_size;
  if (options.seed !== undefined) input.seed = options.seed;
  if (options.flow_shift !== undefined) input.flow_shift = options.flow_shift;

  const body = {
    model: 'Qubico/z-image',
    task_type: 'txt2img',
    input,
    config: { service_mode: 'public' },
  };

  log('zimage_generate_start', { width: input.width, height: input.height });

  const taskId = await piApi.createTask(apiKey, body);
  const result = await piApi.pollTask(apiKey, taskId);
  const imageUrl = extractImageUrl(result);

  if (!imageUrl) throw new Error(`Z-Image: No image URL in completed task ${taskId}`);

  log('zimage_generate_complete', { taskId });
  return { imageUrl };
};
