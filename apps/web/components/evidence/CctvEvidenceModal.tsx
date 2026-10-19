'use client';

import React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { CctvEvidenceViewer } from './CctvEvidenceViewer';
import { useCctvEvidenceModalStore } from '@/store/useCctvEvidenceModalStore';

export function CctvEvidenceModal() {
  const isOpen = useCctvEvidenceModalStore((s) => s.isOpen);
  const activeCamera = useCctvEvidenceModalStore((s) => s.activeCamera);
  const closeModal = useCctvEvidenceModalStore((s) => s.closeModal);
  const setActiveCamera = useCctvEvidenceModalStore((s) => s.setActiveCamera);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeModal();
      }}
      title="Real CCTV & ANPR Physical Evidence Viewer"
      description="Inspect genuine multi-camera CCTV footage and extracted frames from Level B2 Carparking-01 facility."
      className="max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-slate-950 border-slate-800 text-slate-100"
    >
      <div className="pt-2">
        <CctvEvidenceViewer
          key={activeCamera}
          initialCamera={activeCamera}
          onCameraChange={(cam) => setActiveCamera(cam)}
          showTitle={false}
        />
      </div>
    </Dialog>
  );
}
