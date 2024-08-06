import { MarketTradesFetchProps } from "@/models";

export const fetchMarketTrades = async (symbol: string) => {
  const query = await fetch(
    `https://api-evm.orderly.org/v1/public/market_trades?symbol=${symbol}`
  );
  const response: MarketTradesFetchProps = await query.json();
  return response?.data?.rows || [];
};
