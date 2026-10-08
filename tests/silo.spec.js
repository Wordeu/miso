import { test, expect } from "@playwright/test";

test("page and supplied assets load without errors at desktop and mobile widths", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveTitle("Silo — Intelligence, within reach.");
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator(".blueprint")).toBeVisible();
  }
  await page.locator("#models").scrollIntoViewIfNeeded();
  for (const name of ["Kimi logo", "Mistral AI logo", "DeepSeek logo"]) {
    await expect(page.getByAltText(name)).toBeVisible();
    await expect
      .poll(() =>
        page
          .getByAltText(name)
          .evaluate((img) => img.complete && img.naturalWidth > 0),
      )
      .toBe(true);
  }
  expect(errors).toEqual([]);
});

test("drawing supports keyboard, pointer, scroll reveal and motion toggle", async ({
  page,
}) => {
  await page.goto("/");
  const drawing = page.locator(".blueprint");
  await drawing.focus();
  await page.keyboard.press("ArrowRight");
  await expect(drawing).toHaveClass(/is-active/);
  expect(
    await drawing.evaluate((el) => el.style.getPropertyValue("--move-x")),
  ).not.toBe("0px");
  await page.keyboard.press("Escape");
  await expect(drawing).not.toHaveClass(/is-active/);
  const box = await drawing.boundingBox();
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.4);
  await expect(page.locator(".drawing-highlight")).toHaveCSS("opacity", "1");
  await page.locator("#models").scrollIntoViewIfNeeded();
  await expect(page.locator(".model-grid")).toHaveCSS("opacity", "1");
  await page.locator(".footer-drawing").scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page
        .locator(".footer-drawing")
        .evaluate((el) =>
          Number(el.style.getPropertyValue("--footer-progress")),
        ),
    )
    .toBeGreaterThan(0.9);
  await page.getByRole("button", { name: "Motion on" }).click();
  await expect(
    page.getByRole("button", { name: "Motion off" }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".drawing-type")).toHaveCSS(
    "animation-name",
    "none",
  );
});

test("reduced motion stays static and navigation works from the keyboard", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".drawing-type")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(page.locator(".footer-fill")).toHaveCSS("clip-path", "none");
  await expect(
    page.getByRole("button", { name: "Reduced motion" }),
  ).toBeDisabled();
  const modelsLink = page
    .getByRole("navigation")
    .getByRole("link", { name: "Models", exact: true });
  await modelsLink.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#models$/);
  await expect(
    page.getByRole("heading", { name: "Your choice of open-weight models." }),
  ).toBeInViewport();
});

test("API rejects malformed input and never exposes saved email addresses", async ({
  request,
}) => {
  expect(
    (
      await request.post("/api/waitlist", { data: { email: "invalid" } })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/waitlist", {
        data: "broken",
        headers: { "Content-Type": "application/json" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/waitlist", {
        data: { email: "test@example.com" },
        headers: { "Sec-Fetch-Site": "cross-site" },
      })
    ).status(),
  ).toBe(403);
  expect((await request.get("/api/waitlist")).status()).toBe(405);
  expect((await request.get("/.data/waitlist.jsonl")).status()).toBe(404);
});
