import React from "react";
import "./socials.css";

type Social = {
  href: string;
  label: string;
  icon: "telegramNews" | "telegramCommunity" | "youtube";
};

const socials: Social[] = [
  {
    href: "https://t.me/CryptoStyleMatrixNews",
    label: "Telegram news",
    icon: "telegramNews",
  },
  {
    href: "https://t.me/CryptoStyleMatrixbot",
    label: "Telegram group",
    icon: "telegramCommunity",
  },
  {
    href: "https://www.youtube.com/@CryptoStyleOfficial",
    label: "YouTube",
    icon: "youtube",
  },
];

const Socials: React.FC = () => {
  const renderIcon = (icon: Social["icon"]) => {
    if (icon === "youtube") {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="social-icon youtube-icon"
          aria-hidden
        >
          <path d="M21.6 7.2s-.2-1.4-.8-2c-.7-.8-1.5-.8-1.8-.9C16.4 4 12 4 12 4h0s-4.4 0-7 .3c-.3 0-1.1 0-1.8.9-.6.6-.8 2-.8 2S2 8.9 2 10.6v1.6c0 1.7.2 3.4.2 3.4s.2 1.4.8 2c.7.8 1.6.7 2 .8 1.4.1 5.9.3 6.9.3.1 0 .2 0 .2 0s4.4 0 7-.3c.3 0 1.1 0 1.8-.8.6-.6.8-2 .8-2s.2-1.7.2-3.4v-1.6c0-1.7-.2-3.4-.2-3.4Zm-12 6.8V8l5.2 3-5.2 3Z" />
        </svg>
      );
    }

    if (icon === "telegramCommunity") {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="social-icon telegram-icon"
          aria-hidden
        >
          <path d="M7.5 12.5a3.5 3.5 0 1 1 3.06-1.795A3.5 3.5 0 0 1 7.5 12.5Zm9 0a3.5 3.5 0 1 1 3.06-1.795A3.5 3.5 0 0 1 16.5 12.5Z" />
          <path d="M3 18.5a4.5 4.5 0 1 1 9 0V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Zm11 0a4.5 4.5 0 1 1 9 0V19a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1Z" />
        </svg>
      );
    }

    // telegramNews
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="social-icon telegram-icon"
        aria-hidden
      >
        <path d="M9.999 15.2 9.91 15.29l-.006-.002-.187.184a.8.8 0 0 1-.502.211h-.007a.74.74 0 0 1-.252-.047c-.145-.053-.26-.161-.317-.297l-.002-.002L7.6 12.61l-2.447-.774a.5.5 0 0 1 .058-.967l13.8-4.5a.5.5 0 0 1 .643.594l-2.4 9.6a.5.5 0 0 1-.787.279L13.28 14.2l-2.4 1a.5.5 0 0 1-.639-.226l-.001-.002-.24-.472Z" />
      </svg>
    );
  };

  return (
    <div className="socials">
      {socials.map(({ href, label, icon }) => (
        <a
          key={href}
          className="social-block"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
        >
          {renderIcon(icon)}
        </a>
      ))}
    </div>
  );
};

export default Socials;
