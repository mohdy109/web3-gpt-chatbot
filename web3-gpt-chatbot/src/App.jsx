
import { useState, useEffect,useRef } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { use } from "react";
import Web3 from "web3";
import { formatWalletDataForEmbedding } from "./utils/formatData";
import styled from "styled-components";

const ALCHEMY_KEY = import.meta.env.VITE_ALCHEMY_API_KEY;
const Api = import.meta.env.VITE_BACKEND_API;

function App() {
  const [count, setCount] = useState(0);
  const [wallet, setWallet] = useState("");
  const [summary, setSummary] = useState("");
  const [ethBalance, setEthBalance] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const chatBoxRef = useRef(null);
  const [data, setData] = useState({
    nfts: [],
    tokens: [],
    transfers: [],
    votes: [],
  });
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");

  const askBot = async (customQuery = null) => {
    const finalQuery = customQuery || query;

    if (!finalQuery) return;

    setChatHistory((prev) => [...prev, { sender: "user", text: finalQuery }]);
    setQuery("");

    try {
      const res = await fetch(`${Api}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, query: finalQuery }),
      });

      const data = await res.json();
      const answer = data.answer || "I couldn't find any information about that.";
      
      setChatHistory((prev) => [...prev, { sender: "bot", text: answer }]);
      setResponse(answer);
    } catch (err) {
      console.error(err);
      setChatHistory((prev) => [...prev, { sender: "bot", text: "Sorry, I encountered an error processing your request." }]);
    }
  };

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [chatHistory]);


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

  const disconnectWallet = () => {
    setWallet("");
    setSummary("");
    setData({
      nfts: [],
      tokens: [],
      transfers: [],
      votes: [],
    });
    setQuery("");
    setResponse("");
    setChatHistory([]);
  };

  useEffect(() => {
    if (!wallet || !summary) return;

    const sendEmbedding = async () => {
      try {
        await fetch(`${Api}/embed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet, text: summary }),
        });
      } catch (err) {
        console.error("Embedding upload failed:", err);
      }
    };

    sendEmbedding();
  }, [summary]);

  const fetchWalletBalance = async () => {
    const res = await fetch(
      `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_getBalance",
          params: [wallet, "latest"],
          id: 1,
        }),
      }
    );

    const json = await res.json();
    const wei = parseInt(json.result, 16);
    const eth = wei / 1e18;
    setEthBalance(eth.toFixed(4));
  };

  useEffect(() => {
    if (!wallet) return;

    const fetchAlchemyData = async () => {
      const base = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;

      const fetchNFTs = fetch(`${base}/getNFTs/?owner=${wallet}`).then((res) =>
        res.json()
      );

      const fetchTokens = fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "alchemy_getTokenBalances",
          params: [wallet],
        }),
      }).then((res) => res.json());

      const fetchTransfers = fetch(base, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: 1,
          jsonrpc: "2.0",
          method: "alchemy_getAssetTransfers",
          params: [
            {
              fromAddress: wallet,
              category: ["external", "erc20", "erc721"],
              maxCount: "0xa",
              order: "desc",
            },
          ],
        }),
      }).then((res) => res.json());

      const [nfts, transfers, tokens] = await Promise.all([
        fetchNFTs,
        fetchTransfers,
        fetchTokens,
      ]);

      setData((prev) => ({
        ...prev,
        nfts,
        transfers,
        tokens: tokens.result,
      }));
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
      setData((prev) => ({ ...prev, votes: json.data?.votes || [] }));
    };

    fetchAlchemyData();
    fetchSnapshotVotes();
    fetchWalletBalance();
  }, [wallet]);

  useEffect(() => {
    if (!wallet || !data.nfts || !data.tokens || !data.transfers || !data.votes)
      return;
    const text = formatWalletDataForEmbedding({
      wallet,
      nfts: data.nfts,
      tokens: data.tokens,
      transfers: data.transfers,
      votes: data.votes,
    });

    setSummary(text);
    console.log(summary, "Summary");
  }, [wallet, data]);

  const presetQuestions = [
    "What NFTs do I own?",
    "How many tokens did I transfer last month?",
    "What DAOs did I vote in recently?",
    "What's my current ETH balance?",
    "What were my top 3 transactions in May?",
  ];

  const renderDataSection = (title, data, emptyMessage) => {
    return (
      <Section>
        <h2>{title}</h2>
        <Pre>
          {data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)
            ? JSON.stringify(data, null, 2)
            : emptyMessage}
        </Pre>
      </Section>
    );
  };

  

  return (
    <Container>
      <Centered>
        <h1 style={{ fontSize: "2rem", textAlign: "center" }}>
          🧠 GPT Web3 Chatbot
        </h1>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <Button onClick={connectWallet}>Connect MetaMask</Button>
          <Button onClick={disconnectWallet} bg="#dc2626" hover="#b91c1c">
            Disconnect Wallet
          </Button>
        </div>

        {wallet && (
          <p style={{ textAlign: "center", color: "#22c55e" }}>
            🔗 Connected Wallet:{" "}
            <span style={{ fontFamily: "monospace" }}>{wallet}</span>
          </p>
        )}

        {ethBalance && (
          <p style={{ textAlign: "center", color: "#facc15" }}>
            💵 ETH Balance: {ethBalance} ETH
          </p>
        )}

        {renderDataSection("🖼️ NFTs", data.nfts, "No NFTs found in this wallet.")}
        {renderDataSection("🔁 Transfers", data.transfers, "No transfer history found.")}
        {renderDataSection("🗳️ DAO Votes", data.votes, "No DAO votes found for this wallet.")}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.75rem",
          }}
        >
          {presetQuestions.map((q, i) => (
            <QuestionButton key={i} onClick={() => askBot(q)}>
              💬 {q}
            </QuestionButton>
          ))}
        </div>

        <ChatBox ref={chatBoxRef} >
          {chatHistory.length > 0 ? (
            chatHistory.map((entry, idx) => (
              <ChatBubble key={idx} isUser={entry.sender === "user"}>
                <strong>{entry.sender === "user" ? "🧑 You" : "🤖 Bot"}: </strong>
                {entry.text}
              </ChatBubble>
            ))
          ) : (
            <EmptyChatMessage>Your chat history will appear here</EmptyChatMessage>
          )}
        </ChatBox>

        <div>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && askBot()}
            placeholder="Ask: What did I vote for last month?"
          />
          <Button
            onClick={() => askBot()}
            bg="#059669"
            hover="#047857"
            style={{ width: "100%", marginTop: "0.5rem" }}
          >
            Ask
          </Button>
        </div>
      </Centered>
    </Container>
  );
}

const Container = styled.div`
  min-height: 100vh;
  background: #111827;
  color: white;
  padding: 2rem;
  font-family: sans-serif;
`;

const Centered = styled.div`
  max-width: 768px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const Button = styled.button`
  padding: 0.5rem 1.2rem;
  border-radius: 0.375rem;
  font-weight: bold;
  background: ${(props) => props.bg || "#2563eb"};
  color: white;
  cursor: pointer;
  &:hover {
    background: ${(props) => props.hover || "#1d4ed8"};
  }
`;

const Section = styled.div`
  background: #1f2937;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
`;

const Pre = styled.pre`
  font-size: 0.875rem;
  white-space: pre-wrap;
  background-color: #0f172a;
  color: #d1d5db;
  border: 1px solid #334155;
  border-radius: 0.5rem;
  padding: 1rem;
  overflow-x: auto;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
  font-family: "Fira Code", "Courier New", monospace;
  line-height: 1.5;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 0.5rem;
  color: white;
  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const QuestionButton = styled.button`
  background: #374151;
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  text-align: left;
  color: white;
  &:hover {
    background: #4b5563;
  }
`;

const ChatBox = styled.div`
  background: #1f2937;
  padding: 1rem;
  border-radius: 0.5rem;
  margin-top: 1rem;
  height: 300px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  /* Ensure smooth scrolling */
  scroll-behavior: smooth;
`;
const ChatBubble = styled.div`
  background: ${({ isUser }) => (isUser ? "#374151" : "#334155")};
  padding: 0.75rem 1rem;
  border-radius: ${({ isUser }) => 
    isUser ? "0.5rem 0.5rem 0 0.5rem" : "0.5rem 0.5rem 0.5rem 0"};
  color: white;
  align-self: ${({ isUser }) => (isUser ? "flex-end" : "flex-start")};
  max-width: 75%;
  white-space: pre-wrap;
  word-break: break-word;
`;

const EmptyChatMessage = styled.div`
  color: #9ca3af;
  text-align: center;
  padding: 1rem;
`;

export default App;