import React from 'react';
import {
  Stack, Group, Text, Select, Switch, Slider, SegmentedControl, Badge, Textarea,
} from '@mantine/core';

const KLING_RESOLUTIONS = [
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' },
];

const KLING_ASPECT_RATIOS = [
  { value: '16:9', label: '16:9 (Landscape)' },
  { value: '9:16', label: '9:16 (Portrait)' },
  { value: '1:1', label: '1:1 (Square)' },
];

const LUMA_ASPECT_RATIOS = [
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
  { value: '21:9', label: '21:9' },
  { value: '9:21', label: '9:21' },
];

const LUMA_RESOLUTIONS = [
  { value: '540p', label: '540p' },
  { value: '720p', label: '720p' },
];

const HAILUO_MODELS = [
  { value: 'v2.3', label: 'Hailuo v2.3 (Standard)' },
  { value: 'v2.3-fast', label: 'Hailuo v2.3 Fast' },
];

const VERTEX_ASPECT_RATIOS = [
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
];

const WAN_TASK_TYPES = [
  { value: 'txt2video-14b', label: '14B (High Quality)' },
  { value: 'txt2video-1.3b', label: '1.3B (Fast)' },
  { value: 'wan22-txt2video-14b', label: 'Wan 2.2 — 14B (720p)' },
];

const WAN_ASPECT_RATIOS = [
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
];

const HUNYUAN_TASK_TYPES = [
  { value: 'txt2video', label: 'Standard (txt2video)' },
  { value: 'fast-txt2video', label: 'Fast (fast-txt2video)' },
];

const HUNYUAN_ASPECT_RATIOS = [
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
];

const VEO3_MODEL_VERSIONS = [
  { value: 'veo3', label: 'Veo 3' },
  { value: 'veo3.1', label: 'Veo 3.1' },
];

const VEO3_DURATIONS = [
  { value: '4s', label: '4 seconds' },
  { value: '6s', label: '6 seconds' },
  { value: '8s', label: '8 seconds' },
];

const VEO3_RESOLUTIONS = [
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' },
];

const VEO3_ASPECT_RATIOS = [
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
];

const SKYREELS_ASPECT_RATIOS = [
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
];

