import React from 'react';
import { Title, Text, Group, Badge } from '@mantine/core';
import VideoGenerator from '../components/video/VideoGenerator';

export default function VideoGenerationPage() {
  return (
    <>
      {/* Page Header */}
      <Group justify="space-between" align="center" mb="lg">
        <div>
          <Title order={2} className="section-title" mb={4}>Video Generation</Title>
          <Text size="sm" c="dimmed">
            Generate AI-powered videos with multi-provider support — Kling 3.0, Luma Ray-v2, Hailuo, and Google Veo 3.1
          </Text>
        </div>
        <Badge size="lg" color="violet" variant="light">AI Video</Badge>
      </Group>

      <VideoGenerator />
    </>
  );
}
