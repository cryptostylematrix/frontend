
import { useContext } from "react";
import MultiMatrixFilters from "../../components/multi/matrixes/filters/MultiMatrixFilters";
import MultiMatrixBreadCrumbs from "../../components/multi/matrixes/MultiMatrixBreadCrumbs";
import MultiMatrixTree from "../../components/multi/matrixes/MultiMatrixTree";
import ProfileStatusBlock from "../../components/ProfileStatusBlock";
import { WalletContext } from "../../App";
import { useProfileContext } from "../../context/ProfileContext";
import { MatrixProvider } from "../../context/MatrixContext";

export default function MultiMatrixes() {
  const { wallet } = useContext(WalletContext)!;
  const { currentProfile } = useProfileContext();

  if (!wallet) {
    return <ProfileStatusBlock type="wallet" />;
  }

  if (!currentProfile) {
    return <ProfileStatusBlock type="profile" />;
  }

  return (
    <MatrixProvider>
      <section className="multi-matrixes">
        <MultiMatrixFilters />
        <MultiMatrixBreadCrumbs />
        <MultiMatrixTree />
      </section>
    </MatrixProvider>
  );
}
