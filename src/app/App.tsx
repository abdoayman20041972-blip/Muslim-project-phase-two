import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { surahList } from "../quran-meta";
import { PrayerTimesView } from "./features/prayer/PrayerTimesView";
import { QiblaView } from "./features/qibla/QiblaView";
import { ProphetsView } from "./features/prophets/ProphetsView";
import { HadithView } from "./features/hadith/HadithView";
import { type View, type Section } from "./constants";
import { Splash } from "./components/app-chrome";
import { AppContent, BottomNav } from "./components/app-shell";
import { HomeView } from "./features/home/HomeView";
import { AzkarListView } from "./features/azkar/AzkarListView";
import { CategoryView } from "./features/azkar/CategoryView";
import { FavoritesView } from "./features/azkar/FavoritesView";
import { QuranReaderView } from "./features/quran/QuranReaderView";
import { QuranAudioProvider } from "./features/quran/QuranAudioProvider";
import { QuranMiniPlayer } from "./features/quran/QuranMiniPlayer";
import { QuranListView } from "./features/quran/QuranListView";
import { useViewPersistence } from "./features/quran/useViewPersistence";
import { TasbihView } from "./features/tasbih/TasbihView";
import { useTasbih } from "./features/tasbih/useTasbih";
import { useAzkarCatalog } from "./features/azkar/useAzkarCatalog";
import { useAzkarFeature } from "./features/azkar/useAzkarFeature";
import { SettingsView } from "./features/settings/SettingsView";
import { useWakeLockSetting } from "./features/settings/useWakeLockSetting";
import { useAppearanceMode } from "./features/settings/useAppearanceMode";
import { useUiScaleSync } from "./features/settings/useUiScaleSync";
import { startPreferencesMirror } from "./features/storage/preferencesMirror";
import { scheduleNativeNotifications } from "./features/notifications/nativeNotifications";
import { useAppSounds } from "./features/sound/useAppSounds";
import { useTapSoundFeedback } from "./features/sound/useTapSoundFeedback";
import { APP_SETTINGS_KEYS, readSetting } from "./settings";

export function notificationOpenTarget(value: string | null): View | null {
  if (value === 'prayer') return { name: 'prayer-times' }
  if (value === 'azkar') return { name: 'azkar-list' }
  if (value === 'ayah') return { name: 'mushaf-list' }
  return null
}
function consumeNotificationOpen(): View | null {
  const url = new URL(window.location.href)
  const target = notificationOpenTarget(url.searchParams.get('open'))
  if (!target) return null
  url.searchParams.delete('open')
  window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : '') + url.hash)
  return target
}

export function AppLoadingFallback() {
  // Deliberately quiet: no card, no big text — after the immediate prefetch
  // this only flashes for a few frames in the rare case the user navigates
  // faster than the chunks load, and a loud full card there reads as a
  // "loading problem" even when it lasts 100ms.
  return (
    <main
      className="app-content startup-loading w-full min-w-0 max-w-md px-5"
      aria-live="polite"
      aria-label="جاري تحميل الشاشة"
    >
      <div className="startup-loading-indicator" aria-hidden="true">
        <span />
      </div>
    </main>
  );
}

