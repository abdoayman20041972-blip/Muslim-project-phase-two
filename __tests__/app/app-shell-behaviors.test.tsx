import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Splash } from "../../src/app/components/app-chrome";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App, AppLoadingFallback } from "../../src/app/App";

function finishBoot() {
  return waitFor(
    () => expect(screen.getAllByText("مسلم").length).toBeGreaterThan(0),
    { timeout: 4000 },
  );
}

describe("App shell behaviors", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.stubGlobal("Notification", {
      permission: "default",
      requestPermission: vi.fn().mockResolvedValue("granted"),
    });
  });

  it("toggles dark mode from the home screen", async () => {
    render(<App />);
    await finishBoot();

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "تبديل الوضع الليلي" }));

    await waitFor(() =>
      expect(document.documentElement.classList.contains("dark")).toBe(true),
    );
  });

});

describe("Suspense screen fallback", () => {
  it("renders loading feedback inside the content main region", () => {
    render(<AppLoadingFallback />);
    const main = screen.getByRole("main", { name: "جاري تحميل الشاشة" });
    expect(main).toBeTruthy();
    expect(main).toHaveTextContent("جاري التحميل");
  });
});

describe("startup Splash", () => {
  it("keeps Splash colors independent from theme variables", () => {
    const { container } = render(<Splash />);
    const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
    const start = css.indexOf("/* Cinematic startup Splash");
    expect(start).toBeGreaterThanOrEqual(0);
    const end = css.indexOf(".startup-loading{", start);
    const splashCss = css.slice(start, end > start ? end : undefined);

    expect(splashCss).not.toContain("var(--azkar-");
    expect(container.innerHTML).not.toContain("azkar-");
    expect(container.innerHTML).not.toContain("var(--");
  });

  it("supports the exit state", () => {
    const { rerender } = render(<Splash />);
    expect(screen.getByRole("status", { name: "جاري تحميل مسلم" })).toBeTruthy();
    expect(screen.getByText("مسلم")).toBeTruthy();

    rerender(<Splash exiting />);

    expect(
      screen.getByRole("status", { name: "جاري تحميل مسلم" }).className,
    ).toContain("muslim-splash-exit");
  });

  it("renders the intended Splash artwork with the mosque emblem", () => {
    const { container } = render(<Splash />);
    expect(screen.getByRole("status", { name: "جاري تحميل مسلم" })).toBeTruthy();
    expect(container.querySelector(".muslim-splash-emblem-core svg")).toBeTruthy();
    expect(container.querySelector(".muslim-splash-arch")).toBeTruthy();
    expect(container.innerHTML).not.toContain("muslim-splash-spin");
  });
});
