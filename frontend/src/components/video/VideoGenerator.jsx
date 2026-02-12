import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Title, Text, Group, Button, Stack, Textarea, Badge,
  Select, Alert, Progress, Divider,
} from '@mantine/core';
import { joinVideoJob, leaveVideoJob, onVideoProgress } from '../../services/socket';
import * as api from '../../api/v2';
import ProviderSettings from './ProviderSettings';
import MultiShotEditor from './MultiShotEditor';

const PROVIDER_OPTIONS = [
  { value: 'kling', label: 'Kling 3.0 Omni', description: 'PiAPI — Multi-shot, audio' },
  { value: 'luma', label: 'Luma Ray-v2', description: 'PiAPI — Loop, 7 aspect ratios' },
  { value: 'hailuo', label: 'Hailuo v2.3', description: 'PiAPI — 6s/10s, 768p/1080p' },
  { value: 'wan', label: 'Wan (Alibaba)', description: 'PiAPI — 1.3B/14B, camera control' },
  { value: 'hunyuan', label: 'Hunyuan (Tencent)', description: 'PiAPI — Fast mode, i2v' },
  { value: 'veo3_piapi', label: 'Veo 3 / 3.1 (PiAPI)', description: 'PiAPI — 4-8s, audio, fast mode' },
  { value: 'vertex', label: 'Veo 3.1 (Vertex AI)', description: 'Google Cloud — Direct, audio' },
  { value: 'skyreels', label: 'SkyReels (Kunlun)', description: 'PiAPI — Image-to-video, guidance' },
  { value: 'framepack', label: 'Framepack', description: 'PiAPI — Long video 10-30s, img2video' },
];

const DEFAULT_OPTIONS = {
  kling: { resolution: '1080p', aspect_ratio: '16:9', duration: 5, enable_audio: true },
  luma: { aspect_ratio: '16:9', duration: 5, loop: false, resolution: '720p' },
  hailuo: { model: 'v2.3', expand_prompt: true, duration: 6, resolution: '768' },
  wan: { task_type: 'txt2video-14b', aspect_ratio: '16:9' },
  hunyuan: { task_type: 'txt2video', aspect_ratio: '16:9' },
  veo3_piapi: { model_version: 'veo3', speed: 'standard', aspect_ratio: '16:9', duration: '8s', resolution: '720p', generate_audio: false },
  vertex: { aspectRatio: '16:9', enhancePrompt: true, generateAudio: true },
  skyreels: { aspect_ratio: '16:9', guidance_scale: 3.5 },
  framepack: { duration: 10, negative_prompt: '' },
};

