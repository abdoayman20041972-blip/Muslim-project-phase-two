package com.muslim.exactalarms;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Shader;
import android.widget.RemoteViews;

/**
 * The notification card look: a green gradient with thin wavy gold lines, like
 * the daily-ayah card in the app. Prayer notifications get a palette that suits
 * the prayer (same green family, shifted hue). The background is drawn into a
 * bitmap here so no extra image assets are needed.
 *
 * Android still draws its own header row (app icon, app name, time) above a
 * custom view, and some phone makers restyle or ignore custom notification
 * views, so the exact result varies by device.
 */
final class NotificationLook {
    private NotificationLook() {}

    static final int GOLD = 0xFFE6C86E;

    /** {gradient start, gradient end, accent colour for setColor}. */
    static int[] paletteFor(String title) {
        String t = title == null ? "" : title;
        if (t.contains("الفجر")) return new int[] { 0xFF12324A, 0xFF1F6070, 0xFF7FC4D6 };
        if (t.contains("الظهر")) return new int[] { 0xFF0F5A45, 0xFF33905F, 0xFF8EDDB0 };
        if (t.contains("العصر")) return new int[] { 0xFF4B5A1C, 0xFF8B8B2B, 0xFFD8D27A };
        if (t.contains("المغرب")) return new int[] { 0xFF5A2F3F, 0xFF9A5A3A, 0xFFE5A07A };
        if (t.contains("العشاء")) return new int[] { 0xFF1D2147, 0xFF38327A, 0xFFA9A3EA };
        return new int[] { 0xFF0F4A3C, 0xFF1F6F58, GOLD };
    }

    static Bitmap background(int[] palette) {
        final int w = 720;
        final int h = 200;
        Bitmap bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG);
        fill.setShader(new LinearGradient(w, 0, 0, h, palette[0], palette[1], Shader.TileMode.CLAMP));
        canvas.drawRect(0, 0, w, h, fill);

        Paint line = new Paint(Paint.ANTI_ALIAS_FLAG);
        line.setStyle(Paint.Style.STROKE);
        line.setStrokeCap(Paint.Cap.ROUND);
        line.setColor(GOLD);
        float[] baselines = { 0.22f, 0.5f, 0.8f };
        int[] alphas = { 150, 85, 120 };
        float[] widths = { 3.2f, 2.2f, 2.8f };
        for (int i = 0; i < baselines.length; i++) {
            line.setAlpha(alphas[i]);
            line.setStrokeWidth(widths[i]);
            Path path = new Path();
            float amp = 11f + 5f * i;
            float length = 260f - 30f * i;
            float phase = i * 1.3f;
            for (int x = 0; x <= w; x += 6) {
                float y = h * baselines[i] + (float) Math.sin(x / length * 2 * Math.PI + phase) * amp;
                if (x == 0) path.moveTo(x, y); else path.lineTo(x, y);
            }
            canvas.drawPath(path, line);
        }
        return bitmap;
    }

    static RemoteViews views(Context context, String title, String body, boolean expanded) {
        int layout = context.getResources().getIdentifier(expanded ? "muslim_notification" : "muslim_notification_compact", "layout", context.getPackageName());
        int bg = context.getResources().getIdentifier("muslim_notif_bg", "id", context.getPackageName());
        int titleId = context.getResources().getIdentifier("muslim_notif_title", "id", context.getPackageName());
        int bodyId = context.getResources().getIdentifier("muslim_notif_body", "id", context.getPackageName());
        if (layout == 0 || bg == 0 || titleId == 0 || bodyId == 0) return null;
        RemoteViews views = new RemoteViews(context.getPackageName(), layout);
        views.setImageViewBitmap(bg, background(paletteFor(title)));
        views.setTextViewText(titleId, title);
        views.setTextViewText(bodyId, body);
        return views;
    }
}
