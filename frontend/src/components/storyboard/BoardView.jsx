import React from 'react';
import {
  Card, Title, Text, Group, Badge, Stack, Image, Button, SimpleGrid, ActionIcon,
} from '@mantine/core';

/**
 * BoardView — Kanban-style view grouped by scene.
 * Each scene is a column, shots are cards within.
 */
export default function BoardView({
  scenes = [],
  shots = [],
  onEditShot,
  onGenerateImage,
  generatingImageId,
}) {
  // Group shots by scene
  const getSceneShots = (sceneId) =>
    shots.filter(s => s.sceneId === sceneId).sort((a, b) => a.sortOrder - b.sortOrder);

  if (scenes.length === 0) {
    return (
      <Card withBorder padding="xl" radius="md">
        <Text ta="center" c="dimmed">No scenes yet. Upload a script and generate scenes first.</Text>
      </Card>
    );
  }

  return (
    <div style={{
      display: 'flex',
      gap: 'var(--space-md)',
      overflowX: 'auto',
      padding: 'var(--space-sm) 0',
      minHeight: 400,
    }}>
      {scenes.map((scene) => {
        const sceneShots = getSceneShots(scene.id);
        return (
          <div
            key={scene.id}
            style={{
              minWidth: 280,
              maxWidth: 320,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--pucho-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--pucho-border)',
            }}
          >
            {/* Scene Header */}
            <div style={{
              padding: 'var(--space-md)',
              borderBottom: '1px solid var(--pucho-border)',
            }}>
              <Group justify="space-between" mb={4}>
                <Badge size="sm" variant="light" color="violet">
                  Scene {scene.sceneNumber}
                </Badge>
                <Badge size="xs" variant="dot" color="gray">
                  {sceneShots.length} shots
                </Badge>
              </Group>
              <Text size="sm" fw={600} lineClamp={1}>
                {scene.heading || 'Untitled Scene'}
              </Text>
              {scene.location && (
                <Text size="xs" c="dimmed" mt={2}>
                  {scene.location}{scene.timeOfDay ? ` — ${scene.timeOfDay}` : ''}
                </Text>
              )}
            </div>

            {/* Shots */}
            <div style={{
              padding: 'var(--space-sm)',
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-sm)',
            }}>
              {sceneShots.length === 0 ? (
                <Text size="xs" c="dimmed" ta="center" py="md">
                  No shots generated yet
                </Text>
              ) : (
                sceneShots.map((shot) => (
                  <Card
                    key={shot.id}
                    withBorder
                    radius="md"
                    padding="xs"
                    style={{
                      cursor: 'pointer',
                      transition: 'all var(--duration-fast) var(--ease-default)',
                    }}
                    onClick={() => onEditShot?.(shot)}
                    className="shot-card"
                  >
                    {shot.imageUrl && shot.imageUrl.startsWith('data:') ? (
                      <Image
                        src={shot.imageUrl}
                        alt={`Shot ${shot.shotNumber}`}
                        height={140}
                        radius="sm"
                        mb={6}
                      />
                    ) : (
                      <div style={{
                        height: 100,
                        background: 'var(--pucho-surface)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 6,
                        border: '1px dashed var(--pucho-border)',
                      }}>
                        {generatingImageId === shot.id ? (
                          <Text size="xs" c="dimmed">Generating...</Text>
                        ) : (
                          <Button
                            size="xs"
                            variant="subtle"
                            onClick={(e) => {
                              e.stopPropagation();
                              onGenerateImage?.(shot.id);
                            }}
                          >
                            Generate Image
                          </Button>
                        )}
                      </div>
                    )}

                    <Group justify="space-between" align="center">
                      <Badge size="xs" variant="light">Shot {shot.shotNumber}</Badge>
                      {shot.cameraAngle && (
                        <Text size="xs" c="dimmed">{shot.cameraAngle}</Text>
                      )}
                    </Group>

                    <Text size="xs" mt={4} lineClamp={2} c="dimmed">
                      {shot.prompt || shot.description || ''}
                    </Text>

                    {shot.duration && (
                      <Text size="xs" c="dimmed" mt={2}>
                        {shot.duration}s
                      </Text>
                    )}
                  </Card>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
