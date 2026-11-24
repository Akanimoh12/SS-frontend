/** Wallet-specific network switching steps (#610). Pure content, no I/O. */

import type { WalletKind } from "@/lib/stellar";

/** xBull is included as informational content; the app itself supports only Freighter and Albedo. */
export type GuideWallet = WalletKind | "xbull";

export interface NetworkGuideStep {
  step: number;
  text: string;
}

export interface NetworkGuide {
  wallet: GuideWallet;
  title: string;
  steps: NetworkGuideStep[];
  note?: string;
}

const NETWORK_GUIDES: Record<GuideWallet, NetworkGuide> = {
  freighter: {
    wallet: "freighter",
    title: "Switch network in Freighter",
    steps: [
      { step: 1, text: "Open the Freighter browser extension." },
      { step: 2, text: "Click the network selector at the top of the extension." },
      { step: 3, text: "Choose the network shown in the banner above." },
      { step: 4, text: "Return to this page. The banner clears automatically once your wallet reconnects." },
    ],
  },
  albedo: {
    wallet: "albedo",
    title: "Switch network in Albedo",
    steps: [
      { step: 1, text: "Open the Albedo browser extension." },
      { step: 2, text: "Open Albedo settings and select Network." },
      { step: 3, text: "Pick the network shown in the banner above and save." },
      { step: 4, text: "Return to this page. We detect the change and clear the banner for you." },
    ],
  },
  xbull: {
    wallet: "xbull",
    title: "Switch network in xBull",
    note: "xBull is not currently a supported wallet. These steps are provided for reference only.",
    steps: [
      { step: 1, text: "Open the xBull browser extension." },
      { step: 2, text: "Click the current network name in the extension header." },
      { step: 3, text: "Select the network shown in the banner above." },
      { step: 4, text: "Reconnect your wallet to this site." },
    ],
  },
};

const GENERIC_GUIDE: NetworkGuide = {
  wallet: "freighter",
  title: "Switch your wallet network",
  steps: [
    { step: 1, text: "Open your Stellar wallet extension." },
    { step: 2, text: "Find the network selector and choose the network shown in the banner above." },
    { step: 3, text: "Return to this page. The banner clears once your wallet reports the matching network." },
  ],
};

/** Returns the guide for a connected wallet, or a neutral guide when none is known. */
export function getNetworkGuide(wallet: GuideWallet | null): NetworkGuide {
  if (!wallet) return GENERIC_GUIDE;
  return NETWORK_GUIDES[wallet];
}
