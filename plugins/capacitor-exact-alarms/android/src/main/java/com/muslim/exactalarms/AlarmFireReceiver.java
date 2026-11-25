package com.muslim.exactalarms;

import android.Manifest;
import android.app.Notification;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.content.ContextCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Fires when a setAlarmClock alarm goes off. Posts the notification (channel id,
 * icons and sound were configured once by the app through
 * @capacitor/local-notifications, so the adhan channel rings exactly like
 * before), prunes fired-long-ago entries, and then CHAIN-ADVANCES: re-arms
 * every stored alarm inside the next 48-hour window, so the plan keeps firing
 * for weeks even if the app is never opened again.
 *
 * v1.2.7 root-cause fixes here:
 *   - goAsync() + a background thread: a receiver gets ~10s on the main
 *     thread; doing binder work there could ANR and get the process killed,
 *     silently killing every future notification.
 *   - The fired entry is NOT removed from storage anymore: the stored plan is
 *     the recovery source the boot receiver and the chain re-arm from.
 *   - Stale notifications clean themselves up (setTimeoutAfter via entry.ttl):
 *     the "prayer is coming" reminders used to sit in the shade for days.
 *   - Grouped prayers get a summary notification so the shade stacks them.
 *
 * Tap extras intentionally mimic @capacitor/local-notifications
 * (LocalNotificationId / LocalNotficationObject / LocalNotificationUserAction)
 * so taps keep flowing through the stock plugin's
 * localNotificationActionPerformed listener (warm starts) and through
 * ExactAlarms.launchNotification() (cold starts — the stock plugin only
 * handles warm ones).
 */
public class AlarmFireReceiver extends BroadcastReceiver {

    private static final int GOLD = 0xFFE6C86E;
    /** Notification id of the group summary; outside the planned id range. */
    private static final int GROUP_SUMMARY_ID = 700100002;
    /** Entries older than this are pruned from storage on each fire. */
    private static final long PRUNE_AFTER_MS = 24L * 3600_000;

    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();

    @Override
    public void onReceive(Context context, Intent intent) {
        int id = intent.getIntExtra("id", Integer.MIN_VALUE);
        if (id == Integer.MIN_VALUE) return;
        final PendingResult result = goAsync();
        EXECUTOR.execute(() -> {
            FireLog log = new FireLog(context);
            try {
                AlarmStorage storage = new AlarmStorage(context);
                AlarmEntry entry = storage.find(id);
                if (entry == null) {
                    log.add(id, "", 0L, "no_entry", "alarm fired but the stored plan has no entry for it");
                } else {
                    deliver(context, entry, log);
                }
                // Covers a missed timezone broadcast; does nothing when the zone is unchanged.
                ClockSync.reconcile(context, storage, log);
                long now = System.currentTimeMillis();
                storage.pruneBefore(now - PRUNE_AFTER_MS);
                AlarmScheduler.armWindow(context, storage.list(), AlarmScheduler.ARM_WINDOW_MS);
            } catch (RuntimeException unexpected) {
                log.add(id, "", 0L, "error", String.valueOf(unexpected.getMessage()));
            } finally {
                result.finish();
            }
        });
    }

