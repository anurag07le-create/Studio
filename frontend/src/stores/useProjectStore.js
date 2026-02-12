import { create } from 'zustand';

const useProjectStore = create((set, get) => ({
  // Current project context
  currentProject: null,
  currentStoryId: null,

  // Form inputs
  sentence: '',
  shotCount: 6,
  styleOption: 'cyberpunk',
  customStyle: '',

  // Generation results
  storyboard: null,
  videos: [],

  // Loading states
  loading: false,
  videoLoading: false,
  error: null,
  regeneratingIndex: null,

  // Actions: Form
  setSentence: (sentence) => set({ sentence }),
  setShotCount: (shotCount) => set({ shotCount }),
  setStyleOption: (styleOption) => set({ styleOption }),
  setCustomStyle: (customStyle) => set({ customStyle }),

  // Actions: Generation
  setStoryboard: (storyboard) => set({ storyboard }),
  setVideos: (videos) => set({ videos }),
  setLoading: (loading) => set({ loading }),
  setVideoLoading: (videoLoading) => set({ videoLoading }),
  setError: (error) => set({ error }),
  setRegeneratingIndex: (regeneratingIndex) => set({ regeneratingIndex }),
  setCurrentStoryId: (currentStoryId) => set({ currentStoryId }),

  // Actions: Project
  setCurrentProject: (project) => set({ currentProject: project }),

  // Load a saved story into the workspace
  loadStory: (story) => set({
    currentStoryId: story.id,
    sentence: story.title || '',
    storyboard: story.storyboard || null,
    videos: story.videos || [],
    shotCount: story.shotCount || story.storyboard?.length || 6,
    styleOption: story.style ? 'custom' : 'cyberpunk',
    customStyle: story.style || '',
    error: null,
  }),

  // Reset workspace to initial state
  resetWorkspace: () => set({
    currentProject: null,
    currentStoryId: null,
    sentence: '',
    shotCount: 6,
    styleOption: 'cyberpunk',
    customStyle: '',
    storyboard: null,
    videos: [],
    loading: false,
    videoLoading: false,
    error: null,
    regeneratingIndex: null,
  }),
}));

export default useProjectStore;
