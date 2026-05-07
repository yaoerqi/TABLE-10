import type { Locale } from "@/lib/i18n/locale";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";
import type { DbItem } from "@/lib/supabase/types";

const SEED_AUCTION_ID = "seed-auction-demo";

export function isSeedAuctionItemId(id: string): boolean {
  return id === SEED_AUCTION_ID;
}

export type AuctionBidRow = {
  id: string;
  amount: number;
  created_at: string;
  bidder_id: string;
  nickname: string;
  avatar_url: string | null;
};

/** Local-only demo seed card for the Auction tab (no Supabase writes). */
export function getSeedAuctionItem(locale: Locale = DEFAULT_LOCALE): DbItem {
  const end = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  return {
    id: SEED_AUCTION_ID,
    seller_id: "seed-seller",
    title: translate(locale, "demo.seedAuctionTitle"),
    description: translate(locale, "demo.seedAuctionDesc"),
    price: 320,
    category: "数码",
    images_array: [
      "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80"
    ],
    meetup_location: "图书馆正门阶前｜Main Library Gate",
    status: "available",
    is_auction: true,
    auction_start_price: 320,
    auction_current_price: 380,
    auction_end_at: end,
    auction_step: 10,
    auction_high_bidder_id: "seed-bidder-demo"
  };
}

export function getSeedAuctionBids(locale: Locale = DEFAULT_LOCALE): AuctionBidRow[] {
  return [
    {
      id: "sb1",
      amount: 380,
      created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      bidder_id: "seed-bidder-demo",
      nickname: translate(locale, "demo.bidderDemo"),
      avatar_url: "https://i.pravatar.cc/96?img=11"
    },
    {
      id: "sb2",
      amount: 360,
      created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      bidder_id: "u2",
      nickname: `${translate(locale, "demo.peerPrefix")}042`,
      avatar_url: "https://i.pravatar.cc/96?img=22"
    },
    {
      id: "sb3",
      amount: 340,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      bidder_id: "u3",
      nickname: `${translate(locale, "demo.peerPrefix")}108`,
      avatar_url: "https://i.pravatar.cc/96?img=33"
    }
  ];
}
