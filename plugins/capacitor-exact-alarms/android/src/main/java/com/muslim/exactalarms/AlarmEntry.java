package com.muslim.exactalarms;

import org.json.JSONException;
import org.json.JSONObject;

/** One planned alarm: everything the receiver needs to post its notification. */
public class AlarmEntry {
    public final int id;
    public final long at;
    public final String title;
    public final String body;
    public final String channelId;
    public final String target;
    public final String group;
    /**
     * Milliseconds after posting before Android removes the notification from
     * the shade by itself (NotificationCompat.setTimeoutAfter). 0 = never.
     */
    public final long ttl;
    /**
     * True when the instant is a fixed local clock time (custom wird time, daily
     * ayah, Quran reminder, Al-Kahf). False for physical instants (prayer,
     * sunrise, sunset). Entries from older plans default to false.
     */
    public final boolean wallClock;

    public AlarmEntry(int id, long at, String title, String body, String channelId, String target, String group) {
        this(id, at, title, body, channelId, target, group, 0L);
    }

    public AlarmEntry(int id, long at, String title, String body, String channelId, String target, String group, long ttl) {
        this(id, at, title, body, channelId, target, group, ttl, false);
    }

    public AlarmEntry(int id, long at, String title, String body, String channelId, String target, String group, long ttl, boolean wallClock) {
        this.wallClock = wallClock;
        this.id = id;
        this.at = at;
        this.title = title == null ? "" : title;
        this.body = body == null ? "" : body;
        this.channelId = channelId == null || channelId.length() == 0 ? "default" : channelId;
        this.target = target == null ? "" : target;
        this.group = group == null ? "" : group;
        this.ttl = ttl < 0 ? 0 : ttl;
    }

    public JSONObject toJson() throws JSONException {
        JSONObject object = new JSONObject();
        object.put("id", id);
        object.put("at", at);
        object.put("title", title);
        object.put("body", body);
        object.put("channel", channelId);
        object.put("target", target);
        object.put("group", group);
        object.put("ttl", ttl);
        object.put("wallClock", wallClock);
        return object;
    }

    public static AlarmEntry fromJson(JSONObject object) throws JSONException {
        return new AlarmEntry(
            object.getInt("id"),
            object.getLong("at"),
            object.optString("title", ""),
            object.optString("body", ""),
            object.optString("channel", "default"),
            object.optString("target", ""),
            object.optString("group", ""),
            object.optLong("ttl", 0L),
            object.optBoolean("wallClock", false)
        );
    }

    /** The same entry at a different instant. */
    public AlarmEntry withAt(long newAt) {
        return new AlarmEntry(id, newAt, title, body, channelId, target, group, ttl, wallClock);
    }
}
