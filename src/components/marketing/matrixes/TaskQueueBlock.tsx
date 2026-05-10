import "./task-queue-block.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { getMarketingData, type MarketingDataResponse, type MarketingTaskResponse } from "../../../services/contractsApi";
import { useProfileContext } from "../../../context/ProfileContext";
import { useTranslation } from "react-i18next";
import { useMarketingContext } from "../../../context/MarketingContext";

const REFRESH_INTERVAL_SECONDS = 5;

const TASK_LABELS: Record<number, { key: string; defaultValue: string }> = {
  1: { key: "buyPlace", defaultValue: "Buy a place" },
  2: { key: "createClone", defaultValue: "Create a clone" },
  3: { key: "lockPos", defaultValue: "Lock pos" },
  4: { key: "unlockPos", defaultValue: "Unlock pos" },
  5: { key: "task5", defaultValue: "Task #5" },
  6: { key: "task6", defaultValue: "Task #6" },
};

type QueueTask = {
  key: string;
  val: MarketingTaskResponse;
};

export default function TaskQueueBlock() {
  const { t } = useTranslation();
  const { currentProfile } = useProfileContext();
  const { marketingAddr } = useMarketingContext();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_INTERVAL_SECONDS);
  const [marketingData, setMarketingData] = useState<MarketingDataResponse | null>(null);
  const inFlightRef = useRef(false);
  const nextRefreshAtRef = useRef(Date.now());

  if (!currentProfile) return null;

  const allTasks: QueueTask[] = Object.entries(marketingData?.queue ?? {})
    .map(([key, val]) => ({ key, val }))
    .sort((a, b) => Number(a.key) - Number(b.key));
  const profileTasks = allTasks.filter(
    (task) => task.val.profile_addr === currentProfile.address
  );
  const totalTasks = profileTasks.length;

  const taskRows = profileTasks.reduce<Array<{ tag: number; indexes: string[] }>>((rows, task) => {
    const tag = task.val.payload?.tag;
    if (!Number.isFinite(tag)) return rows;
    const existing = rows.find((row) => row.tag === tag);
    if (existing) {
      existing.indexes.push(task.key);
    } else {
      rows.push({ tag, indexes: [task.key] });
    }
    return rows;
  }, []);

  taskRows.sort((a, b) => a.tag - b.tag);

  const refreshNow = useCallback(async () => {
    if (inFlightRef.current || !marketingAddr) return;
    inFlightRef.current = true;
    nextRefreshAtRef.current = Date.now() + REFRESH_INTERVAL_SECONDS * 1000;
    setSecondsLeft(REFRESH_INTERVAL_SECONDS);
    try {
      const result = await getMarketingData(marketingAddr);
      setMarketingData(result);
    } finally {
      inFlightRef.current = false;
    }
  }, [marketingAddr]);

  useEffect(() => {
    if (isCollapsed) return;

    let cancelled = false;
    void refreshNow();

    const intervalId = window.setInterval(() => {
      if (cancelled) return;
      const left = Math.max(
        0,
        Math.ceil((nextRefreshAtRef.current - Date.now()) / 1000)
      );
      setSecondsLeft(left);
      if (left === 0) {
        void refreshNow();
      }
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [isCollapsed, refreshNow]);

  useEffect(() => {
    if (isCollapsed) {
      setSecondsLeft(REFRESH_INTERVAL_SECONDS);
    }
  }, [isCollapsed]);

  return (
    <div className="matrix-row task-queue">
      <div className="task-queue-toggle">
        <span className="task-queue-title">
          {t("multiMatrix.queue.title", "Task queue")}
        </span>
        <button
          type="button"
          className="task-queue-button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          aria-expanded={!isCollapsed}
          aria-controls="task-queue-body"
        >
          {isCollapsed
            ? t("multiMatrix.filters.show", "Show")
            : t("multiMatrix.filters.hide", "Hide")}
        </button>
      </div>

      <div
        id="task-queue-body"
        className={`task-queue-body ${isCollapsed ? "is-collapsed" : ""}`}
      >
        <div className="task-queue-refresh-row">
          <p className="task-queue-refresh">
            {t("multiMatrix.queue.refreshIn", "The data will refresh in")}{" "}
            <strong>{secondsLeft}</strong>{" "}
            {t("multiMatrix.queue.seconds", "seconds")}
          </p>
          <button
            type="button"
            className="task-queue-refresh-button"
            onClick={() => void refreshNow()}
            disabled={isCollapsed}
          >
            {t("multiMatrix.queue.refreshNow", "Refresh now")}
          </button>
        </div>
        <p className="task-queue-summary">
          {t("multiMatrix.queue.summaryPrefix", "There are")}{" "}
          <strong>{totalTasks}</strong>{" "}
          {t("multiMatrix.queue.summarySuffix", "tasks associated with the profile")}{" "}
          <strong className="task-queue-profile">{currentProfile.login}</strong>
        </p>
        <div className="task-queue-table">
          <div className="task-queue-table__row task-queue-table__header">
            <span>{t("multiMatrix.queue.task", "Task")}</span>
            <span>{t("multiMatrix.queue.count", "Count")}</span>
            <span>{t("multiMatrix.queue.orderIndex", "Order index")}</span>
          </div>
          {taskRows.length === 0 ? (
            <div className="task-queue-table__row">
              <span>{t("multiMatrix.queue.noTasks", "No tasks")}</span>
              <span>{t("multiMatrix.queue.tasksCount", { count: 0, defaultValue: "{{count}} tasks" })}</span>
              <span>—</span>
            </div>
          ) : (
            taskRows.map((row) => {
              const label = TASK_LABELS[row.tag] ?? {
                key: `task${row.tag}`,
                defaultValue: `Task #${row.tag}`,
              };
              return (
                <div className="task-queue-table__row" key={row.tag}>
                  <span>{t(`multiMatrix.queue.${label.key}`, label.defaultValue)}</span>
                  <span>
                    {t("multiMatrix.queue.tasksCount", {
                      count: row.indexes.length,
                      defaultValue: "{{count}} tasks",
                    })}
                  </span>
                  <span>{row.indexes.join(", ")}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
