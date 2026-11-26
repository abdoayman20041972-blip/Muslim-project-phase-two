package com.muslim.exactalarms;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.SoundPool;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Collections;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Short UI click sounds played through {@link SoundPool}. The sounds are synthesized once into small WAV files in
 * the cache directory and decoded into memory when the plugin loads, so a tap only has to call play(). This avoids
 * the WebView audio path (Web Audio output latency on Android) for the button click.
 */
final class TapSounds {
    private static final int RATE = 44100;
    private static final float ATTACK_SECONDS = 0.004f;

    private SoundPool pool;
    private int uiId;
    private int tasbihId;
    private int completeId;
    private final Set<Integer> loaded = Collections.newSetFromMap(new ConcurrentHashMap<Integer, Boolean>());

    TapSounds(Context context) {
        try {
            AudioAttributes attributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
            pool = new SoundPool.Builder().setMaxStreams(4).setAudioAttributes(attributes).build();
            pool.setOnLoadCompleteListener(new SoundPool.OnLoadCompleteListener() {
                @Override
                public void onLoadComplete(SoundPool soundPool, int sampleId, int status) {
                    if (status == 0) {
                        loaded.add(sampleId);
                    }
                }
            });
            File dir = context.getCacheDir();
            uiId = load(dir, "tap_ui.wav", new float[][] { { 520f, 0f, 0.055f, 0.10f } });
            tasbihId = load(dir, "tap_tasbih.wav", new float[][] { { 285f, 0f, 0.085f, 0.14f }, { 570f, 0.038f, 0.065f, 0.09f } });
            completeId = load(dir, "tap_complete.wav", new float[][] { { 220f, 0f, 0.09f, 0.16f }, { 440f, 0.06f, 0.12f, 0.12f } });
        } catch (RuntimeException unavailable) {
            pool = null;
        }
    }

    /** Plays the click for the kind ("ui", "tasbih" or "tasbih-complete"). Silent if the sound is not loaded yet. */
    void play(String kind) {
        SoundPool current = pool;
        if (current == null) {
            return;
        }
        int id = uiId;
        if ("tasbih".equals(kind)) {
            id = tasbihId;
        } else if ("tasbih-complete".equals(kind)) {
            id = completeId;
        }
        if (id != 0 && loaded.contains(id)) {
            current.play(id, 1f, 1f, 1, 0, 1f);
        }
    }

    void release() {
        SoundPool current = pool;
        pool = null;
        if (current != null) {
            current.release();
        }
    }

    private int load(File dir, String name, float[][] tones) {
        try {
            File file = new File(dir, name);
            writeWav(file, tones);
            return pool.load(file.getAbsolutePath(), 1);
        } catch (IOException failed) {
            return 0;
        }
    }

    /** tones: each row is {frequencyHz, startSeconds, durationSeconds, peakAmplitude}. */
    private static void writeWav(File file, float[][] tones) throws IOException {
        float total = 0f;
        for (float[] tone : tones) {
            total = Math.max(total, tone[1] + tone[2]);
        }
        int samples = (int) (total * RATE) + 64;
        short[] pcm = new short[samples];
        for (float[] tone : tones) {
            int start = (int) (tone[1] * RATE);
            int length = (int) (tone[2] * RATE);
            for (int i = 0; i < length && start + i < samples; i++) {
                float t = i / (float) RATE;
                float envelope;
                if (t < ATTACK_SECONDS) {
                    envelope = t / ATTACK_SECONDS;
                } else {
                    envelope = (float) Math.exp(-5.0 * (t - ATTACK_SECONDS) / Math.max(0.001f, tone[2] - ATTACK_SECONDS));
                }
                double value = Math.sin(2.0 * Math.PI * tone[0] * t) * tone[3] * envelope;
                int mixed = pcm[start + i] + (int) (value * 32767.0);
                pcm[start + i] = (short) Math.max(-32768, Math.min(32767, mixed));
            }
        }
        int dataBytes = samples * 2;
        byte[] header = new byte[44];
        putString(header, 0, "RIFF");
        putInt(header, 4, 36 + dataBytes);
        putString(header, 8, "WAVE");
        putString(header, 12, "fmt ");
        putInt(header, 16, 16);
        putShort(header, 20, 1);
        putShort(header, 22, 1);
        putInt(header, 24, RATE);
        putInt(header, 28, RATE * 2);
        putShort(header, 32, 2);
        putShort(header, 34, 16);
        putString(header, 36, "data");
        putInt(header, 40, dataBytes);
        byte[] body = new byte[dataBytes];
        for (int i = 0; i < samples; i++) {
            body[2 * i] = (byte) (pcm[i] & 0xff);
            body[2 * i + 1] = (byte) ((pcm[i] >> 8) & 0xff);
        }
        FileOutputStream out = new FileOutputStream(file);
        try {
            out.write(header);
            out.write(body);
        } finally {
            out.close();
        }
    }

    private static void putString(byte[] target, int offset, String text) {
        for (int i = 0; i < text.length(); i++) {
            target[offset + i] = (byte) text.charAt(i);
        }
    }

    private static void putInt(byte[] target, int offset, int value) {
        target[offset] = (byte) (value & 0xff);
        target[offset + 1] = (byte) ((value >> 8) & 0xff);
        target[offset + 2] = (byte) ((value >> 16) & 0xff);
        target[offset + 3] = (byte) ((value >> 24) & 0xff);
    }

    private static void putShort(byte[] target, int offset, int value) {
        target[offset] = (byte) (value & 0xff);
        target[offset + 1] = (byte) ((value >> 8) & 0xff);
    }
}
