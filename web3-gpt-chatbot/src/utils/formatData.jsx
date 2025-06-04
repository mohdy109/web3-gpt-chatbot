export const formatWalletDataForEmbedding = ({ wallet, nfts, tokens, transfers, votes }) => {
    let summary = `Wallet Address: ${wallet}\n\n`;
  
    // NFTs
    summary += `--- NFTs Owned ---\n`;
    if (nfts?.ownedNfts?.length) {
      nfts.ownedNfts.slice(0, 5).forEach((nft, idx) => {
        summary += `${idx + 1}. ${nft.title || "Unnamed NFT"} from ${nft.contract.address}\n`;
      });
    } else {
      summary += "No NFTs found.\n";
    }
  
    // Tokens
    summary += `\n--- Token Balances ---\n`;
    if (tokens?.tokenBalances?.length) {
      tokens.tokenBalances.slice(0, 5).forEach((token, idx) => {
        summary += `${idx + 1}. Token at ${token.contractAddress} - balance: ${token.tokenBalance}\n`;
      });
    } else {
      summary += "No tokens found.\n";
    }
  
    // Transfers
    summary += `\n--- Recent Transfers ---\n`;
    if (transfers?.transfers?.length) {
      transfers.transfers.forEach((tx, idx) => {
        summary += `${idx + 1}. ${tx.category} transfer of ${tx.value || "?"} from ${tx.from} to ${tx.to}\n`;
      });
    } else {
      summary += "No transfers found.\n";
    }
  
    // Votes
    summary += `\n--- DAO Votes ---\n`;
    if (votes?.length) {
      votes.slice(0, 5).forEach((vote, idx) => {
        const choice =
          Array.isArray(vote.proposal.choices) && vote.choice
            ? vote.proposal.choices[vote.choice - 1]
            : "Unknown";
        summary += `${idx + 1}. Voted '${choice}' on '${vote.proposal.title}'\n`;
      });
    } else {
      summary += "No DAO votes found.\n";
    }
  
    return summary;
  };