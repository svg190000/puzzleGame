import * as ImageManipulator from 'expo-image-manipulator';

// Performance constants
const MAX_DIMENSION = 2048; // Cap image processing at 2048px to prevent slowdowns
const JPEG_QUALITY = 0.85; // Balance between quality and speed (0.85 is good quality, much faster than PNG)

/**
 * Creates manipulation actions for scaling and cropping an image to fit target dimensions.
 * Optimized: removed quality scaling factor to reduce operations from 3 to 2.
 */
const createScaleAndCropActions = (originalWidth, originalHeight, targetWidth, targetHeight, isWider) => {
  if (isWider) {
    const scaleFactor = targetHeight / originalHeight;
    const scaledWidth = originalWidth * scaleFactor;
    const cropWidth = targetWidth;
    const cropX = (scaledWidth - cropWidth) / 2;
    
    return [
      { resize: { width: scaledWidth, height: targetHeight } },
      { crop: { originX: cropX, originY: 0, width: cropWidth, height: targetHeight } }
    ];
  } else {
    const scaleFactor = targetWidth / originalWidth;
    const scaledHeight = originalHeight * scaleFactor;
    const cropHeight = targetHeight;
    const cropY = (scaledHeight - cropHeight) / 2;
    
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

    // Cap target dimensions to prevent processing oversized images
    const maxDimension = Math.max(targetBoardWidth, targetBoardHeight);
    if (maxDimension > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / maxDimension;
      targetBoardWidth = Math.round(targetBoardWidth * scale);
      targetBoardHeight = Math.round(targetBoardHeight * scale);
    }

    // Get image dimensions (use JPEG for faster processing)
    const imageInfo = await ImageManipulator.manipulateAsync(
      imageUri,
      [],
      { format: ImageManipulator.SaveFormat.JPEG }
    );

    if (!imageInfo || !imageInfo.width || !imageInfo.height) {
      throw new Error('Failed to get image dimensions');
    }

    const originalWidth = imageInfo.width;
    const originalHeight = imageInfo.height;
    
    // Calculate integer piece dimensions first to ensure exact fit
    const pieceWidth = Math.floor(targetBoardWidth / cols);
    const pieceHeight = Math.floor(targetBoardHeight / rows);
    const exactWidth = pieceWidth * cols;
    const exactHeight = pieceHeight * rows;
    
    // Pre-scale very large source images to speed up processing (only if significantly larger than target)
    let sourceUri = imageUri;
    let sourceWidth = originalWidth;
    let sourceHeight = originalHeight;
    const sourceMaxDimension = Math.max(originalWidth, originalHeight);
    const targetMaxDimension = Math.max(exactWidth, exactHeight);
    
    // Only pre-scale if source is more than 2x larger than target
    if (sourceMaxDimension > targetMaxDimension * 2) {
      const preScale = (targetMaxDimension * 2) / sourceMaxDimension;
      const preScaledWidth = Math.round(originalWidth * preScale);
      const preScaledHeight = Math.round(originalHeight * preScale);
      const preScaled = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: preScaledWidth, height: preScaledHeight } }],
        { format: ImageManipulator.SaveFormat.JPEG, compress: JPEG_QUALITY }
      );
      sourceUri = preScaled.uri;
      sourceWidth = preScaledWidth;
      sourceHeight = preScaledHeight;
    }
    
    const isWider = (sourceWidth / sourceHeight) > (exactWidth / exactHeight);
    
    // Scale and crop image to fit exact board dimensions, keeping center in focus
    const manipulationActions = createScaleAndCropActions(
      sourceWidth,
      sourceHeight,
      exactWidth,
      exactHeight,
      isWider
    );
    
    const scaledImage = await ImageManipulator.manipulateAsync(
      sourceUri,
      manipulationActions,
      { format: ImageManipulator.SaveFormat.JPEG, compress: JPEG_QUALITY }
    );
    
    const processedImageUri = scaledImage.uri;

    // Generate all piece crops in parallel for faster processing
    const piecePromises = [];
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const originX = Math.round(col * pieceWidth);
        const originY = Math.round(row * pieceHeight);
        
        const piecePromise = ImageManipulator.manipulateAsync(
          processedImageUri,
          [{ crop: { originX, originY, width: Math.round(pieceWidth), height: Math.round(pieceHeight) } }],
          { format: ImageManipulator.SaveFormat.JPEG, compress: JPEG_QUALITY }
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
