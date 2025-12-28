import { create } from 'zustand';

export interface StoryPost {
    id: string;
    storyId: string;
    imagePaths: string[]; // references to ingested images
    text: string;
    platform: 'twitter' | 'instagram' | 'threads' | 'facebook';
    layout: 'single' | 'gallery' | 'vertical-split' | 'horizontal-split';
    createdAt: number;
}

export interface Story {
    id: string;
    name: string;
    posts: StoryPost[];
    createdAt: number;
}

interface StoryState {
    stories: Story[];
    activeStoryId: string | null;
    activePostId: string | null;

    // Actions
    addStory: (name: string) => void;
    setActiveStory: (id: string | null) => void;
    addPostToStory: (storyId: string, post: Partial<StoryPost>) => void;
    updatePost: (postId: string, updates: Partial<StoryPost>) => void;
    deletePost: (postId: string) => void;
}

export const useStoryStore = create<StoryState>((set) => ({
    stories: [],
    activeStoryId: null,
    activePostId: null,

    addStory: (name) => {
        const newStory: Story = {
            id: Math.random().toString(36).substring(7),
            name,
            posts: [],
            createdAt: Date.now()
        };
        set(state => ({
            stories: [...state.stories, newStory],
            activeStoryId: newStory.id
        }));
    },

    setActiveStory: (id) => set({ activeStoryId: id }),

    addPostToStory: (storyId, post) => {
        const newPost: StoryPost = {
            id: Math.random().toString(36).substring(7),
            storyId,
            imagePaths: post.imagePaths || [],
            text: post.text || '',
            platform: post.platform || 'twitter',
            layout: post.layout || 'single',
            createdAt: Date.now()
        };

        set(state => ({
            stories: state.stories.map(s =>
                s.id === storyId ? { ...s, posts: [...s.posts, newPost] } : s
            ),
            activePostId: newPost.id
        }));
    },

    updatePost: (postId, updates) => {
        set(state => ({
            stories: state.stories.map(s => ({
                ...s,
                posts: s.posts.map(p => p.id === postId ? { ...p, ...updates } : p)
            }))
        }));
    },

    deletePost: (postId) => {
        set(state => ({
            stories: state.stories.map(s => ({
                ...s,
                posts: s.posts.filter(p => p.id !== postId)
            })),
            activePostId: state.activePostId === postId ? null : state.activePostId
        }));
    }
}));
