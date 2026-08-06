import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, createContext } from "react";

import Home from "./pages/Home";
import Profile from "./pages/profile/Profile";
import AddProfile from "./pages/profile/AddProfile";
import CreateProfile from "./pages/profile/CreateProfile";
import UpdateProfile from "./pages/profile/UpdateProfile";
import Finance from "./pages/Finance";
import Multi from "./pages/multi/Multi";
import Neo from "./pages/neo/Neo";

import Header from "./components/header/Header";
import Footer from "./components/Footer";
import Navigation from "./components/Navigation";

import { ProfileProvider } from "./context/ProfileContext";
import { useTonConnectUI } from "@tonconnect/ui-react";
import MultiInviter from "./pages/multi/MultiInviter";
import MultiStructure from "./pages/multi/MultiStructure";
import MultiMatrixes from "./pages/multi/MultiMatrixes";
import MultiMarketing from "./pages/multi/MultiMarketing";
import MultiStat from "./pages/multi/MultiStat";
import NeoInviter from "./pages/neo/NeoInviter";
import NeoStructure from "./pages/neo/NeoStructure";
import NeoMatrixes from "./pages/neo/NeoMatrixes";
import NeoMarketing from "./pages/neo/NeoMarketing";
import NeoStat from "./pages/neo/NeoStat";
import Programs from "./pages/programs/Programs";
import ProgramReferrals from "./pages/programs/ProgramReferrals";
import ProgramInviter from "./pages/programs/ProgramInviter";
import ProgramStat from "./pages/programs/ProgramStat";
import ProgramStructures from "./pages/programs/ProgramStructures";
import ProgramMarketing from "./pages/programs/ProgramMarketing";

/**
 * Wallet context shared globally
 */
export interface WalletContextType {
  wallet: string;
  setWallet: React.Dispatch<React.SetStateAction<string>>;
}

export const WalletContext = createContext<WalletContextType | undefined>(undefined);

function App() {
  const [wallet, setWallet] = useState("");
  const [tonConnectUI] = useTonConnectUI();

  return (
    <WalletContext.Provider value={{ wallet, setWallet }}>
      <ProfileProvider wallet={wallet} tonConnectUI={tonConnectUI}>
        <BrowserRouter basename="/frontend">
          <Header />
          <Navigation />

          <main>
            <div className="content-container">
              <Routes>
                <Route path="/" element={<Home />} />

                <Route path="/profile" element={<Profile />}>
                  {/* Redirect /profile → /profile/update by default */}
                  <Route index element={<Navigate to="update" replace />} />
                  <Route path="update" element={<UpdateProfile />} />
                  <Route path="add" element={<AddProfile />} />
                  <Route path="create" element={<CreateProfile />} />
                </Route>

                <Route path="/finance" element={<Finance />} />

                <Route path="/programs/:marketingAddress" element={<Programs />}>
                  <Route index element={<Navigate to="inviter" replace />} />
                  <Route path="referrals" element={<ProgramReferrals />} />
                  <Route path="inviter" element={<ProgramInviter />} />
                  <Route path="stat" element={<ProgramStat />} />
                  <Route path="structures" element={<ProgramStructures />} />
                  <Route path="marketing" element={<ProgramMarketing />} />
                </Route>
                
                <Route path="/multi" element={<Multi />}>
                  <Route index element={<Navigate to="inviter" replace />} />
                  <Route path="inviter" element={<MultiInviter />} />
                  <Route path="structure" element={< MultiStructure />} />
                  <Route path="matrixes" element={<MultiMatrixes />} />
                  <Route path="marketing" element={<MultiMarketing />} />
                  <Route path="stat" element={<MultiStat />} />
                </Route>

                <Route path="/neo" element={<Neo />}>
                  <Route index element={<Navigate to="inviter" replace />} />
                  <Route path="inviter" element={<NeoInviter />} />
                  <Route path="structure" element={<NeoStructure />} />
                  <Route path="matrixes" element={<NeoMatrixes />} />
                  <Route path="marketing" element={<NeoMarketing />} />
                  <Route path="stat" element={<NeoStat />} />
                </Route>
              </Routes>
            </div>
          </main>

          <Footer />
        </BrowserRouter>
      </ProfileProvider>
    </WalletContext.Provider>
  );
}

export default App;
