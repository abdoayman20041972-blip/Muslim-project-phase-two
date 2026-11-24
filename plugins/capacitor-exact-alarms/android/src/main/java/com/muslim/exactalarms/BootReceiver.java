package com.muslim.exactalarms;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * setAlarmClock alarms do not survive a reboot, so after BOOT_COMPLETED (and
 * the vendor QUICKBOOT variant) every stored alarm inside the 48-hour armed
 * window is re-armed, without the WebView, straight from this receiver.
 * (The app's own re-arm on open remains the primary path.)
 *
 * Other triggers: MY_PACKAGE_REPLACED re-arms right after an update. TIME_SET
 * and TIMEZONE_CHANGED keep the plan; {@link ClockSync} converts fixed
 * local-clock reminders only if the zone really changed (see its comment).
 * Earlier builds cleared the whole plan on either broadcast, which left no
 * notifications at all until the app was opened.
 * goAsync() + a background thread: arming alarms is binder work, and a
 * receiver that blocks the main thread at boot can be killed (ANR).
 */
public class BootReceiver extends BroadcastReceiver {

    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null && intent.getAction() != null ? intent.getAction() : "";
        boolean boot = Intent.ACTION_BOOT_COMPLETED.equals(action)
            || "android.intent.action.QUICKBOOT_POWERON".equals(action);
        boolean replaced = Intent.ACTION_MY_PACKAGE_REPLACED.equals(action);
        boolean timeSet = Intent.ACTION_TIME_CHANGED.equals(action);
        boolean zoneChanged = Intent.ACTION_TIMEZONE_CHANGED.equals(action);
        if (!boot && !replaced && !timeSet && !zoneChanged) return;

        final PendingResult result = goAsync();
        EXECUTOR.execute(() -> {
            FireLog log = new FireLog(context);
            try {
                AlarmStorage storage = new AlarmStorage(context);
                boolean changed = ClockSync.reconcile(context, storage, log);
                if (!changed) {
                    if (boot) log.add(0, "", 0L, "boot", "re-armed from stored plan");
                    else if (replaced) log.add(0, "", 0L, "package_replaced", "re-armed from stored plan");
                    else if (timeSet) log.add(0, "", 0L, "time_set", "clock changed or synced, plan kept");
                    else log.add(0, "", 0L, "timezone_event", "broadcast received, zone unchanged, plan kept");
                }
                storage.pruneBefore(System.currentTimeMillis() - 24L * 3600_000);
                AlarmScheduler.armWindow(context, storage.list(), AlarmScheduler.ARM_WINDOW_MS);
            } catch (RuntimeException unexpected) {
                log.add(0, "", 0L, "error", String.valueOf(unexpected.getMessage()));
            } finally {
                result.finish();
            }
        });
    }
}
