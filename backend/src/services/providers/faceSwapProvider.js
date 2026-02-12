/**
 * faceSwapProvider.js — FaceSwap (PiAPI image-toolkit)
 * Model: Qubico/image-toolkit
 * Task types: face-swap, multi-face-swap
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
 * @param {string} params.prompt - Not used for face swap, but kept for API consistency
 * @param {object} [params.options]
 * @param {string} params.options.target_image - Target image URL
 * @param {string} params.options.swap_image - Source face image URL
 * @param {boolean} [params.options.multi] - Use multi-face-swap
 * @param {string} [params.options.swap_faces_index] - e.g., "0,1"
 * @param {string} [params.options.target_faces_index] - e.g., "0,1"
 * @returns {{ imageUrl: string }}
 */
exports.generateImage = async ({ prompt, options = {} }) => {
  const apiKey = process.env.PIAPI_KEY;
  if (!apiKey) throw new Error('PIAPI_KEY is required for FaceSwap provider');

  if (!options.target_image || !options.swap_image) {
    throw new Error('FaceSwap requires target_image and swap_image in options');
  }

  const taskType = options.multi ? 'multi-face-swap' : 'face-swap';
  const input = {
    target_image: options.target_image,
    swap_image: options.swap_image,
  };

  if (taskType === 'multi-face-swap') {
    if (options.swap_faces_index) input.swap_faces_index = options.swap_faces_index;
    if (options.target_faces_index) input.target_faces_index = options.target_faces_index;
  }

  const body = {
    model: 'Qubico/image-toolkit',
    task_type: taskType,
    input,
    config: { service_mode: 'public' },
  };

  log('faceswap_start', { taskType, hasMulti: !!options.multi });

  const taskId = await piApi.createTask(apiKey, body);
  const result = await piApi.pollTask(apiKey, taskId);
  const imageUrl = extractImageUrl(result);

  if (!imageUrl) throw new Error(`FaceSwap: No image URL in completed task ${taskId}`);

  log('faceswap_complete', { taskId, taskType });
  return { imageUrl };
};
