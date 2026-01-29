import React, { createContext, useContext } from 'react';

const GameContext = createContext(null);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

export const GameProvider = ({ children, startPuzzleWithImage }) => {
  return (
    <GameContext.Provider value={{ startPuzzleWithImage }}>
      {children}
    </GameContext.Provider>
  );
};
