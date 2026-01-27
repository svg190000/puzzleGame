import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Creates manipulation actions for scaling and cropping an image to fit target dimensions.
 * Uses quality scaling (2x then downscale) when source image is large enough.
 */
const createScaleAndCropActions = (originalWidth, originalHeight, targetWidth, targetHeight, isWider) => {
  const QUALITY_SCALE_FACTOR = 2;
  
  if (isWider) {
    const scaleFactor = targetHeight / originalHeight;
    const scaledWidth = originalWidth * scaleFactor;
    const cropWidth = targetWidth;
    const cropX = (scaledWidth - cropWidth) / 2;
    
    const useQualityScaling = originalWidth >= cropWidth * QUALITY_SCALE_FACTOR && 
                               originalHeight >= targetHeight * QUALITY_SCALE_FACTOR;
    
    if (useQualityScaling) {
      return [
        { resize: { width: scaledWidth * QUALITY_SCALE_FACTOR, height: targetHeight * QUALITY_SCALE_FACTOR } },
        { crop: { originX: cropX * QUALITY_SCALE_FACTOR, originY: 0, width: cropWidth * QUALITY_SCALE_FACTOR, height: targetHeight * QUALITY_SCALE_FACTOR } },
        { resize: { width: cropWidth, height: targetHeight } }
      ];
    }
    return [
      { resize: { width: scaledWidth, height: targetHeight } },
      { crop: { originX: cropX, originY: 0, width: cropWidth, height: targetHeight } }
    ];
  } else {
    const scaleFactor = targetWidth / originalWidth;
    const scaledHeight = originalHeight * scaleFactor;
    const cropHeight = targetHeight;
    const cropY = (scaledHeight - cropHeight) / 2;
    
    const useQualityScaling = originalWidth >= targetWidth * QUALITY_SCALE_FACTOR && 
                               originalHeight >= cropHeight * QUALITY_SCALE_FACTOR;
    
    if (useQualityScaling) {
      return [
        { resize: { width: targetWidth * QUALITY_SCALE_FACTOR, height: scaledHeight * QUALITY_SCALE_FACTOR } },
        { crop: { originX: 0, originY: cropY * QUALITY_SCALE_FACTOR, width: targetWidth * QUALITY_SCALE_FACTOR, height: cropHeight * QUALITY_SCALE_FACTOR } },
        { resize: { width: targetWidth, height: cropHeight } }
      ];
    }
    return [
      { resize: { width: targetWidth, height: scaledHeight } },
      { crop: { originX: 0, originY: cropY, width: targetWidth, height: cropHeight } }
    ];
  }
};

export const generatePuzzle = async (imageUri, rows, cols, targetBoardWidth, targetBoardHeight) => {
  try {
    if (!imageUri || !rows || !cols || rows <= 0 || cols <= 0) {
      throw new Error('Invalid parameters for puzzle generation');
    }

    // targetBoardWidth and targetBoardHeight are now pixel dimensions (not layout units)
    // This ensures the generated bitmap matches device pixel density for maximum sharpness

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
    const isWider = (originalWidth / originalHeight) > (targetBoardWidth / targetBoardHeight);
    
    // Scale and crop image to fit board dimensions, keeping center in focus
    const manipulationActions = createScaleAndCropActions(
      originalWidth,
      originalHeight,
      targetBoardWidth,
      targetBoardHeight,
      isWider
    );
    
    const scaledImage = await ImageManipulator.manipulateAsync(
      imageUri,
      manipulationActions,
      { format: ImageManipulator.SaveFormat.PNG, compress: 1 }
    );
    
    let processedImageUri = scaledImage.uri;
    let processedWidth = targetBoardWidth;
    let processedHeight = targetBoardHeight;

    // Calculate integer piece dimensions and exact coverage
    const pieceWidth = Math.floor(targetBoardWidth / cols);
    const pieceHeight = Math.floor(targetBoardHeight / rows);
    const exactWidth = pieceWidth * cols;
    const exactHeight = pieceHeight * rows;
    
    // Only resize if there's a significant mismatch to avoid quality degradation
    const RESIZE_THRESHOLD = 4;
    if (Math.abs(processedWidth - exactWidth) > RESIZE_THRESHOLD || 
        Math.abs(processedHeight - exactHeight) > RESIZE_THRESHOLD) {
      const finalImage = await ImageManipulator.manipulateAsync(
        processedImageUri,
        [{ resize: { width: exactWidth, height: exactHeight } }],
        { format: ImageManipulator.SaveFormat.PNG, compress: 1 }
      );
      processedImageUri = finalImage.uri;
      processedWidth = exactWidth;
      processedHeight = exactHeight;
    }

    // Generate all piece crops in parallel for faster processing
    const piecePromises = [];
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const originX = Math.round(col * pieceWidth);
        const originY = Math.round(row * pieceHeight);
        
        const piecePromise = ImageManipulator.manipulateAsync(
          processedImageUri,
          [{ crop: { originX, originY, width: Math.round(pieceWidth), height: Math.round(pieceHeight) } }],
          { format: ImageManipulator.SaveFormat.PNG, compress: 1 }
        ).then((pieceImage) => ({
          id: `${row}-${col}`,
          row,
          col,
          correctRow: row,
          correctCol: col,
          imageUri: pieceImage.uri,
          edgeTypes: {
            top: row === 0 ? 'flat' : (row % 2 === 0 ? 'tab' : 'outlet'),
            right: col === cols - 1 ? 'flat' : (col % 2 === 0 ? 'tab' : 'outlet'),
            bottom: row === rows - 1 ? 'flat' : (row % 2 === 0 ? 'outlet' : 'tab'),
            left: col === 0 ? 'flat' : (col % 2 === 0 ? 'outlet' : 'tab'),
          },
          currentX: 0,
          currentY: 0,
        }));

        piecePromises.push(piecePromise);
      }
    }

    const pieces = await Promise.all(piecePromises);

    return {
      pieces,
      originalWidth: exactWidth,
      originalHeight: exactHeight,
      originalImageUri: processedImageUri,
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
