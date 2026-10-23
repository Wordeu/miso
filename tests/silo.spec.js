import { test, expect } from "@playwright/test";

const formspreeEndpoint = "https://formspree.io/f/mwlvoqoo";

test.beforeEach(async ({ page }) => {
  // Keep automated signups out of the real Formspree inbox.
  await page.route("https://formspree.io/**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ok: true }),
  }));
});

test("signup submits to Formspree and supports keyboard submission", async ({ page }) => {
  await page.goto("/");
  const email = `launch-${Date.now()}@example.com`;
  const input = page.getByRole("textbox", { name: "Email address" });
  await expect(page.locator("#signup-title")).toHaveText(
    "Help shape Orla.",
  );
  await expect(page.locator("#signup-copy")).toHaveText(
    "We’re speaking with teams whose essential work depends on the cloud. Leave your email to discuss what needs to keep running and help shape our first use cases.",
  );
  await expect(page.locator(".signup-fields button")).toHaveText(
    "Talk to us →",
  );
  await input.fill(email);
  const submission = page.waitForRequest(formspreeEndpoint);
  await input.press("Enter");
  const request = await submission;
  expect(request.method()).toBe("POST");
  expect(request.headers().accept).toBe("application/json");
  expect(request.postDataJSON()).toEqual({ email });
  await expect(page.getByRole("status")).toHaveText("Thanks for getting in touch. We’ll be in contact.");
  await expect(input).toHaveValue("");
});

test("signup preserves the email after a network failure and allows retry", async ({ page }) => {
  await page.goto("/");
  const input = page.getByRole("textbox", { name: "Email address" });
  const button = page.getByRole("button", { name: "Talk to us" });
  await page.route(formspreeEndpoint, (route) => route.abort());
  await input.fill("retry@example.com");
  await button.click();
  await expect(page.getByRole("status")).toHaveText("Couldn’t connect. Please try again.");
  await expect(input).toHaveValue("retry@example.com");
  await expect(button).toBeEnabled();
  await page.unroute(formspreeEndpoint);
  await button.click();
  await expect(page.getByRole("status")).toHaveText("Thanks for getting in touch. We’ll be in contact.");
});

test("signup preserves the email when Formspree rejects a submission", async ({ page }) => {
  await page.goto("/");
  const input = page.getByRole("textbox", { name: "Email address" });
  const button = page.getByRole("button", { name: "Talk to us" });
  await input.fill("retry@example.com");
  for (const status of [422, 429, 500]) {
    await page.route(formspreeEndpoint, (route) => route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({ errors: [{ message: "Submission rejected" }] }),
    }));
    await button.click();
    await expect(page.getByRole("status")).toHaveText(status === 429
      ? "Please wait a minute and try again."
      : "Couldn’t send your details. Please try again.");
    await expect(input).toHaveValue("retry@example.com");
    await expect(button).toBeEnabled();
    await page.unroute(formspreeEndpoint);
  }
});

test("page and supplied assets load without errors at desktop and mobile widths", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page,
  ).toHaveTitle("Orla — Keep essential services running when the cloud goes down.");
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
  await page.locator("#team").scrollIntoViewIfNeeded();
  for (const name of ["Alice", "Johnny", "Tanzim"]) {
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

test("mobile hero wraps normally and aligns with its description after resizing", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  for (const width of [390, 320, 430, 700, 1440, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const reserve = page.locator(".headline-reserve");
    const matrix = page.locator(".headline-matrix");
    if (width > 700) {
      await expect(matrix).toBeVisible();
      await expect(reserve).toBeHidden();
      continue;
    }
    await expect(reserve).toBeVisible();
    await expect(matrix).toBeHidden();
    expect(await reserve.innerText()).toBe(
      "Keep essential services running when the cloud goes down.",
    );
    await expect(page.locator(".intro-description")).toHaveCSS("text-align", "left");
    const heading = await page.locator("#hero-title").boundingBox();
    const description = await page.locator(".intro-description").boundingBox();
    expect(Math.abs(heading.x - description.x)).toBeLessThan(1);
    expect(description.y - (heading.y + heading.height)).toBeGreaterThanOrEqual(27);
    expect(heading.x + heading.width).toBeLessThanOrEqual(width);
  }
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
  await page.locator("#why-now").scrollIntoViewIfNeeded();
  await expect(page.locator(".research-copy")).toHaveCSS("opacity", "1");
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
  const whyLink = page
    .getByRole("navigation")
    .getByRole("link", { name: "Why now", exact: true });
  await whyLink.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#why-now$/);
  await expect(
    page.getByRole("heading", { name: "Local intelligence is becoming more practical." }),
  ).toBeInViewport();
});

test("page explains the developing local network and keeps Johnny in the middle", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-copy='description']")).toContainText("We’re developing a network of secure local computers");
  await expect(page.locator(".steps")).toContainText("enough spare computing power");
  await expect(page.locator(".steps")).toContainText("pause lower-priority processing");
  await expect(page.locator(".product-section")).toHaveCount(0);
  await expect(page.locator('img[src^="/orla-device"]')).toHaveCount(0);
  await expect(page.locator(".team-member h3")).toHaveText(["Alice", "Johnny", "Tanzim"]);
  const johnny = page.locator("[aria-labelledby='johnny-name']");
  await expect(johnny).toContainText("He also supported a $12m funding round");
  await expect(johnny).not.toContainText(/London School of Economics|LSE/);
  await expect(page.locator("main")).not.toContainText(/Free Forever|£1,800|60\+ models|clips to your phone/);
  await expect(page.locator("main")).not.toContainText(";");
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
