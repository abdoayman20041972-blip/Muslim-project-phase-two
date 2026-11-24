package com.muslim.exactalarms;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Small persisted record of what the native receivers actually did: each alarm
 * that fired (posted, skipped and why, failed) and each clock/timezone/boot
 * event. Lets a missing notification be explained instead of failing silently.
 * Kept to the newest {@link #MAX} rows so storage stays tiny.
 */
public class FireLog {

    public static final int MAX = 40;
    private static final String KEY = "log";

    private final SharedPreferences prefs;

    public FireLog(Context context) {
        prefs = context.getSharedPreferences("muslim_fire_log", Context.MODE_PRIVATE);
    }

    /** Appends one row; the oldest rows beyond {@link #MAX} are dropped. */
    public synchronized void add(int id, String title, long plannedAt, String result, String detail) {
        try {
            JSONArray old = read();
            JSONArray next = new JSONArray();
            int start = Math.max(0, old.length() - (MAX - 1));
            for (int i = start; i < old.length(); i++) {
                next.put(old.get(i));
            }
            JSONObject row = new JSONObject();
            row.put("id", id);
            row.put("title", title == null ? "" : title);
            row.put("planned", plannedAt);
            row.put("at", System.currentTimeMillis());
            row.put("result", result);
            row.put("detail", detail == null ? "" : detail);
            next.put(row);
            prefs.edit().putString(KEY, next.toString()).apply();
        } catch (JSONException | RuntimeException ignored) {
            // Logging must never break delivery.
        }
    }

    public synchronized JSONArray read() {
        String raw = prefs.getString(KEY, null);
        if (raw == null) return new JSONArray();
        try {
            return new JSONArray(raw);
        } catch (JSONException broken) {
            return new JSONArray();
        }
    }

    public synchronized void clear() {
        prefs.edit().remove(KEY).apply();
    }
}
