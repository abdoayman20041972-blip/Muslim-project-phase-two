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
import android.media.AudioManager;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import androidx.media.AudioAttributesCompat;
import androidx.media.AudioFocusRequestCompat;
import androidx.media.AudioManagerCompat;

/**
 * Foreground service with an active MediaSession, MediaStyle notification,
 * Audio Focus and a partial wake lock while audio is playing.
 *
 * The web layer owns the real audio element and is the source of truth for
 * play/pause state. This service never changes its displayed state by itself:
 * a button press, media key or audio-focus change is forwarded to the web layer
 * as an event, and the web layer answers with a new start() call carrying the
 * resulting state.
 */
public class MediaPlaybackService extends Service {

    public static final String ACTION_PLAY = "com.muslim.backgroundaudio.action.PLAY";
    public static final String ACTION_PAUSE = "com.muslim.backgroundaudio.action.PAUSE";
    public static final String ACTION_STOP = "com.muslim.backgroundaudio.action.STOP";

    /** Receives user and system requests that the web layer must apply to the audio element. */
    public interface Listener {
        void onAction(String action);
    }

    private static final String CHANNEL_ID = "muslim_background_audio";
    private static final int NOTIFICATION_ID = 72001;
    private static volatile boolean running = false;
    private static volatile Listener listener;

    private MediaSessionCompat mediaSession;
    private PowerManager.WakeLock wakeLock;
    private AudioManager audioManager;
    private AudioFocusRequestCompat focusRequest;
    private boolean receiverRegistered = false;
    private boolean foregroundStarted = false;

    private String title = "تلاوة القرآن";
    private String artist = "مسلم";
    private boolean playing = true;
    private long positionMs = 0L;
    private long durationMs = -1L;

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

    private final AudioManager.OnAudioFocusChangeListener focusListener = change -> {
        switch (change) {
            case AudioManager.AUDIOFOCUS_GAIN:
                dispatch("focusGain");
                break;
            case AudioManager.AUDIOFOCUS_LOSS:
                // Another app took audio for good. Pause; never resume automatically.
                abandonFocus();
                dispatch("focusLoss");
                break;
            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                // Calls, alarms and navigation prompts. Pause, resume on gain.
                dispatch("focusLossTransient");
                break;
            default:
                break;
        }
    };

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
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
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
        if (ACTION_PLAY.equals(action) || ACTION_PAUSE.equals(action) || ACTION_STOP.equals(action)) {
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
        }
        applyWakeLock();
        if (playing) {
            requestFocus();
        }
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

    private void requestFocus() {
        if (audioManager == null || focusRequest != null) {
            return;
        }
        AudioAttributesCompat attributes = new AudioAttributesCompat.Builder()
            .setUsage(AudioAttributesCompat.USAGE_MEDIA)
            .setContentType(AudioAttributesCompat.CONTENT_TYPE_SPEECH)
            .build();
        // Pause (not duck) on transient loss so recitation is never talked over.
        AudioFocusRequestCompat request = new AudioFocusRequestCompat.Builder(AudioManagerCompat.AUDIOFOCUS_GAIN)
            .setAudioAttributes(attributes)
            .setWillPauseWhenDucked(true)
            .setOnAudioFocusChangeListener(focusListener)
            .build();
        int result = AudioManagerCompat.requestAudioFocus(audioManager, request);
        if (result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
            focusRequest = request;
        } else {
            // Denied (for example during a call): let the web layer pause.
            dispatch("focusLossTransient");
        }
    }

    private void abandonFocus() {
        if (audioManager != null && focusRequest != null) {
            try {
                AudioManagerCompat.abandonAudioFocusRequest(audioManager, focusRequest);
            } catch (Exception ignored) {
            }
        }
        focusRequest = null;
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
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentIntent(contentIntent)
            .setOngoing(playing)
            .setOnlyAlertOnce(true)
            .setShowWhen(false)
            .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setDeleteIntent(actionIntent(ACTION_STOP, 3));
        if (playing) {
            builder.addAction(android.R.drawable.ic_media_pause, "إيقاف مؤقت", actionIntent(ACTION_PAUSE, 1));
        } else {
            builder.addAction(android.R.drawable.ic_media_play, "تشغيل", actionIntent(ACTION_PLAY, 2));
        }
        builder.addAction(android.R.drawable.ic_menu_close_clear_cancel, "إغلاق", actionIntent(ACTION_STOP, 3));
        androidx.media.app.NotificationCompat.MediaStyle style = new androidx.media.app.NotificationCompat.MediaStyle()
            .setShowActionsInCompactView(0, 1)
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

    private void updateSession() {
        if (mediaSession == null) {
            return;
        }
        try {
            MediaMetadataCompat.Builder metadata = new MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist);
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
        abandonFocus();
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
