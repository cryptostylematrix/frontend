import "./header.css";
import logo from "../../assets/logo.png";
import Lang from "./Lang";
import Social from "./Socials";
import TonConnect from "./TonConnect";
import Profiles from "./Profiles";

const Header: React.FC = () => {
  return (
    <header>
      <div className="header-container">
        <div className="header-left">
          {/* Use "/" instead of "index.html" for SPA routing */}
          <a href="/frontend" className="logo-link">
            <img src={logo} alt="Crypto Style Logo" className="logo-img" />
          </a>
        </div>

        <div className="header-center">
          <Social />
        </div>

        <div className="header-right">
          <Lang />
          <TonConnect />
          <Profiles />
        </div>
      </div>
    </header>
  );
};

export default Header;