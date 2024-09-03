import { config } from "@/lib/wallet-connect/config";
import { NFT_SOULBOUND_ABI, NFT_SOULBOUND_ADDRESS } from "@/utils/veenox";
import axios from "axios";
import { useCallback, useState } from "react";
import { simulateContract, writeContract } from "viem/actions";
import { useAccount, useClient, useWalletClient } from "wagmi";

const JWT = "..";
const contractAddress = NFT_SOULBOUND_ADDRESS;

export const useTradePosterContract = () => {
  const { address, chain } = useAccount();
  const [isMintLoading, setIsMintLoading] = useState(false);
  const [isMintSuccess, setIsMintSuccess] = useState(false);
  const [mintError, setMintError] = useState(null);
  const publicClient = useClient({ config });
  const walletClient = useWalletClient();

  console.log("publicClient", publicClient);
  const uploadImageToPinata = async (imageData) => {
    const formData = new FormData();
    const blob = await fetch(imageData).then((r) => r.blob());
    formData.append("file", blob, "tradePoster.png");

    const pinataMetadata = JSON.stringify({
      name: "Trade Poster",
    });
    formData.append("pinataMetadata", pinataMetadata);

    const pinataOptions = JSON.stringify({
      cidVersion: 0,
    });
    formData.append("pinataOptions", pinataOptions);

    try {
      const res = await axios.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        formData,
        {
          maxBodyLength: "Infinity",
          headers: {
            "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
            Authorization: `Bearer ${JWT}`,
          },
        }
      );
      return res.data.IpfsHash;
    } catch (error) {
      console.log("Erreur lors de l'upload de l'image sur Pinata:", error);
      throw error;
    }
  };

  const createMetadata = (imageCID, tradeData) => {
    return {
      name: `Trade Poster #${tradeData.id}`,
      description: "Un poster représentant un trade réussi",
      image: `ipfs://${imageCID}`,
      attributes: [
        { trait_type: "Paire de trading", value: tradeData.pair },
        { trait_type: "Profit", value: `${tradeData.profit}%` },
        { trait_type: "Date", value: tradeData.date },
      ],
    };
  };

  const mintToken = useCallback(
    async (imageData, tradeData) => {
      if (!walletClient || !address) {
        throw new Error("Client or address not properly initialized");
      }

      setIsMintLoading(true);
      setMintError(null);

      try {
        const imageCID = await uploadImageToPinata(imageData);
        const metadata = createMetadata(imageCID, tradeData);

        const metadataRes = await axios.post(
          "https://api.pinata.cloud/pinning/pinJSONToIPFS",
          metadata,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${JWT}`,
            },
          }
        );
        const tokenURI = `ipfs://${metadataRes.data.IpfsHash}`;
        const { request } = await simulateContract(publicClient, {
          account: address,
          address: "0xd8b934580fcE35a11B58C6D73aDeE468a2833fa8",
          abi: NFT_SOULBOUND_ABI,
          functionName: "mintTradePoster",
          args: [address, tokenURI],
        });
        await writeContract(publicClient, request);

        console.log("transaction", transaction);
        const receipt = await transaction.wait();
        setIsMintSuccess(true);
        return receipt;
      } catch (error) {
        console.log("Erreur lors du minting:", error);
        setMintError(error);
        throw error;
      } finally {
        setIsMintLoading(false);
      }
    },
    [address, walletClient]
  );

  return {
    mintToken,
    isMintLoading,
    isMintSuccess,
    mintError,
  };
};
