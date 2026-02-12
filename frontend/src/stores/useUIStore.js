import { create } from 'zustand';

const useUIStore = create((set) => ({
  // Sidebar
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  // View mode for storyboard (future: board, timeline, list)
  activeView: 'board',
  setActiveView: (activeView) => set({ activeView }),

  // Image preview modal
  previewImage: null,
  setPreviewImage: (previewImage) => set({ previewImage }),

  // Video fullscreen modal
  fullscreenVideo: null,
  setFullscreenVideo: (fullscreenVideo) => set({ fullscreenVideo }),

  // Logs modal (V1 compat — will become a page in later phases)
  showLogs: false,
  setShowLogs: (showLogs) => set({ showLogs }),

  // View story modal
  viewStory: null,
  setViewStory: (viewStory) => set({ viewStory }),
}));

export default useUIStore;
