/**
 * ParkTwin AI — Voice Output Adapter Interface & Web Speech API Implementation
 * ==============================================================================
 * Provides audio speech output using the standard browser Web Speech API
 * (`window.speechSynthesis`). Handles browser autoplay audio policy with
 * explicit one-time unlock and falls back gracefully when speech is unavailable.
 */

export interface VoiceMessagePayload {
  message_id: string;
  event_id: string;
  kind: "ASSIGNMENT" | "ROUTE_STEP" | "WRONG_BAY_WARNING" | "ERROR" | string;
  text: string;
  priority: number;
  lang?: string;
  vehicle_id?: string;
  source?: string;
  ts?: string;
}

export interface VoiceOutput {
  speak(msg: VoiceMessagePayload, options?: { volume?: number; rate?: number }): Promise<boolean>;
  cancel(messageId?: string): void;
  isAvailable(): boolean;
  unlock(): Promise<boolean>;
  isUnlocked(): boolean;
}

export class BrowserWebSpeechAdapter implements VoiceOutput {
  private _unlocked = false;

  isAvailable(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  isUnlocked(): boolean {
    return this._unlocked;
  }

  /**
   * Unlock speech synthesis on user interaction (bypasses browser autoplay restrictions).
   */
  async unlock(): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const utter = new window.SpeechSynthesisUtterance("");
      utter.volume = 0;
      window.speechSynthesis.speak(utter);
      this._unlocked = true;
      return true;
    } catch {
      return false;
    }
  }

  async speak(
    msg: VoiceMessagePayload,
    options?: { volume?: number; rate?: number }
  ): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    return new Promise((resolve) => {
      try {
        // Cancel in-progress speech if higher priority
        if (msg.priority >= 100) {
          window.speechSynthesis.cancel();
        }

        const utterance = new window.SpeechSynthesisUtterance(msg.text);
        utterance.lang = msg.lang || "en-US";
        utterance.volume = options?.volume ?? 1.0;
        utterance.rate = options?.rate ?? 1.0;

        utterance.onend = () => resolve(true);
        utterance.onerror = () => resolve(false);

        window.speechSynthesis.speak(utterance);
        this._unlocked = true;
      } catch {
        resolve(false);
      }
    });
  }

  cancel(messageId?: string): void {
    if (!this.isAvailable()) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

// Default singleton instance
export const defaultVoiceOutput: VoiceOutput = new BrowserWebSpeechAdapter();
