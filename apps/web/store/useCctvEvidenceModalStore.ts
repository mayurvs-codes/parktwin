import { create } from 'zustand';

export type CctvCameraId = 'CAM-01' | 'CAM-02' | 'CAM-03';

interface CctvEvidenceModalState {
  isOpen: boolean;
  activeCamera: CctvCameraId;
  highlightTrackId?: number | null;
  highlightPlate?: string | null;
  openModal: (options?: {
    camera?: CctvCameraId;
    trackId?: number | null;
    plate?: string | null;
  }) => void;
  closeModal: () => void;
  setActiveCamera: (camera: CctvCameraId) => void;
}

export const useCctvEvidenceModalStore = create<CctvEvidenceModalState>((set) => ({
  isOpen: false,
  activeCamera: 'CAM-01',
  highlightTrackId: null,
  highlightPlate: null,
  openModal: (options) =>
    set({
      isOpen: true,
      activeCamera: options?.camera ?? 'CAM-01',
      highlightTrackId: options?.trackId ?? null,
      highlightPlate: options?.plate ?? null,
    }),
  closeModal: () => set({ isOpen: false }),
  setActiveCamera: (camera) => set({ activeCamera: camera }),
}));
