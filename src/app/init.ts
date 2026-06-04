import { getAppDataDir } from "../ipc";
import { topicsRoot } from "../fs/mdRepo";
import { getAllSettings } from "../db/repos/settings";
import { seedIfEmpty } from "../db/seed";
import { getOrCreateLocalUser } from "../db/repos/users";
import { listProfiles } from "../db/repos/profiles";
import { useAppStore } from "../stores/appStore";
import i18n from "./i18n";

export async function bootstrap() {
  const appDataDir = await getAppDataDir();
  await topicsRoot();
  await seedIfEmpty();
  const settings = await getAllSettings();
  await i18n.changeLanguage(settings.language);

  // Load user and profiles
  const user = await getOrCreateLocalUser();
  const profiles = await listProfiles(user.id);
  const currentProfileId =
    settings.last_profile_id && profiles.some((p) => p.id === settings.last_profile_id)
      ? settings.last_profile_id
      : profiles[0]?.id ?? null;

  useAppStore.setState({
    appDataDir,
    settings,
    currentUserId: user.id,
    currentUser: user,
    currentProfileId,
    profiles,
    currentTopicId: settings.startup_mode === "last" ? settings.last_topic_id : null,
    ready: true,
  });
}
