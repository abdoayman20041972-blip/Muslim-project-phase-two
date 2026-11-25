package com.muslim.exactalarms;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.RadialGradient;
import android.graphics.RectF;
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

    static boolean isMorning(String title) { return title != null && title.contains("أذكار الصباح"); }
    static boolean isEvening(String title) { return title != null && title.contains("أذكار المساء"); }
    static boolean isPrayer(String title) {
        String t = title == null ? "" : title;
        return t.contains("وقت صلاة");
    }

    /** Accent colour for setColor: sunrise orange, night gold, else the palette accent. */
    static int accentFor(String title) {
        if (isMorning(title)) return 0xFFF4A261;
        if (isEvening(title)) return GOLD;
        return paletteFor(title)[2];
    }

    private static void mosque(Canvas c, float x, float base, float s, int color) {
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(color);
        c.drawRect(x - 70 * s, base - 50 * s, x + 70 * s, base, p);
        c.drawArc(new RectF(x - 46 * s, base - 96 * s, x + 46 * s, base - 4 * s), 180, 180, true, p);
        c.drawRect(x - 2 * s, base - 118 * s, x + 2 * s, base - 94 * s, p);
        c.drawArc(new RectF(x - 78 * s, base - 66 * s, x - 46 * s, base - 34 * s), 180, 180, true, p);
        c.drawArc(new RectF(x + 46 * s, base - 66 * s, x + 78 * s, base - 34 * s), 180, 180, true, p);
        for (int m = -1; m <= 1; m += 2) {
            float mx = x + m * 105 * s;
            c.drawRect(mx - 6 * s, base - 130 * s, mx + 6 * s, base, p);
            Path tip = new Path();
            tip.moveTo(mx - 8 * s, base - 130 * s);
            tip.lineTo(mx, base - 155 * s);
            tip.lineTo(mx + 8 * s, base - 130 * s);
            tip.close();
            c.drawPath(tip, p);
        }
    }

    private static Bitmap morningBackground() {
        final int w = 720, h = 200;
        Bitmap bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bitmap);
        Paint sky = new Paint(Paint.ANTI_ALIAS_FLAG);
        sky.setShader(new LinearGradient(0, 0, 0, h, new int[] { 0xFF5FB4E0, 0xFFF7D68A, 0xFFF4A261 }, new float[] { 0f, 0.6f, 1f }, Shader.TileMode.CLAMP));
        c.drawRect(0, 0, w, h, sky);
        Paint glow = new Paint(Paint.ANTI_ALIAS_FLAG);
        glow.setShader(new RadialGradient(380, 175, 150, 0xF2FFF0AA, 0x00FFF0AA, Shader.TileMode.CLAMP));
        c.drawRect(0, 0, w, h, glow);
        Paint sun = new Paint(Paint.ANTI_ALIAS_FLAG);
        sun.setColor(0xFFFFE27A);
        c.drawCircle(380, 180, 42, sun);
        Paint cloud = new Paint(Paint.ANTI_ALIAS_FLAG);
        cloud.setColor(0xBFFFFFFF);
        float[][] clouds = { { 430, 50, 90 }, { 560, 85, 70 }, { 300, 35, 60 } };
        for (float[] k : clouds) {
            c.drawOval(new RectF(k[0] - k[2], k[1] - 16, k[0] + k[2], k[1] + 16), cloud);
            c.drawOval(new RectF(k[0] + k[2] / 2 - k[2] / 2, k[1] - 22, k[0] + k[2] / 2 + k[2] / 2, k[1] + 6), cloud);
        }
        mosque(c, 120, 215, 0.8f, 0x8C784628);
        return bitmap;
    }

    private static Bitmap eveningBackground() {
        final int w = 720, h = 200;
        Bitmap bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bitmap);
        Paint sky = new Paint(Paint.ANTI_ALIAS_FLAG);
        sky.setShader(new LinearGradient(0, 0, 0, h, 0xFF0B1236, 0xFF2F2A6B, Shader.TileMode.CLAMP));
        c.drawRect(0, 0, w, h, sky);
        Paint star = new Paint(Paint.ANTI_ALIAS_FLAG);
        star.setColor(0xFFFFFFFF);
        for (int i = 0; i < 40; i++) {
            star.setAlpha(100 + (int) (155 * ((i * 37) % 10) / 10f));
            c.drawCircle((i * 173) % w, (i * 59) % 150, 1f + ((i * 7) % 3) * 0.7f, star);
        }
        Paint moon = new Paint(Paint.ANTI_ALIAS_FLAG);
        moon.setColor(0xFFF2D675);
        c.drawCircle(360, 70, 38, moon);
        moon.setColor(0xFF161B4A);
        c.drawCircle(378, 62, 34, moon);
        mosque(c, 120, 215, 0.8f, 0xFF0A0F2C);
        return bitmap;
    }

    static Bitmap backgroundFor(String title) {
        if (isMorning(title)) return morningBackground();
        if (isEvening(title)) return eveningBackground();
        int[] palette = paletteFor(title);
        if (!isPrayer(title)) return background(palette);
        final int w = 720, h = 200;
        Bitmap bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bitmap);
        Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG);
        fill.setShader(new LinearGradient(w, 0, 0, h, palette[0], palette[1], Shader.TileMode.CLAMP));
        c.drawRect(0, 0, w, h, fill);
        // The mosque is the same hue as the card, only darker, so it reads as part of the colour.
        int dark = 0x73000000 | ((palette[0] >> 1) & 0x7F7F7F);
        mosque(c, 120, 215, 0.8f, dark);
        return bitmap;
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
        views.setImageViewBitmap(bg, backgroundFor(title));
        if (isMorning(title)) {
            views.setTextColor(titleId, 0xFF3B2A10);
            views.setTextColor(bodyId, 0xFF3B2A10);
        }
        views.setTextViewText(titleId, title);
        views.setTextViewText(bodyId, body);
        return views;
    }
}
