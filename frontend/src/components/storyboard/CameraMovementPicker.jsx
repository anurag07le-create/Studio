import React from 'react';
import { SimpleGrid, Button, Text, Stack, Badge, Group } from '@mantine/core';

const CAMERA_MOVEMENTS = [
  { id: 'static', label: 'Static', icon: '📷', desc: 'No movement' },
  { id: 'pan-left', label: 'Pan Left', icon: '⬅️', desc: 'Horizontal left' },
  { id: 'pan-right', label: 'Pan Right', icon: '➡️', desc: 'Horizontal right' },
  { id: 'tilt-up', label: 'Tilt Up', icon: '⬆️', desc: 'Vertical up' },
  { id: 'tilt-down', label: 'Tilt Down', icon: '⬇️', desc: 'Vertical down' },
  { id: 'dolly-in', label: 'Dolly In', icon: '🔍', desc: 'Move toward' },
  { id: 'dolly-out', label: 'Dolly Out', icon: '🔭', desc: 'Pull back' },
  { id: 'tracking', label: 'Tracking', icon: '🏃', desc: 'Follow subject' },
  { id: 'orbit', label: 'Orbit', icon: '🔄', desc: '360° around' },
  { id: 'crane-up', label: 'Crane Up', icon: '🏗️', desc: 'Rise vertical' },
  { id: 'crane-down', label: 'Crane Down', icon: '⤵️', desc: 'Lower vertical' },
  { id: 'handheld', label: 'Handheld', icon: '✋', desc: 'Documentary feel' },
  { id: 'zoom-in', label: 'Zoom In', icon: '🔎', desc: 'Lens zoom in' },
  { id: 'zoom-out', label: 'Zoom Out', icon: '🖼️', desc: 'Lens zoom out' },
  { id: 'rack-focus', label: 'Rack Focus', icon: '🎯', desc: 'Shift focus' },
];

export default function CameraMovementPicker({ value, onChange }) {
  return (
    <Stack gap="xs">
      <Text size="xs" fw={600} c="dimmed" tt="uppercase">Camera Movement</Text>
      <SimpleGrid cols={5} spacing={4}>
        {CAMERA_MOVEMENTS.map((cam) => (
          <Button
            key={cam.id}
            variant={value === cam.id ? 'filled' : 'light'}
            color={value === cam.id ? 'violet' : 'gray'}
            size="xs"
            onClick={() => onChange?.(cam.id)}
            styles={{
              root: { height: 'auto', padding: '6px 4px' },
              label: { display: 'flex', flexDirection: 'column', gap: 2 },
            }}
          >
            <Text size="md">{cam.icon}</Text>
            <Text size={10} lh={1}>{cam.label}</Text>
          </Button>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

export { CAMERA_MOVEMENTS };
