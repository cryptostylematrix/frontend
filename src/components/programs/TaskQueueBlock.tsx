import { useCallback, useEffect, useRef, useState } from "react";
import { Address } from "@ton/core";
import { useTranslation } from "react-i18next";
import { MarketingTaskCommandTag } from "../../contracts/schemes/MarketingTaskCommand";
import { UserCommandTag } from "../../contracts/schemes/UserCommand";
import { useProfileContext } from "../../context/ProfileContext";
import { useProgramContext } from "../../context/ProgramContext";
import {
  getMarketingV3Data,
  type MarketingV3DataResponse,
} from "../../services/contractsApi";
import "./task-queue-block.css";

const REFRESH_INTERVAL_SECONDS = 5;

const TASK_LABELS: Record<number, { key: string; defaultValue: string }> = {
  [UserCommandTag.activatePlace]: { key: "activatePlace", defaultValue: "Activate a place" },
  [UserCommandTag.buyFirstPlace]: { key: "buyFirstPlace", defaultValue: "Buy first place" },
  [UserCommandTag.buyPlace]: { key: "buyPlace", defaultValue: "Buy a place" },
  [UserCommandTag.buySysPlace]: { key: "buySysPlace", defaultValue: "Buy a system place" },
  [UserCommandTag.buyTopPlace]: { key: "buyTopPlace", defaultValue: "Buy a top place" },
  [UserCommandTag.chooseInviter]: { key: "chooseInviter", defaultValue: "Choose inviter" },
  [UserCommandTag.lockPos]: { key: "lockPos", defaultValue: "Lock pos" },
  [UserCommandTag.unlockPos]: { key: "unlockPos", defaultValue: "Unlock pos" },
};

type TaskRow = {
  tag: number;
  indexes: number[];
};

export default function TaskQueueBlock() {
  const { t } = useTranslation();
  const { currentProfile } = useProfileContext();
  const { marketingAddress } = useProgramContext();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_INTERVAL_SECONDS);
  const [marketingData, setMarketingData] = useState<MarketingV3DataResponse | null>(null);
  const inFlightRef = useRef(false);
  const nextRefreshAtRef = useRef(Date.now());

  const profileTasks = currentProfile?.address
    ? Object.entries(marketingData?.queue ?? {})
        .sort(([left], [right]) => Number(left) - Number(right))
        .map(([, task], index) => ({ task, queueNumber: index + 1 }))
        .filter(({ task }) => {
          const command = task.command;
          return (
            command?.tag === MarketingTaskCommandTag.userCommand &&
            addressesEqual(command.profile_addr, currentProfile.address)
          );
        })
    : [];

  const taskRows = profileTasks.reduce<TaskRow[]>((rows, { task, queueNumber }) => {
    const command = task.command;
    if (command?.tag !== MarketingTaskCommandTag.userCommand) return rows;

    const tag = command.command_tag;
    const existing = rows.find((row) => row.tag === tag);
    if (existing) {
      existing.indexes.push(queueNumber);
    } else {
      rows.push({ tag, indexes: [queueNumber] });
    }
    return rows;
  }, []);

  const refreshNow = useCallback(async () => {
    if (inFlightRef.current || !marketingAddress.trim()) return;
    inFlightRef.current = true;
    nextRefreshAtRef.current = Date.now() + REFRESH_INTERVAL_SECONDS * 1000;
    setSecondsLeft(REFRESH_INTERVAL_SECONDS);

    try {
      const data = await getMarketingV3Data(marketingAddress);
      setMarketingData(data);
    } catch (error) {
      console.error("Failed to load program task queue", error);
      setMarketingData(null);
    } finally {
      inFlightRef.current = false;
    }
  }, [marketingAddress]);

  useEffect(() => {
    if (isCollapsed) return;

    void refreshNow();
    const intervalId = window.setInterval(() => {
      const left = Math.max(
        0,
        Math.ceil((nextRefreshAtRef.current - Date.now()) / 1000),
      );
      setSecondsLeft(left);
      if (left === 0) void refreshNow();
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isCollapsed, refreshNow]);

  useEffect(() => {
    setMarketingData(null);
    setSecondsLeft(REFRESH_INTERVAL_SECONDS);
  }, [isCollapsed, marketingAddress]);

  if (!currentProfile) return null;

  return (
    <div className="matrix-row task-queue">
      <div className="task-queue-toggle">
        <span className="task-queue-title">
          {t("programQueue.title", "Task queue")}
        </span>
        <button
          type="button"
          className="task-queue-button"
          onClick={() => setIsCollapsed((value) => !value)}
          aria-expanded={!isCollapsed}
          aria-controls="program-task-queue-body"
        >
          {isCollapsed
            ? t("structure.show", "Show")
            : t("structure.hide", "Hide")}
        </button>
      </div>

      <div
        id="program-task-queue-body"
        className={`task-queue-body ${isCollapsed ? "is-collapsed" : ""}`}
      >
        <div className="task-queue-refresh-row">
          <p className="task-queue-refresh">
            {t("programQueue.refreshIn", "The data will refresh in")} {" "}
            <strong>{secondsLeft}</strong> {t("programQueue.seconds", "seconds")}
          </p>
          <button
            type="button"
            className="task-queue-refresh-button"
            onClick={() => void refreshNow()}
            disabled={inFlightRef.current}
          >
            {t("programQueue.refreshNow", "Refresh now")}
          </button>
        </div>

        <p className="task-queue-summary">
          {t("programQueue.summaryPrefix", "There are")} {" "}
          <strong>{profileTasks.length}</strong> {" "}
          {t("programQueue.summarySuffix", "tasks associated with the profile")} {" "}
          <strong className="task-queue-profile">{currentProfile.login}</strong>
        </p>

        <div className="task-queue-table">
          <div className="task-queue-table__row task-queue-table__header">
            <span>{t("programQueue.task", "Task")}</span>
            <span>{t("programQueue.count", "Count")}</span>
            <span>{t("programQueue.orderIndex", "Order index")}</span>
          </div>
          {taskRows.length === 0 ? (
            <div className="task-queue-table__row">
              <span>{t("programQueue.noTasks", "No tasks")}</span>
              <span>{t("programQueue.tasksCount", { count: 0, defaultValue: "{{count}} tasks" })}</span>
              <span>—</span>
            </div>
          ) : (
            taskRows.map((row) => {
              const label = TASK_LABELS[row.tag];
              return (
                <div className="task-queue-table__row" key={row.tag}>
                  <span>
                    {label
                      ? t(`programQueue.${label.key}`, label.defaultValue)
                      : t("programQueue.unknownTask", {
                          tag: row.tag,
                          defaultValue: "Task #{{tag}}",
                        })}
                  </span>
                  <span>
                    {t("programQueue.tasksCount", {
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

function addressesEqual(left: string | null, right: string): boolean {
  if (!left) return false;
  try {
    return Address.parse(left).equals(Address.parse(right));
  } catch {
    return left === right;
  }
}
