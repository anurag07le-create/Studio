/**
 * imageController.js — Standalone image generation
 * Supports: Flux, Z-Image, Qwen Image, Nano Banana, FaceSwap
 */
const fluxProvider = require('../services/providers/fluxImageProvider');
const zimageProvider = require('../services/providers/zimageProvider');
const qwenImageProvider = require('../services/providers/qwenImageProvider');
const nanoBananaProvider = require('../services/providers/nanoBananaProvider');
const faceSwapProvider = require('../services/providers/faceSwapProvider');

const IMAGE_PROVIDERS = {
  flux: fluxProvider,
  zimage: zimageProvider,
  qwen: qwenImageProvider,
  nano_banana: nanoBananaProvider,
  faceswap: faceSwapProvider,
};

/**
 * Generate a standalone image.
 *
 * POST /api/v2/image/generate
 * Body: { prompt, provider, options }
 */
exports.generateStandalone = async (req, res) => {
  try {
    const { prompt, provider: providerName = 'flux', options = {} } = req.body;

    // FaceSwap doesn't need a prompt but needs images
    if (providerName !== 'faceswap' && (!prompt || !prompt.trim())) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const providerKey = providerName.toLowerCase();
    const provider = IMAGE_PROVIDERS[providerKey];

    if (!provider) {
      return res.status(400).json({
        error: `Unknown image provider: ${providerName}. Available: ${Object.keys(IMAGE_PROVIDERS).join(', ')}`,
      });
    }

    const result = await provider.generateImage({ prompt, options });

    res.json({
      imageUrl: result.imageUrl,
      provider: providerKey,
      model: options.model || providerKey,
    });
  } catch (err) {
    console.error('Error generating standalone image:', err);
    res.status(500).json({ error: err.message });
  }
};
