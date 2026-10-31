package com.muslim.exactalarms;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import java.util.ArrayList;
import java.util.List;

/**
 * setAlarmClock alarms do not survive a reboot, so after BOOT_COMPLETED every
 * stored future alarm is re-armed — without the WebView, straight from this
 * receiver. (The app's own re-arm on open remains the primary path; this is
 * the safety net for a phone that stays off overnight.)
 */
public class BootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null && intent.getAction() != null ? intent.getAction() : "";
        if (!Intent.ACTION_BOOT_COMPLETED.equals(action) && !"android.intent.action.QUICKBOOT_POWERON".equals(action)) {
            return;
        }
        AlarmStorage storage = new AlarmStorage(context);
        List<AlarmEntry> all = storage.list();
        long now = System.currentTimeMillis();
        ArrayList<AlarmEntry> future = new ArrayList<>();
        for (AlarmEntry entry : all) {
            if (entry.at > now + 5_000L) {
                AlarmScheduler.arm(context, entry);
                future.add(entry);
            }
        }
        storage.save(future);
    }
}
