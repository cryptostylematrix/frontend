import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, createContext } from "react";

import Home from "./pages/Home";
import Profile from "./pages/profile/Profile";
import AddProfile from "./pages/profile/AddProfile";
import CreateProfile from "./pages/profile/CreateProfile";
import UpdateProfile from "./pages/profile/UpdateProfile";
import Finance from "./pages/Finance";
import Multi from "./pages/Multi";

import Header from "./components/header/Header";
import Footer from "./components/Footer";
import Navigation from "./components/Navigation";

import { ProfileProvider } from "./context/ProfileContext";
import { useTonConnectUI } from "@tonconnect/ui-react";

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
        <BrowserRouter>
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
                <Route path="/multi" element={<Multi />} />
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