export default function ProviderSettings({ provider, options, onChange, multiShotMode, onMultiShotToggle }) {
  const update = (key, value) => {
    onChange({ ...options, [key]: value });
  };

  if (provider === 'kling') {
    return (
      <Stack gap="sm" className="provider-settings-panel">
        <Group gap="md" grow>
          <Select
            label="Resolution"
            data={KLING_RESOLUTIONS}
            value={options.resolution || '1080p'}
            onChange={(val) => update('resolution', val)}
            size="sm"
          />
          <Select
            label="Aspect Ratio"
            data={KLING_ASPECT_RATIOS}
            value={options.aspect_ratio || '16:9'}
            onChange={(val) => update('aspect_ratio', val)}
            size="sm"
          />
        </Group>

        {!multiShotMode && (
          <div>
            <Text size="xs" c="dimmed" mb={4}>Duration: {options.duration || 5}s</Text>
            <Slider
              min={3}
              max={15}
              step={1}
              value={options.duration || 5}
              onChange={(val) => update('duration', val)}
              size="sm"
              color="violet"
              marks={[
                { value: 3, label: '3s' },
                { value: 5, label: '5s' },
                { value: 10, label: '10s' },
                { value: 15, label: '15s' },
              ]}
            />
          </div>
        )}

        <Group justify="space-between" align="center">
          <Switch
            label="Enable Audio"
            checked={options.enable_audio !== false}
            onChange={(e) => update('enable_audio', e.currentTarget.checked)}
            size="sm"
          />
          <Group gap="xs">
            <Switch
              label="Multi-Shot Mode"
              checked={!!multiShotMode}
              onChange={(e) => onMultiShotToggle?.(e.currentTarget.checked)}
              size="sm"
              color="violet"
            />
            <Badge size="xs" color="violet" variant="light">Up to 6 shots</Badge>
          </Group>
        </Group>
      </Stack>
    );
  }

  if (provider === 'luma') {
    return (
      <Stack gap="sm" className="provider-settings-panel">
        <Group gap="md" grow>
          <Select
            label="Aspect Ratio"
            data={LUMA_ASPECT_RATIOS}
            value={options.aspect_ratio || '16:9'}
            onChange={(val) => update('aspect_ratio', val)}
            size="sm"
          />
          <Select
            label="Resolution"
            data={LUMA_RESOLUTIONS}
            value={options.resolution || '720p'}
            onChange={(val) => update('resolution', val)}
            size="sm"
          />
        </Group>

        <Group gap="md">
          <div>
            <Text size="xs" c="dimmed" mb={4}>Duration</Text>
            <SegmentedControl
              data={[
                { value: '5', label: '5 seconds' },
                { value: '10', label: '10 seconds' },
              ]}
              value={String(options.duration || 5)}
              onChange={(val) => update('duration', parseInt(val))}
              size="sm"
            />
          </div>
          <Switch
            label="Loop Video"
            checked={!!options.loop}
            onChange={(e) => update('loop', e.currentTarget.checked)}
            size="sm"
            mt="lg"
          />
        </Group>
      </Stack>
    );
  }

  if (provider === 'hailuo') {
    return (
      <Stack gap="sm" className="provider-settings-panel">
        <Group gap="md" grow>
          <Select
            label="Model"
            data={HAILUO_MODELS}
            value={options.model || 'v2.3'}
            onChange={(val) => update('model', val)}
            size="sm"
          />
          <Select
            label="Resolution"
            data={[
              { value: '768', label: '768p' },
              { value: '1080', label: '1080p' },
            ]}
            value={options.resolution || '768'}
            onChange={(val) => update('resolution', val)}
            size="sm"
          />
        </Group>

        <Group gap="md">
          <div>
            <Text size="xs" c="dimmed" mb={4}>Duration</Text>
            <SegmentedControl
              data={[
                { value: '6', label: '6 seconds' },
                { value: '10', label: '10 seconds' },
              ]}
              value={String(options.duration || 6)}
              onChange={(val) => update('duration', parseInt(val))}
              size="sm"
            />
          </div>
          <Switch
            label="Expand Prompt"
            checked={options.expand_prompt !== false}
            onChange={(e) => update('expand_prompt', e.currentTarget.checked)}
            size="sm"
            mt="lg"
          />
        </Group>
        {options.resolution === '1080' && options.duration === 10 && (
          <Text size="xs" c="red">Note: 1080p + 10s is not supported by Hailuo</Text>
        )}
      </Stack>
    );
  }

  if (provider === 'wan') {
    return (
      <Stack gap="sm" className="provider-settings-panel">
        <Group gap="md" grow>
          <Select
            label="Model Size"
            data={WAN_TASK_TYPES}
            value={options.task_type || 'txt2video-14b'}
            onChange={(val) => update('task_type', val)}
            size="sm"
            description="14B = higher quality, 1.3B = faster"
          />
          <Select
            label="Aspect Ratio"
            data={WAN_ASPECT_RATIOS}
            value={options.aspect_ratio || '16:9'}
            onChange={(val) => update('aspect_ratio', val)}
            size="sm"
          />
        </Group>
      </Stack>
    );
  }

  if (provider === 'hunyuan') {
    return (
      <Stack gap="sm" className="provider-settings-panel">
        <Group gap="md" grow>
          <Select
            label="Mode"
            data={HUNYUAN_TASK_TYPES}
            value={options.task_type || 'txt2video'}
            onChange={(val) => update('task_type', val)}
            size="sm"
            description="Fast mode generates quicker but lower quality"
          />
          <Select
            label="Aspect Ratio"
            data={HUNYUAN_ASPECT_RATIOS}
            value={options.aspect_ratio || '16:9'}
            onChange={(val) => update('aspect_ratio', val)}
            size="sm"
          />
        </Group>
      </Stack>
    );
  }

  if (provider === 'veo3_piapi') {
    return (
      <Stack gap="sm" className="provider-settings-panel">
        <Group gap="md" grow>
          <Select
            label="Model Version"
            data={VEO3_MODEL_VERSIONS}
            value={options.model_version || 'veo3'}
            onChange={(val) => update('model_version', val)}
            size="sm"
          />
          <div>
            <Text size="xs" c="dimmed" mb={4}>Speed</Text>
            <SegmentedControl
              data={[
                { value: 'standard', label: 'Standard' },
                { value: 'fast', label: 'Fast' },
              ]}
              value={options.speed || 'standard'}
              onChange={(val) => update('speed', val)}
              size="sm"
              fullWidth
            />
          </div>
        </Group>
        <Group gap="md" grow>
          <Select
            label="Duration"
            data={VEO3_DURATIONS}
            value={options.duration || '8s'}
            onChange={(val) => update('duration', val)}
            size="sm"
          />
          <Select
            label="Resolution"
            data={VEO3_RESOLUTIONS}
            value={options.resolution || '720p'}
            onChange={(val) => update('resolution', val)}
            size="sm"
          />
          <Select
            label="Aspect Ratio"
            data={VEO3_ASPECT_RATIOS}
            value={options.aspect_ratio || '16:9'}
            onChange={(val) => update('aspect_ratio', val)}
            size="sm"
          />
        </Group>
        <Switch
          label="Generate Audio"
          checked={!!options.generate_audio}
          onChange={(e) => update('generate_audio', e.currentTarget.checked)}
          size="sm"
        />
      </Stack>
    );
  }

  if (provider === 'vertex') {
    return (
      <Stack gap="sm" className="provider-settings-panel">
        <Select
          label="Aspect Ratio"
          data={VERTEX_ASPECT_RATIOS}
          value={options.aspectRatio || '16:9'}
          onChange={(val) => update('aspectRatio', val)}
          size="sm"
        />

        <Group gap="md">
          <Switch
            label="Enhance Prompt"
            checked={options.enhancePrompt !== false}
            onChange={(e) => update('enhancePrompt', e.currentTarget.checked)}
            size="sm"
          />
          <Switch
            label="Generate Audio"
            checked={options.generateAudio !== false}
            onChange={(e) => update('generateAudio', e.currentTarget.checked)}
            size="sm"
          />
        </Group>
      </Stack>
    );
  }

  if (provider === 'skyreels') {
    return (
      <Stack gap="sm" className="provider-settings-panel">
        <Text size="xs" c="orange" fw={500}>SkyReels requires an image input (image-to-video only)</Text>
        <Group gap="md" grow>
          <Select
            label="Aspect Ratio"
            data={SKYREELS_ASPECT_RATIOS}
            value={options.aspect_ratio || '16:9'}
            onChange={(val) => update('aspect_ratio', val)}
            size="sm"
          />
          <div>
            <Text size="xs" c="dimmed" mb={4}>Guidance Scale: {options.guidance_scale ?? 3.5}</Text>
            <Slider
              min={0}
              max={10}
              step={0.5}
              value={options.guidance_scale ?? 3.5}
              onChange={(val) => update('guidance_scale', val)}
              size="sm"
              color="violet"
              marks={[
                { value: 0, label: '0' },
                { value: 3.5, label: '3.5' },
                { value: 7, label: '7' },
                { value: 10, label: '10' },
              ]}
            />
          </div>
        </Group>
      </Stack>
    );
  }

  if (provider === 'framepack') {
    return (
      <Stack gap="sm" className="provider-settings-panel">
        <div>
          <Text size="xs" c="dimmed" mb={4}>Duration: {options.duration || 10}s</Text>
          <Slider
            min={10}
            max={30}
            step={1}
            value={options.duration || 10}
            onChange={(val) => update('duration', val)}
            size="sm"
            color="violet"
            marks={[
              { value: 10, label: '10s' },
              { value: 15, label: '15s' },
              { value: 20, label: '20s' },
              { value: 25, label: '25s' },
              { value: 30, label: '30s' },
            ]}
          />
        </div>
        <Textarea
          label="Negative Prompt"
          placeholder="What to exclude from the video..."
          value={options.negative_prompt || ''}
          onChange={(e) => update('negative_prompt', e.target.value)}
          minRows={2}
          maxRows={4}
          autosize
          size="sm"
        />
      </Stack>
    );
  }

  return null;
}
