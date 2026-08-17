const ENGLISH_YOUTUBE_CHANNEL =
  "https://www.youtube.com/@CryptoStyleOfficial-EN";

const YOUTUBE_CHANNELS: Record<string, string> = {
  ru: "https://www.youtube.com/@CryptoStyleOfficial",
  hu: "https://www.youtube.com/@CryptoStyleOfficial-HU",
  pt: "https://www.youtube.com/@CryptoStyleOfficial-PT",
  kk: "https://www.youtube.com/@CryptoStyleOfficial-KK",
  fr: "https://www.youtube.com/@CryptoStyleOfficial-FR",
  it: "https://www.youtube.com/@CryptoStyleOfficial-IT",
  en: ENGLISH_YOUTUBE_CHANNEL,
  de: "https://www.youtube.com/@CryptoStyleOfficial-DE",
  pl: "https://www.youtube.com/@CryptoStyleOfficial-PL",
  uk: "https://www.youtube.com/@CryptoStyleOfficial-UA",
  es: "https://www.youtube.com/@CryptoStyleOfficial-ES",
};

export function getYoutubeChannel(language: string | undefined): string {
  const normalizedLanguage = (language ?? "en")
    .trim()
    .toLowerCase()
    .split(/[-_]/)[0];
  return YOUTUBE_CHANNELS[normalizedLanguage] ?? ENGLISH_YOUTUBE_CHANNEL;
}
