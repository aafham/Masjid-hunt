import { expect, test } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  // Stable official-shaped timetable fixture; live JAKIM is verified separately.
  await page.route("**/api/prayer-times?*", async route => {
    const params = new URL(route.request().url()).searchParams;
    await route.fulfill({ json: { zone: params.get("zone"), area: "Zon pilihan", date: params.get("date"), timezone: "Asia/Kuala_Lumpur", source: "jakim", timings: { Fajr: "05:56", Dhuhr: "13:10", Asr: "16:14", Maghrib: "19:12", Isha: "20:21" } } });
  });
});
test("operating route categories show exactly the selected line", async ({ page }) => {
  await page.goto("/stations");
  await page.getByRole("button", { name: "MRT", exact: true }).click();
  await expect(page.locator("#directory-line option")).toHaveCount(3);
  await page.getByLabel("Pilih laluan").selectOption("MRT Putrajaya");
  await expect(page.locator(".station-card")).toHaveCount(36);
  await expect(page.locator(".station-group h2")).toHaveText("MRT Putrajaya");
  await page.getByRole("button", { name: "LRT", exact: true }).click();
  await page.getByLabel("Pilih laluan").selectOption("LRT Shah Alam");
  await expect(page.locator(".station-card")).toHaveCount(20);
  await page.locator(".station-card").filter({ hasText: "Johan Setia" }).click();
  await expect(page).toHaveURL(/\/station\/johan-setia-sa/);
  await expect(page.locator("h1")).toHaveText("Johan Setia");
  await expect(page.locator(".selected-station")).toContainText("Shah Alam");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("home route selection requires an explicit station and handles no match", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "LRT", exact: true }).click();
  await page.getByLabel("Pilih laluan").selectOption("LRT Shah Alam");
  const search = page.getByRole("combobox", { name: "Anda turun di stesen mana?" });
  await search.fill("zzzaudit");
  await expect(page.getByText("Tiada stesen sepadan.", { exact: true })).toBeVisible();
  await expect(page.locator("article")).toHaveCount(0);
  await search.fill("Johan");
  await page.getByRole("option").filter({ hasText: "Johan Setia" }).click();
  await expect(page).toHaveURL(/station=johan-setia-sa/);
  await expect(page.locator(".selected-station h2")).toHaveText("Johan Setia");
  await expect(page.locator(".result-skeletons")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("detail station stays fixed while radius and mosque name filter change", async ({ page }) => {
  await page.goto("/station/kl-sentral");
  await expect(page.locator("article").first()).toBeVisible();
  await expect(page.getByLabel("Pilih laluan")).toHaveCount(0);
  await page.getByRole("button", { name: "1 km", exact: true }).click();
  await expect(page).toHaveURL(/radius=1/);
  await expect(page.locator("article").first()).toBeVisible();
  await page.locator("summary").filter({ hasText: "Tapis hasil" }).click();
  await page.getByLabel("Nama masjid dalam hasil ini").fill("zzzaudit");
  await expect(page.getByText("Tiada nama yang sepadan.", { exact: true })).toBeVisible();
  await expect(page.locator("h1")).toHaveText("KL Sentral");
  await expect(page.locator("article")).toHaveCount(0);
  await page.getByRole("button", { name: "Kosongkan carian nama" }).click();
  await expect(page.locator("article").first()).toBeVisible();
  const directions = await page.locator("article a").first().getAttribute("href");
  expect(directions).toContain("travelmode=walking");
  const origin = new URL(directions!).searchParams.get("origin")!;
  expect(origin).not.toBe("3.2376,101.7244");
});
test("home navigation resets URL and selection, browser back restores matching state", async ({ page }) => {
  await page.goto("/?station=kl-sentral&radius=1");
  await expect(page.locator(".selected-station h2")).toHaveText("KL Sentral");
  await page.getByRole("link", { name: "Cari masjid", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("combobox", { name: "Anda turun di stesen mana?" })).toBeVisible();
  await expect(page.locator(".selected-station")).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/station=kl-sentral/);
  await expect(page.locator(".selected-station h2")).toHaveText("KL Sentral");
});
test("chosen prayer zone survives choosing and changing stations", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Waktu solat/ }).click();
  await page.getByLabel(/Zon pilihan/).selectOption("SGR03");
  await expect(page.getByText("05:56", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "KL Sentral", exact: true }).click();
  await expect(page.getByRole("button", { name: /Waktu solat Selangor · SGR03/ })).toBeVisible();
  await page.locator(".selected-station").getByRole("button", { name: /Tukar/ }).click();
  await expect(page.getByRole("button", { name: /Waktu solat Selangor · SGR03/ })).toBeVisible();
});
test("location is explicit and its nearest station can start the search", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 3.134, longitude: 101.686 });
  await page.goto("/");
  await expect(page.locator(".nearby-option")).toHaveCount(0);
  await page.getByRole("button", { name: "Guna lokasi saya", exact: true }).click();
  await expect(page.locator(".nearby-option")).toHaveCount(3);
  const expectedStation = await page.locator(".nearby-option strong").first().innerText();
  await page.locator(".nearby-option").first().click();
  await expect(page.locator(".selected-station h2")).toHaveText(expectedStation);
  await expect(page.locator("article").first()).toBeVisible();
});
test("API failure can retry without losing the chosen station", async ({ page }) => {
  await page.route("**/api/mosques?*", route => route.fulfill({ status: 503, json: { error: "Sumber sementara tidak tersedia." } }));
  await page.goto("/?station=kl-sentral");
  await expect(page.locator(".error-state")).toBeVisible();
  await page.unroute("**/api/mosques?*");
  await page.locator(".error-state").getByRole("button", { name: "Cuba lagi" }).click();
  await expect(page.locator("article").first()).toBeVisible();
  await expect(page.locator(".selected-station h2")).toHaveText("KL Sentral");
});
test("saved stations persist on this device and can be removed", async ({ page }) => {
  await page.goto("/?station=kl-sentral");
  await page.getByRole("button", { name: "Simpan stesen", exact: true }).click();
  await expect(page.getByRole("button", { name: "Buang stesen daripada simpanan" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("link", { name: "Cari masjid", exact: true }).click();
  await expect(page.getByText("STESEN DISIMPAN", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "KL Sentral", exact: true }).click();
  await page.getByRole("button", { name: "Buang stesen daripada simpanan" }).click();
  await expect(page.getByRole("button", { name: "Simpan stesen", exact: true })).toHaveAttribute("aria-pressed", "false");
});
test("map and list selection stay synchronized", async ({ page, isMobile }) => {
  await page.goto("/?station=kl-sentral");
  const first = page.locator("article").first();
  await expect(first).toBeVisible();
  const name = await first.locator("h3").innerText();
  await first.getByRole("button", { name: "Lihat di peta" }).click();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await expect(page.locator(".map-selected")).toContainText(name!);
  await page.locator(".map-selected").getByRole("button", { name: "Lihat butiran" }).click();
  await expect(page.locator("article.selected")).toBeVisible();
  if (isMobile) await expect(page.getByRole("button", { name: "Senarai", exact: true })).toHaveAttribute("aria-pressed", "true");
});
test("keyboard station suggestions keep the active row visible", async ({ page }) => {
  await page.goto("/");
  const input = page.getByRole("combobox", { name: "Anda turun di stesen mana?" });
  await input.focus();
  for (let index = 0; index < 8; index++) await input.press("ArrowDown");
  const activeId = await input.getAttribute("aria-activedescendant");
  const option = page.locator("[id=" + JSON.stringify(activeId) + "]");
  const box = await option.boundingBox();
  const list = await page.getByRole("listbox").boundingBox();
  expect(box && list && box.y >= list.y && box.y + box.height <= list.y + list.height + 1).toBe(true);
  const name = await option.locator("strong").innerText();
  await input.press("Enter");
  await expect(page.locator(".selected-station h2")).toHaveText(name);
});

test("failed map tiles show a fallback while pins and walking directions remain usable", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.route("https://tile.openstreetmap.org/**", route => route.abort("failed"));
  await page.goto("/?station=kl-sentral");
  const first = page.locator("article").first();
  await expect(first).toBeVisible();
  const directions = first.getByRole("link", { name: /Laluan berjalan/ });
  const href = await directions.getAttribute("href");
  expect(href).toContain("travelmode=walking");
  await first.getByRole("button", { name: "Lihat di peta" }).click();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  const status = page.getByRole("status").filter({ hasText: "Imej peta tidak dapat dimuatkan sepenuhnya." });
  await expect(status).toBeVisible();
  await expect(page.locator(".station-map-pin")).toBeVisible();
  await expect(page.locator(".mosque-map-pin").first()).toBeVisible();
  await expect(status.getByRole("link", { name: /Buka OpenStreetMap/ })).toHaveAttribute("href", /^https:\/\/www\.openstreetmap\.org\/\?mlat=/);
  // A recovered layer removes the warning after its failed tiles are replaced.
  await page.unroute("https://tile.openstreetmap.org/**");
  await page.route("https://tile.openstreetmap.org/**", route => route.fulfill({
    contentType: "image/svg+xml",
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e9eddd"/></svg>'
  }));
  await page.locator(".leaflet-control-zoom-in").click();
  await expect(status).toHaveCount(0);
  await page.locator(".map-selected").getByRole("button", { name: "Lihat butiran" }).click();
  await expect(directions).toBeVisible();
  await expect(directions).toHaveAttribute("href", href!);
  expect(pageErrors).toEqual([]);
});
