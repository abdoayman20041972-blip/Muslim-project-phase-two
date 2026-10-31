package com.muslim.exactalarms;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * The alarm plan in SharedPreferences so alarms survive process death and are
 * re-armed after a reboot (BootReceiver) without waiting for the WebView.
 */
public class AlarmStorage {

    private static final String KEY = "alarms";

    private final SharedPreferences prefs;

    public AlarmStorage(Context context) {
        prefs = context.getSharedPreferences("muslim_exact_alarms", Context.MODE_PRIVATE);
    }

    public synchronized void save(List<AlarmEntry> entries) {
        JSONArray array = new JSONArray();
        for (AlarmEntry entry : entries) {
            try {
                array.put(entry.toJson());
            } catch (JSONException ignored) {
            }
        }
        prefs.edit().putString(KEY, array.toString()).apply();
    }

    public synchronized List<AlarmEntry> list() {
        ArrayList<AlarmEntry> entries = new ArrayList<>();
        String raw = prefs.getString(KEY, null);
        if (raw == null) return entries;
        try {
            JSONArray array = new JSONArray(raw);
            for (int i = 0; i < array.length(); i++) {
                try {
                    entries.add(AlarmEntry.fromJson(array.getJSONObject(i)));
                } catch (JSONException ignored) {
                }
            }
        } catch (JSONException ignored) {
        }
        return entries;
    }

    public synchronized List<Integer> listIds() {
        ArrayList<Integer> ids = new ArrayList<>();
        for (AlarmEntry entry : list()) {
            ids.add(entry.id);
        }
        return ids;
    }

    public synchronized AlarmEntry find(int id) {
        for (AlarmEntry entry : list()) {
            if (entry.id == id) return entry;
        }
        return null;
    }

    public synchronized void remove(int id) {
        ArrayList<AlarmEntry> kept = new ArrayList<>();
        for (AlarmEntry entry : list()) {
            if (entry.id != id) kept.add(entry);
        }
        save(kept);
    }

    public synchronized void clear() {
        prefs.edit().remove(KEY).apply();
    }

    /**
     * Drops entries that fired long ago. Entries that fired TODAY are kept:
     * they are harmless (nothing re-arms the past) and keeping them means the
     * stored list doubles as the recovery plan the boot receiver re-arms from.
     * Returns how many entries were removed.
     */
    public synchronized int pruneBefore(long cutoff) {
        ArrayList<AlarmEntry> kept = new ArrayList<>();
        int removed = 0;
        for (AlarmEntry entry : list()) {
            if (entry.at < cutoff) {
                removed++;
            } else {
                kept.add(entry);
            }
        }
        if (removed > 0) save(kept);
        return removed;
    }
}
