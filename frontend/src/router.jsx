import React from 'react';
import { Routes, Route } from 'react-router';
import AppShell from './components/layout/AppShell';
import DashboardPage from './pages/DashboardPage';
import ImageGenerationPage from './pages/ImageGenerationPage';
import VideoGenerationPage from './pages/VideoGenerationPage';
import StudioPage from './pages/StudioPage';
import GalleryPage from './pages/GalleryPage';
import LogsPage from './pages/LogsPage';
import ProjectPage from './pages/ProjectPage';
import SettingsPage from './pages/SettingsPage';
import VideoLabPage from './pages/VideoLabPage';

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/image-generation" element={<ImageGenerationPage />} />
        <Route path="/video-generation" element={<VideoGenerationPage />} />
        <Route path="/studio" element={<StudioPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/project/:id" element={<ProjectPage />} />
        <Route path="/project/:id/video" element={<VideoLabPage />} />
      </Route>
    </Routes>
  );
}
