import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, Modal, Dimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { PinchGestureHandler, State } from 'react-native-gesture-handler';
import { Animated } from 'react-native';
import { Button, Snackbar } from 'react-native-paper';
import { useApp, useColors } from '../context/AppContext';
import { COLORS, SPACING, FONT_SIZES, formatMoney, formatShortDate, CATEGORIES, ColorPalette } from '../utils/theme';
import { DailyFolder, Receipt } from '../types';
import * as db from '../services/database';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GALLERY_COLUMN_WIDTH = (SCREEN_WIDTH - SPACING.lg * 3) / 2;

// Helper: Get LOCAL date string (YYYY-MM-DD) from any date input
const getLocalDateKey = (dateInput: string | Date): string => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  // Use local timezone methods
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};


const ZoomableImage = ({ uri }: { uri: string }) => {
  const scale = React.useRef(new Animated.Value(1)).current;
  const lastScale = React.useRef(1);

  const onPinchEvent = Animated.event(
    [{ nativeEvent: { scale } }],
    { useNativeDriver: true }
  );

  const onPinchStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      lastScale.current *= event.nativeEvent.scale;
      // Limit scale
      lastScale.current = Math.max(1, Math.min(lastScale.current, 4));

      scale.setValue(1);
      scale.setOffset(lastScale.current);
      scale.setValue(0); // This is tricky without reanimated, simplified approach:
      // Actually, standard Animated loop is hard for pinch. 
      // Let's use a simpler approach: restart scaling from 1 but visually apply previous scale * new scale
    }
  };

  // Improved simple pinch logic for Android using minimal dependencies
  // Since we can't use Reanimated easily, let's use a basic View wrapper that handles the scale prop
  // But wait, the previous code block was just a comment. Let's implement fully.

  return (
    <PinchGestureHandler
      onGestureEvent={onPinchEvent}
      onHandlerStateChange={onPinchStateChange}
    >
      <Animated.Image
        source={{ uri }}
        style={[
          { width: '100%', height: '100%' },
          {
            transform: [{ scale }],
          },
        ]}
        resizeMode="contain"
      />
    </PinchGestureHandler>
  );
};

