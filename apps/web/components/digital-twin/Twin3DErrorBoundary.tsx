"use client";

import React, { Component, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function isWebGLAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

interface Twin3DErrorBoundaryProps {
  children: ReactNode;
  fallback2D: ReactNode;
  onFallbackTriggered?: () => void;
}

interface Twin3DErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

export class Twin3DErrorBoundary extends Component<
  Twin3DErrorBoundaryProps,
  Twin3DErrorBoundaryState
> {
  constructor(props: Twin3DErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: !isWebGLAvailable(),
      errorMessage: !isWebGLAvailable()
        ? "WebGL hardware acceleration is not supported or disabled in this browser."
        : null,
    };
  }

  static getDerivedStateFromError(error: Error): Twin3DErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || "An unexpected error occurred in the 3D renderer.",
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn("Twin3DErrorBoundary caught error:", error, errorInfo);
    this.props.onFallbackTriggered?.();
  }

  handleRetry = () => {
    this.setState({
      hasError: !isWebGLAvailable(),
      errorMessage: null,
    });
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="relative w-full h-full flex flex-col">
          {/* Prominent Visible Fallback Notice */}
          <div className="shrink-0 bg-amber-950/80 border-b border-amber-500/40 px-3.5 py-2 flex items-center justify-between text-xs text-amber-200 backdrop-blur z-20 gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
              <span>
                <strong>3D Twin Fallback Active:</strong> {this.state.errorMessage} Showing authoritative 2D Digital Twin.
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={this.handleRetry}
                className="h-6 px-2 text-[11px] font-mono border-amber-500/50 hover:bg-amber-500/20 text-amber-200"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry 3D
              </Button>
            </div>
          </div>
          {/* Active 2D Fallback View */}
          <div className="flex-1 w-full h-full min-h-0 relative">
            {this.props.fallback2D}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
