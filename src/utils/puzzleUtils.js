import * as ImageManipulator from 'expo-image-manipulator';

export const generatePuzzle = async (imageUri, rows, cols) => {
  try {
    if (!imageUri || !rows || !cols || rows <= 0 || cols <= 0) {
      throw new Error('Invalid parameters for puzzle generation');
    }

    // Get image dimensions
    const imageInfo = await ImageManipulator.manipulateAsync(
      imageUri,
      [],
      { format: ImageManipulator.SaveFormat.PNG }
    );

    if (!imageInfo || !imageInfo.width || !imageInfo.height) {
      throw new Error('Failed to get image dimensions');
    }

    const originalWidth = imageInfo.width;
    const originalHeight = imageInfo.height;

    const pieceWidth = Math.floor(originalWidth / cols);
    const pieceHeight = Math.floor(originalHeight / rows);

    const pieces = [];
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const originX = col * pieceWidth;
        const originY = row * pieceHeight;
        
        const pieceImage = await ImageManipulator.manipulateAsync(
          imageUri,
          [
            {
              crop: {
                originX,
                originY,
                width: pieceWidth,
                height: pieceHeight,
              },
            },
          ],
          { format: ImageManipulator.SaveFormat.PNG, compress: 0.9 }
        );

        const edgeTypes = {
          top: row === 0 ? 'flat' : (row % 2 === 0 ? 'tab' : 'outlet'),
          right: col === cols - 1 ? 'flat' : (col % 2 === 0 ? 'tab' : 'outlet'),
          bottom: row === rows - 1 ? 'flat' : (row % 2 === 0 ? 'outlet' : 'tab'),
          left: col === 0 ? 'flat' : (col % 2 === 0 ? 'outlet' : 'tab'),
        };

        pieces.push({
          id: `${row}-${col}`,
          row,
          col,
          correctRow: row,
          correctCol: col,
          imageUri: pieceImage.uri,
          edgeTypes,
          currentX: 0,
          currentY: 0,
        });
      }
    }

    return {
      pieces,
      originalWidth,
      originalHeight,
      rows,
      cols,
    };
  } catch (error) {
    console.error('Error generating puzzle:', error);
    throw error;
  }
};

export const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};
