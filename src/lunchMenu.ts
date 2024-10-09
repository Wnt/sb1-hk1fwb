import axios from "axios";
import { MenuItem, parseMenuWithChatGPT } from "./openai";
import { JSDOM } from "jsdom";
import fs from "fs/promises";
import path from "path";

export type WeekMenu = {
  [key in Weekday]: MenuItem[];
};

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday";

const weekdays: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];

async function fetchLunchMenu(): Promise<string> {
  try {
    const response = await axios.get("https://blanko.net/lounas");
    const dom = new JSDOM(response.data);
    const document = dom.window.document;

    // Remove svg, img, and script tags
    document.querySelectorAll("svg, img, script").forEach((el) => el.remove());

    const bodyContent = document.body.innerHTML;
    return bodyContent;
  } catch (error) {
    console.error("Error fetching lunch menu:", error);
    throw error;
  }
}

const isCacheValid = async (filePath: string): Promise<boolean> => {
  const stats = await fs.stat(filePath).catch(() => null);
  if (!stats) return false;
  const cacheAge = Date.now() - stats.mtime.getTime();
  return cacheAge < 24 * 60 * 60 * 1000; // 24 hours in milliseconds
};

const readCache = async (filePath: string): Promise<string | null> => {
  if (await isCacheValid(filePath)) {
    return fs.readFile(filePath, "utf-8");
  }
  return null;
};

const parseWeeklyMenu = async (htmlContent: string): Promise<WeekMenu> => {
  const weekMenu: Partial<WeekMenu> = {};

  for (const weekday of weekdays) {
    const parsedMenu = await parsedResultsWithCache(htmlContent, weekday);
    weekMenu[weekday] = parsedMenu;
  }

  return weekMenu as WeekMenu;
};

const getHtmlContentWithCache = async (): Promise<string> => {
  const cacheDir = path.join(__dirname, "cache");
  const cacheFile = path.join(cacheDir, "menu-cache.html");
  // Ensure cache directory exists
  await fs.mkdir(cacheDir, { recursive: true });
  const htmlContent = (await readCache(cacheFile)) || (await fetchLunchMenu());
  await fs.writeFile(cacheFile, htmlContent);
  return htmlContent;
};

export const getAndParseWeeklyMenu = async (): Promise<WeekMenu> => {
  const htmlContent = await getHtmlContentWithCache();
  return parseWeeklyMenu(htmlContent);
};
const parsedResultsWithCache = async (
  htmlContent: string,
  weekday: Weekday
): Promise<MenuItem[]> => {
  const cacheDir = path.join(__dirname, "cache");
  const cacheFile = path.join(cacheDir, `${weekday}.json`);

  // Ensure cache directory exists
  await fs.mkdir(cacheDir, { recursive: true });

  // Check if valid cache exists
  const cachedContent = await readCache(cacheFile);
  if (cachedContent) {
    return JSON.parse(cachedContent);
  }

  // If no valid cache, parse the menu and cache the result
  const parsedMenu = await parseMenuWithChatGPT(htmlContent, weekday);
  await fs.writeFile(cacheFile, JSON.stringify(parsedMenu));
  return parsedMenu;
};
export const getAndParseDayMenu = async (
  weekday: Weekday
): Promise<MenuItem[]> => {
  const htmlContent = await getHtmlContentWithCache();

  return await parsedResultsWithCache(htmlContent, weekday);
};
