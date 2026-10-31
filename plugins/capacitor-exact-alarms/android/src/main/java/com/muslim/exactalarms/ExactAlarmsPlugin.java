package com.muslim.exactalarms;

import android.app.AlarmManager;
import android.content.Context;
import android.os.Build;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Arms notifications with {@link AlarmManager#setAlarmClock} — the only alarm
 * API Android never defers: the system treats these as the user's own alarm
 * clocks and leaves Doze/Battery Saver to deliver them at the exact instant.
 * (The stock @capacitor/local-notifications plugin uses
 * setExactAndAllowWhileIdle, which Battery Saver and OEM battery managers
 * still postpone — the reason adhan notifications used to arrive late.)
 *
 * Notification channels, the POST_NOTIFICATIONS permission and tap actions
 * remain owned by @capacitor/local-notifications; this plugin only owns TIME.
 */
@CapacitorPlugin(name = "ExactAlarms")
public class ExactAlarmsPlugin extends Plugin {

    @PluginMethod
    public void schedule(PluginCall call) {
        JSONArray alarms = call.getArray("alarms");
        if (alarms == null) {
            call.reject("alarms array is required");
            return;
        }
        // Optional ids that must SURVIVE this replace run — e.g. the pending
        // 10-second diagnostic test: a settings change or app resume during
        // those seconds must not cancel it.
        JSONArray keepRaw = call.getArray("keepIds");
        ArrayList<Integer> keepIds = new ArrayList<>();
        if (keepRaw != null) {
            for (int i = 0; i < keepRaw.length(); i++) {
                try {
                    keepIds.add(keepRaw.getInt(i));
                } catch (JSONException ignored) {
                }
            }
        }
        Context context = getContext();
        AlarmStorage storage = new AlarmStorage(context);
        // Replace semantics: drop everything previously armed except keepIds.
        long now = System.currentTimeMillis();
        ArrayList<AlarmEntry> entries = new ArrayList<>();
        for (AlarmEntry previous : storage.list()) {
            if (keepIds.contains(previous.id) && previous.at > now) {
                entries.add(previous);
            } else {
                AlarmScheduler.cancelOne(context, previous.id);
            }
        }
        for (int i = 0; i < alarms.length(); i++) {
            try {
                JSONObject item = alarms.getJSONObject(i);
                AlarmEntry entry = AlarmEntry.fromJson(item);
                if (entry != null && entry.at > now) {
                    entries.add(entry);
                }
            } catch (JSONException ignored) {
                // Skip malformed entries; the rest of the plan still arms.
            }
        }
        storage.save(entries);
        int armed = 0;
        for (AlarmEntry entry : entries) {
            if (keepIds.contains(entry.id)) continue; // already armed, untouched
            if (AlarmScheduler.arm(context, entry)) {
                armed++;
            }
        }
        JSObject result = new JSObject();
        result.put("armed", armed);
        result.put("stored", entries.size());
        call.resolve(result);
    }

    /** Arms ONE alarm on top of whatever is already stored (used by the diagnostic test). */
    @PluginMethod
    public void add(PluginCall call) {
        JSONObject alarm = call.getObject("alarm");
        if (alarm == null) {
            call.reject("alarm object is required");
            return;
        }
        try {
            AlarmEntry entry = AlarmEntry.fromJson(alarm);
            if (entry == null || entry.at <= System.currentTimeMillis()) {
                call.reject("alarm time must be in the future");
                return;
            }
            Context context = getContext();
            AlarmStorage storage = new AlarmStorage(context);
            // A previous instance of the same id is replaced, not stacked.
            AlarmScheduler.cancelOne(context, entry.id);
            ArrayList<AlarmEntry> entries = new ArrayList<>(storage.list());
            for (int i = 0; i < entries.size(); i++) {
                if (entries.get(i).id == entry.id) {
                    entries.remove(i);
                    break;
                }
            }
            entries.add(entry);
            boolean ok = AlarmScheduler.arm(context, entry);
            storage.save(entries);
            JSObject result = new JSObject();
            result.put("armed", ok ? 1 : 0);
            result.put("stored", entries.size());
            call.resolve(result);
        } catch (JSONException malformed) {
            call.reject("alarm object is malformed");
        }
    }

    /** Cancels ONE alarm by id without touching the rest of the plan. */
    @PluginMethod
    public void cancelOne(PluginCall call) {
        Integer id = call.getInt("id");
        if (id == null) {
            call.reject("id is required");
            return;
        }
        Context context = getContext();
        AlarmStorage storage = new AlarmStorage(context);
        AlarmScheduler.cancelOne(context, id);
        storage.remove(id);
        call.resolve();
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        Context context = getContext();
        AlarmStorage storage = new AlarmStorage(context);
        AlarmScheduler.cancelAll(context, storage.listIds());
        storage.clear();
        call.resolve();
    }

    @PluginMethod
    public void pending(PluginCall call) {
        AlarmStorage storage = new AlarmStorage(getContext());
        JSArray items = new JSArray();
        for (AlarmEntry entry : storage.list()) {
            JSObject item = new JSObject();
            item.put("id", entry.id);
            item.put("at", entry.at);
            item.put("title", entry.title);
            items.put(item);
        }
        JSObject result = new JSObject();
        result.put("items", items);
        call.resolve(result);
    }

    @PluginMethod
    public void check(PluginCall call) {
        AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        boolean exact = true;
        if (alarmManager != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            exact = alarmManager.canScheduleExactAlarms();
        }
        JSObject result = new JSObject();
        result.put("exactAlarm", exact ? "granted" : "denied");
        call.resolve(result);
    }
}
