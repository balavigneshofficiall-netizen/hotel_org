import fs from "fs";
import path from "path";
import {
  DEFAULT_NOTIFICATION_TEMPLATES,
  NotificationTemplatesMap,
  renderNotificationTemplate,
} from "./notificationTemplates";

export {
  DEFAULT_NOTIFICATION_TEMPLATES,
  type NotificationTemplatesMap,
  renderNotificationTemplate,
};

const TEMPLATES_FILE_PATH = path.join(
  process.cwd(),
  "src",
  "data",
  "notificationTemplates.json"
);

/**
 * Loads current notification templates from file or returns defaults
 */
export function getNotificationTemplates(): NotificationTemplatesMap {
  try {
    if (fs.existsSync(TEMPLATES_FILE_PATH)) {
      const data = fs.readFileSync(TEMPLATES_FILE_PATH, "utf-8");
      const parsed = JSON.parse(data);
      return {
        ...DEFAULT_NOTIFICATION_TEMPLATES,
        ...parsed,
      };
    }
  } catch (err) {
    console.error("Error reading notificationTemplates.json:", err);
  }
  return { ...DEFAULT_NOTIFICATION_TEMPLATES };
}

/**
 * Saves updated notification templates to file
 */
export function saveNotificationTemplates(
  templates: Partial<NotificationTemplatesMap>
): NotificationTemplatesMap {
  try {
    const dir = path.dirname(TEMPLATES_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const current = getNotificationTemplates();
    const merged = { ...current, ...templates };
    fs.writeFileSync(TEMPLATES_FILE_PATH, JSON.stringify(merged, null, 2), "utf-8");
    return merged;
  } catch (err) {
    console.error("Error saving notificationTemplates.json:", err);
    return { ...DEFAULT_NOTIFICATION_TEMPLATES, ...templates };
  }
}
