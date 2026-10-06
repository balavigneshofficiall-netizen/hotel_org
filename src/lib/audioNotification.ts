/**
 * Audio Synthesizer & Browser Web Notification System
 * Uses 100% Web Audio API - Zero external MP3/WAV dependencies, instant zero-latency playback.
 */

export type NotificationSoundTone =
  | "chime"
  | "bell"
  | "buzzer"
  | "digital"
  | "longring"
  | "harp"
  | "dingdong";

export const NOTIFICATION_SOUNDS: Array<{
  id: NotificationSoundTone;
  name: string;
  description: string;
  emoji: string;
}> = [
  {
    id: "chime",
    name: "Classic Duo Chime",
    description: "Gentle dual restaurant chime (Default)",
    emoji: "🔔",
  },
  {
    id: "bell",
    name: "Hotel Counter Bell",
    description: "Crisp metallic desk reception bell",
    emoji: "🛎️",
  },
  {
    id: "buzzer",
    name: "Loud Kitchen Buzzer",
    description: "High-impact triple alarm — loud & punchy for busy kitchens",
    emoji: "🚨",
  },
  {
    id: "digital",
    name: "Modern Kitchen Beep",
    description: "Triple digital order terminal chirp",
    emoji: "📟",
  },
  {
    id: "longring",
    name: "2-Sec Melodic Chime",
    description: "Single 2-second musical phrase — melodic tune with warm chord finale",
    emoji: "🎵",
  },
];

let globalAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!globalAudioCtx || globalAudioCtx.state === "closed") {
      globalAudioCtx = new AudioCtx();
    }
    if (globalAudioCtx.state === "suspended") {
      globalAudioCtx.resume();
    }
    return globalAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Plays one of the 5 synthesized notification tones
 */
export function playNotificationTone(tone: NotificationSoundTone | string = "chime") {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  try {
    switch (tone) {
      case "bell": {
        // High-pitched crisp hotel reception bell (1318.5Hz - E6) with high metallic resonance
        const osc = ctx.createOscillator();
        const overtone = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        overtone.type = "triangle";

        osc.frequency.setValueAtTime(1318.5, now);
        overtone.frequency.setValueAtTime(2637, now); // 1 octave overtone

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.35, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.connect(gain);
        overtone.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        overtone.start(now);
        osc.stop(now + 1.2);
        overtone.stop(now + 1.2);
        break;
      }

      case "buzzer":
      case "dingdong": {
        // High-impact loud restaurant kitchen buzzer (sawtooth + sine harmonics)
        // 3 urgent, piercing alert pulses: 920Hz -> 920Hz -> 1180Hz (Hard & loud)
        const pulses = [
          { freq: 920, start: 0.0, dur: 0.12, vol: 0.45 },
          { freq: 920, start: 0.18, dur: 0.12, vol: 0.45 },
          { freq: 1180, start: 0.36, dur: 0.22, vol: 0.5 },
        ];

        pulses.forEach(({ freq, start, dur, vol }) => {
          const t = now + start;
          const oscSaw = ctx.createOscillator();
          const oscSine = ctx.createOscillator();
          const gain = ctx.createGain();

          oscSaw.type = "sawtooth";
          oscSaw.frequency.setValueAtTime(freq, t);

          oscSine.type = "sine";
          oscSine.frequency.setValueAtTime(freq, t);

          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(vol, t + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

          oscSaw.connect(gain);
          oscSine.connect(gain);
          gain.connect(ctx.destination);

          oscSaw.start(t);
          oscSine.start(t);
          oscSaw.stop(t + dur);
          oscSine.stop(t + dur);
        });
        break;
      }

      case "digital": {
        // Modern 3-chirp terminal beep (A5, D6, E6)
        const notes = [880, 1174.66, 1318.51];
        notes.forEach((freq, index) => {
          const t = now + index * 0.09;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "square";
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.12, t + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.07);
        });
        break;
      }

      case "longring":
      case "harp": {
        // Single cohesive 2-second musical melody (warm acoustic chime phrase)
        // 5 ascending melodic notes ending in a lush 3-note harmonic chord (~2.1s total)
        const melody = [
          { freq: 659.25, time: 0.0, dur: 0.45, vol: 0.35 },  // E5
          { freq: 783.99, time: 0.22, dur: 0.45, vol: 0.35 }, // G5
          { freq: 1046.5, time: 0.44, dur: 0.45, vol: 0.38 }, // C6
          { freq: 1174.66, time: 0.72, dur: 0.45, vol: 0.4 }, // D6
          { freq: 1318.51, time: 1.0, dur: 0.5, vol: 0.42 },  // E6
          // Final 3-note grand harmonic chord from 1.30s to 2.15s
          { freq: 523.25, time: 1.3, dur: 0.85, vol: 0.35 },  // C5 (Root)
          { freq: 783.99, time: 1.3, dur: 0.85, vol: 0.35 },  // G5 (Fifth)
          { freq: 1046.5, time: 1.3, dur: 0.85, vol: 0.4 },   // C6 (Octave)
        ];

        melody.forEach(({ freq, time, dur, vol }) => {
          const t = now + time;
          const oscSine = ctx.createOscillator();
          const oscTriangle = ctx.createOscillator();
          const gain = ctx.createGain();

          oscSine.type = "sine";
          oscTriangle.type = "triangle";

          oscSine.frequency.setValueAtTime(freq, t);
          oscTriangle.frequency.setValueAtTime(freq * 2, t);

          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(vol, t + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

          oscSine.connect(gain);
          oscTriangle.connect(gain);
          gain.connect(ctx.destination);

          oscSine.start(t);
          oscTriangle.start(t);
          oscSine.stop(t + dur);
          oscTriangle.stop(t + dur);
        });
        break;
      }

      case "chime":
      default: {
        // Classic pleasant dual chime (F5 and C6)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sine";
        osc2.type = "triangle";

        osc1.frequency.setValueAtTime(698.46, now);
        osc2.frequency.setValueAtTime(1046.5, now + 0.08);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now + 0.08);
        osc1.stop(now + 0.7);
        osc2.stop(now + 0.7);
        break;
      }
    }
  } catch (err) {
    console.error("Audio playback error:", err);
  }
}

/**
 * Triggers a standard native browser Web Notification banner
 * (works even if user is on another desktop tab / app)
 */
export function triggerBrowserWebNotification(options: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  if (Notification.permission === "granted") {
    try {
      const notif = new Notification(options.title, {
        body: options.body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: options.tag || "hotel-order-alert",
      });

      notif.onclick = () => {
        window.focus();
        if (options.url) {
          window.location.href = options.url;
        }
        notif.close();
      };
    } catch (e) {
      console.error("Web Notification error:", e);
    }
  } else if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}

/**
 * Helper to request browser notification permission
 */
export async function requestWebNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return await Notification.requestPermission();
}
