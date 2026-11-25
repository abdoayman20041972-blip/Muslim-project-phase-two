package com.muslim.backgroundaudio;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ServiceInfo;
import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.AudioManager;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

/**
 * Foreground service with an active MediaSession, MediaStyle notification
 * and a partial wake lock while audio is playing.
 *
 * The web layer owns the real audio element and is the source of truth for
 * play/pause state. This service never changes its displayed state by itself:
 * a button press, media key or the headphone-unplug broadcast is forwarded to
 * the web layer as an event, and the web layer answers with a new start() call
 * carrying the resulting state.
 *
 * This service deliberately does NOT request audio focus. The WebView's
 * Chromium engine holds audio focus for the real audio element, and a second
 * app-side focus request made both clients fight: the later request delivered
 * AUDIOFOCUS_LOSS to the service, the forwarded event paused the web element,
 * and every recitation stopped a second after it started. Calls and other apps
 * still pause playback through Chromium's own focus handling, which reaches the
 * web layer as the element's pause event.
 */
public class MediaPlaybackService extends Service {

    public static final String ACTION_PLAY = "com.muslim.backgroundaudio.action.PLAY";
    public static final String ACTION_PAUSE = "com.muslim.backgroundaudio.action.PAUSE";
    public static final String ACTION_STOP = "com.muslim.backgroundaudio.action.STOP";
    public static final String ACTION_NEXT = "com.muslim.backgroundaudio.action.NEXT";
    public static final String ACTION_PREVIOUS = "com.muslim.backgroundaudio.action.PREVIOUS";

    /** Receives user and system requests that the web layer must apply to the audio element. */
    public interface Listener {
        void onAction(String action);
    }

    private static final String CHANNEL_ID = "muslim_background_audio";
    private static final int NOTIFICATION_ID = 72001;
    // Same brand gold as the prayer/adhan notifications (AlarmFireReceiver.GOLD).
    private static final int GOLD = 0xFFE6C86E;
    private static volatile boolean running = false;
    private static volatile Listener listener;

    private MediaSessionCompat mediaSession;
    private PowerManager.WakeLock wakeLock;
    private boolean receiverRegistered = false;
    private boolean foregroundStarted = false;

    private String title = "تلاوة القرآن";
    private String artist = "مسلم";
    private boolean playing = true;
    private long positionMs = 0L;
    private long durationMs = -1L;
    private boolean skipPrevious = false;
    private boolean skipNext = false;

    public static boolean isRunning() {
        return running;
    }

    public static void setListener(Listener value) {
        listener = value;
    }