    /**
     * Posts the entry and records what happened. A failed post is retried once
     * after a short pause; a skipped post (notifications disabled) is logged
     * with its reason instead of vanishing.
     */
    private void deliver(Context context, AlarmEntry entry, FireLog log) {
        long late = Math.max(0L, System.currentTimeMillis() - entry.at);
        String lateNote = "fired " + (late / 1000) + "s after the planned time";
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) {
            log.add(entry.id, entry.title, entry.at, "notifications_disabled", lateNote);
            return;
        }
        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                ensureChannel(context, entry.channelId);
                postNotification(context, entry);
                log.add(entry.id, entry.title, entry.at, "posted", lateNote + (attempt > 1 ? ", second attempt" : ""));
                return;
            } catch (RuntimeException postFailure) {
                if (attempt == 2) {
                    log.add(entry.id, entry.title, entry.at, "post_failed", String.valueOf(postFailure.getMessage()));
                    return;
                }
                try {
                    Thread.sleep(1500);
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    log.add(entry.id, entry.title, entry.at, "post_failed", "interrupted before retry");
                    return;
                }
            }
        }
    }

    /**
     * If the entry's channel is missing (for example the user deleted it in
     * system settings while the plan survived), Android 8+ drops the post.
     * Recreate a basic channel with the same id so the notification still shows.
     * An existing channel is never touched, so the user's own settings stay.
     */
    private void ensureChannel(Context context, String channelId) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        android.app.NotificationManager manager =
            (android.app.NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null || manager.getNotificationChannel(channelId) != null) return;
        boolean silent = channelId.endsWith("silent");
        boolean adhan = channelId.contains("adhan") && !silent;
        android.app.NotificationChannel channel = new android.app.NotificationChannel(
            channelId,
            adhan || silent ? "الأذان" : "التنبيهات",
            silent
                ? android.app.NotificationManager.IMPORTANCE_LOW
                : adhan
                    ? android.app.NotificationManager.IMPORTANCE_HIGH
                    : android.app.NotificationManager.IMPORTANCE_DEFAULT
        );
        if (silent) {
            channel.setSound(null, null);
            channel.enableVibration(false);
        } else if (channelId.endsWith("-adhan")) {
            channel.setSound(
                adhanSound(context),
                new android.media.AudioAttributes.Builder()
                    .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION)
                    .build()
            );
        }
        manager.createNotificationChannel(channel);
    }

    private void postNotification(Context context, AlarmEntry entry) {
        NotificationManagerCompat manager = NotificationManagerCompat.from(context);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, entry.channelId)
            .setSmallIcon(smallIcon(context))
            .setContentTitle(entry.title)
            .setContentText(entry.body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(entry.body))
            .setColor(NotificationLook.paletteFor(entry.title)[2])
            .setAutoCancel(true)
            .setWhen(System.currentTimeMillis())
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setContentIntent(tapIntent(context, entry));

        // Green gradient card with gold wavy lines. Title/text above stay set for
        // accessibility and as the fallback when a device ignores custom views.
        try {
            android.widget.RemoteViews card = NotificationLook.views(context, entry.title, entry.body, false);
            android.widget.RemoteViews bigCard = NotificationLook.views(context, entry.title, entry.body, true);
            if (card != null && bigCard != null) {
                builder.setStyle(new NotificationCompat.DecoratedCustomViewStyle());
                builder.setCustomContentView(card);
                builder.setCustomBigContentView(bigCard);
            }
        } catch (RuntimeException ignored) {
            // Keep the plain notification (BigTextStyle) when the card cannot be built.
        }

        // Stale notifications remove themselves: the pre-prayer reminder is
        // meaningless once the adhan fires, and a week of untapped
        // notifications used to pile up in the shade.
        if (entry.ttl > 0) builder.setTimeoutAfter(entry.ttl);

        Bitmap large = largeIcon(context);
        if (large != null) builder.setLargeIcon(large);
        if (entry.group.length() > 0) {
            builder.setGroup(entry.group);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Sound/vibration/importance come from the channel (created via
            // LocalNotifications.createChannel with the adhan sound).
            builder.setDefaults(0);
        } else {
            builder.setPriority(NotificationCompat.PRIORITY_HIGH);
            builder.setSound(adhanSound(context));
            builder.setVibrate(new long[] { 0, 400, 200, 400 });
            builder.setDefaults(NotificationCompat.DEFAULT_LIGHTS);
        }

        // Explicit runtime check: on Android 13+ a denied POST_NOTIFICATIONS
        // must not reach notify(). ContextCompat maps this to
        // areNotificationsEnabled() on older versions. The caller logs the
        // SecurityException as a post failure.
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            throw new SecurityException("POST_NOTIFICATIONS is not granted");
        }

        Notification notification = builder.build();
        manager.notify(entry.id, notification);

        // The summary is cosmetic. It must never turn a delivered notification
        // into a "failure" that the retry would then post (and sound) twice.
        if (entry.group.length() > 0) {
            try {
                manager.notify(GROUP_SUMMARY_ID, groupSummary(context, entry));
            } catch (RuntimeException summaryFailure) {
                // Ignored on purpose.
            }
        }
    }

    /** The shade header the grouped prayer notifications stack under. */
    private Notification groupSummary(Context context, AlarmEntry entry) {
        return new NotificationCompat.Builder(context, entry.channelId)
            .setSmallIcon(smallIcon(context))
            .setContentTitle("مواقيت الصلاة")
            .setColor(GOLD)
            .setAutoCancel(true)
            .setGroup(entry.group)
            .setGroupSummary(true)
            .build();
    }

    private int smallIcon(Context context) {
        Resources resources = context.getResources();
        int id = resources.getIdentifier("muslim_stat_icon", "drawable", context.getPackageName());
        if (id == 0) id = resources.getIdentifier("ic_launcher", "mipmap", context.getPackageName());
        if (id == 0) id = android.R.drawable.ic_dialog_info;
        return id;
    }

    private Bitmap largeIcon(Context context) {
        try {
            Resources resources = context.getResources();
            int id = resources.getIdentifier("muslim_large_icon", "drawable", context.getPackageName());
            if (id == 0) return null;
            return BitmapFactory.decodeResource(resources, id);
        } catch (RuntimeException decodeFailure) {
            return null;
        }
    }

    private Uri adhanSound(Context context) {
        Resources resources = context.getResources();
        int id = resources.getIdentifier("adhan", "raw", context.getPackageName());
        if (id == 0) return android.provider.Settings.System.DEFAULT_NOTIFICATION_URI;
        return Uri.parse("android.resource://" + context.getPackageName() + "/" + id);
    }

    private PendingIntent tapIntent(Context context, AlarmEntry entry) {
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch == null) launch = new Intent();
        launch.putExtra("LocalNotificationId", entry.id);
        launch.putExtra("LocalNotificationUserAction", "tap");
        launch.putExtra("LocalNotficationObject", notificationJson(entry));
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getActivity(context, entry.id, launch, flags);
    }

    private String notificationJson(AlarmEntry entry) {
        JSONObject object = new JSONObject();
        try {
            object.put("id", entry.id);
            object.put("title", entry.title);
            object.put("body", entry.body);
            JSONObject extra = new JSONObject();
            extra.put("target", entry.target);
            object.put("extra", extra);
        } catch (JSONException ignored) {
        }
        return object.toString();
    }
}
