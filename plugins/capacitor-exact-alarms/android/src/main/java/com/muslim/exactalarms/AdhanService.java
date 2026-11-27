package com.muslim.exactalarms;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.content.res.AssetFileDescriptor;
import android.content.res.Resources;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

/**
 * Plays the adhan once, from start to its natural end, as a foreground service.
 *
 * Why a service: a notification channel sound is owned by the system. Tapping or
 * swiping the notification (or the timeout) cuts it off. Here the app owns the
 * playback, so only the "إيقاف" action on the notification (ACTION_STOP) stops it
 * early. The audio uses the notification usage, so it follows the phone silent and vibrate
 * modes (user choice 17284237: respect silent). The notification itself is silent (its own low-importance channel);
 * the sound comes from the MediaPlayer, so there is no double sound.
 *
 * Audio focus: the adhan asks for a TRANSIENT focus (not "may duck"), so other audio such as a
 * Quran recitation or music pauses for the call to prayer and resumes when it ends, instead of
 * playing underneath it. Focus is abandoned as soon as playback stops. A phone call or another
 * app taking focus ends the adhan (it is not resumed late).
 *
 * If Android refuses startForeground, a normal heads-up notification is posted on the prayer's
 * own channel (or a fallback channel) so the prayer time is never silently dropped.
 */
public class AdhanService extends Service {

    static final String ACTION_STOP = "com.muslim.exactalarms.ADHAN_STOP";
    static final String CHANNEL_ID = "adhan-playback-v1";
    static final String FALLBACK_CHANNEL_ID = "adhan-fallback-v1";
    private static final String WAKE_TAG = "muslim:adhan";
    private static final String TAG = "AdhanService";
    /** Fallback watchdog when the recording length is unknown; normally length + 30s is used. */
    private static final long MAX_PLAY_MS = 6L * 60_000;

    private MediaPlayer player;
    private PowerManager.WakeLock wakeLock;
    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;
    private final AudioManager.OnAudioFocusChangeListener focusListener = change -> {
        if (change == AudioManager.AUDIOFOCUS_LOSS || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) {
            finishPlayback();
        }
    };
    private final android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
    private final Runnable watchdog = this::finishPlayback;

