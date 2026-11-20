import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

/*
 * The playground runs generate() in the browser: valid input prints the CSS
 * and the tokens, invalid input prints the readable error, and the output is
 * always text. No screenshots here (site.spec.ts owns those).
 */

/**
 * @param {Page} page - Page under test
 * @param {string} text - Replaces the theme JSON
 * @returns {Promise<void>} Resolves once the text is typed
 */
const setTheme = async (page: Page, text: string): Promise<void> => {
  await page.getByLabel("Theme JSON").fill(text);
};

const output = (page: Page) => page.getByTestId("playground-output");

test.beforeEach(async ({ page }) => {
  await page.goto("/playground");
});

test("the sample theme prints CSS", async ({ page }) => {
  await expect(output(page)).toContainText("--sg-color-");
});

test("an edit re-runs generate()", async ({ page }) => {
  await setTheme(page, '{"colors":{"brand":"#123456"}}');
  await expect(output(page)).toContainText("--sg-color-brand: #123456", {
    timeout: 2000,
  });
});

test("an unknown key shows the validation error and no CSS", async ({
  page,
}) => {
  await setTheme(page, '{"colors":{"brand":"#123456"},"foo":1}');
  await expect(page.getByRole("alert")).toContainText("foo", {
    timeout: 2000,
  });
  await expect(output(page)).toHaveCount(0);
});

test("malformed JSON names the theme text", async ({ page }) => {
  await setTheme(page, "{");
  await expect(page.getByRole("alert")).toContainText(/^Theme JSON:/, {
    timeout: 2000,
  });
});

test("the Tokens tab lists the tokens", async ({ page }) => {
  await setTheme(page, '{"colors":{"brand":"#123456"}}');
  await expect(output(page)).toContainText("--sg-color-brand");
  await page.getByRole("tab", { name: "Tokens" }).click();
  await expect(output(page)).toContainText('"brand"');
});

test("markup in the input stays text", async ({ page }) => {
  const payload = "<img src=x onerror=window.__xss=1>";
  // A value with `<` is rejected without echo; an unknown key is echoed.
  await setTheme(page, `{"colors":{"brand":"${payload}"}}`);
  await expect(page.getByRole("alert")).toBeVisible({ timeout: 2000 });
  await setTheme(page, `{"colors":{"brand":"#123456"},"${payload}":1}`);
  await expect(page.getByRole("alert")).toContainText(payload, {
    timeout: 2000,
  });
  expect(await page.evaluate(() => "__xss" in window)).toBe(false);
  await expect(page.getByRole("alert").locator("img")).toHaveCount(0);
});

test("a __proto__ key is rejected and does not pollute", async ({ page }) => {
  await setTheme(page, '{"__proto__":{"x":1},"colors":{"a":"#000"}}');
  await expect(page.getByRole("alert")).toBeVisible({ timeout: 2000 });
  const inherited = await page.evaluate(() => {
    const probe: { x?: unknown } = {};
    return probe.x;
  });
  expect(inherited).toBeUndefined();
});
