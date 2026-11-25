package com.muslim.backgroundaudio;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.view.WindowManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import androidx.core.app.NotificationManagerCompat;

/**
 * Starts/updates/stops a foreground MediaSession service while a Quran recitation session exists,
 * so Android keeps the app process (and with it the WebView audio) alive in
 * the background.
 */
@CapacitorPlugin(
    name = "BackgroundAudio",
    permissions = @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications")
)
public class BackgroundAudioPlugin extends Plugin {

    @Override
    public void load() {
        // Forward notification buttons, media keys and seek-bar moves to the web layer.
        MediaPlaybackService.setListener(
            action -> {
                JSObject data = new JSObject();
                if (action != null && action.startsWith("seek:")) {
                    data.put("action", "seek");
                    try {
                        data.put("position", Long.parseLong(action.substring(5)));
                    } catch (NumberFormatException ignored) {
                        data.put("position", 0L);
                    }
                } else {
                    data.put("action", action);
                }
                notifyListeners("mediaAction", data);
            }
        );
    }

    @Override
    protected void handleOnDestroy() {
        MediaPlaybackService.setListener(null);
        super.handleOnDestroy();
    }

    private boolean notificationsEnabled() {
        return NotificationManagerCompat.from(getContext()).areNotificationsEnabled();
    }

    private JSObject notificationState() {
        JSObject result = new JSObject();
        result.put("granted", notificationsEnabled());
        return result;
    }

    @PluginMethod
    public void notificationPermission(PluginCall call) {
        call.resolve(notificationState());
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (notificationsEnabled() || Build.VERSION.SDK_INT < 33) {
            call.resolve(notificationState());
            return;
        }
        requestPermissionForAlias("notifications", call, "notificationPermissionResult");
    }

    @PermissionCallback
    private void notificationPermissionResult(PluginCall call) {
        call.resolve(notificationState());
    }

    @PluginMethod
    public void start(PluginCall call) {
        String title = call.getString("title", "تلاوة القرآن");
        String artist = call.getString("artist", "مسلم");
        Context context = getContext();
        Intent intent = new Intent(context, MediaPlaybackService.class);
        intent.putExtra("title", title);
        intent.putExtra("artist", artist);
        intent.putExtra("playing", call.getBoolean("playing", true));
        Double position = call.getDouble("position", 0.0);
        Double duration = call.getDouble("duration", 0.0);
        intent.putExtra("skipPrevious", Boolean.TRUE.equals(call.getBoolean("skipPrevious", false)));
        intent.putExtra("skipNext", Boolean.TRUE.equals(call.getBoolean("skipNext", false)));
        intent.putExtra("positionMs", position == null ? 0L : (long) (position * 1000));
        intent.putExtra("durationMs", duration == null || duration <= 0 ? -1L : (long) (duration * 1000));
        try {
            if (Build.VERSION.SDK_INT >= 26) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
            call.resolve();
        } catch (Exception exception) {
            String message = exception.getMessage();
            call.reject(message == null ? "Unable to start background audio service" : message);
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        try {
            getContext().stopService(new Intent(getContext(), MediaPlaybackService.class));
            call.resolve();
        } catch (Exception exception) {
            String message = exception.getMessage();
            call.reject(message == null ? "Unable to stop background audio service" : message);
        }
    }

    @PluginMethod
    public void setKeepScreenOn(PluginCall call) {
        boolean enabled = call.getBoolean("enabled", false);
        final Activity activity = getBridge().getActivity();
        if (activity == null || activity.getWindow() == null) {
            call.reject("Activity is unavailable");
            return;
        }
        final boolean flag = enabled;
        activity.runOnUiThread(
            () -> {
                if (flag) {
                    activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                } else {
                    activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                }
            }
        );
        call.resolve();
    }

    @PluginMethod
    public void isActive(PluginCall call) {
        JSObject result = new JSObject();
        result.put("active", MediaPlaybackService.isRunning());
        call.resolve(result);
    }
}
