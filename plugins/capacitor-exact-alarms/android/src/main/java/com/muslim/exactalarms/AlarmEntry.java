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

    public AlarmEntry(int id, long at, String title, String body, String channelId, String target, String group) {
        this.id = id;
        this.at = at;
        this.title = title == null ? "" : title;
        this.body = body == null ? "" : body;
        this.channelId = channelId == null || channelId.length() == 0 ? "default" : channelId;
        this.target = target == null ? "" : target;
        this.group = group == null ? "" : group;
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
            object.optString("group", "")
        );
    }
}
