// ───────────────────────────────────────────────────────────────
//  ElevenLabs text-to-speech via the REST API.
//  Returns raw MP3 bytes for an Arabic-capable voice.
// ───────────────────────────────────────────────────────────────

const DEFAULT_MODEL = "eleven_multilingual_v2";

export interface TtsParams {
  text: string;
}

export async function synthesizeSpeech({ text }: TtsParams): Promise<ArrayBuffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;

  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not set. Add it to .env.local");
  }
  if (!voiceId) {
    throw new Error("ELEVENLABS_VOICE_ID is not set. Add it to .env.local");
  }

  const modelId = process.env.ELEVENLABS_MODEL_ID || DEFAULT_MODEL;
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      // Voice settings tuned for an energetic, expressive streamer tone.
      voice_settings: {
        stability: 0.4,
        similarity_boost: 0.85,
        style: 0.55,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ElevenLabs request failed (${res.status}): ${detail}`);
  }

  return res.arrayBuffer();
}
