import "@testing-library/jest-dom";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { server } from "./mocks/server";

// Mock next/navigation for Next.js App Router components
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

beforeAll(() => {
  server.listen();

  if (typeof window !== "undefined") {
    // Stub matchMedia for ThemeProvider / Responsive components
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Stub offsetParent for jsdom focus trapping checks
    Object.defineProperty(HTMLElement.prototype, "offsetParent", {
      get() {
        return this.parentNode;
      },
    });

    // Stub HTMLMediaElement for video elements in jsdom
    window.HTMLMediaElement.prototype.load = () => {};
    window.HTMLMediaElement.prototype.play = async () => {};
    window.HTMLMediaElement.prototype.pause = () => {};

    // Stub ResizeObserver for responsive charts / components
    if (!window.ResizeObserver) {
      window.ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
    }
  }
});

afterEach(() => server.resetHandlers());
afterAll(() => server.close());
