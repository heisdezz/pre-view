import type { GalleryAsset } from './types';

/**
 * Cross-screen handoff for the `/view/[id]` route: the gallery grid stashes
 * the list it's currently showing here right before navigating, so the
 * full-screen viewer can swipe through the same list without re-fetching it
 * or serializing the whole array through navigation params (which only take
 * strings). A plain module-level object is used instead of `useRef` because
 * the value must outlive the grid's own render — `useRef` only persists for
 * as long as its owning component instance does.
 */
export const viewQueueRef: { current: GalleryAsset[] } = { current: [] };