export function App() {
  const [booting, setBooting] = useState(true);
  const [splashExiting, setSplashExiting] = useState(false);
  // Minimum splash time is counted from the moment the artwork is on screen,
  // not from mount, so a slow image can no longer flash by in a few frames.
  const splashImageAtRef = useRef<number | null>(null);
  const tryFinishSplashRef = useRef<() => void>(() => {});
  const onSplashImageSettled = useCallback(() => {
    if (splashImageAtRef.current === null) splashImageAtRef.current = performance.now();
    tryFinishSplashRef.current();
  }, []);
  const [view, setView] = useState<View>({ name: "home" });
  // In-app view history so the Android hardware back button can navigate
  // backwards instead of closing the app (native only, see effect below).
  const viewHistoryRef = useRef<View[]>([]);
  const lastViewRef = useRef<View>(view);
  useEffect(() => {
    if (lastViewRef.current === view) return;
    viewHistoryRef.current.push(lastViewRef.current);
    if (viewHistoryRef.current.length > 50) viewHistoryRef.current.shift();
    lastViewRef.current = view;
  }, [view]);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cleanup = () => {};
    let cancelled = false;
    void (async () => {
      try {
        const { App: NativeApp } = await import("@capacitor/app");
        if (cancelled) return;
        const subscription = await NativeApp.addListener("backButton", () => {
          const previous = viewHistoryRef.current.pop();
          if (previous) {
            lastViewRef.current = previous;
            setView(previous);
          } else {
            void NativeApp.exitApp();
          }
        });
        if (cancelled) {
          void subscription.remove();
          return;
        }
        cleanup = () => void subscription.remove();
      } catch {
        // Native bridge unavailable; fall back to default behavior.
      }
    })();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);
  const [mounted, setMounted] = useState(false);
  // The launch screen is handled purely by the Android launch theme now:
  // the system splash (mosque icon on the brand green) flows into the same
  // green window background while the WebView boots, then the designed
  // in-app splash paints — one continuous brand moment, no plugin stage.
  const [surahSearch, setSurahSearch] = useState("");
  const [, setSettingsVersion] = useState(0);
  const [lastSurah, setLastSurah] = useState<number | null>(null);
  const [navOrigin, setNavOrigin] = useState<"default" | "quick-tools">(
    "default",
  );
  const { categories } = useAzkarCatalog();
  const {
    counts,
    dayTotal,
    selectedWord,
    roundCounts,
    rounds,
    setSelectedWord,
    load: loadTasbih,
    tap,
    resetWord,
    resetToday,
  } = useTasbih();
  const {
    favorites,
    favoriteItems,
    selectedCategory,
    favoritesCount,
    toggleFavorite,
  } = useAzkarFeature(categories, view);

  // Native notifications: re-armed whenever the app starts, returns to the
  // foreground, resumes from recents, or the settings change. The scheduler
  // deduplicates via a fingerprint that includes the day and timezone offset,
  // so a DST switch re-arms every alarm with the new offset.
  // The FIRST re-arm deliberately waits for the splash to be gone: scheduling
  // does several native-bridge round-trips that would compete with the launch
  // paint. Resume/visibility/settings changes still re-arm immediately.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const refresh = () => void scheduleNativeNotifications();
    const start = () => {
      window.removeEventListener("muslim-splash-done", start);
      window.clearTimeout(safety);
      refresh();
    };
    window.addEventListener("muslim-splash-done", start);
    const safety = window.setTimeout(start, 3000);
    const id = window.setInterval(refresh, 60 * 60 * 1000); // re-schedule next day
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("azkar-settings-changed", refresh);
    window.addEventListener("azkar-prayer-settings-changed", refresh);
    document.addEventListener("visibilitychange", onVisible);
    let removeResumeListener = () => {};
    let cancelled = false;
    void (async () => {
      try {
        const { App: NativeApp } = await import("@capacitor/app");
        if (cancelled) return;
        const subscription = await NativeApp.addListener("resume", refresh);
        removeResumeListener = () => void subscription.remove();
      } catch {
        // Native bridge unavailable; visibility events still cover it.
      }
    })();
    return () => {
      cancelled = true;
      removeResumeListener();
      window.clearInterval(id);
      window.clearTimeout(safety);
      window.removeEventListener("muslim-splash-done", start);
      window.removeEventListener("azkar-settings-changed", refresh);
      window.removeEventListener("azkar-prayer-settings-changed", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  useWakeLockSetting();
  const { tapFeedback } = useAppSounds();
  const { darkMode, appearance, setAppearance } = useAppearanceMode(mounted);
  useUiScaleSync();
  useTapSoundFeedback(tapFeedback);
  const readerView = useViewPersistence(view, setLastSurah);

  useEffect(() => {
    const target = consumeNotificationOpen()
    if (target) setView(target)
    // Native shell: tapping a scheduled notification opens the right view.
    if (!Capacitor.isNativePlatform()) return
    let removeTapListener = () => {}
    let cancelled = false
    void (async () => {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications')
        if (cancelled) return
        const subscription = await LocalNotifications.addListener(
          'localNotificationActionPerformed',
          (event) => {
            const target = notificationOpenTarget((event.notification.extra?.target as string | undefined) ?? null)
            if (target) setView(target)
          },
        )
        removeTapListener = () => void subscription.remove()
      } catch {
        // Native bridge unavailable; fall back to plain app launch.
      }
    })()
    return () => {
      cancelled = true
      removeTapListener()
    }
  }, [])

  useEffect(() => {
    const refreshSettings = () => setSettingsVersion((v) => v + 1);
    window.addEventListener("azkar-settings-changed", refreshSettings);
    return () =>
      window.removeEventListener("azkar-settings-changed", refreshSettings);
  }, []);

  useEffect(() => startPreferencesMirror(), []);

  useEffect(() => {
    setMounted(true);
    // Single-stage splash: the designed in-app splash is the only splash. The
    // Android launch theme (patched in scripts/patch-android.mjs) now carries
    // the FULL designed splash artwork as the window background, so during the
    // whole WebView boot the user already sees the designed splash natively;
    // this in-app splash is its animated continuation, not a repeat.
    // v1.2.6: the artwork already showed during boot, so the minimum web time
    // is short — the launch reads as: brief system icon → designed splash
    // (native, most of the time) → designed splash (animated) → app.
    const SPLASH_MIN_MS = 600;
    const SPLASH_EXIT_MS = 260;
    const SPLASH_IMAGE_WAIT_MS = 1200;
    let painted = false;
    let fontsReady = false;
    let cancelled = false;
    let exiting = false;
    let exitTimer = 0;
    let waitTimer = 0;
    const beginExit = () => {
      if (cancelled || exiting) return;
      exiting = true;
      setSplashExiting(true);
      exitTimer = window.setTimeout(() => {
        setBooting(false);
        // Heavy startup work (image/data warm-up, notification re-arm) waits
        // for this moment instead of competing with the launch paint.
        window.dispatchEvent(new Event("muslim-splash-done"));
      }, SPLASH_EXIT_MS);
    };
    const finishSplash = () => {
      const imageAt = splashImageAtRef.current;
      if (cancelled || exiting || waitTimer || !painted || !fontsReady || imageAt === null) return;
      const wait = Math.max(0, SPLASH_MIN_MS - (performance.now() - imageAt));
      waitTimer = window.setTimeout(beginExit, wait);
    };
    tryFinishSplashRef.current = finishSplash;
    // If the artwork never settles, stop waiting for it (the SVG fallback shows).
    const imageGuard = window.setTimeout(() => {
      // Already waited long enough: count the minimum display time as elapsed.
      if (splashImageAtRef.current === null) splashImageAtRef.current = performance.now() - SPLASH_MIN_MS;
      finishSplash();
    }, SPLASH_IMAGE_WAIT_MS);
    const fonts = document.fonts?.ready
      ? Promise.race([
          document.fonts.ready,
          new Promise((resolve) => window.setTimeout(resolve, 1200)),
        ])
      : Promise.resolve();
    fonts.finally(() => {
      fontsReady = true;
      finishSplash();
    });
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        painted = true;
        finishSplash();
      }),
    );
    const hardStop = window.setTimeout(() => {
      beginExit();
    }, 2000);
    try {
      const savedLastSurah = localStorage.getItem("azkar_last_surah");
      if (savedLastSurah) setLastSurah(parseInt(savedLastSurah, 10) || null);
      loadTasbih();
      if (readSetting(APP_SETTINGS_KEYS.restoreLastPage, "0") === "1") {
        const savedView = localStorage.getItem("azkar_last_view");
        if (savedView === "prayer-times") setView({ name: "prayer-times" });
        else if (savedView === "mushaf-list") setView({ name: "mushaf-list" });
        else if (savedView === "azkar-list") setView({ name: "azkar-list" });
        else if (savedView === "tasbih") setView({ name: "tasbih" });
      }
    } catch (error) { console.debug('[App]', error) }
    const idle = (callback: () => void, timeout = 1800) => {
      if ("requestIdleCallback" in window) {
        const id = window.requestIdleCallback(callback, { timeout });
        return () => window.cancelIdleCallback(id);
      }
      const id = globalThis.setTimeout(callback, Math.min(timeout, 1200));
      return () => window.clearTimeout(id);
    };
    // Screen chunks are no longer lazy: every screen module ships inside the
    // main bundle (local file inside the APK — no chunk fetch can ever sit
    // between a tab tap and its screen). What still benefits from warming is
    // the DATA and the heavy background artwork.
    const prefetchData = () =>
      // Warm the hadith editions too: their JSON is bundled inside the APK, so
      // opening «الأحاديث» switches from a fetch-then-skeleton to instant.
      import("./features/hadith/hadithData")
        .then((m) => Promise.allSettled(m.API_EDITIONS.map((edition) => m.loadApiEdition(edition.edition))))
        .catch(() => {});
    const prefetchImages = () => {
      // Warm the biggest background images too, so the first navigation to
      // each screen shows its artwork instantly. All local files inside the
      // APK: warming them costs no network and no permission.
      for (const src of [
        "/img/tasbih-mosque-background.jpg",
        "/img/tasbih-mosque-night.jpg",
        "/img/qibla-mobile.jpg",
        "/img/azkar-morning-wide-mosque.jpg",
        "/img/azkar-evening-wide-sunset-mosque.jpg",
      ]) {
        const image = new Image();
        image.decoding = "async";
        image.src = src;
      }
    };
    let prefetchStarted = false;
    const startPrefetch = () => {
      if (prefetchStarted) return;
      prefetchStarted = true;
      prefetchImages();
      void prefetchData();
    };
    // v1.2.6: warm-up starts when the splash is DONE, not on the first frame —
    // decoding five large JPEGs and parsing hadith JSON used to fight the
    // splash paint for the main thread. The first tap and an idle timeout stay
    // as safety nets for the rare case the splash-done event never fires.
    const onSplashDone = () => startPrefetch();
    window.addEventListener("muslim-splash-done", onSplashDone, { once: true });
    const onFirstTouch = () => startPrefetch();
    window.addEventListener("pointerdown", onFirstTouch, { once: true });
    const cancelPrefetch = idle(() => {
      if (!cancelled) startPrefetch();
    }, 3200);
    return () => {
      cancelled = true;
      window.clearTimeout(hardStop);
      window.clearTimeout(exitTimer);
      window.clearTimeout(waitTimer);
      window.clearTimeout(imageGuard);
      window.removeEventListener("pointerdown", onFirstTouch);
      window.removeEventListener("muslim-splash-done", onSplashDone);
      cancelPrefetch();
    };
  }, [loadTasbih]);

  // v1.2.6 navigation speed: every screen's element is memoized, so merely
  // switching tabs no longer re-renders ALL mounted (kept-alive) screens.
  // React bails out of a subtree when the parent returns the same element
  // reference — a tab switch now reconciles only the two tabs whose className
  // flips between "hidden" and "contents".
  const goView = useCallback((v: View) => {
    setNavOrigin("default");
    setView(v);
  }, []);
  const go = (s: Section) => {
    setNavOrigin("default");
    setView(
      s === "home"
        ? { name: "home" }
        : s === "mushaf"
          ? { name: "mushaf-list" }
          : s === "hadith"
            ? { name: "hadith" }
            : s === "azkar"
              ? { name: "azkar-list" }
              : s === "tasbih"
                ? { name: "tasbih" }
                : { name: "settings" },
    );
  };
  // Quick Tools entries return straight to Home; bottom-nav and dashboard
  // entries keep their normal back destinations.
  const backTo = navOrigin === "quick-tools" ? () => setView({ name: "home" }) : null;
  const quickOrigin = navOrigin === "quick-tools";
  const lastSurahMeta = lastSurah
    ? surahList.find((s) => s.number === lastSurah)
    : undefined;

  const homeScreen = useMemo(
    () => (
      <HomeView
        lastSurahMeta={lastSurahMeta}
        darkMode={darkMode}
        onToggleDarkMode={() => setAppearance(darkMode ? "light" : "dark")}
        onOpenPrayer={() => setView({ name: "prayer-times" })}
        onOpenMushaf={() => setView({ name: "mushaf-list" })}
        onOpenAzkar={() => setView({ name: "azkar-list" })}
        onOpenMorningAzkar={() => {
          setNavOrigin("quick-tools");
          setView({ name: "category", id: "morning" });
        }}
        onOpenEveningAzkar={() => {
          setNavOrigin("quick-tools");
          setView({ name: "category", id: "evening" });
        }}
        onOpenTasbih={() => setView({ name: "tasbih" })}
        onContinueReading={() =>
          lastSurahMeta
            ? (setNavOrigin("quick-tools"),
              setView({
                name: "mushaf-surah",
                number: lastSurahMeta.number,
              }))
            : (setNavOrigin("quick-tools"),
              setView({ name: "mushaf-list" }))
        }
        onOpenSettings={() => setView({ name: "settings" })}
        onOpenQibla={() => setView({ name: "qibla" })}
        onOpenProphets={() => setView({ name: "prophets" })}
        onOpenHadith={() => setView({ name: "hadith" })}
        onOpenFavorites={() => {
          setNavOrigin("quick-tools");
          setView({ name: "favorites" });
        }}
      />
    ),
    [lastSurahMeta, darkMode, setAppearance],
  );
  const settingsScreen = useMemo(
    () => (
      <SettingsView
        darkMode={darkMode}
        appearance={appearance}
        onAppearance={setAppearance}
        onBack={() => setView({ name: "home" })}
      />
    ),
    [darkMode, appearance, setAppearance],
  );
  const azkarListScreen = useMemo(
    () => (
      <div className="azkar-no-select">
        <AzkarListView
          categories={categories}
          favoritesCount={favoritesCount}
          onBack={() => setView({ name: "home" })}
          setView={setView}
        />
      </div>
    ),
    [categories, favoritesCount],
  );
  const favoritesScreen = useMemo(
    () => (
      <div className="azkar-no-select">
        <FavoritesView
          favorites={favoriteItems}
          onToggleFavorite={toggleFavorite}
          onBack={backTo ?? (() => setView({ name: "azkar-list" }))}
          setView={setView}
        />
      </div>
    ),
    [favoriteItems, backTo, toggleFavorite],
  );
  const categoryScreen = useMemo(
    () =>
      selectedCategory ? (
        <div className="azkar-no-select">
          <CategoryView
            category={selectedCategory}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onBack={
              quickOrigin
                ? () => setView({ name: "home" })
                : () => setView({ name: "azkar-list" })
            }
          />
        </div>
      ) : null,
    [selectedCategory, favorites, toggleFavorite, quickOrigin],
  );
  const mushafListScreen = useMemo(
    () => (
      <QuranListView
        lastSurah={lastSurah}
        surahSearch={surahSearch}
        setSurahSearch={setSurahSearch}
        setView={goView}
      />
    ),
    [lastSurah, surahSearch, goView],
  );
  const mushafReaderScreen = useMemo(
    () =>
      readerView ? (
        <QuranReaderView
          view={readerView}
          setView={
            quickOrigin
              ? (v) => {
                  if (v.name === "mushaf-list" || v.name === "home") {
                    setView({ name: "home" });
                    setNavOrigin("default");
                  } else {
                    setView(v);
                  }
                }
              : setView
          }
        />
      ) : null,
    [readerView, quickOrigin],
  );
  const prayerScreen = useMemo(
    () => (
      <PrayerTimesView
        onBack={() => setView({ name: "home" })}
        onOpenQibla={() => setView({ name: "qibla" })}
      />
    ),
    [],
  );
  const qiblaScreen = useMemo(() => <QiblaView onBack={() => setView({ name: "home" })} />, []);
  const prophetsScreen = useMemo(() => <ProphetsView onBack={() => setView({ name: "home" })} />, []);
  const hadithScreen = useMemo(() => <HadithView onBack={() => setView({ name: "home" })} />, []);
  const tasbihScreen = useMemo(
    () => (
      <TasbihView
        counts={counts}
        dayTotal={dayTotal}
        selectedWord={selectedWord}
        roundCounts={roundCounts}
        rounds={rounds}
        onTap={tap}
        onResetWord={resetWord}
        onResetToday={resetToday}
        onSelectWord={setSelectedWord}
        setView={setView}
      />
    ),
    [counts, dayTotal, selectedWord, roundCounts, rounds, tap, resetWord, resetToday, setSelectedWord],
  );

  return (
    <QuranAudioProvider setView={setView}>
      <div
        dir="rtl"
        className="app-viewport min-h-[100dvh] w-full min-w-0 flex flex-col items-center overflow-x-hidden font-['Cairo',sans-serif] text-azkar-ink"
        style={{
          background:
            "radial-gradient(ellipse 120% 60% at 50% -10%, hsl(var(--hero-a)), transparent), radial-gradient(ellipse 100% 50% at 100% 100%, hsl(var(--hero-b)), transparent), hsl(var(--azkar-bg))",
        }}
      >
        {booting && <Splash exiting={splashExiting} onImageSettled={onSplashImageSettled} />}
        <AppContent
            view={view}
            home={homeScreen}
            settings={settingsScreen}
            azkarList={azkarListScreen}
            favorites={favoritesScreen}
            category={categoryScreen}
            mushafList={mushafListScreen}
            mushafReader={mushafReaderScreen}
            mushafReaderActive={view.name === "mushaf-surah"}
            prayer={prayerScreen}
            qibla={qiblaScreen}
            prophets={prophetsScreen}
            hadith={hadithScreen}
            onHome={() => setView({ name: "home" })}
            tasbih={tasbihScreen}
          />
        {view.name !== "mushaf-surah" && <QuranMiniPlayer />}
        {view.name !== "mushaf-surah" && (
          <BottomNav view={view} onNavigate={go} />
        )}
      </div>
    </QuranAudioProvider>
  );
}
