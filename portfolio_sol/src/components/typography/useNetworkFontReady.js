import { useEffect, useState } from "react";

export const NETWORK_FONT_REQUEST = '400 1em "Network Free"';

export function useNetworkFontReady() {
  const [ready, setReady] = useState(
    () => typeof document === "undefined" || !document.fonts?.load,
  );

  useEffect(() => {
    if (!document.fonts?.load) {
      return undefined;
    }

    let active = true;
    const finish = () => {
      if (active) setReady(true);
    };

    document.fonts.load(NETWORK_FONT_REQUEST).then(finish, finish);

    return () => {
      active = false;
    };
  }, []);

  return ready;
}
