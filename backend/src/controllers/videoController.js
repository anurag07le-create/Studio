/**
 * videoController.js — Standalone video generation (not project-based)
 */
const crypto = require('crypto');
const videoService = require('../services/videoService');
const { emitVideoProgress } = require('../services/socketService');

/**
 * Generate a standalone video clip from a text prompt.
 * Returns 202 immediately with a jobId; progress streams via Socket.IO.
 *
 * POST /api/v2/video/generate
 * Body: { prompt, provider, options }
 */
exports.generateStandalone = async (req, res) => {
  try {
    const { prompt, provider, options = {} } = req.body;

    // Validate: require either a prompt or multi_shots
    const hasMultiShots = options.multi_shots && Array.isArray(options.multi_shots) && options.multi_shots.length > 0;
    if (!prompt && !hasMultiShots) {
      return res.status(400).json({ error: 'prompt is required (or multi_shots for Kling multi-shot mode)' });
    }

    const validProviders = ['kling', 'luma', 'hailuo', 'vertex', 'wan', 'hunyuan', 'veo3_piapi', 'skyreels', 'framepack'];
    const providerName = provider || process.env.DEFAULT_VIDEO_PROVIDER || 'vertex';
    if (!validProviders.includes(providerName)) {
      return res.status(400).json({ error: `Invalid provider. Choose from: ${validProviders.join(', ')}` });
    }

    // Generate a unique job ID
    const jobId = `vid_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Return 202 immediately
    res.status(202).json({
      jobId,
      message: `Video generation started with ${providerName}`,
      provider: providerName,
    });

    // Run generation in background — progress via Socket.IO
    const progressCallback = (data) => {
      emitVideoProgress(jobId, data);
    };

    videoService.generateStandaloneClip({
      prompt: prompt || '',
      provider: providerName,
      options,
      progressCallback,
    }).catch((err) => {
      console.error(`[StandaloneVideo] Background generation failed (${jobId}):`, err.message);
      emitVideoProgress(jobId, { phase: 'Error', percent: 0, message: err.message });
    });

  } catch (err) {
    console.error('Error starting standalone video generation:', err);
    res.status(500).json({ error: err.message });
  }
};
