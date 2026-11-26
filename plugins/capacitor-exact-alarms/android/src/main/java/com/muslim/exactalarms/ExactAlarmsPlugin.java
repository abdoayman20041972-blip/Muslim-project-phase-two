package com.muslim.exactalarms;

import android.app.Activity;
import android.app.AlarmManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import androidx.core.app.NotificationManagerCompat;
import android.os.Bundle;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Arms notifications with {@link AlarmManager#setAlarmClock}. Android's
 * documentation says alarms set this way keep firing in Doze (the system exits
 * Doze shortly before them) and that revoking the exact-alarm permission
 * deletes them. Vendor battery managers are outside that documentation and can
 * still stop an app's alarms, which is why the fire log below exists.
 *
 * Notification channels, the POST_NOTIFICATIONS permission and tap actions
 * remain owned by @capacitor/local-notifications; this plugin only owns TIME.
 *
 * v1.2.7 storage/arming split: the whole 30-day plan is STORED (it is the
 * recovery source for reboots and the chain-advance in the fire receiver),
 * but only the entries inside the arm window (~48h, ~40 alarms instead of
 * ~420) are actually ARMED — Android's per-app alarm limit is 500 and OEM
 * battery managers flag apps that register hundreds of alarm-clock alarms.
 */
@CapacitorPlugin(name = "ExactAlarms")
public class ExactAlarmsPlugin extends Plugin {

    private TapSounds tapSounds;

    @Override
    public void load() {
        try {
            tapSounds = new TapSounds(getContext());
        } catch (RuntimeException unavailable) {
            tapSounds = null;
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (tapSounds != null) {
            tapSounds.release();
            tapSounds = null;
        }
    }

    /** Plays the native click sound (low latency, no WebView audio). Fire and forget: nothing is returned. */
    @PluginMethod(returnType = PluginMethod.RETURN_NONE)
    public void tapSound(PluginCall call) {
        TapSounds sounds = tapSounds;
        if (sounds != null) {
            sounds.play(call.getString("kind", "ui"));
        }
    }

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
        // How far ahead alarms are actually armed. The JS side owns this value
        // (it must match the fire receiver's chain window); default is the same
        // constant the receiver uses.
        Long armWithinRaw = call.getLong("armWithinMs");
        long armWithinMs = armWithinRaw != null && armWithinRaw >= 0 ? armWithinRaw : AlarmScheduler.ARM_WINDOW_MS;

        Context context = getContext();
        AlarmStorage storage = new AlarmStorage(context);
        long now = System.currentTimeMillis();

        // Replace semantics: the new stored set is every future entry of the
        // incoming plan plus the kept ids; every previously stored id NOT in
        // that set is cancelled (the user turned something off, or the plan
        // horizon rolled past it).
        List<AlarmEntry> previous = storage.list();
        ArrayList<AlarmEntry> stored = new ArrayList<>();
        HashSet<Integer> storedIds = new HashSet<>();
        for (AlarmEntry kept : previous) {
            if (keepIds.contains(kept.id) && kept.at > now) {
                stored.add(kept);
                storedIds.add(kept.id);
            }
        }
        for (int i = 0; i < alarms.length(); i++) {
            try {
                JSONObject item = alarms.getJSONObject(i);
                AlarmEntry entry = AlarmEntry.fromJson(item);
                if (entry != null && entry.at > now) {
                    stored.add(entry);
                    storedIds.add(entry.id);
                }
            } catch (JSONException ignored) {
                // Skip malformed entries; the rest of the plan still arms.
            }
        }
        for (AlarmEntry old : previous) {
            if (!storedIds.contains(old.id)) {
                AlarmScheduler.cancelOne(context, old.id);
            }
        }
        storage.save(stored);
        storage.setPlanTimeZoneId(java.util.TimeZone.getDefault().getID());
        storage.setNeedsReplan(false);

        int armed = 0;
        for (AlarmEntry entry : stored) {
            if (keepIds.contains(entry.id)) continue; // already armed, untouched
            if (entry.at > now + armWithinMs) continue; // stored but not armed yet; the chain arms it later
            if (AlarmScheduler.arm(context, entry)) {
                armed++;
            }
        }
        JSObject result = new JSObject();
        result.put("armed", armed);
        result.put("stored", stored.size());
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
        long now = System.currentTimeMillis();
        JSArray items = new JSArray();
        for (AlarmEntry entry : storage.list()) {
            if (entry.at <= now) continue; // already fired or pruned-eligible
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

    /** The native receivers' own record of fired alarms and clock/boot events, newest last. */
    @PluginMethod
    public void fireLog(PluginCall call) {
        JSObject result = new JSObject();
        result.put("items", new FireLog(getContext()).read());
        call.resolve(result);
    }

    @PluginMethod
    public void clearFireLog(PluginCall call) {
        new FireLog(getContext()).clear();
        call.resolve();
    }

    /**
     * Facts the native side can read without the WebView: whether the OS lets
     * the app skip battery optimization, whether notifications are enabled at
     * all, and whether a timezone change left the plan needing a rebuild.
     */
    @PluginMethod
    public void status(PluginCall call) {
        Context context = getContext();
        boolean ignoring = false;
        try {
            PowerManager power = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (power != null) {
                ignoring = power.isIgnoringBatteryOptimizations(context.getPackageName());
            }
        } catch (RuntimeException unavailable) {
            // Leave false: the UI then only suggests checking the setting.
        }
        boolean enabled = NotificationManagerCompat.from(context).areNotificationsEnabled();
        AlarmStorage storage = new AlarmStorage(context);
        JSObject result = new JSObject();
        result.put("ignoringBatteryOptimizations", ignoring);
        result.put("notificationsEnabled", enabled);
        result.put("needsReplan", storage.needsReplan());
        result.put("storedAlarms", storage.list().size());
        call.resolve(result);
    }

    /**
     * Cold-start notification tap. The stock @capacitor/local-notifications
     * plugin only fires localNotificationActionPerformed from
     * handleOnNewIntent — i.e. when the app was ALREADY alive. When the app
     * was killed (the normal state overnight before Fajr) and the user taps
     * the adhan notification, the tap extras sit unread on the launch intent
     * and the app opened Home instead of the prayer view. This reads those
     * extras once, then consumes them so a later WebView re-creation cannot
     * re-consume a stale tap.
     */
    @PluginMethod
    public void launchNotification(PluginCall call) {
        JSObject result = new JSObject();
        result.put("notification", JSONObject.NULL);
        try {
            Activity activity = getBridge() != null ? getBridge().getActivity() : null;
            Intent intent = activity != null ? activity.getIntent() : null;
            boolean fromHistory = intent != null
                && (intent.getFlags() & Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY) != 0;
            if (intent != null && !fromHistory && intent.hasExtra("LocalNotificationId")) {
                int id = intent.getIntExtra("LocalNotificationId", 0);
                String raw = intent.getStringExtra("LocalNotficationObject");
                String title = "";
                String body = "";
                String target = "";
                if (raw != null) {
                    try {
                        JSONObject parsed = new JSONObject(raw);
                        title = parsed.optString("title", "");
                        body = parsed.optString("body", "");
                        target = parsed.optJSONObject("extra") != null
                            ? parsed.getJSONObject("extra").optString("target", "")
                            : "";
                    } catch (JSONException ignored) {
                    }
                }
                if (id != 0) {
                    JSObject notification = new JSObject();
                    notification.put("id", id);
                    notification.put("title", title);
                    notification.put("body", body);
                    JSObject extra = new JSObject();
                    extra.put("target", target);
                    notification.put("extra", extra);
                    result.put("notification", notification);
                    // Consume: clear the launch intent extras so a later
                    // WebView re-creation does not navigate again.
                    intent.replaceExtras((Bundle) null);
                }
            }
        } catch (RuntimeException unavailable) {
            // No activity / read failure: no notification launch to report.
        }
        call.resolve(result);
    }
}
