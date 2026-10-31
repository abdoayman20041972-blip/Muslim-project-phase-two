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

    private AlarmScheduler() {}

    public static boolean arm(Context context, AlarmEntry entry) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return false;
        Intent intent = new Intent(context, AlarmFireReceiver.class);
        intent.putExtra("id", entry.id);
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
        PendingIntent pending = pendingBroadcast(context, id, intent);
        if (pending != null) alarmManager.cancel(pending);
    }

    private static PendingIntent pendingBroadcast(Context context, int id, Intent intent) {
        int flags = PendingIntent.FLAG_CANCEL_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_MUTABLE;
        }
        return PendingIntent.getBroadcast(context, id, intent, flags);
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
