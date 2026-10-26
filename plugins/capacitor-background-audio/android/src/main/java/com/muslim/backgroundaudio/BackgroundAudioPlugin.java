package com.muslim.backgroundaudio;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.view.WindowManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Starts/stops a foreground MediaSession service while Quran recitation plays,
 * so Android keeps the app process (and with it the WebView audio) alive in
 * the background.
 */
@CapacitorPlugin(name = "BackgroundAudio")
public class BackgroundAudioPlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        String title = call.getString("title", "تلاوة القرآن");
        String artist = call.getString("artist", "مسلم");
        Context context = getContext();
        Intent intent = new Intent(context, MediaPlaybackService.class);
        intent.putExtra("title", title);
        intent.putExtra("artist", artist);
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
