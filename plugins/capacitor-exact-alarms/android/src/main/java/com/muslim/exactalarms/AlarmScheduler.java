package com.muslim.exactalarms;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import java.util.List;

/**
 * The alarm-arming core. Every alarm goes out as an {@link AlarmManager#setAlarmClock}
 * — the API the platform explicitly never reschedules, even inside Doze or
 * Battery Saver ("the system identifies these alarms as the most critical ones
 * and leaves low-power modes if necessary to deliver the alarms").
 *
 * Fallbacks keep the plugin robust on Android 12 devices where the special
 * "Alarms & reminders" access was not granted: setExactAndAllowWhileIdle
 * first, then plain setAndAllowWhileIdle, so an alarm is ALWAYS armed even
 * when the exact variant is unavailable.
 */
public class AlarmScheduler {

    /**
     * How far ahead alarms are actually ARMED. The full 30-day plan is stored,
     * but only this window is armed at a time (~40 alarms instead of ~420):
     * the per-app alarm limit is 500, and OEM battery managers flag apps that
     * register hundreds of alarm-clock alarms as abusive. The fire receiver
     * re-arms the window on every alarm that fires (chain-advance), and the
     * boot receiver re-arms it after a reboot. Keep in sync with
     * ARM_WINDOW_MS in nativeNotifications.ts.
     */
    public static final long ARM_WINDOW_MS = 48L * 3600_000;

    private AlarmScheduler() {}

    public static boolean arm(Context context, AlarmEntry entry) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return false;
        Intent intent = new Intent(context, AlarmFireReceiver.class);
        intent.putExtra("id", entry.id);
        cancelLegacy(context, alarmManager, entry.id);
        PendingIntent pending = pendingBroadcast(context, entry.id, intent);
        if (pending == null) return false;
        PendingIntent show = showIntent(context, entry);
        try {
            alarmManager.setAlarmClock(new AlarmManager.AlarmClockInfo(entry.at, show), pending);
            return true;
        } catch (SecurityException exactNotAllowed) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, entry.at, pending);
                } else {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, entry.at, pending);
                }
                return true;
            } catch (SecurityException noExactAccess) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, entry.at, pending);
                } else {
                    alarmManager.set(AlarmManager.RTC_WAKEUP, entry.at, pending);
                }
                return true;
            }
        } catch (RuntimeException armFailure) {
            return false;
        }
    }

    public static void cancelAll(Context context, List<Integer> ids) {
        if (ids == null || ids.isEmpty()) return;
        for (Integer id : ids) {
            cancelOne(context, id);
        }
    }

    public static void cancelOne(Context context, int id) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;
        Intent intent = new Intent(context, AlarmFireReceiver.class);
        cancelLegacy(context, alarmManager, id);
        PendingIntent pending = pendingBroadcast(context, id, intent);
        if (pending != null) alarmManager.cancel(pending);
    }

    /**
     * Arms every stored entry inside (now, now + windowMs]. Re-arming an
     * already-armed alarm is a replace, so this is the chain-advance used by
     * the fire receiver and the boot receiver. Returns how many were armed.
     */
    public static int armWindow(Context context, List<AlarmEntry> entries, long windowMs) {
        long now = System.currentTimeMillis();
        int armed = 0;
        for (AlarmEntry entry : entries) {
            if (entry.at > now && entry.at <= now + windowMs) {
                if (arm(context, entry)) armed++;
            }
        }
        return armed;
    }

    /**
     * The fire intent is explicit and the system never fills anything into it (the receiver only
     * reads the "id" extra we put there), so the PendingIntent is IMMUTABLE.
     */
    private static PendingIntent pendingBroadcast(Context context, int id, Intent intent) {
        int flags = PendingIntent.FLAG_CANCEL_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getBroadcast(context, id, intent, flags);
    }

    /**
     * Alarms armed by earlier builds used a MUTABLE PendingIntent (a different identity for the
     * system). Cancel any such leftover for this id so an upgrade can never leave two alarms for
     * one prayer. FLAG_NO_CREATE returns null when none exists.
     */
    private static void cancelLegacy(Context context, AlarmManager alarmManager, int id) {
        try {
            Intent intent = new Intent(context, AlarmFireReceiver.class);
            int flags = PendingIntent.FLAG_NO_CREATE;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                flags |= PendingIntent.FLAG_MUTABLE;
            }
            PendingIntent legacy = PendingIntent.getBroadcast(context, id, intent, flags);
            if (legacy != null) {
                alarmManager.cancel(legacy);
                legacy.cancel();
            }
        } catch (RuntimeException ignored) {
            // Best effort: the immutable alarm below is still armed.
        }
    }

    /** Opens the app when the user taps the status-bar alarm icon. Data URIs are
     * deliberately NOT set: they break resolution of the implicit launcher intent. */
    private static PendingIntent showIntent(Context context, AlarmEntry entry) {
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch == null) launch = new Intent();
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getActivity(context, entry.id + 100000, launch, flags);
    }
}
