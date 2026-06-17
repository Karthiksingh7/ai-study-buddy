import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Gamepad2,
  Brain,
  Timer,
  Trophy,
  Sparkles,
  Grid3X3,
  Puzzle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Crown,
  AlertTriangle,
  Code,
  Zap,
  Blocks,
  Bug
} from "lucide-react";
import { cn } from "@/lib/utils";

type GameType = "sudoku" | "logic" | "memory" | "chess" | "codeChallenge" | "algorithmRace" | "codeTetris" | "codeSnake" | null;

interface SudokuCell {
  value: number | null;
  isFixed: boolean;
  isError: boolean;
}

export default function Games() {
  const [activeGame, setActiveGame] = useState<GameType>(null);
  const [gameStartTime, setGameStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [recentGames, setRecentGames] = useState<any[]>([]);
  const { user } = useAuth();

  // Sudoku state
  const [sudokuGrid, setSudokuGrid] = useState<SudokuCell[][]>([]);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);

  // Logic puzzle state
  const [logicQuestion, setLogicQuestion] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [logicScore, setLogicScore] = useState(0);
  const [logicRound, setLogicRound] = useState(1);

  // Memory game state
  const [memoryCards, setMemoryCards] = useState<any[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<number[]>([]);
  const [memoryMoves, setMemoryMoves] = useState(0);

  // Break timer state
  const [breakTimerLimit, setBreakTimerLimit] = useState(5); // 5 minutes default
  const [showTimerWarning, setShowTimerWarning] = useState(false);
  const navigate = useNavigate();

  // Chess state
  const [chessBoard, setChessBoard] = useState<string[][]>([]);
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
  const [isWhiteTurn, setIsWhiteTurn] = useState(true);
  const [capturedPieces, setCapturedPieces] = useState<{ white: string[], black: string[] }>({ white: [], black: [] });

  // Code Challenge state
  const [codeQuestion, setCodeQuestion] = useState<any>(null);
  const [codeAnswer, setCodeAnswer] = useState("");
  const [codeScore, setCodeScore] = useState(0);
  const [codeRound, setCodeRound] = useState(1);

  // Algorithm Race state
  const [algoQuestion, setAlgoQuestion] = useState<any>(null);
  const [algoOptions, setAlgoOptions] = useState<number[]>([]);
  const [algoScore, setAlgoScore] = useState(0);
  const [algoRound, setAlgoRound] = useState(1);

  // Snake Game state
  const [snakeBody, setSnakeBody] = useState<{ x: number, y: number }[]>([]);
  const [snakeFood, setSnakeFood] = useState<{ x: number, y: number }>({ x: 5, y: 5 });
  const [snakeDirection, setSnakeDirection] = useState<string>("RIGHT");
  const [snakeScore, setSnakeScore] = useState(0);
  const [snakeGameOver, setSnakeGameOver] = useState(false);

  // Tetris state
  const [tetrisBoard, setTetrisBoard] = useState<number[][]>([]);
  const [tetrisScore, setTetrisScore] = useState(0);
  const [tetrisGameOver, setTetrisGameOver] = useState(false);
  const [currentPiece, setCurrentPiece] = useState<{ shape: number[][], x: number, y: number, color: number } | null>(null);

  useEffect(() => {
    if (user) loadRecentGames();
  }, [user]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameStartTime && activeGame) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - gameStartTime.getTime()) / 1000);
        setElapsedTime(elapsed);

        // Check break time limit
        const limitSeconds = breakTimerLimit * 60;
        if (elapsed >= limitSeconds - 30 && elapsed < limitSeconds && !showTimerWarning) {
          setShowTimerWarning(true);
          toast.warning("30 seconds remaining! Time to get back to studying.");
        }
        if (elapsed >= limitSeconds) {
          toast.info("Break time is over! Back to studying.");
          saveGameSession(activeGame, 0);
          setActiveGame(null);
          navigate("/chat");
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameStartTime, activeGame, breakTimerLimit, showTimerWarning]);

  const loadRecentGames = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(5);

    if (data) setRecentGames(data);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const saveGameSession = async (gameType: string, score: number) => {
    if (!user) return;
    await supabase
      .from("game_sessions")
      .insert({
        user_id: user.id,
        game_type: gameType,
        score,
        duration_seconds: elapsedTime
      });
    loadRecentGames();
  };

  // Sudoku functions
  const generateSudoku = () => {
    // Simple 4x4 Sudoku for quick breaks
    const solution = [
      [1, 2, 3, 4],
      [3, 4, 1, 2],
      [2, 1, 4, 3],
      [4, 3, 2, 1]
    ];

    const grid: SudokuCell[][] = solution.map(row =>
      row.map(value => ({ value, isFixed: false, isError: false }))
    );

    // Remove some cells
    const cellsToRemove = 6;
    let removed = 0;
    while (removed < cellsToRemove) {
      const row = Math.floor(Math.random() * 4);
      const col = Math.floor(Math.random() * 4);
      if (grid[row][col].value !== null) {
        grid[row][col] = { value: null, isFixed: false, isError: false };
        removed++;
      }
    }

    // Mark remaining as fixed
    grid.forEach(row => row.forEach(cell => {
      if (cell.value !== null) cell.isFixed = true;
    }));

    setSudokuGrid(grid);
    setSelectedCell(null);
    setGameStartTime(new Date());
    setElapsedTime(0);
  };

  const handleSudokuInput = (num: number) => {
    if (!selectedCell || sudokuGrid[selectedCell[0]][selectedCell[1]].isFixed) return;

    const newGrid = [...sudokuGrid.map(row => [...row])];
    newGrid[selectedCell[0]][selectedCell[1]] = {
      value: num,
      isFixed: false,
      isError: false
    };
    setSudokuGrid(newGrid);

    // Check if complete
    const isFilled = newGrid.every(row => row.every(cell => cell.value !== null));
    if (isFilled) {
      const isValid = validateSudoku(newGrid);
      if (isValid) {
        toast.success("🎉 Sudoku completed!");
        saveGameSession("sudoku", 100);
        setActiveGame(null);
      } else {
        toast.error("Some numbers are incorrect");
      }
    }
  };

  const validateSudoku = (grid: SudokuCell[][]) => {
    const solution = [
      [1, 2, 3, 4],
      [3, 4, 1, 2],
      [2, 1, 4, 3],
      [4, 3, 2, 1]
    ];
    return grid.every((row, i) =>
      row.every((cell, j) => cell.value === solution[i][j])
    );
  };

  // Logic puzzle functions
  const logicPuzzles = [
    {
      question: "If all Bloops are Razzies and all Razzies are Lazzies, then all Bloops are definitely Lazzies?",
      options: ["True", "False", "Cannot be determined"],
      correct: 0,
      explanation: "This is a transitive relationship: Bloops → Razzies → Lazzies"
    },
    {
      question: "A farmer has 17 sheep. All but 9 die. How many sheep are left?",
      options: ["8", "9", "17", "0"],
      correct: 1,
      explanation: "'All but 9' means 9 remain alive"
    },
    {
      question: "What comes next in the sequence: 2, 6, 12, 20, 30, ?",
      options: ["40", "42", "44", "46"],
      correct: 1,
      explanation: "The differences are 4, 6, 8, 10, 12... so next is 30 + 12 = 42"
    },
    {
      question: "If you rearrange 'CIFAIPC', you get the name of a?",
      options: ["City", "Animal", "Ocean", "Country"],
      correct: 2,
      explanation: "CIFAIPC rearranges to PACIFIC (an ocean)"
    },
    {
      question: "Tom's mother has 4 children: May, June, July and?",
      options: ["August", "Tom", "April", "September"],
      correct: 1,
      explanation: "The question says 'Tom's mother' - so Tom is the fourth child!"
    }
  ];

  const startLogicGame = () => {
    setLogicRound(1);
    setLogicScore(0);
    nextLogicPuzzle();
    setGameStartTime(new Date());
    setElapsedTime(0);
  };

  const nextLogicPuzzle = () => {
    const randomPuzzle = logicPuzzles[Math.floor(Math.random() * logicPuzzles.length)];
    setLogicQuestion(randomPuzzle);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const checkLogicAnswer = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
    setShowResult(true);

    if (answerIndex === logicQuestion.correct) {
      setLogicScore(prev => prev + 10);
    }

    setTimeout(() => {
      if (logicRound < 5) {
        setLogicRound(prev => prev + 1);
        nextLogicPuzzle();
      } else {
        toast.success(`Game complete! Score: ${logicScore + (answerIndex === logicQuestion.correct ? 10 : 0)}/50`);
        saveGameSession("logic", logicScore + (answerIndex === logicQuestion.correct ? 10 : 0));
        setActiveGame(null);
      }
    }, 2000);
  };

  // Memory game functions
  const emojis = ["🎓", "📚", "✏️", "🧮", "🔬", "🎨", "🎵", "⚡"];

  const startMemoryGame = () => {
    const pairs = emojis.slice(0, 6);
    const cards = [...pairs, ...pairs]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({ id: index, emoji, isFlipped: false }));

    setMemoryCards(cards);
    setFlippedCards([]);
    setMatchedPairs([]);
    setMemoryMoves(0);
    setGameStartTime(new Date());
    setElapsedTime(0);
  };

  const flipCard = (index: number) => {
    if (flippedCards.length === 2 || matchedPairs.includes(index) || flippedCards.includes(index)) return;

    const newFlipped = [...flippedCards, index];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMemoryMoves(prev => prev + 1);

      if (memoryCards[newFlipped[0]].emoji === memoryCards[newFlipped[1]].emoji) {
        setMatchedPairs(prev => [...prev, ...newFlipped]);
        setFlippedCards([]);

        if (matchedPairs.length + 2 === memoryCards.length) {
          setTimeout(() => {
            toast.success(`🎉 Memory game complete in ${memoryMoves + 1} moves!`);
            saveGameSession("memory", Math.max(0, 100 - (memoryMoves + 1) * 5));
            setActiveGame(null);
          }, 500);
        }
      } else {
        setTimeout(() => setFlippedCards([]), 1000);
      }
    }
  };

  // Chess functions
  const chessPieces: Record<string, string> = {
    'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
    'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟',
    '': ''
  };

  const startChessGame = () => {
    const initialBoard = [
      ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
      ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
      ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR'],
    ];
    setChessBoard(initialBoard);
    setSelectedSquare(null);
    setIsWhiteTurn(true);
    setCapturedPieces({ white: [], black: [] });
    setGameStartTime(new Date());
    setElapsedTime(0);
    setShowTimerWarning(false);
  };

  const handleChessClick = (row: number, col: number) => {
    const piece = chessBoard[row][col];

    if (selectedSquare) {
      // Try to move
      const [fromRow, fromCol] = selectedSquare;
      const movingPiece = chessBoard[fromRow][fromCol];
      const isWhitePiece = movingPiece.startsWith('w');

      if (isWhitePiece === isWhiteTurn) {
        // Simple move validation (can capture or move to empty)
        const targetPiece = chessBoard[row][col];
        const isTargetEmpty = targetPiece === '';
        const isTargetEnemy = targetPiece !== '' && targetPiece.startsWith(isWhiteTurn ? 'b' : 'w');

        if (isTargetEmpty || isTargetEnemy) {
          const newBoard = chessBoard.map(r => [...r]);
          newBoard[row][col] = movingPiece;
          newBoard[fromRow][fromCol] = '';
          setChessBoard(newBoard);

          if (isTargetEnemy) {
            setCapturedPieces(prev => ({
              ...prev,
              [isWhiteTurn ? 'white' : 'black']: [...prev[isWhiteTurn ? 'white' : 'black'], targetPiece]
            }));

            // Check for king capture (game over)
            if (targetPiece === 'bK' || targetPiece === 'wK') {
              toast.success(`${isWhiteTurn ? 'White' : 'Black'} wins! 🎉`);
              saveGameSession("chess", 100);
              setActiveGame(null);
              return;
            }
          }

          setIsWhiteTurn(!isWhiteTurn);
        }
      }
      setSelectedSquare(null);
    } else {
      // Select piece of current player
      if (piece && piece.startsWith(isWhiteTurn ? 'w' : 'b')) {
        setSelectedSquare([row, col]);
      }
    }
  };

  // Code Challenge puzzles
  const codeChallenges = [
    { question: "What is the output of: console.log(typeof [])", answer: "object", hint: "Arrays are objects in JS" },
    { question: "What does [1,2,3].length return?", answer: "3", hint: "Count the elements" },
    { question: "What is 5 % 2 in JavaScript?", answer: "1", hint: "Modulo gives remainder" },
    { question: "What does 'hello'.toUpperCase() return?", answer: "HELLO", hint: "Converts to uppercase" },
    { question: "What is Math.floor(4.7)?", answer: "4", hint: "Floor rounds down" },
  ];

  const startCodeChallenge = () => {
    setCodeRound(1);
    setCodeScore(0);
    setCodeAnswer("");
    const randomQ = codeChallenges[Math.floor(Math.random() * codeChallenges.length)];
    setCodeQuestion(randomQ);
    setGameStartTime(new Date());
    setElapsedTime(0);
  };

  const checkCodeAnswer = () => {
    if (codeAnswer.toLowerCase().trim() === codeQuestion.answer.toLowerCase()) {
      setCodeScore(prev => prev + 20);
      toast.success("Correct! 🎉");
    } else {
      toast.error(`Wrong! Answer: ${codeQuestion.answer}`);
    }

    if (codeRound < 5) {
      setCodeRound(prev => prev + 1);
      setCodeAnswer("");
      const randomQ = codeChallenges[Math.floor(Math.random() * codeChallenges.length)];
      setCodeQuestion(randomQ);
    } else {
      toast.success(`Game over! Score: ${codeScore + (codeAnswer.toLowerCase().trim() === codeQuestion.answer.toLowerCase() ? 20 : 0)}/100`);
      saveGameSession("codeChallenge", codeScore);
      setActiveGame(null);
    }
  };

  // Algorithm Race questions
  const algoQuestions = [
    { question: "Time complexity of binary search?", options: ["O(n)", "O(log n)", "O(n²)", "O(1)"], correct: 1 },
    { question: "Space complexity of merge sort?", options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], correct: 2 },
    { question: "Best case for quicksort?", options: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"], correct: 1 },
    { question: "Time to access array element by index?", options: ["O(n)", "O(log n)", "O(1)", "O(n²)"], correct: 2 },
    { question: "Worst case for bubble sort?", options: ["O(n)", "O(n log n)", "O(n²)", "O(1)"], correct: 2 },
  ];

  const startAlgorithmRace = () => {
    setAlgoRound(1);
    setAlgoScore(0);
    const randomQ = algoQuestions[Math.floor(Math.random() * algoQuestions.length)];
    setAlgoQuestion(randomQ);
    setGameStartTime(new Date());
    setElapsedTime(0);
  };

  const checkAlgoAnswer = (index: number) => {
    if (index === algoQuestion.correct) {
      setAlgoScore(prev => prev + 20);
      toast.success("Correct! 🎉");
    } else {
      toast.error(`Wrong! Answer: ${algoQuestion.options[algoQuestion.correct]}`);
    }

    if (algoRound < 5) {
      setAlgoRound(prev => prev + 1);
      const randomQ = algoQuestions[Math.floor(Math.random() * algoQuestions.length)];
      setAlgoQuestion(randomQ);
    } else {
      toast.success(`Game over! Score: ${algoScore + (index === algoQuestion.correct ? 20 : 0)}/100`);
      saveGameSession("algorithmRace", algoScore);
      setActiveGame(null);
    }
  };


  // Code Tetris - FULL IMPLEMENTATION
  const TETRIS_ROWS = 18;
  const TETRIS_COLS = 10;

  const TETRIS_PIECES = [
    { shape: [[1, 1, 1, 1]], color: 1 }, // I
    { shape: [[1, 1], [1, 1]], color: 2 }, // O
    { shape: [[0, 1, 0], [1, 1, 1]], color: 3 }, // T
    { shape: [[1, 0, 0], [1, 1, 1]], color: 4 }, // L
    { shape: [[0, 0, 1], [1, 1, 1]], color: 5 }, // J
    { shape: [[0, 1, 1], [1, 1, 0]], color: 6 }, // S
    { shape: [[1, 1, 0], [0, 1, 1]], color: 7 }, // Z
  ];

  const TETRIS_COLORS: Record<number, string> = {
    0: "bg-secondary/30",
    1: "bg-cyan-500",
    2: "bg-yellow-500",
    3: "bg-purple-500",
    4: "bg-orange-500",
    5: "bg-blue-500",
    6: "bg-green-500",
    7: "bg-red-500",
  };

  const spawnTetrisPiece = useCallback(() => {
    const piece = TETRIS_PIECES[Math.floor(Math.random() * TETRIS_PIECES.length)];
    return {
      shape: piece.shape.map(row => [...row]),
      x: Math.floor((TETRIS_COLS - piece.shape[0].length) / 2),
      y: 0,
      color: piece.color
    };
  }, []);

  const startCodeTetris = () => {
    const emptyBoard = Array(TETRIS_ROWS).fill(null).map(() => Array(TETRIS_COLS).fill(0));
    setTetrisBoard(emptyBoard);
    setTetrisScore(0);
    setTetrisGameOver(false);
    setCurrentPiece(spawnTetrisPiece());
    setGameStartTime(new Date());
    setElapsedTime(0);
  };

  const checkTetrisCollision = useCallback((piece: typeof currentPiece, board: number[][], offsetX = 0, offsetY = 0) => {
    if (!piece) return false;
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const newX = piece.x + x + offsetX;
          const newY = piece.y + y + offsetY;
          if (newX < 0 || newX >= TETRIS_COLS || newY >= TETRIS_ROWS) return true;
          if (newY >= 0 && board[newY][newX]) return true;
        }
      }
    }
    return false;
  }, []);

  const mergeTetrisPiece = useCallback((piece: typeof currentPiece, board: number[][]) => {
    if (!piece) return board;
    const newBoard = board.map(row => [...row]);
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x] && piece.y + y >= 0) {
          newBoard[piece.y + y][piece.x + x] = piece.color;
        }
      }
    }
    return newBoard;
  }, []);

  const clearTetrisLines = useCallback((board: number[][]) => {
    let linesCleared = 0;
    const newBoard = board.filter(row => {
      if (row.every(cell => cell !== 0)) {
        linesCleared++;
        return false;
      }
      return true;
    });
    while (newBoard.length < TETRIS_ROWS) {
      newBoard.unshift(Array(TETRIS_COLS).fill(0));
    }
    return { board: newBoard, lines: linesCleared };
  }, []);

  // Tetris game loop
  useEffect(() => {
    if (activeGame !== "codeTetris" || tetrisGameOver || !currentPiece) return;

    const tick = () => {
      if (checkTetrisCollision(currentPiece, tetrisBoard, 0, 1)) {
        // Merge piece and spawn new
        const merged = mergeTetrisPiece(currentPiece, tetrisBoard);
        const { board: clearedBoard, lines } = clearTetrisLines(merged);
        setTetrisBoard(clearedBoard);
        setTetrisScore(s => s + lines * 100);

        const newPiece = spawnTetrisPiece();
        if (checkTetrisCollision(newPiece, clearedBoard, 0, 0)) {
          setTetrisGameOver(true);
          toast.error(`Game Over! Score: ${tetrisScore}`);
          saveGameSession("codeTetris", tetrisScore);
        } else {
          setCurrentPiece(newPiece);
        }
      } else {
        setCurrentPiece(p => p ? { ...p, y: p.y + 1 } : null);
      }
    };

    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [activeGame, currentPiece, tetrisBoard, tetrisGameOver, checkTetrisCollision, mergeTetrisPiece, clearTetrisLines, spawnTetrisPiece, tetrisScore]);

  // Tetris keyboard controls
  useEffect(() => {
    if (activeGame !== "codeTetris" || tetrisGameOver) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentPiece) return;

      switch (e.key) {
        case "ArrowLeft":
          if (!checkTetrisCollision(currentPiece, tetrisBoard, -1, 0)) {
            setCurrentPiece(p => p ? { ...p, x: p.x - 1 } : null);
          }
          break;
        case "ArrowRight":
          if (!checkTetrisCollision(currentPiece, tetrisBoard, 1, 0)) {
            setCurrentPiece(p => p ? { ...p, x: p.x + 1 } : null);
          }
          break;
        case "ArrowDown":
          if (!checkTetrisCollision(currentPiece, tetrisBoard, 0, 1)) {
            setCurrentPiece(p => p ? { ...p, y: p.y + 1 } : null);
          }
          break;
        case "ArrowUp":
          // Rotate
          const rotated = currentPiece.shape[0].map((_, i) =>
            currentPiece.shape.map(row => row[row.length - 1 - i])
          );
          const rotatedPiece = { ...currentPiece, shape: rotated };
          if (!checkTetrisCollision(rotatedPiece, tetrisBoard, 0, 0)) {
            setCurrentPiece(rotatedPiece);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeGame, currentPiece, tetrisBoard, tetrisGameOver, checkTetrisCollision]);

  // Code Snake functions - FULL IMPLEMENTATION
  const SNAKE_GRID_SIZE = 15;

  const startCodeSnake = () => {
    setSnakeBody([{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }]);
    setSnakeFood({ x: Math.floor(Math.random() * SNAKE_GRID_SIZE), y: Math.floor(Math.random() * SNAKE_GRID_SIZE) });
    setSnakeDirection("RIGHT");
    setSnakeScore(0);
    setSnakeGameOver(false);
    setGameStartTime(new Date());
    setElapsedTime(0);
  };

  // Snake game loop
  useEffect(() => {
    if (activeGame !== "codeSnake" || snakeGameOver) return;

    const moveSnake = () => {
      setSnakeBody(prev => {
        const head = { ...prev[0] };

        switch (snakeDirection) {
          case "UP": head.y -= 1; break;
          case "DOWN": head.y += 1; break;
          case "LEFT": head.x -= 1; break;
          case "RIGHT": head.x += 1; break;
        }

        // Check wall collision
        if (head.x < 0 || head.x >= SNAKE_GRID_SIZE || head.y < 0 || head.y >= SNAKE_GRID_SIZE) {
          setSnakeGameOver(true);
          toast.error(`Game Over! Score: ${snakeScore}`);
          saveGameSession("codeSnake", snakeScore);
          return prev;
        }

        // Check self collision
        if (prev.some(seg => seg.x === head.x && seg.y === head.y)) {
          setSnakeGameOver(true);
          toast.error(`Game Over! Score: ${snakeScore}`);
          saveGameSession("codeSnake", snakeScore);
          return prev;
        }

        const newBody = [head, ...prev];

        // Check food collision
        if (head.x === snakeFood.x && head.y === snakeFood.y) {
          setSnakeScore(s => s + 10);
          // Generate new food
          let newFood;
          do {
            newFood = { x: Math.floor(Math.random() * SNAKE_GRID_SIZE), y: Math.floor(Math.random() * SNAKE_GRID_SIZE) };
          } while (newBody.some(seg => seg.x === newFood.x && seg.y === newFood.y));
          setSnakeFood(newFood);
        } else {
          newBody.pop(); // Remove tail if no food eaten
        }

        return newBody;
      });
    };

    const interval = setInterval(moveSnake, 150);
    return () => clearInterval(interval);
  }, [activeGame, snakeDirection, snakeGameOver, snakeFood, snakeScore]);

  // Snake keyboard controls
  useEffect(() => {
    if (activeGame !== "codeSnake") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp": if (snakeDirection !== "DOWN") setSnakeDirection("UP"); break;
        case "ArrowDown": if (snakeDirection !== "UP") setSnakeDirection("DOWN"); break;
        case "ArrowLeft": if (snakeDirection !== "RIGHT") setSnakeDirection("LEFT"); break;
        case "ArrowRight": if (snakeDirection !== "LEFT") setSnakeDirection("RIGHT"); break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeGame, snakeDirection]);

  // Game selection screen
  if (!activeGame) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-primary" />
            Smart Break
          </h1>
          <p className="text-sm text-muted-foreground">
            Take a mental break with brain-training games
          </p>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {/* Brain Games Section */}
          <h2 className="font-semibold mb-3 text-muted-foreground flex items-center gap-2">
            <Brain className="w-4 h-4" /> Brain Games
          </h2>
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setActiveGame("sudoku"); generateSudoku(); }}>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-2">
                  <Grid3X3 className="w-6 h-6 text-white" />
                </div>
                <CardTitle>Mini Sudoku</CardTitle>
                <CardDescription>4x4 number puzzle - quick and relaxing</CardDescription>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setActiveGame("logic"); startLogicGame(); }}>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center mb-2">
                  <Lightbulb className="w-6 h-6 text-white" />
                </div>
                <CardTitle>Logic Puzzles</CardTitle>
                <CardDescription>5 brain teasers to sharpen your mind</CardDescription>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setActiveGame("memory"); startMemoryGame(); }}>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-2">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <CardTitle>Memory Game</CardTitle>
                <CardDescription>Find matching pairs - train your memory</CardDescription>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setActiveGame("chess"); startChessGame(); }}>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-2">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <CardTitle>Mini Chess</CardTitle>
                <CardDescription>Quick chess game - relax and strategize</CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Coding Games Section */}
          <h2 className="font-semibold mb-3 text-muted-foreground flex items-center gap-2">
            <Code className="w-4 h-4" /> Coding Games
          </h2>
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setActiveGame("codeChallenge"); startCodeChallenge(); }}>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center mb-2">
                  <Code className="w-6 h-6 text-white" />
                </div>
                <CardTitle>Code Challenge</CardTitle>
                <CardDescription>Quick coding puzzles to test your skills</CardDescription>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setActiveGame("algorithmRace"); startAlgorithmRace(); }}>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center mb-2">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <CardTitle>Algorithm Race</CardTitle>
                <CardDescription>Race against time to solve algorithms</CardDescription>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setActiveGame("codeTetris"); startCodeTetris(); }}>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center mb-2">
                  <Blocks className="w-6 h-6 text-white" />
                </div>
                <CardTitle>Code Tetris</CardTitle>
                <CardDescription>Stack code blocks in this classic game</CardDescription>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setActiveGame("codeSnake"); startCodeSnake(); }}>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-lime-500 to-green-500 flex items-center justify-center mb-2">
                  <Bug className="w-6 h-6 text-white" />
                </div>
                <CardTitle>Code Snake</CardTitle>
                <CardDescription>Collect bugs to grow your code snake!</CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Break Timer Setting */}
          <div className="mb-6 p-4 bg-secondary/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Break Time Limit</span>
              </div>
              <Select value={breakTimerLimit.toString()} onValueChange={(v) => setBreakTimerLimit(parseInt(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Auto-redirects to study after time is up
            </p>
          </div>

          {recentGames.length > 0 && (
            <div>
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                Recent Games
              </h2>
              <div className="space-y-2">
                {recentGames.map((game) => (
                  <div key={game.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {game.game_type === "sudoku" && <Grid3X3 className="w-4 h-4 text-blue-500" />}
                      {game.game_type === "logic" && <Lightbulb className="w-4 h-4 text-purple-500" />}
                      {game.game_type === "memory" && <Puzzle className="w-4 h-4 text-green-500" />}
                      <span className="capitalize">{game.game_type}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Score: {game.score}</span>
                      <span>{formatTime(game.duration_seconds)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Card className="mt-8 bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Sparkles className="w-6 h-6 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-medium mb-1">AI Tip</h3>
                  <p className="text-sm text-muted-foreground">
                    Taking short mental breaks every 25-45 minutes improves focus and retention.
                    These games are designed to refresh your mind without being too distracting.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Sudoku game
  if (activeGame === "sudoku") {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Grid3X3 className="w-5 h-5 text-blue-500" />
            <h1 className="font-semibold">Mini Sudoku</h1>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">
              <Timer className="w-3 h-3 mr-1" />
              {formatTime(elapsedTime)}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setActiveGame(null)}>
              Exit
            </Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="grid grid-cols-4 gap-1 mb-6">
            {sudokuGrid.map((row, i) =>
              row.map((cell, j) => (
                <button
                  key={`${i}-${j}`}
                  onClick={() => !cell.isFixed && setSelectedCell([i, j])}
                  className={cn(
                    "w-14 h-14 text-xl font-bold rounded-lg transition-colors",
                    cell.isFixed ? "bg-secondary text-foreground" : "bg-secondary/50",
                    selectedCell?.[0] === i && selectedCell?.[1] === j && "ring-2 ring-primary",
                    !cell.isFixed && "hover:bg-secondary/80 cursor-pointer"
                  )}
                >
                  {cell.value || ""}
                </button>
              ))
            )}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(num => (
              <Button
                key={num}
                variant="outline"
                className="w-12 h-12 text-lg"
                onClick={() => handleSudokuInput(num)}
              >
                {num}
              </Button>
            ))}
          </div>

          <Button variant="ghost" className="mt-4" onClick={generateSudoku}>
            <RefreshCw className="w-4 h-4 mr-2" />
            New Puzzle
          </Button>
        </div>
      </div>
    );
  }

  // Logic puzzle game
  if (activeGame === "logic" && logicQuestion) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lightbulb className="w-5 h-5 text-purple-500" />
            <h1 className="font-semibold">Logic Puzzles</h1>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">Round {logicRound}/5</Badge>
            <Badge variant="secondary">Score: {logicScore}</Badge>
            <Button variant="ghost" size="sm" onClick={() => setActiveGame(null)}>
              Exit
            </Button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle className="text-lg">{logicQuestion.question}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {logicQuestion.options.map((option: string, index: number) => (
                <button
                  key={index}
                  onClick={() => !showResult && checkLogicAnswer(index)}
                  disabled={showResult}
                  className={cn(
                    "w-full p-4 rounded-lg text-left transition-colors",
                    showResult && index === logicQuestion.correct && "bg-green-500/20 border-green-500",
                    showResult && selectedAnswer === index && index !== logicQuestion.correct && "bg-red-500/20 border-red-500",
                    !showResult && "bg-secondary hover:bg-secondary/80",
                    "border"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {showResult && index === logicQuestion.correct && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                    {showResult && selectedAnswer === index && index !== logicQuestion.correct && <XCircle className="w-5 h-5 text-red-500" />}
                  </div>
                </button>
              ))}

              {showResult && (
                <div className="mt-4 p-3 bg-primary/10 rounded-lg text-sm">
                  <strong>Explanation:</strong> {logicQuestion.explanation}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Memory game
  if (activeGame === "memory") {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Puzzle className="w-5 h-5 text-green-500" />
            <h1 className="font-semibold">Memory Match</h1>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">Moves: {memoryMoves}</Badge>
            <Badge variant="secondary">
              <Timer className="w-3 h-3 mr-1" />
              {formatTime(elapsedTime)}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setActiveGame(null)}>
              Exit
            </Button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="grid grid-cols-4 gap-3">
            {memoryCards.map((card, index) => (
              <button
                key={card.id}
                onClick={() => flipCard(index)}
                className={cn(
                  "w-16 h-16 md:w-20 md:h-20 rounded-lg text-3xl transition-all duration-300 transform",
                  flippedCards.includes(index) || matchedPairs.includes(index)
                    ? "bg-primary/20 rotate-0"
                    : "bg-secondary hover:bg-secondary/80 rotate-y-180"
                )}
              >
                {(flippedCards.includes(index) || matchedPairs.includes(index)) ? card.emoji : "?"}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-border">
          <Progress value={(matchedPairs.length / memoryCards.length) * 100} className="h-2" />
          <p className="text-center text-sm text-muted-foreground mt-2">
            {matchedPairs.length / 2} of {memoryCards.length / 2} pairs found
          </p>
        </div>
      </div>
    );
  }

  // Chess game
  if (activeGame === "chess") {
    const remainingTime = breakTimerLimit * 60 - elapsedTime;
    const isLowTime = remainingTime <= 60;

    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="w-5 h-5 text-amber-500" />
            <h1 className="font-semibold">Mini Chess</h1>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant={isWhiteTurn ? "default" : "secondary"}>
              {isWhiteTurn ? "White's Turn" : "Black's Turn"}
            </Badge>
            <Badge variant={isLowTime ? "destructive" : "secondary"} className="gap-1">
              <Timer className="w-3 h-3" />
              {formatTime(remainingTime > 0 ? remainingTime : 0)}
              {isLowTime && <AlertTriangle className="w-3 h-3" />}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setActiveGame(null)}>
              Exit
            </Button>
          </div>
        </div>

        {/* Timer Warning */}
        {showTimerWarning && (
          <div className="mx-4 mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span>30 seconds remaining! Time to get back to studying.</span>
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center p-4">
          {/* Captured pieces (Black's captures) */}
          <div className="flex gap-1 mb-2 h-6">
            {capturedPieces.black.map((p, i) => (
              <span key={i} className="text-lg">{chessPieces[p]}</span>
            ))}
          </div>

          {/* Chess Board */}
          <div className="grid grid-cols-8 border-2 border-border rounded-lg overflow-hidden">
            {chessBoard.map((row, rowIndex) =>
              row.map((piece, colIndex) => {
                const isLight = (rowIndex + colIndex) % 2 === 0;
                const isSelected = selectedSquare?.[0] === rowIndex && selectedSquare?.[1] === colIndex;

                return (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    onClick={() => handleChessClick(rowIndex, colIndex)}
                    className={cn(
                      "w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-2xl md:text-3xl transition-colors",
                      isLight ? "bg-amber-100 dark:bg-amber-900/30" : "bg-amber-700 dark:bg-amber-800/50",
                      isSelected && "ring-2 ring-primary ring-inset",
                      piece && piece.startsWith(isWhiteTurn ? 'w' : 'b') && "cursor-pointer hover:brightness-110"
                    )}
                  >
                    {chessPieces[piece]}
                  </button>
                );
              })
            )}
          </div>

          {/* Captured pieces (White's captures) */}
          <div className="flex gap-1 mt-2 h-6">
            {capturedPieces.white.map((p, i) => (
              <span key={i} className="text-lg">{chessPieces[p]}</span>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-border flex justify-center gap-2">
          <Button variant="outline" onClick={startChessGame}>
            <RefreshCw className="w-4 h-4 mr-2" />
            New Game
          </Button>
        </div>
      </div>
    );
  }

  // Code Challenge game
  if (activeGame === "codeChallenge" && codeQuestion) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Code className="w-5 h-5 text-teal-500" />
            <h1 className="font-semibold">Code Challenge</h1>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">Round {codeRound}/5</Badge>
            <Badge variant="secondary">Score: {codeScore}</Badge>
            <Button variant="ghost" size="sm" onClick={() => setActiveGame(null)}>Exit</Button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle className="text-lg font-mono">{codeQuestion.question}</CardTitle>
              <CardDescription>💡 Hint: {codeQuestion.hint}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                type="text"
                value={codeAnswer}
                onChange={(e) => setCodeAnswer(e.target.value)}
                placeholder="Type your answer..."
                className="w-full p-3 rounded-lg bg-secondary border border-border font-mono"
                onKeyDown={(e) => e.key === "Enter" && checkCodeAnswer()}
              />
              <Button onClick={checkCodeAnswer} className="w-full">Submit Answer</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Algorithm Race game
  if (activeGame === "algorithmRace" && algoQuestion) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-rose-500" />
            <h1 className="font-semibold">Algorithm Race</h1>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">Round {algoRound}/5</Badge>
            <Badge variant="secondary">Score: {algoScore}</Badge>
            <Badge variant="secondary"><Timer className="w-3 h-3 mr-1" />{formatTime(elapsedTime)}</Badge>
            <Button variant="ghost" size="sm" onClick={() => setActiveGame(null)}>Exit</Button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle className="text-lg">{algoQuestion.question}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {algoQuestion.options.map((option: string, index: number) => (
                <button
                  key={index}
                  onClick={() => checkAlgoAnswer(index)}
                  className="w-full p-4 rounded-lg text-left bg-secondary hover:bg-secondary/80 transition-colors border border-border"
                >
                  {option}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Code Tetris - FULL GAME UI
  if (activeGame === "codeTetris") {
    // Create display board with current piece overlaid
    const displayBoard = tetrisBoard.map(row => [...row]);
    if (currentPiece) {
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x] && currentPiece.y + y >= 0) {
            displayBoard[currentPiece.y + y][currentPiece.x + x] = currentPiece.color;
          }
        }
      }
    }

    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Blocks className="w-5 h-5 text-indigo-500" />
            <h1 className="font-semibold">Code Tetris</h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">Score: {tetrisScore}</Badge>
            <Badge variant="secondary">
              <Timer className="w-3 h-3 mr-1" />
              {formatTime(elapsedTime)}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setActiveGame(null)}>Exit</Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
          {/* Game Board */}
          <div
            className="grid gap-[1px] bg-border rounded-lg overflow-hidden p-1"
            style={{ gridTemplateColumns: `repeat(${TETRIS_COLS}, 1fr)` }}
          >
            {displayBoard.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={cn(
                    "w-5 h-5 md:w-6 md:h-6 rounded-sm transition-colors",
                    TETRIS_COLORS[cell] || "bg-secondary/30"
                  )}
                />
              ))
            )}
          </div>

          {/* Controls */}
          <div className="text-center space-y-3">
            {tetrisGameOver ? (
              <div className="space-y-3">
                <p className="text-lg font-semibold text-destructive">Game Over!</p>
                <Button onClick={startCodeTetris}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Play Again
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">← → Move | ↑ Rotate | ↓ Drop</p>
                {/* Mobile Controls */}
                <div className="grid grid-cols-4 gap-2 w-40 mx-auto md:hidden">
                  <Button size="sm" variant="outline" onClick={() => {
                    if (currentPiece && !checkTetrisCollision(currentPiece, tetrisBoard, -1, 0)) {
                      setCurrentPiece(p => p ? { ...p, x: p.x - 1 } : null);
                    }
                  }}>←</Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    if (currentPiece) {
                      const rotated = currentPiece.shape[0].map((_, i) =>
                        currentPiece.shape.map(row => row[row.length - 1 - i])
                      );
                      const rotatedPiece = { ...currentPiece, shape: rotated };
                      if (!checkTetrisCollision(rotatedPiece, tetrisBoard, 0, 0)) {
                        setCurrentPiece(rotatedPiece);
                      }
                    }
                  }}>↻</Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    if (currentPiece && !checkTetrisCollision(currentPiece, tetrisBoard, 0, 1)) {
                      setCurrentPiece(p => p ? { ...p, y: p.y + 1 } : null);
                    }
                  }}>↓</Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    if (currentPiece && !checkTetrisCollision(currentPiece, tetrisBoard, 1, 0)) {
                      setCurrentPiece(p => p ? { ...p, x: p.x + 1 } : null);
                    }
                  }}>→</Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Code Snake - FULL GAME UI
  if (activeGame === "codeSnake") {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bug className="w-5 h-5 text-lime-500" />
            <h1 className="font-semibold">Code Snake</h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">Score: {snakeScore}</Badge>
            <Badge variant="secondary">
              <Timer className="w-3 h-3 mr-1" />
              {formatTime(elapsedTime)}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setActiveGame(null)}>Exit</Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
          {/* Game Board */}
          <div
            className="grid gap-[1px] bg-border rounded-lg overflow-hidden p-1"
            style={{ gridTemplateColumns: `repeat(${SNAKE_GRID_SIZE}, 1fr)` }}
          >
            {Array.from({ length: SNAKE_GRID_SIZE * SNAKE_GRID_SIZE }).map((_, i) => {
              const x = i % SNAKE_GRID_SIZE;
              const y = Math.floor(i / SNAKE_GRID_SIZE);
              const isSnakeHead = snakeBody[0]?.x === x && snakeBody[0]?.y === y;
              const isSnakeBody = snakeBody.some((seg, idx) => idx > 0 && seg.x === x && seg.y === y);
              const isFood = snakeFood.x === x && snakeFood.y === y;

              return (
                <div
                  key={i}
                  className={cn(
                    "w-5 h-5 md:w-6 md:h-6 rounded-sm transition-colors",
                    isSnakeHead && "bg-lime-500",
                    isSnakeBody && "bg-lime-400",
                    isFood && "bg-red-500",
                    !isSnakeHead && !isSnakeBody && !isFood && "bg-secondary/50"
                  )}
                />
              );
            })}
          </div>

          {/* Controls */}
          <div className="text-center space-y-3">
            {snakeGameOver ? (
              <div className="space-y-3">
                <p className="text-lg font-semibold text-destructive">Game Over!</p>
                <Button onClick={startCodeSnake}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Play Again
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Use arrow keys to move</p>
                {/* Mobile Controls */}
                <div className="grid grid-cols-3 gap-2 w-32 mx-auto md:hidden">
                  <div />
                  <Button size="sm" variant="outline" onClick={() => snakeDirection !== "DOWN" && setSnakeDirection("UP")}>↑</Button>
                  <div />
                  <Button size="sm" variant="outline" onClick={() => snakeDirection !== "RIGHT" && setSnakeDirection("LEFT")}>←</Button>
                  <Button size="sm" variant="outline" onClick={() => snakeDirection !== "UP" && setSnakeDirection("DOWN")}>↓</Button>
                  <Button size="sm" variant="outline" onClick={() => snakeDirection !== "LEFT" && setSnakeDirection("RIGHT")}>→</Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
