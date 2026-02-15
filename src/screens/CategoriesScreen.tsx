import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, Dialog, Portal, Snackbar } from 'react-native-paper';
import { useApp } from '../context/AppContext';
import { COLORS, SPACING, FONT_SIZES, CATEGORIES, formatMoney, formatShortDate } from '../utils/theme';
import { Transaction } from '../types';

export const CategoriesScreen: React.FC = () => {
  const { transactions, currency, deleteTransaction, undoAction, performUndo } = useApp();
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUndoSnackbar, setShowUndoSnackbar] = useState(false);

  // Show undo snackbar when undoAction is available
  useEffect(() => {
    if (undoAction) {
      setShowUndoSnackbar(true);
    } else {
      setShowUndoSnackbar(false);
    }
  }, [undoAction]);

  const handleDeleteTransaction = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!transactionToDelete) return;
    
    await deleteTransaction(transactionToDelete.id);
    setShowDeleteDialog(false);
    setTransactionToDelete(null);
  };

  const categoryData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const total = expenses.reduce((sum, t) => sum + t.amount, 0);
    
    const categoryTotals = new Map<string, number>();
    expenses.forEach(t => {
      const current = categoryTotals.get(t.category || 'other') || 0;
      categoryTotals.set(t.category || 'other', current + t.amount);
    });

    return CATEGORIES.map(cat => ({
      ...cat,
      total: categoryTotals.get(cat.id) || 0,
      percentage: total > 0 ? ((categoryTotals.get(cat.id) || 0) / total) * 100 : 0,
    })).sort((a, b) => b.total - a.total);
  }, [transactions]);

  const totalExpenses = categoryData.reduce((sum, cat) => sum + cat.total, 0);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Total Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Expenses</Text>
          <Text style={styles.summaryAmount}>{formatMoney(totalExpenses, currency)}</Text>
        </View>

        {/* Categories List */}
        <View style={styles.categoriesList}>
          {categoryData.map((cat) => (
            <View key={cat.id} style={styles.categoryItem}>
              <View style={[styles.categoryIcon, { backgroundColor: cat.color + '20' }]}>
                <MaterialIcons name={cat.icon as any} size={24} color={cat.color} />
              </View>
              
              <View style={styles.categoryInfo}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                  <Text style={styles.categoryAmount}>{formatMoney(cat.total, currency)}</Text>
                </View>
                
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${cat.percentage}%`, backgroundColor: cat.color },
                      ]}
                    />
                  </View>
                  <Text style={styles.percentageText}>{cat.percentage.toFixed(1)}%</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {categoryData.every(c => c.total === 0) && (
          <View style={styles.emptyState}>
            <MaterialIcons name="category" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No expenses yet</Text>
            <Text style={styles.emptySubtext}>Add expenses to see category breakdown</Text>
          </View>
        )}

        {/* Recent Transactions */}
        {transactions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <View style={styles.transactionsList}>
              {transactions.slice(0, 20).map((transaction) => {
                const category = CATEGORIES.find(c => c.id === transaction.category);
                return (
                  <View key={transaction.id} style={styles.transactionItem}>
                    <View style={styles.transactionLeft}>
                      {category && (
                        <View style={[styles.transactionIcon, { backgroundColor: category.color + '20' }]}>
                          <MaterialIcons name={category.icon as any} size={20} color={category.color} />
                        </View>
                      )}
                      <View style={styles.transactionInfo}>
                        <Text style={styles.transactionCategory}>
                          {category?.name || transaction.category || 'Other'}
                        </Text>
                        <Text style={styles.transactionDate}>
                          {formatShortDate(transaction.date)}
                        </Text>
                        {transaction.notes && (
                          <Text style={styles.transactionNotes} numberOfLines={1}>
                            {transaction.notes}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.transactionRight}>
                      <Text style={[
                        styles.transactionAmount,
                        { color: transaction.type === 'income' ? COLORS.primary : COLORS.error }
                      ]}>
                        {transaction.type === 'income' ? '+' : '-'}{formatMoney(transaction.amount, currency)}
                      </Text>
                      <Pressable 
                        onPress={() => handleDeleteTransaction(transaction)}
                        style={styles.deleteButton}
                      >
                        <MaterialIcons name="delete" size={20} color={COLORS.textLight} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>Delete Transaction?</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Are you sure you want to delete this transaction?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button 
              onPress={confirmDelete}
              textColor={COLORS.error}
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

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
        Transaction deleted
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  summaryCard: {
    backgroundColor: COLORS.primary,
    margin: SPACING.lg,
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primaryLight,
  },
  summaryAmount: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: SPACING.xs,
  },
  categoriesList: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    borderRadius: 16,
    overflow: 'hidden',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.text,
    flex: 1,
  },
  categoryAmount: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    marginRight: SPACING.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  percentageText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    width: 45,
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
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
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  transactionsList: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionCategory: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.text,
  },
  transactionDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  transactionNotes: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: 2,
    fontStyle: 'italic',
  },
  transactionRight: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  transactionAmount: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  deleteButton: {
    padding: SPACING.xs,
  },
  dialogText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
});
