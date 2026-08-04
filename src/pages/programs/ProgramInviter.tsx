import { useEffect, useState } from "react";
import { Address } from "@ton/core";
import { useTranslation } from "react-i18next";
import ChooseInviter from "../../components/programs/inviter/ChooseInviter";
import InviterData from "../../components/programs/inviter/InviterData";
import TaskQueueBlock from "../../components/programs/TaskQueueBlock";
import ProfileStatusBlock from "../../components/ProfileStatusBlock";
import { MarketingTaskCommandTag } from "../../contracts/schemes/MarketingTaskCommand";
import { UserCommandTag } from "../../contracts/schemes/UserCommand";
import { useProfileContext } from "../../context/ProfileContext";
import { useProgramContext } from "../../context/ProgramContext";
import { getMarketingV3Data } from "../../services/contractsApi";
import { getInviterData } from "../../services/programApi";
import "./program-inviter.css";

const QUEUE_REFRESH_INTERVAL_MS = 5_000;

export default function ProgramInviter() {
  const { t } = useTranslation();
  const { currentProfile } = useProfileContext();
  const { marketingAddress } = useProgramContext();
  const [inviterProfileAddress, setInviterProfileAddress] = useState<string | null>(null);
  const [hasChooseInviterTask, setHasChooseInviterTask] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setInviterProfileAddress(null);
    setHasChooseInviterTask(false);
    setIsLoading(true);

    if (!currentProfile) {
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const loadInviterState = async () => {
      const [inviterData, pendingTask] = await Promise.all([
        getInviterData(marketingAddress, currentProfile.address),
        hasPendingChooseInviterTask(marketingAddress, currentProfile.address),
      ]);
      if (cancelled) return;

      setInviterProfileAddress(
        inviterData?.inviter_profile_addr?.trim() || null,
      );
      setHasChooseInviterTask(pendingTask);
      setIsLoading(false);
    };

    let refreshTimer: number | undefined;
    const pollInviterState = async () => {
      await loadInviterState();
      if (!cancelled) {
        refreshTimer = window.setTimeout(
          () => void pollInviterState(),
          QUEUE_REFRESH_INTERVAL_MS,
        );
      }
    };

    void pollInviterState();

    return () => {
      cancelled = true;
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
    };
  }, [currentProfile, marketingAddress]);

  if (!currentProfile) return <ProfileStatusBlock type="profile" />;
  if (isLoading) return null;

  if (inviterProfileAddress) {
    return <InviterData inviterProfileAddress={inviterProfileAddress} />;
  }

  if (hasChooseInviterTask) {
    return (
      <div className="program-inviter-processing">
        <div className="program-inviter-processing__message">
          {t("programs.commandProcessing", "Your command is processing...")}
        </div>
        <TaskQueueBlock />
      </div>
    );
  }

  return <ChooseInviter onInviterChosen={() => setHasChooseInviterTask(true)} />;
}

async function hasPendingChooseInviterTask(
  marketingAddress: string,
  profileAddress: string,
): Promise<boolean> {
  try {
    const currentProfileAddress = Address.parse(profileAddress);
    const marketingData = await getMarketingV3Data(marketingAddress);
    if (!marketingData) return false;

    return Object.values(marketingData.queue).some((task) => {
      const command = task.command;
      if (!command?.profile_addr) return false;

      return (
        command.tag === MarketingTaskCommandTag.userCommand &&
        command.command_tag === UserCommandTag.chooseInviter &&
        Address.parse(command.profile_addr).equals(currentProfileAddress)
      );
    });
  } catch (error) {
    console.error("Failed to check choose inviter task", error);
    return false;
  }
}
