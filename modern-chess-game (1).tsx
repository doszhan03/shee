import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { 
  RefreshCw, 
  ChevronRight, 
  ChevronLeft, 
  RotateCcw 
} from 'lucide-react';

const ChessGame = () => {
  // Состояние игры
  const [board, setBoard] = useState([]);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState('white');
  const [gameHistory, setGameHistory] = useState([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [winner, setWinner] = useState(null);

  // Константы для фигур
  const PIECES = {
    white: {
      king: '♔', queen: '♕', rook: '♖', 
      bishop: '♗', knight: '♘', pawn: '♙'
    },
    black: {
      king: '♚', queen: '♛', rook: '♜', 
      bishop: '♝', knight: '♞', pawn: '♟'
    }
  };

  // Инициализация доски
  const initializeBoard = useCallback(() => {
    const newBoard = Array(8).fill().map(() => Array(8).fill(null));
    
    // Расстановка черных фигур
    newBoard[0] = [
      PIECES.black.rook, PIECES.black.knight, PIECES.black.bishop, 
      PIECES.black.queen, PIECES.black.king, PIECES.black.bishop, 
      PIECES.black.knight, PIECES.black.rook
    ];
    newBoard[1] = Array(8).fill(PIECES.black.pawn);

    // Расстановка белых фигур
    newBoard[7] = [
      PIECES.white.rook, PIECES.white.knight, PIECES.white.bishop, 
      PIECES.white.queen, PIECES.white.king, PIECES.white.bishop, 
      PIECES.white.knight, PIECES.white.rook
    ];
    newBoard[6] = Array(8).fill(PIECES.white.pawn);

    return newBoard;
  }, []);

  // Начало игры
  useEffect(() => {
    setBoard(initializeBoard());
    setCurrentPlayer('white');
    setGameHistory([]);
    setIsGameOver(false);
    setWinner(null);
  }, [initializeBoard]);

  // Проверка, принадлежит ли фигура текущему игроку
  const isPieceOfCurrentPlayer = (piece) => {
    if (!piece) return false;
    return (currentPlayer === 'white' && piece.charCodeAt(0) >= 9812 && piece.charCodeAt(0) <= 9817) ||
           (currentPlayer === 'black' && piece.charCodeAt(0) >= 9818 && piece.charCodeAt(0) <= 9823);
  };

  // Проверка валидности хода
  const isValidMove = (fromRow, fromCol, toRow, toCol) => {
    const piece = board[fromRow][fromCol];
    const targetPiece = board[toRow][toCol];

    // Нельзя ходить на свои фигуры
    if (targetPiece && isPieceOfCurrentPlayer(targetPiece)) {
      return false;
    }

    // Правила движения для разных фигур
    switch (piece) {
      case '♙': // Белая пешка
        return toCol === fromCol && 
               toRow === fromRow - 1 && 
               !board[toRow][toCol];
      case '♟': // Черная пешка
        return toCol === fromCol && 
               toRow === fromRow + 1 && 
               !board[toRow][toCol];
      case '♖': case '♜': // Ладья
        return (fromRow === toRow || fromCol === toCol) && 
               isPathClear(fromRow, fromCol, toRow, toCol);
      case '♘': case '♞': // Конь
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);
        return (rowDiff === 2 && colDiff === 1) || 
               (rowDiff === 1 && colDiff === 2);
      case '♗': case '♝': // Слон
        return Math.abs(toRow - fromRow) === Math.abs(toCol - fromCol) &&
               isPathClear(fromRow, fromCol, toRow, toCol);
      case '♕': case '♛': // Ферзь
        return (fromRow === toRow || fromCol === toCol || 
                Math.abs(toRow - fromRow) === Math.abs(toCol - fromCol)) &&
               isPathClear(fromRow, fromCol, toRow, toCol);
      case '♔': case '♚': // Король
        return Math.abs(toRow - fromRow) <= 1 && 
               Math.abs(toCol - fromCol) <= 1;
      default:
        return false;
    }
  };

  // Проверка свободного пути
  const isPathClear = (fromRow, fromCol, toRow, toCol) => {
    const rowStep = fromRow === toRow ? 0 : (toRow > fromRow ? 1 : -1);
    const colStep = fromCol === toCol ? 0 : (toCol > fromCol ? 1 : -1);

    let currentRow = fromRow + rowStep;
    let currentCol = fromCol + colStep;

    while (currentRow !== toRow || currentCol !== toCol) {
      if (board[currentRow][currentCol]) return false;
      currentRow += rowStep;
      currentCol += colStep;
    }

    return true;
  };

  // Обработка клика по квадрату
  const handleSquareClick = (row, col) => {
    if (isGameOver) return;

    // Если фигура не выбрана
    if (!selectedPiece) {
      const piece = board[row][col];
      if (piece && isPieceOfCurrentPlayer(piece)) {
        setSelectedPiece({ row, col });
      }
    } else {
      // Попытка сделать ход
      if (isValidMove(selectedPiece.row, selectedPiece.col, row, col)) {
        const newBoard = board.map(row => [...row]);
        
        // Сохраняем историю
        setGameHistory(prev => [...prev, {
          board: board.map(row => [...row]),
          currentPlayer
        }]);

        // Перемещаем фигуру
        newBoard[row][col] = newBoard[selectedPiece.row][selectedPiece.col];
        newBoard[selectedPiece.row][selectedPiece.col] = null;

        setBoard(newBoard);
        
        // Проверка на мат
        const isCheckmate = checkForCheckmate(newBoard, currentPlayer === 'white' ? 'black' : 'white');
        if (isCheckmate) {
          setIsGameOver(true);
          setWinner(currentPlayer);
        }

        // Смена игрока
        setCurrentPlayer(currentPlayer === 'white' ? 'black' : 'white');
      }

      // Сбрасываем выделение
      setSelectedPiece(null);
    }
  };

  // Проверка на мат
  const checkForCheckmate = (board, playerToCheck) => {
    // Упрощенная логика - здесь можно добавить более сложную проверку
    const kingSymbol = playerToCheck === 'white' ? '♔' : '♚';
    let kingFound = false;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (board[row][col] === kingSymbol) {
          kingFound = true;
          break;
        }
      }
      if (kingFound) break;
    }

    return !kingFound;
  };

  // Возврат хода
  const undoLastMove = () => {
    if (gameHistory.length > 0) {
      const lastMove = gameHistory[gameHistory.length - 1];
      setBoard(lastMove.board);
      setCurrentPlayer(lastMove.currentPlayer);
      setGameHistory(prev => prev.slice(0, -1));
    }
  };

  // Визуализация доски
  const renderBoard = () => {
    return board.map((row, rowIndex) => 
      row.map((piece, colIndex) => (
        <div 
          key={`${rowIndex}-${colIndex}`}
          className={`
            w-12 h-12 flex items-center justify-center 
            ${(rowIndex + colIndex) % 2 === 0 ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'}
            ${selectedPiece?.row === rowIndex && selectedPiece?.col === colIndex ? 'border-4 border-green-500' : ''}
            cursor-pointer hover:bg-opacity-75
          `}
          onClick={() => handleSquareClick(rowIndex, colIndex)}
        >
          <span className="text-3xl">{piece}</span>
        </div>
      ))
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-4">Шахматы</h1>
      
      <div className="flex items-center space-x-4 mb-4">
        <Button 
          variant="secondary" 
          onClick={undoLastMove} 
          disabled={gameHistory.length === 0}
        >
          <RotateCcw className="mr-2" /> Отменить ход
        </Button>
        <div className="text-xl">
          Ход: {currentPlayer === 'white' ? 'Белые' : 'Черные'}
        </div>
      </div>

      <div className="grid grid-cols-8 border-4 border-gray-600">
        {renderBoard()}
      </div>

      <AlertDialog open={isGameOver}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Игра окончена!</AlertDialogTitle>
            <AlertDialogDescription>
              Победитель: {winner === 'white' ? 'Белые' : 'Черные'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-center mt-4">
            <Button onClick={() => {
              setIsGameOver(false);
              setBoard(initializeBoard());
              setCurrentPlayer('white');
            }}>
              <RefreshCw className="mr-2" /> Новая игра
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChessGame;
