import { expect, test } from "@playwright/test";
import transit from "../../data/transit-lines.json";

const tileUrl = "https://tile.openstreetmap.org/**";

test.beforeEach(async ({ page }) => {
  await page.route(tileUrl, route => route.fulfill({
    contentType: "image/svg+xml",
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"/>'
  }));
});

test("the directory links to all eight routes and category and line filters update the map", async ({ page }) => {
  await page.goto("/stations");
  await page.getByRole("link", { name: /Lihat peta rangkaian/i }).click();
  await expect(page).toHaveURL(/\/peta$/);
  const network = page.locator("#peta-rangkaian");
  await expect(page.getByRole("heading", { level: 1, name: "Peta rangkaian transit" })).toBeVisible();
  await expect(network.locator(".network-station-pin").first()).toBeAttached();

  const routePaths = network.locator(".leaflet-overlay-pane path");
  await expect(routePaths).toHaveCount(8);
  const legend = network.locator(".network-legend li");
  await expect(legend).toHaveText(transit.lines.map(line => line.name));

  await page.getByText("Tapis peta", { exact: true }).click();
  await page.getByRole("button", { name: "MRT", exact: true }).click();
  await expect(legend).toHaveCount(2);
  await expect(routePaths).toHaveCount(2);
  await page.getByRole("combobox", { name: "Pilih laluan", exact: true }).selectOption("MRT Putrajaya");
  await expect(legend).toHaveCount(1);
  await expect(legend).toContainText("MRT Putrajaya");
  await expect(routePaths).toHaveCount(1);
  const stations = network.getByRole("combobox", { name: "Pilih stesen pada peta" });
  await expect(stations.locator('option:not([value=""])')).toHaveCount(36);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.getByRole("searchbox", { name: "Cari stesen" }).fill("ZZ-missing-station");
  await expect(page.getByRole("heading", { name: "Tiada stesen sepadan." })).toBeVisible();
  await expect(network).toHaveCount(0);
  await page.getByRole("button", { name: "Tetapkan semula carian" }).click();
  await expect(legend).toHaveCount(8);
});

test("an interchange offers the detail page for the selected service and its connecting services", async ({ page }) => {
  await page.goto("/peta");
  const network = page.locator("#peta-rangkaian");
  await expect(network.locator(".network-station-pin").first()).toBeAttached();
  await network.getByRole("combobox", { name: "Pilih stesen pada peta" }).selectOption("kl-sentral-erl");
  const selected = network.getByRole("link", { name: /Cari masjid berhampiran/ });
  await expect(selected).toHaveAttribute("href", "/station/kl-sentral-erl");
  await expect(network.locator('a[href="/station/kl-sentral"]')).toBeVisible();
  await expect(network.locator('a[href="/station/muzium-negara"]')).toBeVisible();
  const express = network.locator('a[href="/station/kl-sentral-erl-ekspres"]');
  await expect(express).toBeVisible();
  await express.click();
  await expect(page).toHaveURL(/\/station\/kl-sentral-erl-ekspres$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("KL Sentral");
  await expect(page.locator(".detail-heading")).toContainText("KLIA Ekspres");
});

test("stations remain selectable on the map when basemap tiles fail", async ({ page }) => {
  await page.route(tileUrl, route => route.abort("failed"));
  await page.goto("/peta");
  const network = page.locator("#peta-rangkaian");
  await expect(network.getByRole("status").filter({ hasText: "Imej peta dasar tidak dapat dimuatkan" })).toBeVisible();

  // The express origin is spatially distinct from its airport stops at overview zoom.
  await page.getByText("Tapis peta", { exact: true }).click();
  await page.getByRole("combobox", { name: "Pilih laluan", exact: true }).selectOption("KLIA Ekspres");
  await network.locator('.network-station-pin[title="KL Sentral"]').click();
  await expect(network.getByRole("combobox", { name: "Pilih stesen pada peta" })).toHaveValue("kl-sentral-erl-ekspres");
  await expect(network.getByRole("link", { name: /Cari masjid berhampiran/ })).toHaveAttribute("href", "/station/kl-sentral-erl-ekspres");
});
