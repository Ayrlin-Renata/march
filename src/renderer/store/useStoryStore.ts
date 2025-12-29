import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type StoryPost, type PlatformKey, type LayoutKey, PLATFORMS, type PlatformConfig, type SlotCrop } from '../types/stories';

interface StoryState {
    posts: StoryPost[];
    activePostId: string | null;

    // Actions
    addPost: (name?: string) => void;
    removePost: (id: string) => void;
    setActivePostId: (id: string | null) => void;
    updatePostName: (id: string, name: string) => void;

    enablePlatform: (postId: string, platform: PlatformKey) => void;
    setActivePlatform: (postId: string, platform: PlatformKey) => void;
    updateLayout: (postId: string, platform: PlatformKey, layout: LayoutKey) => void;
    setSlotImage: (postId: string, platform: PlatformKey, slotIndex: number, image: { id: string, path: string, width?: number, height?: number }) => void;
    updateSlotCrop: (postId: string, platform: PlatformKey, slotIndex: number, crop: SlotCrop) => void;
    updateSlotDimensions: (postId: string, platform: PlatformKey, slotIndex: number, width: number, height: number) => void;
    updatePlatformText: (postId: string, platform: PlatformKey, text: string) => void;
    duplicatePlatformConfig: (postId: string, from: PlatformKey, to: PlatformKey) => void;
    copyToAll: (postId: string, from: PlatformKey) => void;
}

const createDefaultPlatformConfig = (): PlatformConfig => ({
    enabled: false,
    layout: '1-single',
    slots: Array(4).fill(null).map(() => ({
        imageId: null,
        imagePath: null,
        crop: { x: 0, y: 0, scale: 1, aspect: 1, expansion: { top: 0, right: 0, bottom: 0, left: 0 } }
    })),
    text: '',
});

export const useStoryStore = create<StoryState>()(
    persist(
        (set, get) => ({
            posts: [],
            activePostId: null,

            addPost: (name) => {
                const id = Math.random().toString(36).substring(7);
                const newPost: StoryPost = {
                    id,
                    name: name || `Story ${get().posts.length + 1}`,
                    platforms: PLATFORMS.reduce((acc, p) => ({ ...acc, [p.key]: createDefaultPlatformConfig() }), {} as Record<PlatformKey, PlatformConfig>),
                    activePlatform: 'x',
                    createdAt: Date.now(),
                };

                // Enable X by default for new posts
                newPost.platforms.x.enabled = true;

                set((state) => ({
                    posts: [newPost, ...state.posts],
                    activePostId: id,
                }));
            },

            removePost: (id) => set((state) => ({
                posts: state.posts.filter((p) => p.id !== id),
                activePostId: state.activePostId === id ? (state.posts.length > 1 ? state.posts.find(p => p.id !== id)?.id || null : null) : state.activePostId
            })),

            setActivePostId: (id) => set({ activePostId: id }),

            updatePostName: (id, name) => set((state) => ({
                posts: state.posts.map((p) => (p.id === id ? { ...p, name } : p)),
            })),

            enablePlatform: (postId, platform) => set((state) => ({
                posts: state.posts.map((p) => {
                    if (p.id !== postId) return p;
                    // Inherit from the currently active platform configuration
                    const currentActive = p.platforms[p.activePlatform];
                    // If platform is already enabled, we are essentially "cloning" the active state to it
                    // because the UI will call this on the '+' button even if enabled
                    return {
                        ...p,
                        platforms: {
                            ...p.platforms,
                            [platform]: {
                                ...currentActive,
                                enabled: true
                            }
                        },
                        activePlatform: platform
                    };
                }),
            })),

            setActivePlatform: (postId, platform) => set((state) => ({
                posts: state.posts.map((p) => (p.id === postId ? { ...p, activePlatform: platform } : p)),
            })),

            updateLayout: (postId, platform, layout) => set((state) => ({
                posts: state.posts.map((p) => {
                    if (p.id !== postId) return p;
                    return {
                        ...p,
                        platforms: {
                            ...p.platforms,
                            [platform]: { ...p.platforms[platform], layout }
                        }
                    };
                }),
            })),

            setSlotImage: (postId, platform, slotIndex, image) => set((state) => ({
                posts: state.posts.map((p) => {
                    if (p.id !== postId) return p;
                    // Calculate initial "fit" - Center Cover
                    let initialScale = 1;
                    const imgAspect = (image.width && image.height) ? image.width / image.height : 1;

                    const newSlots = [...p.platforms[platform].slots];
                    newSlots[slotIndex] = {
                        imageId: image.id,
                        imagePath: image.path,
                        originalWidth: image.width,
                        originalHeight: image.height,
                        crop: {
                            x: 0,
                            y: 0,
                            scale: initialScale,
                            aspect: imgAspect,
                            expansion: { top: 0, right: 0, bottom: 0, left: 0 }
                        }
                    };
                    return {
                        ...p,
                        platforms: {
                            ...p.platforms,
                            [platform]: { ...p.platforms[platform], slots: newSlots }
                        }
                    };
                }),
            })),

            updateSlotCrop: (postId, platform, slotIndex, crop) => set((state) => ({
                posts: state.posts.map((p) => {
                    if (p.id !== postId) return p;
                    const newSlots = [...p.platforms[platform].slots];
                    newSlots[slotIndex] = { ...newSlots[slotIndex], crop };
                    return {
                        ...p,
                        platforms: {
                            ...p.platforms,
                            [platform]: { ...p.platforms[platform], slots: newSlots }
                        }
                    };
                }),
            })),

            updateSlotDimensions: (postId, platform, slotIndex, width, height) => set((state) => ({
                posts: state.posts.map((p) => {
                    if (p.id !== postId) return p;
                    const newSlots = [...p.platforms[platform].slots];
                    newSlots[slotIndex] = { ...newSlots[slotIndex], originalWidth: width, originalHeight: height };
                    return {
                        ...p,
                        platforms: {
                            ...p.platforms,
                            [platform]: { ...p.platforms[platform], slots: newSlots }
                        }
                    };
                }),
            })),

            updatePlatformText: (postId, platform, text) => set((state) => ({
                posts: state.posts.map((p) => {
                    if (p.id !== postId) return p;
                    return {
                        ...p,
                        platforms: {
                            ...p.platforms,
                            [platform]: { ...p.platforms[platform], text }
                        }
                    };
                }),
            })),

            duplicatePlatformConfig: (postId, from, to) => set((state) => ({
                posts: state.posts.map((p) => {
                    if (p.id !== postId) return p;
                    return {
                        ...p,
                        platforms: {
                            ...p.platforms,
                            [to]: { ...p.platforms[from], enabled: true }
                        },
                        activePlatform: to
                    };
                }),
            })),

            copyToAll: (postId, from) => set((state) => ({
                posts: state.posts.map((p) => {
                    if (p.id !== postId) return p;
                    const sourceConfig = p.platforms[from];
                    const newPlatforms = { ...p.platforms };
                    PLATFORMS.forEach(plt => {
                        if (plt.key !== from) {
                            newPlatforms[plt.key] = { ...sourceConfig, enabled: newPlatforms[plt.key].enabled };
                        }
                    });
                    return { ...p, platforms: newPlatforms };
                }),
            })),
        }),
        {
            name: 'march-stories',
        }
    )
);
