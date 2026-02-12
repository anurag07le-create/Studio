import React from 'react';
import {
  Card, Stack, Group, Text, Textarea, Slider, Button, Badge,
  ActionIcon, Alert, Progress,
} from '@mantine/core';

const MAX_SHOTS = 6;
const MAX_TOTAL_DURATION = 15;

export default function MultiShotEditor({ shots = [], onChange }) {
  const totalDuration = shots.reduce((sum, s) => sum + (s.duration || 3), 0);
  const remainingDuration = MAX_TOTAL_DURATION - totalDuration;

  const updateShot = (index, field, value) => {
    const updated = [...shots];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const addShot = () => {
    if (shots.length >= MAX_SHOTS) return;
    const defaultDuration = Math.min(3, remainingDuration);
    if (defaultDuration < 1) return;
    onChange([...shots, { prompt: '', duration: defaultDuration }]);
  };

  const removeShot = (index) => {
    if (shots.length <= 1) return;
    onChange(shots.filter((_, i) => i !== index));
  };

  const isOverDuration = totalDuration > MAX_TOTAL_DURATION;
  const canAddShot = shots.length < MAX_SHOTS && remainingDuration >= 1;

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="center">
        <Group gap="xs">
          <Text size="sm" fw={600}>Multi-Shot Sequence</Text>
          <Badge size="sm" color="violet" variant="light">Kling 3.0</Badge>
        </Group>
        <Group gap="xs">
          <Badge
            size="sm"
            color={isOverDuration ? 'red' : totalDuration >= 13 ? 'orange' : 'green'}
            variant="light"
          >
            {totalDuration}s / {MAX_TOTAL_DURATION}s
          </Badge>
          <Badge size="sm" color="gray" variant="light">
            {shots.length} / {MAX_SHOTS} shots
          </Badge>
        </Group>
      </Group>

      {/* Duration allocation bar */}
      <div style={{ position: 'relative' }}>
        <Progress.Root size="lg" radius="xl">
          {shots.map((shot, idx) => (
            <Progress.Section
              key={idx}
              value={(shot.duration / MAX_TOTAL_DURATION) * 100}
              color={['violet', 'blue', 'cyan', 'teal', 'green', 'orange'][idx % 6]}
            >
              <Progress.Label>{idx + 1}</Progress.Label>
            </Progress.Section>
          ))}
        </Progress.Root>
      </div>

      {isOverDuration && (
        <Alert color="red" variant="light" size="sm">
          Total duration exceeds {MAX_TOTAL_DURATION}s. Reduce shot durations to continue.
        </Alert>
      )}

      {/* Shot cards */}
      {shots.map((shot, index) => (
        <Card
          key={index}
          withBorder
          radius="md"
          padding="sm"
          className="multi-shot-card"
          style={{ borderLeft: `3px solid var(--mantine-color-${['violet', 'blue', 'cyan', 'teal', 'green', 'orange'][index % 6]}-5)` }}
        >
          <Stack gap="xs">
            <Group justify="space-between" align="center">
              <Group gap="xs">
                <Badge
                  size="sm"
                  variant="filled"
                  color={['violet', 'blue', 'cyan', 'teal', 'green', 'orange'][index % 6]}
                >
                  Shot {index + 1}
                </Badge>
                <Text size="xs" c="dimmed">{shot.duration}s</Text>
              </Group>
              {shots.length > 1 && (
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="sm"
                  onClick={() => removeShot(index)}
                  title="Remove shot"
                >
                  <span style={{ fontSize: 14 }}>x</span>
                </ActionIcon>
              )}
            </Group>

            <Textarea
              placeholder={`Describe shot ${index + 1}... e.g., "A cat sits on a windowsill watching rain"`}
              value={shot.prompt}
              onChange={(e) => updateShot(index, 'prompt', e.target.value)}
              minRows={2}
              maxRows={4}
              autosize
              size="sm"
            />

            <Group gap="sm" align="center">
              <Text size="xs" c="dimmed" w={60}>Duration:</Text>
              <Slider
                min={1}
                max={Math.min(14, shot.duration + remainingDuration)}
                step={1}
                value={shot.duration}
                onChange={(val) => updateShot(index, 'duration', val)}
                style={{ flex: 1 }}
                size="sm"
                color={['violet', 'blue', 'cyan', 'teal', 'green', 'orange'][index % 6]}
                marks={[
                  { value: 3, label: '3s' },
                  { value: 7, label: '7s' },
                  { value: 14, label: '14s' },
                ]}
              />
            </Group>
          </Stack>
        </Card>
      ))}

      <Button
        variant="light"
        color="violet"
        size="sm"
        onClick={addShot}
        disabled={!canAddShot}
        fullWidth
      >
        + Add Shot {shots.length >= MAX_SHOTS ? '(max reached)' : remainingDuration < 1 ? '(no time left)' : ''}
      </Button>
    </Stack>
  );
}
