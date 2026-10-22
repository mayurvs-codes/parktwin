"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseSpokenBay } from "@/utils/spokenBay";
import { bayLabel } from "@/utils/bayLabel";

interface VoiceBayPickerProps {
  availableIds: readonly string[];
  onPick: (spaceId: string) => void;
}

/* Minimal typing for the browser Web Speech recognition API. */
interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

function createRecognition(): RecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/** Lets a driver choose a bay by speaking (or typing) its label, e.g. "C 7". */
export function VoiceBayPicker({ availableIds, onPick }: VoiceBayPickerProps) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const recRef = useRef<RecognitionLike | null>(null);

  useEffect(() => {
    setSupported(createRecognition() !== null);
    return () => recRef.current?.stop();
  }, []);

  const handleTranscript = useCallback(
    (transcript: string) => {
      setHeard(transcript);
      const result = parseSpokenBay(transcript, availableIds);
      if (result.kind === "match") {
        setFeedback(`Selected bay ${result.label}`);
        onPick(result.id);
      } else if (result.kind === "unavailable") {
        setFeedback(`Bay ${result.label} is not available. Pick a free bay.`);
      } else {
        setFeedback(`Could not catch a bay. Say a letter and number, like "${bayLabel(availableIds[0] ?? "SP-01")}".`);
      }
    },
    [availableIds, onPick]
  );

  const gotResultRef = useRef(false);

  const describeError = (code?: string): string => {
    switch (code) {
      case "not-allowed":
      case "service-not-allowed":
        return "Microphone blocked. Click the lock icon in the address bar, allow the microphone, then try again.";
      case "no-speech":
        return "No speech heard. Tap the mic and say a bay, like \"D 6\".";
      case "audio-capture":
        return "No microphone found. Plug one in or choose another input, or type the bay.";
      case "network":
        return "Chrome's speech service could not be reached (needs internet). Type the bay instead.";
      case "aborted":
        return "Voice input stopped.";
      default:
        return `Voice input failed (${code ?? "unknown"}). Type the bay instead.`;
    }
  };

  const startListening = async () => {
    const rec = createRecognition();
    if (!rec) {
      setFeedback("This browser has no voice recognition. Use Chrome or Edge, or type the bay.");
      return;
    }

    // Ask for the microphone explicitly so the permission prompt always appears.
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch (err) {
      const name = (err as { name?: string })?.name;
      setFeedback(describeError(name === "NotFoundError" ? "audio-capture" : "not-allowed"));
      return;
    }

    recRef.current = rec;
    gotResultRef.current = false;
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    rec.onresult = (e) => {
      const result = e.results[e.results.length - 1];
      if (!result) return;
      const alternatives = Array.from(result).map((a) => a.transcript);
      const isFinal = (result as unknown as { isFinal?: boolean }).isFinal;
      setHeard(alternatives[0] ?? "");
      if (!isFinal) return;
      gotResultRef.current = true;
      // Prefer the first alternative that parses to a bay.
      const best = alternatives.find((t) => parseSpokenBay(t, availableIds).kind !== "none") ?? alternatives[0] ?? "";
      handleTranscript(best);
    };
    rec.onerror = (e) => {
      gotResultRef.current = true; // an error message is already shown
      setFeedback(describeError(e.error));
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      if (!gotResultRef.current) setFeedback(describeError("no-speech"));
    };
    setFeedback("Listening… say a bay, like \"D 6\".");
    setHeard("");
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
      setFeedback("Voice input could not start. Reload the page and try again.");
    }
    window.setTimeout(() => rec.stop(), 8000);
  };

  const stopListening = () => {
    recRef.current?.stop();
    setListening(false);
  };

  return (
    <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/40 p-2.5" data-testid="voice-bay-picker">
      <div className="flex items-center gap-2">
        {(
          <Button
            type="button"
            size="sm"
            onClick={listening ? stopListening : startListening}
            data-testid="voice-bay-mic"
            className={`h-8 gap-1.5 font-mono text-[11px] font-bold ${
              listening ? "bg-rose-600 hover:bg-rose-500 text-white" : "bg-sky-600 hover:bg-sky-500 text-white"
            }`}
          >
            {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            {listening ? "LISTENING… (tap to stop)" : "SAY A BAY"}
          </Button>
        )}
        <form
          className="flex flex-1 items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (typed.trim()) handleTranscript(typed);
          }}
        >
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={supported ? "or type, e.g. C 7" : "Type a bay, e.g. C 7"}
            aria-label="Bay to select by voice or text"
            data-testid="voice-bay-input"
            className="h-8 min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 font-mono text-[11px] text-slate-200 placeholder:text-slate-500"
          />
          <Button type="submit" size="sm" variant="outline" className="h-8 font-mono text-[11px]">
            Go
          </Button>
        </form>
      </div>
      {heard && <p className="font-mono text-[10px] text-slate-400">Heard: “{heard}”</p>}
      {feedback && (
        <p className="font-mono text-[11px] text-sky-300" role="status" data-testid="voice-bay-feedback">
          {feedback}
        </p>
      )}
    </div>
  );
}
