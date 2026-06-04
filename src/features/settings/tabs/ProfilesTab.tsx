import { useEffect, useRef, useState } from "react";
import { Button, Card, Divider, Input, Modal, Space, Tag, App, Popconfirm, Segmented } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../../stores/appStore";
import {
  createProfile,
  updateProfile,
  deleteProfile,
} from "../../../db/repos/profiles";
import { updateUser } from "../../../db/repos/users";
import type { Profile } from "../../../types";
import { TextAvatar, AVATAR_PALETTE, parseTextAvatar, buildTextAvatarStr } from "../../../components/TextAvatar";
import type { AvatarLayout } from "../../../components/TextAvatar";

/** Common emoji presets for profile icons */
const PROFILE_EMOJI_PRESETS = [
  "📋", "💼", "🏠", "🎮", "📚", "🎨", "🧪", "🏋️",
  "✈️", "🎵", "🌱", "🔬", "💡", "🎯", "🛠️", "🧠",
];

export function ProfilesTab() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { profiles, setProfiles, currentUserId, currentUser, setCurrentUser, currentProfileId, setCurrentProfile, profilesAutoCreate, clearProfileCreate } =
    useAppStore();

  // --- User info state ---
  const parsedUserAvatar = currentUser?.avatar?.startsWith("text:") ? parseTextAvatar(currentUser.avatar) : null;
  const [nickname, setNickname] = useState(currentUser?.name ?? "");
  const [userAvatarMode, setUserAvatarMode] = useState<"text" | "image">(
    currentUser?.avatar && currentUser.avatar.startsWith("data:") ? "image" : "text"
  );
  const [userAvatarText, setUserAvatarText] = useState(parsedUserAvatar?.text ?? currentUser?.name?.slice(0, 6) ?? "");
  const [userAvatarColor, setUserAvatarColor] = useState<string>(parsedUserAvatar?.color ?? "");
  const [userAvatarLayout, setUserAvatarLayout] = useState<AvatarLayout>(parsedUserAvatar?.layout ?? "auto");
  const [userAvatarImage, setUserAvatarImage] = useState<string | null>(
    currentUser?.avatar && currentUser.avatar.startsWith("data:") ? currentUser.avatar : null
  );
  const userFileRef = useRef<HTMLInputElement>(null);

  const saveUserInfo = async () => {
    if (!currentUserId || !currentUser) return;
    const name = nickname.trim() || "User";
    let avatar: string | null = null;
    if (userAvatarMode === "image" && userAvatarImage) {
      avatar = userAvatarImage;
    } else {
      avatar = buildTextAvatarStr(
        (userAvatarText || name).slice(0, 6),
        userAvatarColor || undefined,
        userAvatarLayout !== "auto" ? userAvatarLayout : undefined
      );
    }
    await updateUser(currentUserId, { name, avatar });
    setCurrentUser({ ...currentUser, name, avatar });
    message.success(t("common.save"));
  };

  const handleUserImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUserAvatarImage(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // --- Profile editing state ---
  const [editing, setEditing] = useState<{
    mode: "create" | "edit";
    id?: string;
    name: string;
    icon: string;
    color: string;
  } | null>(null);

  // Auto-open create modal when navigated from sidebar
  useEffect(() => {
    if (profilesAutoCreate) {
      setEditing({ mode: "create", name: "", icon: "📋", color: "" });
      clearProfileCreate();
    }
  }, [profilesAutoCreate, clearProfileCreate]);

  const handleSave = async () => {
    if (!editing || !currentUserId) return;
    const name = editing.name.trim();
    if (!name) {
      message.warning(t("profile.nameRequired"));
      return;
    }

    if (editing.mode === "create") {
      const created = await createProfile({
        user_id: currentUserId,
        name,
        icon: editing.icon || null,
        color: editing.color || null,
      });
      setProfiles([...profiles, created]);
    } else if (editing.id) {
      await updateProfile(editing.id, {
        name,
        icon: editing.icon || null,
        color: editing.color || null,
      });
      setProfiles(
        profiles.map((p) =>
          p.id === editing.id
            ? { ...p, name, icon: editing.icon || null, color: editing.color || null }
            : p
        )
      );
    }
    setEditing(null);
  };

  const handleDelete = async (profile: Profile) => {
    const ok = await deleteProfile(profile.id);
    if (!ok) {
      message.error(t("profile.cannotDeleteLast"));
      return;
    }
    const next = profiles.filter((p) => p.id !== profile.id);
    setProfiles(next);
    if (currentProfileId === profile.id && next.length > 0) {
      setCurrentProfile(next[0].id);
    }
    message.success(t("common.delete") + " OK");
  };

  return (
    <div>
      {/* ===== 用户信息 ===== */}
      <h4 style={{ marginBottom: 12 }}>{t("profile.user")}</h4>
      <Card size="small" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          {/* 头像区域 */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>{t("profile.avatar")}</div>
            {userAvatarMode === "text" ? (
              <TextAvatar
                text={userAvatarText || nickname || "U"}
                size={64}
                borderRadius={14}
                color={userAvatarColor || undefined}
                layout={userAvatarLayout}
              />
            ) : userAvatarImage ? (
              <img
                src={userAvatarImage}
                alt="avatar"
                style={{ width: 64, height: 64, borderRadius: 14, objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: 64, height: 64, borderRadius: 14,
                  background: "var(--ant-color-fill-tertiary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 24, opacity: 0.5,
                }}
              >
                ?
              </div>
            )}
            <Segmented
              size="small"
              value={userAvatarMode}
              onChange={(v) => setUserAvatarMode(v as "text" | "image")}
              options={[
                { label: t("profile.avatarText"), value: "text" },
                { label: t("profile.avatarImage"), value: "image" },
              ]}
            />
          </div>
          {/* 表单区域 */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>{t("profile.nickname")}</div>
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={t("profile.nicknamePlaceholder")}
                maxLength={20}
              />
            </div>
            {userAvatarMode === "text" && (
              <>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                    {t("profile.avatarTextPlaceholder")}
                  </div>
                  <Input
                    value={userAvatarText}
                    onChange={(e) => setUserAvatarText(e.target.value.slice(0, 6))}
                    placeholder={t("profile.avatarTextPlaceholder")}
                    maxLength={6}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>{t("profile.colorLabel")}</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                    {AVATAR_PALETTE.map((c) => (
                      <div
                        key={c}
                        onClick={() => setUserAvatarColor(c)}
                        style={{
                          width: 22, height: 22, borderRadius: 6, background: c, cursor: "pointer",
                          border: userAvatarColor === c ? "2px solid var(--ant-color-text)" : "2px solid transparent",
                        }}
                      />
                    ))}
                    <Input
                      type="color"
                      value={userAvatarColor || "#1677ff"}
                      onChange={(e) => setUserAvatarColor(e.target.value)}
                      style={{ width: 28, height: 22, padding: 1, borderRadius: 4, marginLeft: 4 }}
                    />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>{t("profile.layout")}</div>
                  <Segmented
                    size="small"
                    value={userAvatarLayout}
                    onChange={(v) => setUserAvatarLayout(v as AvatarLayout)}
                    options={[
                      { label: "Auto", value: "auto" },
                      { label: "2×2", value: "2x2" },
                      { label: "2×3", value: "2x3" },
                      { label: "1×4", value: "1x4" },
                    ]}
                  />
                </div>
              </>
            )}
            {userAvatarMode === "image" && (
              <div>
                <Button size="small" onClick={() => userFileRef.current?.click()}>
                  {t("settings.agents.avatarHint")}
                </Button>
                <input
                  ref={userFileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleUserImageUpload}
                />
              </div>
            )}
            <div style={{ marginTop: 4 }}>
              <Button type="primary" size="small" onClick={saveUserInfo}>
                {t("common.save")}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* ===== 场景模式 ===== */}
      <Divider style={{ margin: "16px 0" }} />
      <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h4 style={{ margin: 0 }}>{t("profile.modes")}</h4>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() =>
            setEditing({ mode: "create", name: "", icon: "📋", color: "" })
          }
        >
          {t("profile.add")}
        </Button>
      </div>
      <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 12 }}>
        {t("profile.description")}
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {profiles.map((p) => (
          <Card
            key={p.id}
            size="small"
            style={{
              borderLeft: `4px solid ${p.color || "var(--ant-color-primary)"}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Space>
                <span style={{ fontSize: 20 }}>{p.icon || "📋"}</span>
                <span style={{ fontWeight: 500 }}>{p.name}</span>
                {p.id === currentProfileId && (
                  <Tag color="blue">{t("profile.current")}</Tag>
                )}
              </Space>
              <Space size={4}>
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() =>
                    setEditing({
                      mode: "edit",
                      id: p.id,
                      name: p.name,
                      icon: p.icon || "",
                      color: p.color || "",
                    })
                  }
                />
                <Popconfirm
                  title={t("profile.confirmDelete")}
                  onConfirm={() => handleDelete(p)}
                  okText={t("common.ok")}
                  cancelText={t("common.cancel")}
                >
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                  />
                </Popconfirm>
              </Space>
            </div>
          </Card>
        ))}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        title={editing?.mode === "create" ? t("profile.add") : t("profile.edit")}
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={handleSave}
        okText={t("common.save")}
        cancelText={t("common.cancel")}
        destroyOnClose
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ marginBottom: 4, fontSize: 13 }}>{t("profile.nameLabel")}</div>
            <Input
              value={editing?.name ?? ""}
              onChange={(e) =>
                setEditing((s) => (s ? { ...s, name: e.target.value } : s))
              }
              placeholder={t("profile.namePlaceholder")}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.nativeEvent.isComposing || e.keyCode === 229)) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
            />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontSize: 13 }}>{t("profile.iconLabel")}</div>
            <Input
              value={editing?.icon ?? ""}
              onChange={(e) =>
                setEditing((s) => (s ? { ...s, icon: e.target.value } : s))
              }
              placeholder={t("profile.iconPlaceholder")}
              style={{ marginBottom: 8 }}
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(8, 1fr)",
                gap: 4,
              }}
            >
              {PROFILE_EMOJI_PRESETS.map((emoji) => (
                <Button
                  key={emoji}
                  type={editing?.icon === emoji ? "primary" : "text"}
                  style={{ fontSize: 18, width: 36, height: 36, padding: 0 }}
                  onClick={() =>
                    setEditing((s) => (s ? { ...s, icon: emoji } : s))
                  }
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ marginBottom: 4, fontSize: 13 }}>{t("profile.colorLabel")}</div>
            <Input
              type="color"
              value={editing?.color || "#1677ff"}
              onChange={(e) =>
                setEditing((s) => (s ? { ...s, color: e.target.value } : s))
              }
              style={{ width: 60, padding: 2, height: 32 }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
