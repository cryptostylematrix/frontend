import "./task-queue-block.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { getMultiData, type MultiDataResponse } from "../../../services/contractsApi";
import { useProfileContext } from "../../../context/ProfileContext";
import { useTranslation } from "react-i18next";

const REFRESH_INTERVAL_SECONDS = 5;
const BUY_TAG = 1;
const CLONE_TAG = 2;
const LOCK_TAG = 3;
const UNLOCK_TAG = 4;

export default function TaskQueueBlock() {
  const { t } = useTranslation();
  const { currentProfile } = useProfileContext();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_INTERVAL_SECONDS);
  const [multiData, setMultiData] = useState<MultiDataResponse | null>(null);
  const inFlightRef = useRef(false);
  const nextRefreshAtRef = useRef(Date.now());

  if (!currentProfile) return null;

  const allTasks = multiData?.tasks ?? [];
  const profileTasks = allTasks.filter(
    (task) => task?.val?.profile_addr === currentProfile.address
  );
  const totalTasks = profileTasks.length;

  const collectIndexes = (tag: number) =>
    allTasks
      .map((task, index) => ({ task, index: index + 1 }))
      .filter(
        ({ task }) =>
          task?.val?.profile_addr === currentProfile.address &&
          task?.val?.payload?.tag === tag
      )
      .map(({ index }) => index);

  const buyIndexes = collectIndexes(BUY_TAG);
  const cloneIndexes = collectIndexes(CLONE_TAG);
  const lockIndexes = collectIndexes(LOCK_TAG);
  const unlockIndexes = collectIndexes(UNLOCK_TAG);

  const refreshNow = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    nextRefreshAtRef.current = Date.now() + REFRESH_INTERVAL_SECONDS * 1000;
    setSecondsLeft(REFRESH_INTERVAL_SECONDS);
    try {
      const result = await getMultiData();
      setMultiData(result);
    } finally {
      inFlightRef.current = false;
    }
  }, []);

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

  void multiData;

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
          <div className="task-queue-table__row">
            <span>{t("multiMatrix.queue.buyPlace", "Buy a place")}</span>
            <span>
              {t("multiMatrix.queue.tasksCount", {
                count: buyIndexes.length,
                defaultValue: "{{count}} tasks",
              })}
            </span>
            <span>{buyIndexes.length ? buyIndexes.join(", ") : "—"}</span>
          </div>
          <div className="task-queue-table__row">
            <span>{t("multiMatrix.queue.createClone", "Create a clone")}</span>
            <span>
              {t("multiMatrix.queue.tasksCount", {
                count: cloneIndexes.length,
                defaultValue: "{{count}} tasks",
              })}
            </span>
            <span>{cloneIndexes.length ? cloneIndexes.join(", ") : "—"}</span>
          </div>
          <div className="task-queue-table__row">
            <span>{t("multiMatrix.queue.lockPos", "Lock pos")}</span>
            <span>
              {t("multiMatrix.queue.tasksCount", {
                count: lockIndexes.length,
                defaultValue: "{{count}} tasks",
              })}
            </span>
            <span>{lockIndexes.length ? lockIndexes.join(", ") : "—"}</span>
          </div>
          <div className="task-queue-table__row">
            <span>{t("multiMatrix.queue.unlockPos", "Unlock pos")}</span>
            <span>
              {t("multiMatrix.queue.tasksCount", {
                count: unlockIndexes.length,
                defaultValue: "{{count}} tasks",
              })}
            </span>
            <span>{unlockIndexes.length ? unlockIndexes.join(", ") : "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