export const ReceiptsScreen: React.FC = () => {
  const { receipts, currency, deleteReceipt, undoAction, performUndo } = useApp();
  const COLORS = useColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [selectedFolder, setSelectedFolder] = useState<DailyFolder | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [receiptToDelete, setReceiptToDelete] = useState<Receipt | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [linkedExpensesCount, setLinkedExpensesCount] = useState(0);
  const [showUndoSnackbar, setShowUndoSnackbar] = useState(false);
  const [imageHeights, setImageHeights] = useState<{ [key: string]: number }>({});

  // Show undo snackbar when undoAction is available
  useEffect(() => {
    if (undoAction) {
      setShowUndoSnackbar(true);
    } else {
      setShowUndoSnackbar(false);
    }
  }, [undoAction]);

  const handleDeleteReceipt = async (receipt: Receipt) => {
    const linked = await db.getTransactionsByReceiptId(receipt.id);
    setLinkedExpensesCount(linked.length);
    setReceiptToDelete(receipt);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async (deleteLinkedExpenses: boolean) => {
    if (!receiptToDelete) return;
    await deleteReceipt(receiptToDelete.id, deleteLinkedExpenses);
    setShowDeleteDialog(false);
    setReceiptToDelete(null);
    setSelectedReceipt(null);
  };

  // PRIORITY 0 FIX: Use LOCAL date for grouping
  const dailyFolders = useMemo(() => {
    const folders = new Map<string, Receipt[]>();

    receipts.forEach(receipt => {
      // CRITICAL: Use local date key from createdAt (when it was saved)
      const localDateKey = getLocalDateKey(receipt.createdAt);
      const existing = folders.get(localDateKey) || [];
      folders.set(localDateKey, [...existing, receipt]);
    });

    const result: DailyFolder[] = [];
    folders.forEach((recs, date) => {
      result.push({
        date,
        receipts: recs,
        count: recs.length,
      });
    });

    // Sort by date descending (newest first)
    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [receipts]);

  // Load image dimensions for masonry layout
  useEffect(() => {
    if (selectedFolder) {
      selectedFolder.receipts.forEach(receipt => {
        if (receipt.imageUri && !imageHeights[receipt.id]) {
          Image.getSize(
            receipt.imageUri,
            (width, height) => {
              const scaledHeight = (GALLERY_COLUMN_WIDTH / width) * height;
              setImageHeights(prev => ({ ...prev, [receipt.id]: Math.min(scaledHeight, 350) }));
            },
            () => setImageHeights(prev => ({ ...prev, [receipt.id]: 200 }))
          );
        }
      });
    }
  }, [selectedFolder]);

  const renderFolder = ({ item }: { item: DailyFolder }) => {
    const totalForDay = item.receipts.reduce((sum, r) => sum + r.totalAmount, 0);
    // Get first receipt with image for thumbnail
    const firstReceipt = item.receipts.find(r => r.imageUri);

    return (
      <Pressable style={styles.folderItem} onPress={() => setSelectedFolder(item)}>
        {/* Receipt thumbnail or icon */}
        <View style={styles.folderIcon}>
          {firstReceipt?.imageUri ? (
            <Image
              source={{ uri: firstReceipt.imageUri }}
              style={styles.folderThumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.folderIconPlaceholder}>
              <MaterialIcons name="receipt-long" size={24} color={COLORS.textSecondary} />
            </View>
          )}
        </View>
        <View style={styles.folderInfo}>
          <Text style={styles.folderDate}>{formatShortDate(item.date)}</Text>
          <Text style={styles.folderCount}>
            {item.count} receipt{item.count !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.folderAmount}>
          <Text style={styles.folderTotal}>{formatMoney(totalForDay, currency)}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={COLORS.textLight} />
      </Pressable>
    );
  };

  const renderReceipt = ({ item }: { item: Receipt }) => {
    const category = CATEGORIES.find(c => c.id === item.category);

    return (
      <Pressable style={styles.receiptCard} onPress={() => setSelectedReceipt(item)}>
        {/* Full receipt image - no cropping */}
        {item.imageUri ? (
          <Image
            source={{ uri: item.imageUri }}
            style={styles.receiptCardImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.receiptCardPlaceholder}>
            <MaterialIcons name="receipt" size={48} color={COLORS.textLight} />
            <Text style={styles.noImageText}>No Image</Text>
          </View>
        )}

        {/* Receipt info overlay at bottom */}
        <View style={styles.receiptCardInfo}>
          <View style={styles.receiptCardHeader}>
            <Text style={styles.receiptCardStore} numberOfLines={1}>
              {item.storeName || 'Unknown Store'}
            </Text>
            <Text style={styles.receiptCardAmount}>
              {formatMoney(item.totalAmount, currency)}
            </Text>
          </View>
          <Text style={styles.receiptCardDate}>
            {item.date ? formatShortDate(item.date) : '—'}
          </Text>
          {category && (
            <View style={[styles.receiptCardCategory, { backgroundColor: category.color + '20' }]}>
              <MaterialIcons name={category.icon as any} size={14} color={category.color} />
              <Text style={[styles.receiptCardCategoryText, { color: category.color }]}>
                {category.name.split('/')[0].trim()}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {dailyFolders.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="receipt-long" size={64} color={COLORS.textLight} />
          <Text style={styles.emptyText}>No receipts yet</Text>
          <Text style={styles.emptySubtext}>Scan receipts to see them here</Text>
        </View>
      ) : (
        <FlatList
          data={dailyFolders}
          renderItem={renderFolder}
          keyExtractor={(item) => item.date}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* PRIORITY A: Visual Gallery Modal - Masonry Layout */}
      <Modal
        visible={!!selectedFolder}
        animationType="slide"
        onRequestClose={() => setSelectedFolder(null)}
      >
        <SafeAreaView style={styles.galleryContainer}>
          {/* Gallery Header */}
          <View style={styles.galleryHeader}>
            <Pressable onPress={() => setSelectedFolder(null)} style={styles.galleryBackButton}>
              <MaterialIcons name="arrow-back" size={24} color={COLORS.text} />
            </Pressable>
            <View style={styles.galleryHeaderInfo}>
              <Text style={styles.galleryTitle}>
                {selectedFolder ? formatShortDate(selectedFolder.date) : ''}
              </Text>
              <Text style={styles.gallerySubtitle}>
                {selectedFolder?.count} receipt{selectedFolder?.count !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* Masonry Gallery - "Clean Desk" Look */}
          {selectedFolder && (
            <ScrollView
              style={styles.galleryScroll}
              contentContainerStyle={styles.galleryContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.masonryContainer}>
                {/* Left Column */}
                <View style={styles.masonryColumn}>
                  {selectedFolder.receipts
                    .filter((_, idx) => idx % 2 === 0)
                    .map(receipt => (
                      <Pressable
                        key={receipt.id}
                        style={styles.receiptTile}
                        onPress={() => setSelectedReceipt(receipt)}
                      >
                        {receipt.imageUri ? (
                          <Image
                            source={{ uri: receipt.imageUri }}
                            style={[
                              styles.receiptTileImage,
                              { height: imageHeights[receipt.id] || 200 }
                            ]}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.receiptTilePlaceholder, { height: 150 }]}>
                            <MaterialIcons name="receipt" size={40} color={COLORS.textLight} />
                          </View>
                        )}
                        {/* Receipt Info Overlay */}
                        <View style={styles.receiptTileOverlay}>
                          <Text style={styles.tileStoreName} numberOfLines={1}>
                            {receipt.storeName || 'Unknown Store'}
                          </Text>
                          <Text style={styles.tileAmount}>
                            {formatMoney(receipt.totalAmount, currency)}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                </View>
                {/* Right Column */}
                <View style={styles.masonryColumn}>
                  {selectedFolder.receipts
                    .filter((_, idx) => idx % 2 === 1)
                    .map(receipt => (
                      <Pressable
                        key={receipt.id}
                        style={styles.receiptTile}
                        onPress={() => setSelectedReceipt(receipt)}
                      >
                        {receipt.imageUri ? (
                          <Image
                            source={{ uri: receipt.imageUri }}
                            style={[
                              styles.receiptTileImage,
                              { height: imageHeights[receipt.id] || 220 }
                            ]}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.receiptTilePlaceholder, { height: 180 }]}>
                            <MaterialIcons name="receipt" size={40} color={COLORS.textLight} />
                          </View>
                        )}
                        {/* Receipt Info Overlay */}
                        <View style={styles.receiptTileOverlay}>
                          <Text style={styles.tileStoreName} numberOfLines={1}>
                            {receipt.storeName || 'Unknown Store'}
                          </Text>
                          <Text style={styles.tileAmount}>
                            {formatMoney(receipt.totalAmount, currency)}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                </View>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Receipt Detail Modal - FULL SCREEN with DARK BACKGROUND */}
      <Modal
        visible={!!selectedReceipt}
        animationType="fade"
        onRequestClose={() => setSelectedReceipt(null)}
        statusBarTranslucent
      >
        <View style={styles.fullScreenModal}>
          {/* Header with controls */}
          <SafeAreaView style={styles.fullScreenHeader} edges={['top']}>
            <Pressable onPress={() => setSelectedReceipt(null)} style={styles.fullScreenButton}>
              <MaterialIcons name="close" size={28} color="#FFF" />
            </Pressable>
            <View style={styles.fullScreenInfo}>
              <Text style={styles.fullScreenStore} numberOfLines={1}>
                {selectedReceipt?.storeName || 'Receipt'}
              </Text>
              <Text style={styles.fullScreenAmount}>
                {selectedReceipt ? formatMoney(selectedReceipt.totalAmount, currency) : ''}
              </Text>
            </View>
            <Pressable
              onPress={() => selectedReceipt && handleDeleteReceipt(selectedReceipt)}
              style={styles.fullScreenButton}
            >
              <MaterialIcons name="delete" size={28} color={COLORS.error} />
            </Pressable>
          </SafeAreaView>

          {/* Zoomable Image Area */}
          {selectedReceipt?.imageUri ? (
            <ScrollView
              style={styles.zoomContainer}
              contentContainerStyle={styles.zoomContent}
              maximumZoomScale={4}
              minimumZoomScale={1}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              centerContent
              bouncesZoom
            >
              <Image
                source={{ uri: selectedReceipt.imageUri }}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
            </ScrollView>
          ) : (
            <View style={styles.noImageFullScreen}>
              <MaterialIcons name="receipt" size={80} color="#666" />
              <Text style={styles.noImageFullScreenText}>No Image Available</Text>
            </View>
          )}

          {/* DELETE DIALOG */}
          {showDeleteDialog && (
            <View style={styles.deleteDialogOverlay}>
              <View style={styles.deleteDialogContainer}>
                <Text style={styles.deleteDialogTitle}>Delete Receipt?</Text>
                <Text style={styles.deleteDialogText}>
                  {linkedExpensesCount > 0
                    ? `This receipt has ${linkedExpensesCount} linked expense${linkedExpensesCount > 1 ? 's' : ''}. What would you like to do?`
                    : 'Are you sure you want to delete this receipt?'}
                </Text>
                <View style={styles.deleteDialogButtons}>
                  <Button
                    mode="outlined"
                    onPress={() => setShowDeleteDialog(false)}
                    style={styles.deleteDialogButton}
                  >
                    Cancel
                  </Button>
                  {linkedExpensesCount > 0 ? (
                    <>
                      <Button
                        mode="outlined"
                        onPress={() => confirmDelete(false)}
                        style={styles.deleteDialogButton}
                      >
                        Receipt Only
                      </Button>
                      <Button
                        mode="contained"
                        onPress={() => confirmDelete(true)}
                        buttonColor={COLORS.error}
                        style={styles.deleteDialogButton}
                      >
                        Delete All
                      </Button>
                    </>
                  ) : (
                    <Button
                      mode="contained"
                      onPress={() => confirmDelete(false)}
                      buttonColor={COLORS.error}
                      style={styles.deleteDialogButton}
                    >
                      Delete
                    </Button>
                  )}
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Portal Dialog removed - now inside Modal */}

      {/* Undo Snackbar */}
      <Snackbar
        visible={showUndoSnackbar}
        onDismiss={() => setShowUndoSnackbar(false)}
        duration={5000}
        action={{
          label: 'UNDO',
          onPress: () => {
            performUndo();
            setShowUndoSnackbar(false);
          },
        }}
        style={{ backgroundColor: COLORS.text }}
      >
        {undoAction?.type === 'receipt' ? 'Receipt deleted' : 'Item deleted'}
      </Snackbar>
    </SafeAreaView>
  );
};

const createStyles = (COLORS: ColorPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: SPACING.lg,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  folderIcon: {
    marginRight: SPACING.md,
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
  },
  folderThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  folderIconPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderInfo: {
    flex: 1,
  },
  folderDate: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  folderCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  folderAmount: {
    marginRight: SPACING.sm,
  },
  folderTotal: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  // ======== MASONRY GALLERY STYLES ========
  galleryContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  galleryBackButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryHeaderInfo: {
    flex: 1,
    alignItems: 'center',
  },
  galleryTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  gallerySubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  galleryScroll: {
    flex: 1,
  },
  galleryContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl * 2,
  },
  masonryContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  masonryColumn: {
    flex: 1,
    gap: SPACING.md,
  },
  receiptTile: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  receiptTileImage: {
    width: '100%',
    backgroundColor: COLORS.border,
  },
  receiptTilePlaceholder: {
    width: '100%',
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptTileOverlay: {
    padding: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tileStoreName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  tileAmount: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
  // Legacy modal styles (kept for backwards compat)
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  // NEW: Receipt Card Layout (no cropping)
  receiptCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  receiptCardImage: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.border,
  },
  receiptCardPlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  receiptCardInfo: {
    padding: SPACING.md,
  },
  receiptCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptCardStore: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginRight: SPACING.sm,
  },
  receiptCardAmount: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  receiptCardDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: 2,
  },
  receiptCardCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: SPACING.sm,
    gap: 4,
  },
  receiptCardCategoryText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
  },

  // NEW: Full Screen Modal (dark background, pinch-to-zoom)
  fullScreenModal: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  fullScreenButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenInfo: {
    flex: 1,
    alignItems: 'center',
  },
  fullScreenStore: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: '#FFF',
  },
  fullScreenAmount: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
  zoomContainer: {
    flex: 1,
  },
  zoomContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  noImageFullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageFullScreenText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  fullScreenFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  footerText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  footerHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },

  // Legacy styles (kept for backwards compat)
  receiptDetail: {
    flex: 1,
  },
  detailLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  detailValue: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  detailAmount: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: SPACING.xs,
  },
  dialogText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  // Delete dialog styles (FIX #4)
  deleteDialogOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  deleteDialogContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 400,
  },
  deleteDialogTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  deleteDialogText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  deleteDialogButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  deleteDialogButton: {
    minWidth: 80,
  },
});