    /** Starts the service for an alarm entry. Throws when the system refuses (caller falls back). */
    static void start(Context context, AlarmEntry entry) {
        Intent intent = new Intent(context, AdhanService.class);
        intent.putExtra("id", entry.id);
        intent.putExtra("title", entry.title);
        intent.putExtra("body", entry.body);
        intent.putExtra("target", entry.target);
        intent.putExtra("channel", entry.channelId);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            finishPlayback();
            return START_NOT_STICKY;
        }
        // A second prayer arriving while one plays: restart with the new one.
        releasePlayer();
        int id = intent == null ? 0 : intent.getIntExtra("id", 0);
        String title = intent == null ? "" : intent.getStringExtra("title");
        String body = intent == null ? "" : intent.getStringExtra("body");
        String target = intent == null ? "" : intent.getStringExtra("target");
        Notification notification = buildNotification(id, title == null ? "" : title, body == null ? "" : body, target == null ? "" : target);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(id == 0 ? 7001 : id, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(id == 0 ? 7001 : id, notification);
            }
        } catch (RuntimeException refused) {
            // The system refused foreground status: show an ordinary notification instead of
            // stopping silently, then end the service.
            String channel = intent == null ? null : intent.getStringExtra("channel");
            postFallbackNotification(id, title == null ? "" : title, body == null ? "" : body, channel);
            stopSelf();
            return START_NOT_STICKY;
        }
        acquireWakeLock();
        if (!startPlayback()) {
            finishPlayback();
            return START_NOT_STICKY;
        }
        handler.removeCallbacks(watchdog);
        long length = 0;
        try { length = player == null ? 0 : player.getDuration(); } catch (RuntimeException ignored) { }
        // Watchdog = recording length plus a margin, so a normal full playback is never cut.
        handler.postDelayed(watchdog, length > 0 ? length + 30_000L : MAX_PLAY_MS);
        // The wake lock was acquired with the MAX_PLAY_MS cap before the
        // duration was known; re-acquire with the real length so a recording
        // longer than 6 minutes is never cut when the CPU sleeps (acquire on a
        // held lock just resets its timeout).
        if (wakeLock != null && wakeLock.isHeld() && length + 30_000L > MAX_PLAY_MS) {
            try { wakeLock.acquire(length + 60_000L); } catch (RuntimeException ignored) { }
        }
        return START_NOT_STICKY;
    }

    private boolean startPlayback() {
        try {
            Resources resources = getResources();
            int raw = resources.getIdentifier("adhan", "raw", getPackageName());
            if (raw == 0) return false;
            MediaPlayer created = new MediaPlayer();
            created.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build());
            AssetFileDescriptor afd = resources.openRawResourceFd(raw);
            try {
                created.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
            } finally {
                afd.close();
            }
            created.setLooping(false);
            created.setOnCompletionListener(mp -> finishPlayback());
            created.setOnErrorListener((mp, what, extra) -> {
                finishPlayback();
                return true;
            });
            created.prepare();
            requestFocus();
            created.start();
            player = created;
            return true;
        } catch (Exception failure) {
            return false;
        }
    }

    private void finishPlayback() {
        handler.removeCallbacks(watchdog);
        releasePlayer();
        if (wakeLock != null && wakeLock.isHeld()) {
            try { wakeLock.release(); } catch (RuntimeException ignored) { }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(Service.STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }
        stopSelf();
    }

    private void requestFocus() {
        try {
            if (audioManager == null) audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (audioManager == null) return;
            abandonFocus();
            AudioAttributes attributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build();
            // The result is not required: when focus is refused the adhan still plays, because
            // a missed call to prayer is worse than overlapping audio.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                    .setAudioAttributes(attributes)
                    .setOnAudioFocusChangeListener(focusListener, handler)
                    .build();
                audioManager.requestAudioFocus(focusRequest);
            } else {
                audioManager.requestAudioFocus(focusListener, AudioManager.STREAM_NOTIFICATION, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT);
            }
        } catch (RuntimeException ignored) { }
    }

    private void abandonFocus() {
        if (audioManager == null) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (focusRequest != null) audioManager.abandonAudioFocusRequest(focusRequest);
                focusRequest = null;
            } else {
                audioManager.abandonAudioFocus(focusListener);
            }
        } catch (RuntimeException ignored) { }
    }

    private void releasePlayer() {
        abandonFocus();
        if (player == null) return;
        try {
            if (player.isPlaying()) player.stop();
        } catch (RuntimeException ignored) { }
        try { player.release(); } catch (RuntimeException ignored) { }
        player = null;
    }

    private void acquireWakeLock() {
        try {
            PowerManager power = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (power == null) return;
            if (wakeLock == null) { wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, WAKE_TAG); wakeLock.setReferenceCounted(false); }
            wakeLock.acquire(MAX_PLAY_MS);
        } catch (RuntimeException ignored) { }
    }

    private void postFallbackNotification(int id, String title, String body, String channelId) {
        try {
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager == null) return;
            // Same explicit check as AlarmFireReceiver: a denied POST_NOTIFICATIONS (Android 13+) drops
            // the notification silently, so log it instead of pretending it was shown.
            if (Build.VERSION.SDK_INT >= 33
                && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                Log.w(TAG, "Adhan fallback notification not shown: POST_NOTIFICATIONS is not granted");
                return;
            }
            Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            String channel = channelId;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (channel == null || channel.isEmpty() || manager.getNotificationChannel(channel) == null) {
                    channel = FALLBACK_CHANNEL_ID;
                    if (manager.getNotificationChannel(channel) == null) {
                        NotificationChannel fallback = new NotificationChannel(channel, "تنبيه الأذان", NotificationManager.IMPORTANCE_HIGH);
                        fallback.setSound(sound, new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build());
                        manager.createNotificationChannel(fallback);
                    }
                }
            } else if (channel == null) {
                channel = FALLBACK_CHANNEL_ID;
            }
            Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
            if (launch == null) launch = new Intent();
            int piFlags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
            Resources resources = getResources();
            int icon = resources.getIdentifier("muslim_stat_icon", "drawable", getPackageName());
            if (icon == 0) icon = resources.getIdentifier("ic_launcher", "mipmap", getPackageName());
            if (icon == 0) icon = android.R.drawable.ic_lock_silent_mode_off;
            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, channel)
                .setSmallIcon(icon)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setSound(sound)
                .setContentIntent(PendingIntent.getActivity(this, id, launch, piFlags));
            manager.notify(id == 0 ? 7001 : id, builder.build());
        } catch (RuntimeException ignored) {
            // Nothing more can be done; the receiver already logged the fire.
        }
    }

    private Notification buildNotification(int id, String title, String body, String target) {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && manager != null && manager.getNotificationChannel(CHANNEL_ID) == null) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "تشغيل الأذان", NotificationManager.IMPORTANCE_LOW);
            channel.setSound(null, null);
            channel.enableVibration(false);
            manager.createNotificationChannel(channel);
        }
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (launch == null) launch = new Intent();
        launch.putExtra("LocalNotificationId", id);
        launch.putExtra("LocalNotificationUserAction", "tap");
        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        PendingIntent open = PendingIntent.getActivity(this, id, launch, piFlags);

        Intent stop = new Intent(this, AdhanService.class).setAction(ACTION_STOP);
        PendingIntent stopIntent = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? PendingIntent.getForegroundService(this, 7002, stop, piFlags)
            : PendingIntent.getService(this, 7002, stop, piFlags);

        Resources resources = getResources();
        int icon = resources.getIdentifier("muslim_stat_icon", "drawable", getPackageName());
        if (icon == 0) icon = resources.getIdentifier("ic_launcher", "mipmap", getPackageName());
        if (icon == 0) icon = android.R.drawable.ic_lock_silent_mode_off;

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(icon)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setColor(0xFFE6C86E)
            .setOngoing(true)
            .setAutoCancel(false)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setContentIntent(open)
            .addAction(0, "إيقاف", stopIntent);
        // Same artwork card as the other prayer notifications (no separate large icon).
        try {
            android.widget.RemoteViews card = NotificationLook.views(this, title, body, false);
            android.widget.RemoteViews bigCard = NotificationLook.views(this, title, body, true);
            if (card != null && bigCard != null) {
                builder.setStyle(new NotificationCompat.DecoratedCustomViewStyle());
                builder.setCustomContentView(card);
                builder.setCustomBigContentView(bigCard);
            }
        } catch (RuntimeException ignored) {
            // Keeps the plain notification when the card cannot be built.
        }
        return builder.build();
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(watchdog);
        releasePlayer();
        if (wakeLock != null && wakeLock.isHeld()) {
            try { wakeLock.release(); } catch (RuntimeException ignored) { }
        }
        super.onDestroy();
    }
}