export default function VideoGenerator() {
  const [prompt, setPrompt] = useState('');
  const [provider, setProvider] = useState('kling');
  const [options, setOptions] = useState({ ...DEFAULT_OPTIONS.kling });
  const [multiShotMode, setMultiShotMode] = useState(false);
  const [multiShots, setMultiShots] = useState([
    { prompt: '', duration: 5 },
    { prompt: '', duration: 5 },
  ]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [error, setError] = useState(null);

  // Reset options when provider changes
  const handleProviderChange = useCallback((newProvider) => {
    setProvider(newProvider);
    setOptions({ ...(DEFAULT_OPTIONS[newProvider] || {}) });
    if (newProvider !== 'kling') {
      setMultiShotMode(false);
    }
  }, []);

  // Socket.IO: listen for video progress events
  useEffect(() => {
    const cleanup = onVideoProgress((data) => {
      // Only handle events for our current jobId
      if (data.jobId && jobId && data.jobId !== jobId) return;

      setProgress(data);

      if (data.phase === 'Complete' && data.videoUrl) {
        setVideoUrl(data.videoUrl);
        setGenerating(false);
      }

      if (data.phase === 'Error') {
        setError(data.message || 'Video generation failed');
        setGenerating(false);
      }
    });
    return cleanup;
  }, [jobId]);

  // Join/leave job room
  useEffect(() => {
    if (jobId) {
      joinVideoJob(jobId);
      return () => leaveVideoJob(jobId);
    }
  }, [jobId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setProgress(null);
    setVideoUrl(null);

    try {
      const reqOptions = { ...options };

      // Add multi_shots if in multi-shot mode
      if (multiShotMode && provider === 'kling') {
        reqOptions.multi_shots = multiShots.filter(s => s.prompt.trim());
        if (reqOptions.multi_shots.length === 0) {
          setError('Add at least one shot with a prompt');
          setGenerating(false);
          return;
        }
      }

      const result = await api.generateStandaloneVideo({
        prompt: multiShotMode ? '' : prompt,
        provider,
        options: reqOptions,
      });

      setJobId(result.jobId);
    } catch (err) {
      setError(err.message || 'Failed to start video generation');
      setGenerating(false);
    }
  };

  const canGenerate = generating
    ? false
    : multiShotMode
      ? multiShots.some(s => s.prompt.trim())
      : prompt.trim().length > 0;

  return (
    <Card className="glass-panel" withBorder padding="lg" radius="xl" shadow="xl">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <Title order={3} className="section-title" style={{ margin: 0 }}>Video Generation</Title>
            <Badge size="sm" color="violet" variant="light">AI</Badge>
          </Group>
          <Select
            data={PROVIDER_OPTIONS}
            value={provider}
            onChange={handleProviderChange}
            size="sm"
            w={240}
            disabled={generating}
          />
        </Group>

        {error && (
          <Alert color="red" variant="light" withCloseButton onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Prompt — hidden in multi-shot mode */}
        {!multiShotMode && (
          <div>
            <Text className="form-label" size="sm" mb={4}>Video Prompt</Text>
            <Textarea
              placeholder="Describe your video... e.g., 'A golden retriever running through a sunlit meadow, cinematic slow motion, shallow depth of field'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              minRows={2}
              maxRows={5}
              autosize
              disabled={generating}
            />
          </div>
        )}

        {/* Provider-specific settings */}
        <Divider
          label={
            <Text size="xs" c="dimmed">
              {PROVIDER_OPTIONS.find(p => p.value === provider)?.label} Settings
            </Text>
          }
          labelPosition="center"
        />

        <ProviderSettings
          provider={provider}
          options={options}
          onChange={setOptions}
          multiShotMode={multiShotMode}
          onMultiShotToggle={setMultiShotMode}
        />

        {/* Multi-shot editor (Kling only) */}
        {multiShotMode && provider === 'kling' && (
          <>
            <Divider />
            <MultiShotEditor
              shots={multiShots}
              onChange={setMultiShots}
            />
          </>
        )}

        {/* Generate button */}
        <Group justify="flex-end">
          <Button
            size="md"
            variant="gradient"
            gradient={{ from: '#5922C7', to: '#7C3AED' }}
            onClick={handleGenerate}
            loading={generating}
            disabled={!canGenerate}
          >
            {generating ? 'Generating Video...' : 'Generate Video'}
          </Button>
        </Group>

        {/* Progress bar */}
        {progress && progress.phase !== 'Complete' && progress.phase !== 'Error' && (
          <Card withBorder radius="md" padding="md">
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" fw={500}>{progress.phase || 'Processing...'}</Text>
                <Text size="sm" c="dimmed">{Math.round(progress.percent || 0)}%</Text>
              </Group>
              <Progress
                value={progress.percent || 0}
                color="violet"
                size="lg"
                radius="xl"
                animated
              />
              {progress.message && (
                <Text size="xs" c="dimmed">{progress.message}</Text>
              )}
            </Stack>
          </Card>
        )}

        {/* Video player */}
        {videoUrl && (
          <Card withBorder radius="md" padding="md">
            <Stack gap="sm">
              <Group justify="space-between" align="center">
                <Title order={4}>Generated Video</Title>
                <Badge color="green" variant="light">Ready</Badge>
              </Group>
              <div style={{
                borderRadius: 'var(--mantine-radius-md)',
                overflow: 'hidden',
                background: '#000',
              }}>
                <video
                  src={videoUrl}
                  controls
                  style={{ width: '100%', maxHeight: '50vh', display: 'block' }}
                />
              </div>
              <Group gap="sm">
                <Button
                  variant="light"
                  color="violet"
                  component="a"
                  href={videoUrl}
                  download
                  size="sm"
                >
                  Download Video
                </Button>
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => {
                    setVideoUrl(null);
                    setProgress(null);
                    setJobId(null);
                  }}
                >
                  Dismiss
                </Button>
              </Group>
            </Stack>
          </Card>
        )}
      </Stack>
    </Card>
  );
}
