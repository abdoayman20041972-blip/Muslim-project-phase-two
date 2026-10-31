package com.muslim.exactalarms;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * setAlarmClock alarms do not survive a reboot, so after BOOT_COMPLETED (and
 * the vendor QUICKBOOT variant) every stored alarm inside the 48-hour armed
 * window is re-armed — without the WebView, straight from this receiver.
 * (The app's own re-arm on open remains the primary path.)
 *
 * v1.2.7 additions:
 *   - MY_PACKAGE_REPLACED: right after an app update the freshly created
 *     process has not run yet; re-arming here guarantees no prayer is missed
 *     between the update and the next time the app is opened.
 *   - TIME_CHANGED / TIMEZONE_CHANGED: every stored instant is absolute epoch
 *     time. After a manual clock change or a timezone change the whole plan is
 *     wrong, so the alarms are cancelled and the storage wiped rather than
 *     firing at wrong times; the next app open rebuilds the plan from settings.
 *   - goAsync() + a background thread: arming alarms is binder work, and a
 *     receiver that blocks the main thread at boot gets killed (ANR) — which
 *     used to mean NO notifications at all after a reboot on slow phones,
 *     because the old code re-armed all ~420 alarms synchronously.
 */
public class BootReceiver extends BroadcastReceiver {

    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null && intent.getAction() != null ? intent.getAction() : "";
        boolean boot = Intent.ACTION_BOOT_COMPLETED.equals(action)
            || "android.intent.action.QUICKBOOT_POWERON".equals(action);
        boolean replaced = Intent.ACTION_MY_PACKAGE_REPLACED.equals(action);
        boolean clockChanged = Intent.ACTION_TIME_CHANGED.equals(action)
            || Intent.ACTION_TIMEZONE_CHANGED.equals(action);
        if (!boot && !replaced && !clockChanged) return;

        final PendingResult result = goAsync();
        EXECUTOR.execute(() -> {
            try {
                AlarmStorage storage = new AlarmStorage(context);
                if (clockChanged) {
                    AlarmScheduler.cancelAll(context, storage.listIds());
                    storage.clear();
                    return;
                }
                long now = System.currentTimeMillis();
                storage.pruneBefore(now - 24L * 3600_000);
                AlarmScheduler.armWindow(context, storage.list(), AlarmScheduler.ARM_WINDOW_MS);
            } finally {
                result.finish();
            }
        });
    }
}
