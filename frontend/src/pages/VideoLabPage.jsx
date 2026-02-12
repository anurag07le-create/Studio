import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Title, Text, Stack, Card, Group, Button, Badge, SimpleGrid,
  Alert, Loader, Progress, Image, Modal, Select,
} from '@mantine/core';
import { joinProject, leaveProject, onGenerationProgress } from '../services/socket';
import * as api from '../api/v2';

const PROVIDER_OPTIONS = [
  { value: 'vertex', label: 'Google Veo 3.1', description: 'Vertex AI' },
  { value: 'kling', label: 'Kling 3.0 Omni', description: 'PiAPI' },
  { value: 'luma', label: 'Luma Ray-v2', description: 'PiAPI' },
  { value: 'hailuo', label: 'Hailuo (MiniMax)', description: 'PiAPI' },
];

export default function VideoLabPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [shots, setShots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Video generation
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState('kling');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        api.getProject(id),
        api.listShots(id),
      ]);
      setProject(p);
      setShots(s);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Join project room for real-time progress, leave on unmount
  useEffect(() => {
    joinProject(id);
    return () => leaveProject(id);
  }, [id]);

  // Listen for generation progress events
  useEffect(() => {
    const cleanup = onGenerationProgress((data) => {
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
  }, [id]);

  const handleGenerateVideo = async () => {
    setGenerating(true);
    setError(null);
    setProgress(null);
    setVideoUrl(null);
    try {
      await api.generateVideo(id, { provider: selectedProvider });
    } catch (err) {
      setError(err.message || 'Failed to start video generation');
      setGenerating(false);
    }
  };

  const shotsWithImages = shots.filter(s => s.imageUrl && s.imageUrl.startsWith('data:'));
  const shotsWithoutImages = shots.filter(s => !s.imageUrl || !s.imageUrl.startsWith('data:'));
  const canGenerate = shotsWithImages.length >= 2 && !generating;

  if (loading) {
    return (
      <Group justify="center" py="xl">
        <Loader size="lg" />
      </Group>
    );
  }

  if (!project) {
    return (
      <Alert color="red" variant="light">
        Project not found. <Button variant="subtle" onClick={() => navigate('/')}>Go Home</Button>
      </Alert>
    );
  }

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group justify="space-between" align="center">
        <div>
          <Group gap="sm" align="center">
            <Button variant="subtle" size="xs" onClick={() => navigate(`/project/${id}`)}>
              ← Back to Project
            </Button>
            <Title order={2}>{project.title}</Title>
          </Group>
          <Text size="sm" c="dimmed" mt={4}>
            Video Lab — Generate and manage videos from your storyboard shots.
          </Text>
        </div>
        <Group gap="sm" align="flex-end">
          <Select
            label="Video Model"
            data={PROVIDER_OPTIONS}
            value={selectedProvider}
            onChange={setSelectedProvider}
            size="sm"
            w={200}
            disabled={generating}
          />
          <Button
            size="md"
            color="violet"
            disabled={!canGenerate}
            loading={generating}
            onClick={handleGenerateVideo}
          >
            Generate Video
          </Button>
        </Group>
      </Group>

      {error && (
        <Alert color="red" variant="light" withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Progress Bar */}
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

      {/* Video Player */}
      {videoUrl && (
        <Card withBorder radius="md" padding="md">
          <Stack gap="sm">
            <Group justify="space-between" align="center">
              <Title order={3}>Generated Video</Title>
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
                style={{ width: '100%', maxHeight: '60vh', display: 'block' }}
              />
            </div>
            <Group gap="sm">
              <Button
                variant="light"
                color="violet"
                component="a"
                href={videoUrl}
                download
              >
                Download Video
              </Button>
              <Button
                variant="subtle"
                onClick={() => {
                  setVideoUrl(null);
                  setProgress(null);
                }}
              >
                Dismiss
              </Button>
            </Group>
          </Stack>
        </Card>
      )}

      {/* Stats Overview */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
        <Card withBorder radius="md" padding="md" ta="center">
          <Text size="2xl" fw={700} c="violet">{shots.length}</Text>
          <Text size="xs" c="dimmed">Total Shots</Text>
        </Card>
        <Card withBorder radius="md" padding="md" ta="center">
          <Text size="2xl" fw={700} c="green">{shotsWithImages.length}</Text>
          <Text size="xs" c="dimmed">Images Ready</Text>
        </Card>
        <Card withBorder radius="md" padding="md" ta="center">
          <Text size="2xl" fw={700} c="orange">{shotsWithoutImages.length}</Text>
          <Text size="xs" c="dimmed">Need Images</Text>
        </Card>
        <Card withBorder radius="md" padding="md" ta="center">
          <Text size="2xl" fw={700} c="blue">{project.sceneCount || 0}</Text>
          <Text size="xs" c="dimmed">Scenes</Text>
        </Card>
      </SimpleGrid>

      {/* Shot Preview Grid */}
      <div>
        <Group justify="space-between" align="center" mb="md">
          <Title order={3} className="section-title">Shot Images</Title>
          {shotsWithoutImages.length > 0 && (
            <Text size="sm" c="orange">
              {shotsWithoutImages.length} shot(s) need images before video generation
            </Text>
          )}
        </Group>

        {shots.length === 0 ? (
          <Card withBorder padding="xl" radius="md">
            <Stack align="center" gap="sm">
              <Text size="lg">No shots yet</Text>
              <Text c="dimmed" ta="center">
                Go to your project to create scenes and generate shots first.
              </Text>
              <Button variant="light" onClick={() => navigate(`/project/${id}`)}>
                Go to Project
              </Button>
            </Stack>
          </Card>
        ) : (
          <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="sm">
            {shots.map((shot, idx) => (
              <Card key={shot.id} withBorder radius="md" padding="xs" className="shot-card">
                <div
                  style={{
                    position: 'relative',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    background: 'var(--pucho-surface)',
                    cursor: shot.imageUrl ? 'pointer' : 'default',
                  }}
                  onClick={shot.imageUrl?.startsWith('data:') ? () => setPreviewImage(shot.imageUrl) : undefined}
                >
                  {shot.imageUrl && shot.imageUrl.startsWith('data:') ? (
                    <Image src={shot.imageUrl} alt={`Shot ${shot.shotNumber}`} height={120} radius="md" />
                  ) : (
                    <div style={{
                      height: 120,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--pucho-surface)',
                      borderRadius: 'var(--radius-md)',
                    }}>
                      <Text size="xs" c="dimmed">No image</Text>
                    </div>
                  )}
                  <Badge
                    size="xs"
                    variant="filled"
                    color="dark"
                    style={{
                      position: 'absolute',
                      top: 4,
                      left: 4,
                      opacity: 0.85,
                    }}
                  >
                    #{shot.shotNumber}
                  </Badge>
                </div>
                <Text size="xs" mt={4} lineClamp={1} c="dimmed">
                  {shot.prompt || shot.description || `Shot ${shot.shotNumber}`}
                </Text>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </div>

      {/* Sequence Preview */}
      {shotsWithImages.length >= 2 && (
        <Card withBorder radius="md" padding="md">
          <Stack gap="sm">
            <Title order={4}>Sequence Preview</Title>
            <Text size="xs" c="dimmed">
              Your storyboard shots in sequence order. This is the order that will be used for video generation.
            </Text>
            <div style={{
              display: 'flex',
              gap: 4,
              overflowX: 'auto',
              padding: '8px 0',
            }}>
              {shotsWithImages.map((shot, idx) => (
                <div key={shot.id} style={{ flexShrink: 0 }}>
                  <Image
                    src={shot.imageUrl}
                    alt={`Shot ${shot.shotNumber}`}
                    height={80}
                    width={120}
                    radius="sm"
                    style={{ objectFit: 'cover' }}
                  />
                </div>
              ))}
            </div>
          </Stack>
        </Card>
      )}

      {/* Image Preview Modal */}
      <Modal
        opened={!!previewImage}
        onClose={() => setPreviewImage(null)}
        size="xl"
        radius="lg"
        centered
        padding="md"
      >
        {previewImage && (
          <Image src={previewImage} alt="Preview" radius="md" fit="contain" style={{ maxHeight: '80vh' }} />
        )}
      </Modal>
    </Stack>
  );
}
