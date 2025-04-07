import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSound from 'use-sound';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Trophy, Wallet, User, Crown, Volume2, VolumeX, Coins, RotateCw } from 'lucide-react';
import * as web3 from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Program, AnchorProvider, BN } from '@project-serum/anchor';
import idl from './idl.json';
import bgMusic from './assets/bg.mp3';
import buttonSound from './assets/button.mp3';
import bonusSound from './assets/bonus.mp3';

// Game constants
const GRID_SIZE = 10;
const CELL_SIZE = 48;
const GAP_SIZE = 2;

// Solana constants
const PROGRAM_ID = new web3.PublicKey('8qfd4NkZW8fPQE4uaqLB1xoFh2fcVU7ShTKbRqmrqZ1G');
const NETWORK = web3.clusterApiUrl('devnet');
const opts = {
  preflightCommitment: 'processed' as web3.Commitment,
};

// Direction constants
const DIRECTIONS = {
  UP: 0,
  DOWN: 1,
  LEFT: 2,
  RIGHT: 3,
};

interface Position {
  x: number;
  y: number;
}

interface QuestPosition {
  x: number;
  y: number;
}

function App() {
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [moves, setMoves] = useState<number>(0);
  const [gameComplete, setGameComplete] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [bestScore] = useState<number>(
    parseInt(localStorage.getItem('bestScore') || '0')
  );
  const [questPositions, setQuestPositions] = useState<QuestPosition[]>([]);
  const [solBalance, setSolBalance] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [program, setProgram] = useState<Program | null>(null);
  const [provider, setProvider] = useState<AnchorProvider | null>(null);
  const [gameAccount, setGameAccount] = useState<web3.PublicKey | null>(null);
  const [questAccount, setQuestAccount] = useState<web3.PublicKey | null>(null);
  const [treasureAccount, setTreasureAccount] = useState<web3.PublicKey | null>(null);
  const wallet = useAnchorWallet();


  // Sound effects
  const [playMove] = useSound(buttonSound, {
    volume: isMuted ? 0 : 0.5
  });
  const [playWin] = useSound(bonusSound, {
    volume: isMuted ? 0 : 0.7
  });
  const [playError] = useSound(buttonSound, {
    volume: isMuted ? 0 : 0.5
  });
  const [playCoin] = useSound(bonusSound, {
    volume: isMuted ? 0 : 0.5
  });

  // Background music
  const [playBgMusic, { stop: stopBgMusic }] = useSound(bgMusic, {
    volume: isMuted ? 0 : 0.3,
    loop: true,
  });
  // Initialize Solana connection
  useEffect(() => {
    if (wallet) {
      const connection = new web3.Connection(NETWORK, opts.preflightCommitment);
      const provider = new AnchorProvider(
        connection,
        wallet,
        opts
      );

      // Set the provider globally
      anchor.setProvider(provider);

      // Get the program
      const program = new anchor.Program(idl as anchor.Idl, PROGRAM_ID, provider);

      setProvider(provider);
      setProgram(program);

      // Get the PDA for the game account
      const [gameAccount] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("tiny_adventurev2"), wallet.publicKey.toBuffer()],
        program.programId
      );

      const [questAccount] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("questv2"), wallet.publicKey.toBuffer()],
        program.programId
      );

      const [treasureAccount] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("treasurev2")],
        program.programId
      );

      setGameAccount(gameAccount);
      setQuestAccount(questAccount);
      setTreasureAccount(treasureAccount);

      // Check if accounts already exist and fetch data
      checkIfGameExists(program, gameAccount, questAccount);

      // Get wallet balance
      fetchWalletBalance(connection, wallet.publicKey);
    }
  }, [wallet]);

  // Check if game exists
  const checkIfGameExists = async (program: Program, gameAccount: web3.PublicKey, questAccount: web3.PublicKey) => {
    try {
      setIsLoading(true);
      const gameState = await program.account.game.fetch(gameAccount) as { x: number; y: number; movesTaken: number };
      const questState = await program.account.quest.fetch(questAccount);

      // Game exists, update UI with current state
      setPosition({ x: gameState.x as number, y: gameState.y as number });
      setMoves(gameState.movesTaken as number);
      setQuestPositions(questState.positions as QuestPosition[]);
      setIsInitialized(true);

      console.log("Game state loaded:", gameState);
      console.log("Quest positions:", questState.positions);
    } catch (err) {
      console.log("Game not initialized yet:", err);
      setIsInitialized(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize game on Solana
  const initializeGame = async () => {
    if (!program || !wallet || !gameAccount || !questAccount || !treasureAccount) return;

    try {
      setIsLoading(true);
      const tx = await program.methods
        .initialize()
        .accounts({
          gameAccount,
          questAccount,
          treasureAccount,
          signer: wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      console.log("Game initialized. Transaction signature:", tx);

      // Fetch updated game state
      const gameState = await program.account.game.fetch(gameAccount) as { x: number; y: number; movesTaken: number };
      const questState = await program.account.quest.fetch(questAccount);

      setPosition({ x: gameState.x as number, y: gameState.y as number });
      setMoves(gameState.movesTaken);
      setQuestPositions(questState.positions as QuestPosition[]);
      setIsInitialized(true);
    } catch (err) {
      console.error("Error initializing game:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset game on Solana
  const resetGame = async () => {
    if (!program || !wallet || !gameAccount || !questAccount) return;

    try {
      setIsLoading(true);
      const tx = await program.methods
        .reset()
        .accounts({
          gameAccount,
          questAccount,
          signer: wallet.publicKey,
        })
        .rpc();

      console.log("Game reset. Transaction signature:", tx);

      // Fetch updated game state
      const gameState = await program.account.game.fetch(gameAccount) as { x: number; y: number; movesTaken: number };
      const questState = await program.account.quest.fetch(questAccount);

      setPosition({ x: gameState.x as number, y: gameState.y as number });
      setMoves(gameState.movesTaken);
      setQuestPositions(questState.positions as QuestPosition[]);
      setGameComplete(false);
    } catch (err) {
      console.error("Error resetting game:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Deposit SOL to the treasure account
  const depositSol = async (amount: number) => {
    if (!program || !wallet || !treasureAccount) return;

    try {
      setIsLoading(true);
      const lamports = new BN(amount * web3.LAMPORTS_PER_SOL);

      const tx = await program.methods
        .depositSol(lamports)
        .accounts({
          owner: wallet.publicKey,
          treasureAccount,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      console.log("SOL deposited. Transaction signature:", tx);

      // Update wallet balance
      if (provider) {
        fetchWalletBalance(provider.connection, wallet.publicKey);
      }
    } catch (err) {
      console.error("Error depositing SOL:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch wallet balance
  const fetchWalletBalance = async (connection: web3.Connection, publicKey: web3.PublicKey) => {
    try {
      const balance = await connection.getBalance(publicKey);
      setSolBalance(balance / web3.LAMPORTS_PER_SOL);
    } catch (err) {
      console.error("Error fetching balance:", err);
    }
  };

  // Handle game move on Solana
  const handleMoveOnChain = async (direction: number) => {
    if (!program || !wallet || !gameAccount || !questAccount || !treasureAccount) return;

    try {
      setIsLoading(true);
      const tx = await program.methods
        .movePlayer(direction)
        .accounts({
          gameAccount,
          questAccount,
          treasureAccount,
          signer: wallet.publicKey,
        })
        .rpc();

      console.log("Move executed. Transaction signature:", tx);

      // Fetch updated game state
      const gameState = await program.account.game.fetch(gameAccount) as { x: number; y: number; movesTaken: number };
      const questState = await program.account.quest.fetch(questAccount);

      // Update UI state
      setPosition({ x: gameState.x, y: gameState.y });
      setMoves(gameState.movesTaken);

      // Check if any quests were collected
      if (questPositions.length > (questState.positions as QuestPosition[]).length) {
        playCoin();
      }

      setQuestPositions(questState.positions as QuestPosition[]);

      // Check if player reached the goal (9,9)
      if (gameState.x === 9 && gameState.y === 9) {
        playWin();
        setGameComplete(true);
        // Game will auto-reset on chain, but we need to update local state
        setTimeout(() => {
          checkIfGameExists(program, gameAccount, questAccount);
          if (provider) {
            fetchWalletBalance(provider.connection, wallet.publicKey);
          }
        }, 2000);
      } else {
        playMove();
      }
    } catch (err) {
      console.error("Error executing move:", err);
      playError();
    } finally {
      setIsLoading(false);
    }
  };

  // Handle move with Solana integration
  const handleMove = (dx: number, dy: number) => {
    if (isLoading || !isInitialized) return;

    let direction;
    if (dx === 0 && dy === -1) direction = DIRECTIONS.UP;
    else if (dx === 0 && dy === 1) direction = DIRECTIONS.DOWN;
    else if (dx === -1 && dy === 0) direction = DIRECTIONS.LEFT;
    else if (dx === 1 && dy === 0) direction = DIRECTIONS.RIGHT;
    else return;

    handleMoveOnChain(direction);
  };

  useEffect(() => {
    playBgMusic();
    return () => stopBgMusic();
  }, []);

  useEffect(() => {
    if (isMuted) {
      stopBgMusic();
    } else {
      playBgMusic();
    }
  }, [isMuted]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isLoading || gameComplete || !isInitialized) return;

    switch (e.key) {
      case 'ArrowUp':
        handleMove(0, -1);
        break;
      case 'ArrowDown':
        handleMove(0, 1);
        break;
      case 'ArrowLeft':
        handleMove(-1, 0);
        break;
      case 'ArrowRight':
        handleMove(1, 0);
        break;
    }
  }, [isLoading, gameComplete, isInitialized]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const renderGrid = () => {
    const grid = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const isPlayer = x === position.x && y === position.y;
        const isGoal = x === GRID_SIZE - 1 && y === GRID_SIZE - 1;
        const isQuest = questPositions.some(quest => quest.x === x && quest.y === y);

        grid.push(
          <motion.div
            key={`${x}-${y}`}
            className={`
              w-12 h-12
              border-2 
              ${isPlayer ? 'border-cyan-400' : 'border-cyan-500/30'}
              ${isGoal ? 'bg-purple-500/20' : isQuest ? 'bg-yellow-500/20' : 'bg-cyan-950/40'}
              backdrop-blur-sm rounded-md relative
              ${isGoal ? 'animate-pulse' : ''}
              transition-colors duration-200
              ${isPlayer ? 'shadow-lg shadow-cyan-500/50' : ''}
            `}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            {isPlayer && (
              <motion.div
                layoutId="player"
                className="w-full h-full flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <div className="w-full h-full bg-cyan-500/50 rounded-md backdrop-blur-sm flex items-center justify-center">
                  <User className="w-8 h-8 text-cyan-100" />
                </div>
              </motion.div>
            )}
            {isGoal && !isPlayer && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Crown className="w-8 h-8 text-purple-400" />
              </motion.div>
            )}
            {isQuest && !isPlayer && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Coins className="w-6 h-6 text-yellow-400" />
              </motion.div>
            )}
          </motion.div>
        );
      }
    }
    return grid;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 animate-pulse">
            Tiny Adventure on Solana
          </h1>

          <div className="flex items-center justify-center space-x-4">
            <div className="px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <WalletMultiButton className="!bg-transparent !p-0 !h-auto !border-0" />
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMuted(!isMuted)}
              className="px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-all hover:shadow-lg hover:shadow-cyan-500/20"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </motion.button>

            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400"
            >
              Moves: {moves}
            </motion.div>

            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center gap-2"
            >
              <Trophy className="w-5 h-5" /> Best: {bestScore || '-'}
            </motion.div>

            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 flex items-center gap-2"
            >
              <Wallet className="w-5 h-5" /> {solBalance.toFixed(4)} SOL
            </motion.div>
          </div>
        </div>

        {!wallet ? (
          <div className="flex justify-center mt-8">
            <div className="p-6 bg-gray-800/50 backdrop-blur-sm rounded-lg border border-cyan-500/30 text-center">
              <h2 className="text-xl text-cyan-400 mb-4">Connect Your Wallet</h2>
              <p className="text-gray-300 mb-4">Connect your Solana wallet to play Tiny Adventure on-chain!</p>
              <WalletMultiButton className="!bg-gradient-to-r !from-cyan-500 !to-purple-500 !border-0" />
            </div>
          </div>
        ) : !isInitialized ? (
          <div className="flex justify-center mt-8">
            <div className="p-6 bg-gray-800/50 backdrop-blur-sm rounded-lg border border-cyan-500/30 text-center">
              <h2 className="text-xl text-cyan-400 mb-4">Initialize Game</h2>
              <p className="text-gray-300 mb-4">Start your adventure on the Solana blockchain!</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={initializeGame}
                disabled={isLoading}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:shadow-lg hover:shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Initializing...' : 'Initialize Game'}
              </motion.button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="grid p-4 bg-cyan-500/5 rounded-lg border border-cyan-500/30 backdrop-blur-sm shadow-xl shadow-cyan-500/10"
                style={{
                  gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
                  gap: `${GAP_SIZE}px`,
                }}
              >
                {renderGrid()}
              </motion.div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleMove(0, -1)}
                disabled={isLoading}
                className="p-4 rounded-lg bg-cyan-500/10 border-2 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-all hover:shadow-lg hover:shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowUp className="w-8 h-8" />
              </motion.button>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleMove(-1, 0)}
                  disabled={isLoading}
                  className="p-4 rounded-lg bg-cyan-500/10 border-2 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-all hover:shadow-lg hover:shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="w-8 h-8" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleMove(0, 1)}
                  disabled={isLoading}
                  className="p-4 rounded-lg bg-cyan-500/10 border-2 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-all hover:shadow-lg hover:shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowDown className="w-8 h-8" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleMove(1, 0)}
                  disabled={isLoading}
                  className="p-4 rounded-lg bg-cyan-500/10 border-2 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-all hover:shadow-lg hover:shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowRight className="w-8 h-8" />
                </motion.button>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={resetGame}
                disabled={isLoading}
                className="px-6 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-all hover:shadow-lg hover:shadow-cyan-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCw className="w-5 h-5" /> Reset Game
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => depositSol(2)}
                disabled={isLoading}
                className="px-6 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 transition-all hover:shadow-lg hover:shadow-yellow-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Coins className="w-5 h-5" /> Deposit 2 SOL
              </motion.button>
            </div>
          </>
        )}

        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg backdrop-blur-sm z-50"
            >
              Processing transaction...
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {gameComplete && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="bg-gray-900 p-8 rounded-lg border border-cyan-500/30 text-center space-y-4"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    repeatDelay: 1
                  }}
                >
                  <Trophy className="w-16 h-16 text-yellow-400 mx-auto" />
                </motion.div>
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                  Level Complete!
                </h2>
                <p className="text-gray-300">You completed the level in {moves} moves!</p>
                <p className="text-yellow-400">SOL reward sent to your wallet!</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setGameComplete(false)}
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:shadow-lg hover:shadow-cyan-500/20 transition-all"
                >
                  Continue
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;