    private static boolean dispatch(String action) {
        Listener current = listener;
        if (current == null) {
            return false;
        }
        try {
            current.onAction(action);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    private final BroadcastReceiver noisyReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (intent != null && AudioManager.ACTION_AUDIO_BECOMING_NOISY.equals(intent.getAction())) {
                dispatch("noisy");
            }
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        running = true;
        mediaSession = new MediaSessionCompat(this, "MuslimAudio");
        mediaSession.setCallback(
            new MediaSessionCompat.Callback() {
                @Override
                public void onPlay() {
                    dispatch("play");
                }

                @Override
                public void onPause() {
                    dispatch("pause");
                }

                @Override
                public void onStop() {
                    dispatch("stop");
                }

                @Override
                public void onSkipToNext() {
                    dispatch("next");
                }

                @Override
                public void onSkipToPrevious() {
                    dispatch("previous");
                }

                @Override
                public void onSeekTo(long positionMs) {
                    // Expanded-notification seek bar. The web element owns the real position.
                    dispatch("seek:" + positionMs);
                }
            }
        );
        try {
            mediaSession.setActive(true);
        } catch (Exception ignored) {
        }
        try {
            ContextCompat.registerReceiver(
                this,
                noisyReceiver,
                new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY),
                ContextCompat.RECEIVER_NOT_EXPORTED
            );
            receiverRegistered = true;
        } catch (Exception ignored) {
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        if (ACTION_PLAY.equals(action) || ACTION_PAUSE.equals(action) || ACTION_STOP.equals(action)
            || ACTION_NEXT.equals(action) || ACTION_PREVIOUS.equals(action)) {
            // Notification button. If the web layer is gone nothing can act on it.
            boolean delivered = dispatch(action.substring(action.lastIndexOf('.') + 1).toLowerCase());
            if (!delivered || !foregroundStarted) {
                stopSelf();
            }
            return START_NOT_STICKY;
        }
        if (intent != null) {
            String nextTitle = intent.getStringExtra("title");
            String nextArtist = intent.getStringExtra("artist");
            if (nextTitle != null) title = nextTitle;
            if (nextArtist != null) artist = nextArtist;
            playing = intent.getBooleanExtra("playing", true);
            positionMs = Math.max(0L, intent.getLongExtra("positionMs", 0L));
            durationMs = intent.getLongExtra("durationMs", -1L);
            skipPrevious = intent.getBooleanExtra("skipPrevious", false);
            skipNext = intent.getBooleanExtra("skipNext", false);
        }
        applyWakeLock();
        startForegroundInternal();
        return START_NOT_STICKY;
    }

    private void applyWakeLock() {
        if (playing) {
            if (wakeLock == null) {
                PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (powerManager != null) {
                    wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "muslim:background-audio");
                }
            }
            if (wakeLock != null && !wakeLock.isHeld()) {
                wakeLock.acquire(6 * 60 * 60 * 1000L);
            }
        } else if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
            } catch (Exception ignored) {
            }
        }
    }

    private PendingIntent actionIntent(String action, int requestCode) {
        Intent intent = new Intent(this, MediaPlaybackService.class).setAction(action);
        return PendingIntent.getService(this, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private void startForegroundInternal() {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && manager != null) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "تشغيل التلاوة في الخلفية",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            manager.createNotificationChannel(channel);
        }
        PendingIntent contentIntent = null;
        try {
            Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
            if (launch != null) {
                contentIntent = PendingIntent.getActivity(
                    this, 0, launch,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );
            }
        } catch (Exception ignored) {
        }
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(artist)
            .setSmallIcon(smallIcon())
            .setColor(GOLD)
            .setContentIntent(contentIntent)
            .setOngoing(playing)
            .setOnlyAlertOnce(true)
            .setShowWhen(false)
            .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setDeleteIntent(actionIntent(ACTION_STOP, 3));
        Bitmap large = largeIcon();
        if (large != null) {
            builder.setLargeIcon(large);
        }
        int compactCount = 0;
        int[] compact = new int[3];
        int actionIndex = 0;
        if (skipPrevious) {
            builder.addAction(android.R.drawable.ic_media_previous, "السابق", actionIntent(ACTION_PREVIOUS, 4));
            compact[compactCount++] = actionIndex++;
        }
        compact[compactCount++] = actionIndex++;
        if (playing) {
            builder.addAction(android.R.drawable.ic_media_pause, "إيقاف مؤقت", actionIntent(ACTION_PAUSE, 1));
        } else {
            builder.addAction(android.R.drawable.ic_media_play, "تشغيل", actionIntent(ACTION_PLAY, 2));
        }
        if (skipNext) {
            builder.addAction(android.R.drawable.ic_media_next, "التالي", actionIntent(ACTION_NEXT, 5));
            compact[compactCount++] = actionIndex++;
        }
        builder.addAction(android.R.drawable.ic_menu_close_clear_cancel, "إغلاق", actionIntent(ACTION_STOP, 3));
        androidx.media.app.NotificationCompat.MediaStyle style = new androidx.media.app.NotificationCompat.MediaStyle()
            .setShowActionsInCompactView(java.util.Arrays.copyOf(compact, compactCount))
            .setShowCancelButton(true)
            .setCancelButtonIntent(actionIntent(ACTION_STOP, 3));
        if (mediaSession != null) {
            style.setMediaSession(mediaSession.getSessionToken());
        }
        builder.setStyle(style);
        Notification notification = builder.build();
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
        foregroundStarted = true;
        updateSession();
    }

    /** White status-bar glyph shipped in res/drawable (see scripts/patch-android.mjs). */
    private int smallIcon() {
        Resources resources = getResources();
        int id = resources.getIdentifier("muslim_stat_icon", "drawable", getPackageName());
        if (id == 0) id = resources.getIdentifier("ic_launcher", "mipmap", getPackageName());
        if (id == 0) id = android.R.drawable.ic_media_play;
        return id;
    }

    /** Full-colour brand icon shown beside the reciter name. */
    private Bitmap largeIcon() {
        try {
            Resources resources = getResources();
            int id = resources.getIdentifier("muslim_large_icon", "drawable", getPackageName());
            if (id == 0) return null;
            return BitmapFactory.decodeResource(resources, id);
        } catch (RuntimeException decodeFailure) {
            return null;
        }
    }

    private void updateSession() {
        if (mediaSession == null) {
            return;
        }
        try {
            MediaMetadataCompat.Builder metadata = new MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist);
            Bitmap art = largeIcon();
            if (art != null) {
                metadata.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, art);
                metadata.putBitmap(MediaMetadataCompat.METADATA_KEY_ART, art);
                metadata.putBitmap(MediaMetadataCompat.METADATA_KEY_DISPLAY_ICON, art);
            }
            if (durationMs > 0) {
                metadata.putLong(MediaMetadataCompat.METADATA_KEY_DURATION, durationMs);
            }
            mediaSession.setMetadata(metadata.build());
            mediaSession.setPlaybackState(
                new PlaybackStateCompat.Builder()
                    .setActions(
                        PlaybackStateCompat.ACTION_PLAY
                            | PlaybackStateCompat.ACTION_PAUSE
                            | PlaybackStateCompat.ACTION_PLAY_PAUSE
                            | PlaybackStateCompat.ACTION_STOP
                            | PlaybackStateCompat.ACTION_SEEK_TO
                            | (skipNext ? PlaybackStateCompat.ACTION_SKIP_TO_NEXT : 0L)
                            | (skipPrevious ? PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS : 0L)
                    )
                    .setState(
                        playing ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED,
                        positionMs,
                        playing ? 1f : 0f
                    )
                    .build()
            );
        } catch (Exception ignored) {
        }
    }

    @Override
    public void onDestroy() {
        running = false;
        foregroundStarted = false;
        if (receiverRegistered) {
            try {
                unregisterReceiver(noisyReceiver);
            } catch (Exception ignored) {
            }
            receiverRegistered = false;
        }
        if (mediaSession != null) {
            try {
                mediaSession.setCallback(null);
                mediaSession.setActive(false);
                mediaSession.release();
            } catch (Exception ignored) {
            }
            mediaSession = null;
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
            } catch (Exception ignored) {
            }
        }
        wakeLock = null;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
