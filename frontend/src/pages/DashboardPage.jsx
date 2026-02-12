import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { listGalleryApi, deleteGalleryApi } from '../api';
import * as v2Api from '../api/v2';
import {
  Title, Text, Button, Group, Stack, SimpleGrid, Card, Image, Badge,
  Alert,
} from '@mantine/core';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [projectCount, setProjectCount] = useState(null);
  const [error, setError] = useState(null);
  const [savedStories, setSavedStories] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);

  useEffect(() => {
    const fetchGallery = async () => {
      setGalleryLoading(true);
      try {
        const stories = await listGalleryApi();
        setSavedStories(stories);
      } catch (err) {
        console.error('Load gallery failed', err);
      } finally {
        setGalleryLoading(false);
      }
    };
    const fetchProjectCount = async () => {
      try {
        const list = await v2Api.listProjects();
        setProjectCount(list.length);
      } catch (err) {
        console.error('Load projects failed', err);
      }
    };
    fetchGallery();
    fetchProjectCount();
  }, []);

  const handleDeleteStory = (id) => {
    deleteGalleryApi(id)
      .then((stories) => setSavedStories(stories))
      .catch((err) => setError(err.message));
  };

  return (
    <>
      {/* Hero / Welcome Section */}
      <div className="section" style={{ marginTop: 0 }}>
        <Stack gap="md">
          <div>
            <Title order={1} className="section-title" mb={4}>Welcome to StoryGen Atelier</Title>
            <Text size="md" c="dimmed">Your AI-powered creative studio for storyboard images, videos, and screenplays</Text>
          </div>

          {/* Quick Action Cards */}
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
            {/* Studio Card — Hero / Primary */}
            <Card
              className="glass-panel quick-action-card quick-action-hero"
              withBorder padding="xl" radius="xl" shadow="xl"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/studio')}
            >
              <Stack gap="sm" align="center" ta="center">
                <div className="quick-action-icon quick-action-icon-hero" style={{ fontSize: 40 }}>&#127916;</div>
                <Title order={3}>Studio</Title>
                <Text size="sm" c="dimmed">
                  Manage screenplay projects — upload scripts, scenes, shots, and generate full storyboards.
                </Text>
                <Badge color="grape" variant="filled" size="lg">
                  {projectCount !== null ? `${projectCount} Project${projectCount !== 1 ? 's' : ''}` : 'Projects'}
                </Badge>
              </Stack>
            </Card>

            {/* Image Generation Card */}
            <Card
              className="glass-panel quick-action-card"
              withBorder padding="xl" radius="xl" shadow="xl"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/image-generation')}
            >
              <Stack gap="sm" align="center" ta="center">
                <div className="quick-action-icon" style={{ fontSize: 40 }}>&#127912;</div>
                <Title order={3}>Images</Title>
                <Text size="sm" c="dimmed">
                  Generate AI storyboard images with 16+ style presets. Control shot count, style, and composition.
                </Text>
                <Badge color="violet" variant="light" size="lg">AI Storyboard</Badge>
              </Stack>
            </Card>

            {/* Video Generation Card */}
            <Card
              className="glass-panel quick-action-card"
              withBorder padding="xl" radius="xl" shadow="xl"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/video-generation')}
            >
              <Stack gap="sm" align="center" ta="center">
                <div className="quick-action-icon" style={{ fontSize: 40 }}>&#127909;</div>
                <Title order={3}>Videos</Title>
                <Text size="sm" c="dimmed">
                  Create videos with Kling 3.0, Luma, Hailuo, or Google Veo. Multi-shot and camera control.
                </Text>
                <Badge color="violet" variant="light" size="lg">Multi-Provider</Badge>
              </Stack>
            </Card>

            {/* Gallery Card */}
            <Card
              className="glass-panel quick-action-card"
              withBorder padding="xl" radius="xl" shadow="xl"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/gallery')}
            >
              <Stack gap="sm" align="center" ta="center">
                <div className="quick-action-icon" style={{ fontSize: 40 }}>&#128444;</div>
                <Title order={3}>Gallery</Title>
                <Text size="sm" c="dimmed">
                  Browse saved storyboards, load and edit previous generations, manage your creative library.
                </Text>
                <Badge color="teal" variant="light" size="lg">
                  {savedStories.length > 0 ? `${savedStories.length} Saved` : 'Library'}
                </Badge>
              </Stack>
            </Card>
          </SimpleGrid>
        </Stack>
      </div>

      {error && <Alert color="red" variant="light" mt="md">{error}</Alert>}

      {/* Recent Gallery Preview */}
      {savedStories.length > 0 && (
        <div className="section gallery">
          <Group justify="space-between" align="center" mb="md">
            <Title order={2} className="section-title">Recent Storyboards</Title>
            <Button variant="subtle" color="grape" size="sm" onClick={() => navigate('/gallery')}>
              View All
            </Button>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            {savedStories.slice(0, 6).map((story) => (
              <Card key={story.id} className="gallery-card" padding="lg" radius="lg" withBorder shadow="lg">
                <Image src={story.storyboard?.[0]?.imageUrl} alt={story.title} height={180} radius="md" withPlaceholder className="gallery-image" />
                <Title order={4} className="gallery-title">{story.title}</Title>
                <Text size="sm" c="dimmed">
                  {new Date(story.createdAt).toLocaleString()} · {story.shotCount || story.storyboard.length} shots
                </Text>
                <div className="gallery-links">
                  <button className="link-btn" onClick={() => navigate(`/studio?load=${story.id}`)}>Load</button>
                  <span className="link-sep">·</span>
                  <button className="link-btn" onClick={() => handleDeleteStory(story.id)}>Delete</button>
                </div>
              </Card>
            ))}
          </SimpleGrid>
        </div>
      )}
    </>
  );
}
