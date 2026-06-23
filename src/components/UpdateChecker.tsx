import { useEffect } from "react";
import { Modal, Button, App as AntdApp, Space } from "antd";
import { DownloadOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useUpdaterStore } from "../stores/updaterStore";

/**
 * Auto-updater component. Mount once at app root.
 * - Auto-checks for updates 3s after startup (silent: no modal if none found)
 * - Renders the update modal when an update is available
 */
export function UpdateChecker() {
  const { t } = useTranslation();
  const { message } = AntdApp.useApp();
  const { updateInfo, modalOpen, downloading, check, downloadAndInstall, closeModal } =
    useUpdaterStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      check(true); // silent auto-check
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  async function handleUpdate() {
    try {
      await downloadAndInstall();
      message.success(t("update.install_ready", "更新已下载，即将重启安装"));
    } catch {
      message.error(t("update.failed", "更新失败，请稍后重试"));
    }
  }

  if (!modalOpen || !updateInfo) return null;

  return (
    <Modal
      title={
        <Space>
          <DownloadOutlined />
          {t("update.title", "发现新版本")}
        </Space>
      }
      open={modalOpen}
      onCancel={closeModal}
      footer={
        <Space>
          <Button onClick={closeModal} disabled={downloading}>
            {t("update.later", "稍后提醒")}
          </Button>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={downloading}
            onClick={handleUpdate}
          >
            {downloading
              ? t("update.downloading", "正在下载更新...")
              : t("update.install", "立即更新")}
          </Button>
        </Space>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <strong>v{updateInfo.version}</strong>
        {updateInfo.date && (
          <span style={{ marginLeft: 8, color: "var(--ant-color-text-secondary)" }}>
            {updateInfo.date.split("T")[0]}
          </span>
        )}
      </div>
      {updateInfo.body && (
        <div
          style={{
            maxHeight: 200,
            overflowY: "auto",
            padding: "12px",
            background: "var(--ant-color-fill-quaternary)",
            borderRadius: 8,
            whiteSpace: "pre-wrap",
            fontSize: 13,
          }}
        >
          {updateInfo.body}
        </div>
      )}
    </Modal>
  );
}
