/**
 * vertexProvider.js — Google Vertex AI Veo video generation
 *
 * Extracted from videoService.js to follow the provider pattern.
 * Uses Google Cloud service account for authentication.
 */
const fs = require('fs');
const path = require('path');
const { fetch } = require('undici');
const { log } = require('../../utils/logger');
const { GoogleAuth } = require('google-auth-library');

const dataDir = path.join(__dirname, '../../../data');
const videoDir = path.join(dataDir, 'videos');

/** Start an async video generation job on Vertex AI */
const startVideoJobVertex = async ({ prompt, model, firstFrame, lastFrame, durationSeconds, options = {} }) => {
  const projectId = process.env.VERTEX_PROJECT_ID;
  const location = process.env.VERTEX_LOCATION || 'us-central1';
  if (!projectId) throw new Error('VERTEX_PROJECT_ID is required for Vertex provider');

  const modelId = model.startsWith('publishers/') ? model : `publishers/google/models/${model}`;
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/${modelId}:predictLongRunning`;

  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  const token = await client.getAccessToken();

  const instance = { prompt };
  if (firstFrame) instance.image = firstFrame;
  if (lastFrame) instance.lastFrame = lastFrame;

  const body = {
    instances: [instance],
    parameters: {
      aspectRatio: options.aspectRatio || '16:9',
      durationSeconds,
      resolution: '1080p',
      personGeneration: options.personGeneration || 'allow_all',
      enhancePrompt: options.enhancePrompt !== undefined ? options.enhancePrompt : true,
      generateAudio: options.generateAudio !== undefined ? options.generateAudio : true,
    },
  };

  log('vertex_start_request', { url, modelId });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token?.token || token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to start vertex video job: ${res.status} ${text}`);
  }

  const json = await res.json();
  return json.name;
};

/** Poll a long-running Vertex operation until done */
const pollOperationVertex = async (name, maxAttempts = 60, delayMs = 40000) => {
  const projectId = process.env.VERTEX_PROJECT_ID;
  const location = process.env.VERTEX_LOCATION || 'us-central1';
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  log('vertex_poll_auth_success', { location, projectId });

  const modelId = process.env.VERTEX_VEO_MODEL_ID || 'veo-3.1-generate-preview';
  const pollUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:fetchPredictOperation`;

  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(pollUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token?.token || token}`,
      },
      body: JSON.stringify({ operationName: name }),
    });

    if (!res.ok) {
      const text = await res.text();
      log('vertex_poll_error', { status: res.status, message: text });
      await new Promise(r => setTimeout(r, delayMs));
      continue;
    }

    const json = await res.json();
    if (json.error) throw new Error(`Vertex operation error: ${json.error.message}`);

    if (json.done) {
      if (json.response && json.response.error) {
        throw new Error(`Video generation failed: ${json.response.error.message}`);
      }
      return json;
    }

    await new Promise(r => setTimeout(r, delayMs));
  }
  throw new Error('Vertex video generation timed out');
};

/** Extract video URI or base64 from Vertex response */
const extractVideoUriVertex = (op) => {
  const samples = op?.response?.generateVideoResponse?.generatedSamples;
  if (samples && samples.length > 0 && samples[0].video && samples[0].video.uri) {
    return samples[0].video.uri;
  }
  if (op?.response?.videos && op.response.videos.length > 0 && op.response.videos[0].bytesBase64Encoded) {
    return { base64: op.response.videos[0].bytesBase64Encoded };
  }
  return null;
};

/**
 * Generate a single clip using Vertex Veo.
 * @param {object} params
 * @param {string} params.prompt
 * @param {object|null} params.firstFrame  - { bytesBase64Encoded, mimeType }
 * @param {object|null} params.lastFrame
 * @param {number} params.durationSeconds
 * @param {string} [params.model]
 * @param {object} [params.options]           - Provider-specific options
 * @param {string} [params.options.aspectRatio]      - '16:9','9:16','1:1','4:3','3:4' (default: '16:9')
 * @param {boolean} [params.options.enhancePrompt]   - Enhance prompt (default: true)
 * @param {boolean} [params.options.generateAudio]   - Generate audio (default: true)
 * @param {string} [params.options.personGeneration] - 'allow_all','allow_adult','dont_allow' (default: 'allow_all')
 * @returns {{ video_path: string, provider: 'vertex' }}
 */
exports.generateClip = async ({ prompt, firstFrame, lastFrame, durationSeconds, model, options = {} }) => {
  const veoModel = model || process.env.VERTEX_VEO_MODEL || 'veo-3.1-generate-preview';

  const opName = await startVideoJobVertex({
    prompt,
    model: veoModel,
    firstFrame,
    lastFrame,
    durationSeconds,
    options,
  });

  log('vertex_clip_job_started', { opName });

  const opResult = await pollOperationVertex(opName);
  const videoData = extractVideoUriVertex(opResult);

  if (!videoData) throw new Error('No video data found in Vertex response');

  if (videoData.base64) {
    const fileName = `clip_vertex_${Date.now()}.mp4`;
    const outPath = path.join(videoDir, fileName);
    await fs.promises.writeFile(outPath, Buffer.from(videoData.base64, 'base64'));
    return { video_path: outPath, provider: 'vertex' };
  } else if (typeof videoData === 'string' && videoData.startsWith('gs://')) {
    log('received_gcs_uri', { uri: videoData });
    throw new Error('GCS URI returned, direct download not fully supported.');
  }

  return { video_path: null, provider: 'vertex' };
};
