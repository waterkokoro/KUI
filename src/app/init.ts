import { getAppDataDir } from "../ipc";
import { topicsRoot } from "../fs/mdRepo";
import { getAllSettings } from "../db/repos/settings";
import { seedIfEmpty } from "../db/seed";
import { useAppStore } from "../stores/appStore";
import i18n from "./i18n";

export async function bootstrap() {
  const appDataDir = await getAppDataDir();
  await topicsRoot();
  await seedIfEmpty();
  const settings = await getAllSettings();
  await i18n.changeLanguage(settings.language);
  useAppStore.setState({
    appDataDir,
    settings,
    currentTopicId: settings.startup_mode === "last" ? settings.last_topic_id : null,
    ready: true,
  });
}
