import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { v1 } from './apiClient';

// ========================================
// Gallery Queries (V1 compat)
// ========================================

export function useGallery() {
  return useQuery({
    queryKey: ['gallery'],
    queryFn: async () => {
      const data = await v1.get('/gallery');
      return data.stories || [];
    },
  });
}

export function useSaveStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (story) => {
      const data = await v1.post('/gallery', story);
      return data.story;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
    },
  });
}

export function useDeleteStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const data = await v1.del(`/gallery/${id}`);
      return data.stories || [];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
    },
  });
}

// ========================================
// Storyboard Generation Mutations (V1 compat)
// ========================================

export function useGenerateStoryboard() {
  return useMutation({
    mutationFn: async ({ sentence, shotCount, style }) => {
      const data = await v1.post('/storyboard/generate', { sentence, shotCount, style });
      return data.storyboard;
    },
  });
}

export function useGenerateVideo() {
  return useMutation({
    mutationFn: async (storyboard) => {
      const data = await v1.post('/storyboard/generate-video', { storyboard });
      return data.videoUrl;
    },
  });
}

export function useRegenerateShot() {
  return useMutation({
    mutationFn: async ({ shot, style, referenceImageBase64, heroSubject, previousStyleHint }) => {
      const data = await v1.post('/storyboard/regenerate-shot', {
        shot, style, referenceImageBase64, heroSubject, previousStyleHint,
      });
      return data.imageUrl;
    },
  });
}

// ========================================
// Video Logs Queries (V1 compat)
// ========================================

export function useVideoLogs() {
  return useQuery({
    queryKey: ['videoLogs'],
    queryFn: async () => {
      const data = await v1.get('/video-logs');
      return data.logs || [];
    },
  });
}

export function useDeleteVideoLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await v1.del(`/video-logs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videoLogs'] });
    },
  });
}

export function useClearVideoLogs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await v1.del('/video-logs');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videoLogs'] });
    },
  });
}

// ========================================
// Storyboard Logs Queries (V1 compat)
// ========================================

export function useStoryboardLogs() {
  return useQuery({
    queryKey: ['storyboardLogs'],
    queryFn: async () => {
      const data = await v1.get('/storyboard-logs');
      return data.logs || [];
    },
  });
}

export function useDeleteStoryboardLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await v1.del(`/storyboard-logs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storyboardLogs'] });
    },
  });
}

export function useClearStoryboardLogs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await v1.del('/storyboard-logs');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storyboardLogs'] });
    },
  });
}
