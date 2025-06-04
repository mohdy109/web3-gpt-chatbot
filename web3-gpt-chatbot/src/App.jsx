import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { use } from "react";
import Web3 from "web3";
import { formatWalletDataForEmbedding } from "./utils/formatData";

const ALCHEMY_KEY = import.meta.env.VITE_ALCHEMY_API_KEY;

function App() {
  const [count, setCount] = useState(0);
  const [wallet, setWallet] = useState("");
  const [summary, setSummary] = useState("");
  const [data, setData] = useState({
    nfts: [],
    tokens: [],
    transfers: [],
    votes: [],
  });
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");


  const askBot = async () => {
    const res = await fetch("http://localhost:5000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet, query }),
    });

    const data = await res.json();
    setResponse(data.answer);
  };


  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setWallet(accounts[0]);
      } catch (error) {
        console.error("User rejected request");
      }
    } else {
      alert("MetaMask not found");
    }
  };

  useEffect(() => {
    if (!wallet) return;

    const fetchAlchemyData = async () => {
      const base = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;

      const [nfts, tokens, transfers] = await Promise.all([
        fetch(`${base}/getNFTs/?owner=${wallet}`).then((res) => res.json()),
        fetch(`${base}/getTokenBalances?address=${wallet}`).then((res) =>
          res.json()
        ),
        fetch(
          `${base}/getAssetTransfers?fromAddress=${wallet}&category=external,erc20,erc721&maxCount=10`
        ).then((res) => res.json()),
      ]);

      setData((prev) => ({ ...prev, nfts, tokens, transfers }));
    };

    const fetchSnapshotVotes = async () => {
      const SNAPSHOT_GRAPHQL = "https://hub.snapshot.org/graphql";

      const query = {
        query: `
          query {
            votes(where: {voter: "${wallet.toLowerCase()}"}) {
              id
              proposal {
                title
                choices
                end
              }
              choice
              created
            }
          }
        `,
      };

      const res = await fetch(SNAPSHOT_GRAPHQL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(query),
      });

      const json = await res.json();
      setData((prev) => ({ ...prev, votes: json.data.votes }));
    };

    fetchAlchemyData();
    fetchSnapshotVotes();
  }, [wallet]);



  useEffect(() => {
    if (!wallet || !data.nfts || !data.tokens || !data.transfers || !data.votes) return;
    const text = formatWalletDataForEmbedding({
      wallet,
      nfts: data.nfts,
      tokens: data.tokens,
      transfers: data.transfers,
      votes: data.votes
    })

    setSummary(text);
    console.log(summary, "Summary")
  }, [])

  return (
    <div className="App">
      <h1>GPT Web3 Chatbot</h1>
      <button onClick={connectWallet}>Connect MetaMask</button>
      {wallet && <p>🔗 Connected Wallet: {wallet}</p>}

      <h2>🖼️ NFTs</h2>
      <pre>{JSON.stringify(data.nfts, null, 2)}</pre>

      <h2>💰 Token Balances</h2>
      <pre>{JSON.stringify(data.tokens, null, 2)}</pre>

      <h2>🔁 Transfers</h2>
      <pre>{JSON.stringify(data.transfers, null, 2)}</pre>

      <h2>🗳️ DAO Votes (Snapshot)</h2>
      <pre>{JSON.stringify(data.votes, null, 2)}</pre>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask: What did I vote for last month?"
      />
      <button onClick={askBot}>Ask</button>
      <p>🤖 Response: {response}</p>
    </div>
  );
}

export default App;
