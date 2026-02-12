import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { listGalleryApi, deleteGalleryApi } from '../api';
import {
  Title, Text, SimpleGrid, Card, Image, Modal, Stack, ScrollArea, Skeleton,
} from '@mantine/core';

export default function GalleryPage() {
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewStory, setViewStory] = useState(null);

  useEffect(() => {
    listGalleryApi()
      .then(setStories)
      .catch((err) => console.error('Failed to load gallery', err))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = (id) => {
    deleteGalleryApi(id)
      .then(setStories)
      .catch((err) => console.error('Failed to delete', err));
  };

  if (loading) {
    return (
      <div className="section">
        <Title order={2} className="section-title" mb="md">Gallery</Title>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} padding="lg" radius="lg" withBorder>
              <Skeleton height={180} radius="md" mb="md" />
              <Skeleton height={18} width="60%" mb="sm" />
              <Skeleton height={14} width="40%" />
            </Card>
          ))}
        </SimpleGrid>
      </div>
    );
  }

  return (
    <div className="section">
      <Title order={2} className="section-title" mb="md">Gallery</Title>

      {stories.length === 0 ? (
        <Card withBorder padding="xl" radius="md">
          <Text ta="center" c="dimmed">No saved stories yet. Generate a storyboard first!</Text>
        </Card>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {stories.map((story) => (
            <Card key={story.id} className="gallery-card" padding="lg" radius="lg" withBorder shadow="lg">
              <Image src={story.storyboard?.[0]?.imageUrl} alt={story.title} height={180} radius="md" withPlaceholder className="gallery-image" />
              <Title order={4} className="gallery-title">{story.title}</Title>
              <Text size="sm" c="dimmed">
                {new Date(story.createdAt).toLocaleString()} · {story.shotCount || story.storyboard?.length} shots
              </Text>
              <div className="gallery-links">
                <button className="link-btn" onClick={() => setViewStory(story)}>View</button>
                <span className="link-sep">·</span>
                <button className="link-btn" onClick={() => navigate(`/studio?load=${story.id}`)}>Load</button>
                <span className="link-sep">·</span>
                <button className="link-btn" onClick={() => handleDelete(story.id)}>Delete</button>
              </div>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <Modal opened={!!viewStory} onClose={() => setViewStory(null)} title={viewStory?.title} size="xl" radius="lg" centered>
        {viewStory && (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              {new Date(viewStory.createdAt).toLocaleString()} · {viewStory.shotCount || viewStory.storyboard?.length} shots
            </Text>
            <ScrollArea h={520} type="always" scrollHideDelay={0}>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                {viewStory.storyboard?.map((shot, idx) => (
                  <Card key={idx} withBorder radius="md" padding="md" className="viewer-card">
                    <Image src={shot.imageUrl} alt={`Shot ${shot.shot}`} height={180} radius="md" withPlaceholder mb="sm" />
                    <Title order={5} className="shot-title">{shot.description}</Title>
                    <Text size="sm" className="shot-prompt">{shot.shotStory || shot.prompt}</Text>
                  </Card>
                ))}
              </SimpleGrid>
            </ScrollArea>
          </Stack>
        )}
      </Modal>
    </div>
  );
}
