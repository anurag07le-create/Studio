import React from 'react';
import {
  SimpleGrid, Card, Image, Title, Text, Group, Badge, Button, Stack, Skeleton,
} from '@mantine/core';

export default function ShotListEditor({
  shots = [],
  onGenerateImage,
  onGenerateAllImages,
  generatingImageId,
  generatingAll,
}) {
  if (shots.length === 0) {
    return (
      <Card withBorder padding="xl" radius="md">
        <Text ta="center" c="dimmed">No shots yet. Select a scene and click "Generate Shots".</Text>
      </Card>
    );
  }

  const isPlaceholder = (url) => !url || url.includes('placehold.co');

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Title order={4}>Shots ({shots.length})</Title>
        <Button
          variant="outline"
          color="grape"
          size="sm"
          onClick={() => onGenerateAllImages && onGenerateAllImages()}
          loading={generatingAll}
        >
          {generatingAll ? 'Generating All Images...' : 'Generate All Images'}
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
        {shots.map((shot) => {
          const isFailed = isPlaceholder(shot.imageUrl);
          const isGenerating = generatingImageId === shot.id;
          return (
            <Card key={shot.id} className="shot-card" padding="lg" radius="lg" shadow="sm" withBorder>
              {isGenerating ? (
                <Skeleton height={180} radius="md" mb="sm" />
              ) : shot.imageUrl && !isFailed ? (
                <Image src={shot.imageUrl} alt={`Shot ${shot.shotNumber}`} height={180} radius="md" mb="sm" />
              ) : (
                <Card withBorder radius="md" h={180} mb="sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--mantine-color-gray-0)' }}>
                  <Stack align="center" gap={4}>
                    <Text size="xl">🎬</Text>
                    <Text size="xs" c="dimmed">No image yet</Text>
                  </Stack>
                </Card>
              )}

              <Group gap="xs" mb="xs">
                <Badge color="violet" size="sm">Shot {shot.shotNumber}</Badge>
                {shot.cameraAngle && <Badge color="gray" size="sm" variant="light">{shot.cameraAngle}</Badge>}
                {shot.cameraMovement && <Badge color="gray" size="sm" variant="light">{shot.cameraMovement}</Badge>}
                <Badge color="grape" size="sm" variant="light">{shot.duration}s</Badge>
              </Group>

              <Title order={5} lineClamp={2} mb={4}>{shot.description || `Shot ${shot.shotNumber}`}</Title>
              <Text size="sm" c="dimmed" lineClamp={3}>{shot.shotStory || shot.prompt}</Text>

              {(isFailed || !shot.imageUrl) && !isGenerating && (
                <Button
                  size="xs"
                  variant="light"
                  color="grape"
                  mt="sm"
                  fullWidth
                  onClick={() => onGenerateImage && onGenerateImage(shot.id)}
                >
                  Generate Image
                </Button>
              )}
            </Card>
          );
        })}
      </SimpleGrid>
    </Stack>
  );
}
