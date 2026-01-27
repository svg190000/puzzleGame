import * as ImageManipulator from 'expo-image-manipulator';

export const generatePuzzle = async (imageUri, rows, cols, targetBoardWidth, targetBoardHeight) => {
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
    const originalAspectRatio = originalWidth / originalHeight;
    
    // Calculate target aspect ratio for the board
    const targetAspectRatio = targetBoardWidth / targetBoardHeight;
    
    let processedImageUri = imageUri;
    let processedWidth = originalWidth;
    let processedHeight = originalHeight;
    
    // Scale and crop image to fit board dimensions, keeping center in focus
    // Use a two-step scaling process to maintain HD quality: scale to 2x first, then downscale
    // Only use 2x scaling if the original image is large enough to avoid upscaling artifacts
    const QUALITY_SCALE_FACTOR = 2; // Scale to 2x resolution first for better quality
    
    if (originalAspectRatio > targetAspectRatio) {
      // Image is wider than target - scale to fit height, then crop from sides
      const scaleFactor = targetBoardHeight / originalHeight;
      const scaledWidth = originalWidth * scaleFactor;
      const scaledHeight = targetBoardHeight;
      
      // Crop from center (trim evenly from left and right)
      const cropWidth = targetBoardWidth;
      const cropX = (scaledWidth - cropWidth) / 2;
      
      // Use 2x scaling only if original image is large enough (at least 2x the target)
      const useQualityScaling = originalWidth >= cropWidth * QUALITY_SCALE_FACTOR && 
                                 originalHeight >= scaledHeight * QUALITY_SCALE_FACTOR;
      
      let manipulationActions = [];
      if (useQualityScaling) {
        // First scale to 2x resolution for better quality preservation
        const highResWidth = scaledWidth * QUALITY_SCALE_FACTOR;
        const highResHeight = scaledHeight * QUALITY_SCALE_FACTOR;
        const highResCropWidth = cropWidth * QUALITY_SCALE_FACTOR;
        const highResCropX = cropX * QUALITY_SCALE_FACTOR;
        
        manipulationActions = [
          { resize: { width: highResWidth, height: highResHeight } },
          { crop: { originX: highResCropX, originY: 0, width: highResCropWidth, height: highResHeight } },
          { resize: { width: cropWidth, height: scaledHeight } } // Final scale down to target size
        ];
      } else {
        // Direct scaling if original is not large enough for 2x scaling
        manipulationActions = [
          { resize: { width: scaledWidth, height: scaledHeight } },
          { crop: { originX: cropX, originY: 0, width: cropWidth, height: scaledHeight } }
        ];
      }
      
      const scaledImage = await ImageManipulator.manipulateAsync(
        imageUri,
        manipulationActions,
        { format: ImageManipulator.SaveFormat.PNG, compress: 1 }
      );
      
      processedImageUri = scaledImage.uri;
      processedWidth = cropWidth;
      processedHeight = scaledHeight;
    } else {
      // Image is taller than target - scale to fit width, then crop from top/bottom
      const scaleFactor = targetBoardWidth / originalWidth;
      const scaledWidth = targetBoardWidth;
      const scaledHeight = originalHeight * scaleFactor;
      
      // Crop from center (trim evenly from top and bottom)
      const cropHeight = targetBoardHeight;
      const cropY = (scaledHeight - cropHeight) / 2;
      
      // Use 2x scaling only if original image is large enough (at least 2x the target)
      const useQualityScaling = originalWidth >= scaledWidth * QUALITY_SCALE_FACTOR && 
                                 originalHeight >= cropHeight * QUALITY_SCALE_FACTOR;
      
      let manipulationActions = [];
      if (useQualityScaling) {
        // First scale to 2x resolution for better quality preservation
        const highResWidth = scaledWidth * QUALITY_SCALE_FACTOR;
        const highResHeight = scaledHeight * QUALITY_SCALE_FACTOR;
        const highResCropHeight = cropHeight * QUALITY_SCALE_FACTOR;
        const highResCropY = cropY * QUALITY_SCALE_FACTOR;
        
        manipulationActions = [
          { resize: { width: highResWidth, height: highResHeight } },
          { crop: { originX: 0, originY: highResCropY, width: highResWidth, height: highResCropHeight } },
          { resize: { width: scaledWidth, height: cropHeight } } // Final scale down to target size
        ];
      } else {
        // Direct scaling if original is not large enough for 2x scaling
        manipulationActions = [
          { resize: { width: scaledWidth, height: scaledHeight } },
          { crop: { originX: 0, originY: cropY, width: scaledWidth, height: cropHeight } }
        ];
      }
      
      const scaledImage = await ImageManipulator.manipulateAsync(
        imageUri,
        manipulationActions,
        { format: ImageManipulator.SaveFormat.PNG, compress: 1 }
      );
      
      processedImageUri = scaledImage.uri;
      processedWidth = scaledWidth;
      processedHeight = cropHeight;
    }

    // Calculate integer piece dimensions
    // targetBoardWidth and targetBoardHeight should already be multiples of the grid size
    // ensuring integer piece dimensions
    const pieceWidth = Math.floor(targetBoardWidth / cols);
    const pieceHeight = Math.floor(targetBoardHeight / rows);
    
    // Ensure the processed image exactly matches the target dimensions
    // This guarantees all pieces will be the same integer size
    const exactWidth = pieceWidth * cols;
    const exactHeight = pieceHeight * rows;
    
    // If the processed image doesn't match exactly, resize it
    if (Math.abs(processedWidth - exactWidth) > 0.5 || Math.abs(processedHeight - exactHeight) > 0.5) {
      const finalImage = await ImageManipulator.manipulateAsync(
        processedImageUri,
        [
          { resize: { width: exactWidth, height: exactHeight } }
        ],
        { format: ImageManipulator.SaveFormat.PNG, compress: 1 }
      );
      processedImageUri = finalImage.uri;
      processedWidth = exactWidth;
      processedHeight = exactHeight;
    }

    const pieces = [];
    // Crop each piece on pixel boundaries (integer origin, integer size).
    // Adjacent pieces share edges exactly; no "between pixels" slicing.

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const originX = Math.round(col * pieceWidth);
        const originY = Math.round(row * pieceHeight);
        const cropWidth = Math.round(pieceWidth);
        const cropHeight = Math.round(pieceHeight);

        const pieceImage = await ImageManipulator.manipulateAsync(
          processedImageUri,
          [
            {
              crop: {
                originX,
                originY,
                width: cropWidth,
                height: cropHeight,
              },
            },
          ],
          { format: ImageManipulator.SaveFormat.PNG, compress: 1 }
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
