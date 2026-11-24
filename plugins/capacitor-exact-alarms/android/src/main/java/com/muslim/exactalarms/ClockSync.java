package com.muslim.exactalarms;

import android.content.Context;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.TimeZone;

/**
 * Keeps the stored plan honest when the device time zone changes while the app
 * is closed.
 *
 * What is and is not affected:
 *   - Prayer, sunrise and sunset alarms are physical instants (computed for a
 *     place). A zone change does not move them. If the user also moved, they
 *     are for the old place until the app is opened and recomputes them, so
 *     the "needs replan" flag is raised.
 *   - Reminders at a fixed local clock time (entry.wallClock) keep their local
 *     hour: the same HH:MM is re-expressed in the new zone.
 *   - A DST change inside the same zone needs nothing here: the app computed
 *     each future instant with that day's own offset.
 *   - A broadcast about an unchanged zone or a manual clock change leaves the
 *     plan as is (the system keeps RTC alarms on the epoch axis).
 */
public final class ClockSync {

    private ClockSync() {}

    /** Re-expresses the local wall-clock reading of {@code epoch} in zone {@code from} as an instant in zone {@code to}. */
    public static long convertWallClock(long epoch, TimeZone from, TimeZone to) {
        Calendar source = Calendar.getInstance(from);
        source.setTimeInMillis(epoch);
        Calendar target = Calendar.getInstance(to);
        target.clear();
        target.set(
            source.get(Calendar.YEAR),
            source.get(Calendar.MONTH),
            source.get(Calendar.DAY_OF_MONTH),
            source.get(Calendar.HOUR_OF_DAY),
            source.get(Calendar.MINUTE),
            source.get(Calendar.SECOND)
        );
        return target.getTimeInMillis();
    }

    /** Result of {@link #apply}: the entries to keep and how many were converted or dropped. */
    public static final class Outcome {
        public final List<AlarmEntry> entries;
        public final int converted;
        public final int dropped;

        Outcome(List<AlarmEntry> entries, int converted, int dropped) {
            this.entries = entries;
            this.converted = converted;
            this.dropped = dropped;
        }
    }

    /** Pure core, no Android access: convert wall-clock entries, drop any that would now be in the past. */
    public static Outcome apply(List<AlarmEntry> entries, TimeZone from, TimeZone to, long now) {
        ArrayList<AlarmEntry> kept = new ArrayList<>();
        int converted = 0;
        int dropped = 0;
        for (AlarmEntry entry : entries) {
            if (!entry.wallClock) {
                kept.add(entry);
                continue;
            }
            long moved = convertWallClock(entry.at, from, to);
            if (moved <= now) {
                dropped++;
                continue;
            }
            kept.add(moved == entry.at ? entry : entry.withAt(moved));
            if (moved != entry.at) converted++;
        }
        return new Outcome(kept, converted, dropped);
    }

    /**
     * Compares the current zone with the one the plan was built under and, if
     * it changed, converts the fixed-clock reminders, raises needsReplan and
     * logs it. Safe to call from every receiver; it does nothing when the zone
     * is unchanged or unknown. Returns true when the stored plan changed.
     */
    public static boolean reconcile(Context context, AlarmStorage storage, FireLog log) {
        TimeZone current = TimeZone.getDefault();
        String plannedId = storage.planTimeZoneId();
        if (plannedId == null) {
            storage.setPlanTimeZoneId(current.getID());
            return false;
        }
        if (plannedId.equals(current.getID())) return false;

        TimeZone from = TimeZone.getTimeZone(plannedId);
        List<AlarmEntry> before = storage.list();
        Outcome outcome = apply(before, from, current, System.currentTimeMillis());
        ArrayList<Integer> keptIds = new ArrayList<>();
        for (AlarmEntry entry : outcome.entries) keptIds.add(entry.id);
        for (AlarmEntry entry : before) {
            if (!keptIds.contains(entry.id)) AlarmScheduler.cancelOne(context, entry.id);
        }
        storage.save(outcome.entries);
        storage.setPlanTimeZoneId(current.getID());
        storage.setNeedsReplan(true);
        log.add(0, "", 0L, "timezone_changed",
            plannedId + " to " + current.getID() + ": " + outcome.converted + " fixed-time reminders moved, "
                + outcome.dropped + " dropped, prayer times stay for the previous place until the app opens");
        return true;
    }
}
