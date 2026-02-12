/**
 * piApiProvider.js — Shared PiAPI client for Kling, Luma, Hailuo
 *
 * Unified API:
 *   Create: POST https://api.piapi.ai/api/v1/task
 *   Poll:   GET  https://api.piapi.ai/api/v1/task/{task_id}
 *   Auth:   x-api-key header
 */
const fs = require('fs');
const path = require('path');
const { fetch } = require('undici');
const { log } = require('../../utils/logger');

const PIAPI_BASE = 'https://api.piapi.ai/api/v1';

/**
 * Create a task on PiAPI.
 * @param {string} apiKey - PiAPI API key
 * @param {object} body   - { model, task_type, input, config? }
 * @returns {string} task_id
 */
async function createTask(apiKey, body) {
  const url = `${PIAPI_BASE}/task`;
  log('piapi_create_task', { model: body.model, task_type: body.task_type });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PiAPI create task failed: ${res.status} ${text}`);
  }

  const json = await res.json();

  if (json.code && json.code !== 200) {
    throw new Error(`PiAPI error: ${json.message || JSON.stringify(json)}`);
  }

  const taskId = json.data?.task_id || json.task_id;
  if (!taskId) {
    throw new Error(`PiAPI: No task_id in response: ${JSON.stringify(json)}`);
  }

  log('piapi_task_created', { taskId, status: json.data?.status });
  return taskId;
}

/**
 * Poll a task until it completes or fails.
 * @param {string} apiKey
 * @param {string} taskId
 * @param {number} maxAttempts - Default 90 (~30 min with 20s delay)
 * @param {number} delayMs     - Default 20000 (20 seconds)
 * @returns {object} Completed task data
 */
async function pollTask(apiKey, taskId, maxAttempts = 90, delayMs = 20000) {
  const url = `${PIAPI_BASE}/task/${taskId}`;

  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'x-api-key': apiKey },
    });

    if (!res.ok) {
      const text = await res.text();
      log('piapi_poll_error', { attempt: i + 1, status: res.status, message: text });
      await new Promise(r => setTimeout(r, delayMs));
      continue;
    }

    const json = await res.json();
    const data = json.data || json;
    const status = data.status?.toLowerCase();

    log('piapi_poll_status', { attempt: i + 1, taskId, status });

    if (status === 'completed') {
      return data;
    }

    if (status === 'failed') {
      const errMsg = data.error?.message || data.error || 'Task failed';
      throw new Error(`PiAPI task failed: ${errMsg}`);
    }

    // Still processing/pending — wait and retry
    await new Promise(r => setTimeout(r, delayMs));
  }

  throw new Error(`PiAPI task timed out after ${maxAttempts} attempts: ${taskId}`);
}

/**
 * Download a video from a URL and save it locally.
 * @param {string} videoUrl  - Remote video URL
 * @param {string} outputDir - Local directory to save to
 * @param {string} prefix    - Filename prefix (e.g., 'clip_kling')
 * @returns {string} Local file path
 */
async function downloadVideo(videoUrl, outputDir, prefix = 'clip_piapi') {
  const fileName = `${prefix}_${Date.now()}.mp4`;
  const outPath = path.join(outputDir, fileName);

  const res = await fetch(videoUrl);
  if (!res.ok) {
    throw new Error(`Failed to download video: ${res.status} from ${videoUrl}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.promises.writeFile(outPath, buffer);

  log('piapi_video_downloaded', { outPath, size: buffer.length });
  return outPath;
}

/**
 * Extract the video URL from a completed PiAPI task.
 * Different models return video in slightly different fields.
 */
function extractVideoUrl(taskData) {
  const output = taskData.output || {};

  // Try common fields
  if (output.video_url) return output.video_url;
  if (output.video) return output.video;
  if (output.download_url) return output.download_url;

  // Kling-style: output.works[0].resource.resource
  if (output.works && output.works.length > 0) {
    const work = output.works[0];
    if (work.resource?.resource) return work.resource.resource;
    if (work.video_url) return work.video_url;
  }

  // Luma-style: output.video
  if (typeof output === 'string' && output.startsWith('http')) return output;

  return null;
}

module.exports = { createTask, pollTask, downloadVideo, extractVideoUrl };
