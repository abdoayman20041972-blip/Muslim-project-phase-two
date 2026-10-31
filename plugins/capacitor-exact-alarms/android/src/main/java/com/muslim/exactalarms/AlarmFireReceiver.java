package com.muslim.exactalarms;

import android.app.Notification;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Fires when a setAlarmClock alarm goes off — exactly on the scheduled minute,
 * whatever the device's battery state is. Posts the notification (channel id,
 * icons and sound were configured once by the app through
 * @capacitor/local-notifications, so the adhan channel rings exactly like
 * before) and removes the entry from storage.
 *
 * Tap extras intentionally mimic @capacitor/local-notifications
 * (LocalNotificationId / LocalNotficationObject / LocalNotificationUserAction)
 * so warm-start taps keep flowing through the stock plugin's
 * localNotificationActionPerformed listener the app already registers.
 */
public class AlarmFireReceiver extends BroadcastReceiver {

    private static final int GOLD = 0xFFE6C86E;

    @Override
    public void onReceive(Context context, Intent intent) {
        int id = intent.getIntExtra("id", Integer.MIN_VALUE);
        if (id == Integer.MIN_VALUE) return;
        AlarmStorage storage = new AlarmStorage(context);
        AlarmEntry entry = storage.find(id);
        if (entry == null) return;
        try {
            postNotification(context, entry);
        } catch (RuntimeException postFailure) {
            // Never crash the app from a broadcast: the alarm is consumed either way.
        } finally {
            storage.remove(id);
        }
    }

    private void postNotification(Context context, AlarmEntry entry) {
        NotificationManagerCompat manager = NotificationManagerCompat.from(context);
        if (!manager.areNotificationsEnabled()) return;

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, entry.channelId)
            .setSmallIcon(smallIcon(context))
            .setContentTitle(entry.title)
            .setContentText(entry.body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(entry.body))
            .setColor(GOLD)
            .setAutoCancel(true)
            .setWhen(System.currentTimeMillis())
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setContentIntent(tapIntent(context, entry));

        Bitmap large = largeIcon(context);
        if (large != null) builder.setLargeIcon(large);
        if (entry.group.length() > 0) builder.setGroup(entry.group);

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

        Notification notification = builder.build();
        manager.notify(entry.id, notification);
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
