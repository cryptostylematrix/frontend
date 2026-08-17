import { useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { WalletContext } from "../../../App";
import { useProfileContext } from "../../../context/ProfileContext";
import { useProgramContext } from "../../../context/ProgramContext";
import { useStructuresContext } from "../../../context/StructuresContext";
import {
  getStructure,
  getTree,
  type ProgramStructure,
  type ProgramTreeNode,
} from "../../../services/programApi";
import Details from "./Details";
import Grid from "./Grid";
import "./tree.css";

const UNLIMITED_PAGE_SIZE = 4;
const INITIAL_FROM_POS = 1;

export default function Tree() {
  const { t } = useTranslation();
  const { currentProfile } = useProfileContext();
  const { wallet } = useContext(WalletContext)!;
  const { marketingAddress } = useProgramContext();
  const {
    refreshKey,
    selectedPlace,
    selectedStructure,
  } = useStructuresContext();
  const [structure, setStructure] = useState<ProgramStructure | null>(null);
  const [loadedNode, setLoadedNode] = useState<ProgramTreeNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<ProgramTreeNode | null>(null);
  const [fromPos, setFromPos] = useState(INITIAL_FROM_POS);
  const [isStructureLoading, setIsStructureLoading] = useState(false);
  const [isTreeLoading, setIsTreeLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStructure(null);

    if (!marketingAddress) {
      setIsStructureLoading(false);
      return;
    }

    setIsStructureLoading(true);
    void getStructure(marketingAddress, selectedStructure)
      .then((response) => {
        if (!cancelled) setStructure(response);
      })
      .finally(() => {
        if (!cancelled) setIsStructureLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [marketingAddress, selectedStructure]);

  const structureWidth = structure?.width;
  const unlimitedWidth = structureWidth === 0;
  const toPos = useMemo(() => {
    if (structureWidth !== undefined && structureWidth !== 0) {
      return structureWidth;
    }
    return fromPos + UNLIMITED_PAGE_SIZE - 1;
  }, [fromPos, structureWidth]);

  useEffect(() => {
    setFromPos(INITIAL_FROM_POS);
  }, [selectedPlace, selectedStructure]);

  useEffect(() => {
    let cancelled = false;
    setLoadedNode(null);
    setSelectedNode(null);
    setIsTreeLoading(false);

    if (!marketingAddress || !currentProfile || !selectedPlace || !structure) return;

    setIsTreeLoading(true);
    void getTree(
      marketingAddress,
      selectedStructure,
      selectedPlace.profile_addr,
      selectedPlace.place_number,
      currentProfile.address,
      wallet || null,
      fromPos,
      toPos,
    )
      .then((response) => {
        if (cancelled) return;
        setLoadedNode(response);
        setSelectedNode(response);
      })
      .finally(() => {
        if (!cancelled) setIsTreeLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    fromPos,
    currentProfile,
    marketingAddress,
    refreshKey,
    selectedPlace,
    selectedStructure,
    structure,
    toPos,
    wallet,
  ]);

  return (
    <div className="matrix-row structure-row--layout">
      <div>
        {unlimitedWidth && selectedPlace && (
          <div className="tree-range-controls">
            <button
              type="button"
              className="tree-range-button"
              onClick={() =>
                setFromPos((value) =>
                  Math.max(INITIAL_FROM_POS, value - UNLIMITED_PAGE_SIZE),
                )
              }
              disabled={fromPos === INITIAL_FROM_POS}
            >
              {t("structure.previousPositions", "Left")}
            </button>
            <span className="tree-range-label">
              {fromPos} - {toPos}
            </span>
            <button
              type="button"
              className="tree-range-button"
              onClick={() =>
                setFromPos((value) => value + UNLIMITED_PAGE_SIZE)
              }
            >
              {t("structure.nextPositions", "Right")}
            </button>
          </div>
        )}
        <Grid
          isLoading={isTreeLoading || isStructureLoading}
          node={selectedPlace ? loadedNode : null}
          placeholderConfig={selectedPlace ? undefined : structure ?? undefined}
          onSelect={setSelectedNode}
        />
      </div>
      <Details selectedNode={selectedNode} structure={structure} />
    </div>
  );
}
