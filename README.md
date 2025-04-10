# 🧭 Tiny Adventure - Solana Blockchain Game

A fun, secure, and math-driven grid-based game built on the Solana blockchain using React, Anchor, and Vite.

---

## 🧩 About the Project

**Tiny Adventure** is a decentralized GameFi project where players navigate a 10x10 grid from `(0,0)` to `(9,9)` with the fewest moves possible. This project tackles the real-world problem of **lack of transparency and trust in online games**.

By leveraging blockchain technology, all gameplay mechanics and rewards are **verifiable, transparent, and secure**—ensuring no fraud or manipulation.

---

### 🔑 Key Features

- ✅ **Secure blockchain game** – Every move and reward is verified and stored on-chain, eliminating any misuse or fraud.
- 📐 **Math-driven rewards** – Calculations are based on distance, optimal path, and player effort.
- 🧠 **Dijkstra's Algorithm** – Used to calculate and validate the shortest path for fair scoring.
- 📊 **Coordinate geometry logic** – Applied for movement, validation, and distance calculations.
- 🎮 **Amazing and stunning UI** – Built with smooth animations and pixel-art styled aesthetics.
- 🎵 **Gaming feel with background music** – Sound integration to create an immersive game experience.

---

## 🛠 My Experience

This project pushed me to grow as a blockchain developer and full-stack engineer. I faced and solved:

- ⚙️ **Anchor & CLI version mismatches** – Fixed by reinstalling WSL and managing version control.
- 🧪 **Writing test cases** – Learned to simulate user behavior and assert blockchain state changes.
- 🔗 **Connecting frontend to Solana** – Used Anchor IDL and `@solana/web3.js` for seamless interaction.
- 📉 **Gas optimization** – Refactored logic to stay within compute limits of Solana programs.

---

## 🧰 Tech Stack

- 🧱 **Solana Blockchain**
- 🧠 **Anchor Framework** (v0.29.0)
- ⚛️ **React + Vite** (Frontend)
- 💡 **TypeScript**
- 🎨 **TailwindCSS** (UI)
- 🎵 **Howler.js** (for background music)

---

---

## ⚙️ Prerequisites

Ensure the following are installed before you begin:

- 🟢 [Node.js](https://nodejs.org/en/) `v18.x`
- 🦀 [Rust](https://www.rust-lang.org/) `>=1.70`
- 🪙 [Solana CLI](https://docs.solana.com/cli/install-solana-cli) `v1.18.x`
- 🧭 [Anchor CLI](https://book.anchor-lang.com/getting_started/installation.html) `v0.29.0`
- 🧶 [Yarn](https://classic.yarnpkg.com/lang/en/docs/install/)

---

## 💻 How to Clone & Run Locally

```bash
# Clone the repo
git clone https://github.com/yourusername/tiny-adventure.git
cd tiny-adventure

# Install frontend
yarn install
yarn dev

# Setup backend
cd ../contracts/tiny_adventure
anchor build
anchor test

# Optional: Run a local validator
solana-test-validator
```
---

## 🌐 Live Demo

🕹️ [Try the Game Live](https://tiny-adventure-sandy.vercel.app/)

---

## 🤝 Collaboration & Future Scope

I’m open to **collaborations, issues, and pull requests**! Feel free to contribute.

### 🔮 What’s Next?

- 🧝 Character NFTs and skins  
- 💰 Token-based rewards and marketplace  
- 🏆 Leaderboards and on-chain player stats  
- 🤖 AI-based hint system  
- 🎮 Multiplayer mode with wallet-linked battles  

---

⭐ If you liked this project, leave a star and let’s connect!

---
