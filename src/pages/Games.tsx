import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Lightbulb
} from "lucide-react";
import { cn } from "@/lib/utils";

type GameType = "sudoku" | "logic" | "memory" | null;

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

  useEffect(() => {
    if (user) loadRecentGames();
  }, [user]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - gameStartTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameStartTime]);

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
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setActiveGame("sudoku"); generateSudoku(); }}>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-2">
                  <Grid3X3 className="w-6 h-6 text-blue-500" />
                </div>
                <CardTitle>Mini Sudoku</CardTitle>
                <CardDescription>4x4 number puzzle - quick and relaxing</CardDescription>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setActiveGame("logic"); startLogicGame(); }}>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-2">
                  <Lightbulb className="w-6 h-6 text-purple-500" />
                </div>
                <CardTitle>Logic Puzzles</CardTitle>
                <CardDescription>5 brain teasers to sharpen your mind</CardDescription>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setActiveGame("memory"); startMemoryGame(); }}>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center mb-2">
                  <Puzzle className="w-6 h-6 text-green-500" />
                </div>
                <CardTitle>Memory Match</CardTitle>
                <CardDescription>Find matching pairs - train your memory</CardDescription>
              </CardHeader>
            </Card>
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

  return null;
}
