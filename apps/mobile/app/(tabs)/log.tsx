import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Camera, Sparkles, Search, Plus } from 'lucide-react-native';
import { api } from '../../src/services/api';
import { FoodItemDto, ParsedMealItem, MealType } from '@mindful-plate/shared';
import { useStore } from '../../src/store/useStore';
import { syncFoodsFromServer, searchLocalFoods } from '../../src/services/localFoodsDb';

type SearchResultFood = FoodItemDto & { id: string };
type SourceFilter = 'all' | 'common' | 'custom';
type SortBy = 'name' | 'calories' | 'protein';

const VALID_MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const PAGE_SIZE = 20;

const SOURCE_FILTERS: { value: SourceFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'common', label: 'Common' },
  { value: 'custom', label: 'My Foods' },
];

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'calories', label: 'Calories' },
  { value: 'protein', label: 'Protein' },
];

const EMPTY_CUSTOM_FOOD = {
  name: '',
  brand: '',
  servingSize: '',
  servingUnit: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
};

function mapLocalFoods(rows: Awaited<ReturnType<typeof searchLocalFoods>>): SearchResultFood[] {
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    brand: r.brand ?? undefined,
    servingSize: r.servingSize,
    servingUnit: r.servingUnit,
    calories: r.calories,
    protein: r.protein,
    carbs: r.carbs,
    fat: r.fat,
    fiber: r.fiber ?? undefined,
  }));
}

export default function LogScreen() {
  const router = useRouter();
  const { selectedDate } = useStore();
  const { mealType: mealTypeParam } = useLocalSearchParams<{ mealType?: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [mealType, setMealType] = useState<MealType>(
    VALID_MEAL_TYPES.includes(mealTypeParam as MealType) ? (mealTypeParam as MealType) : 'lunch'
  );
  const [foods, setFoods] = useState<SearchResultFood[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offlineFallback, setOfflineFallback] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [cart, setCart] = useState<ParsedMealItem[]>([]);
  const [logging, setLogging] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customFood, setCustomFood] = useState(EMPTY_CUSTOM_FOOD);
  const [creatingCustomFood, setCreatingCustomFood] = useState(false);

  // Guards against a slow page-1 request landing after the query/filter/sort
  // has already moved on and a newer request is in flight.
  const requestId = useRef(0);

  // Check for new foods on the server (e.g. custom foods added from another
  // device) every time this screen is opened, so the local cache stays current.
  useFocusEffect(
    useCallback(() => {
      syncFoodsFromServer().catch(() => {});
    }, [])
  );

  const fetchPage = useCallback(
    async (offset: number): Promise<{ items: SearchResultFood[]; hasMore: boolean; offline: boolean }> => {
      try {
        const res = await api.searchFoods(searchQuery, {
          source: sourceFilter,
          sort: sortBy,
          limit: PAGE_SIZE,
          offset,
        });
        return { items: res.foods, hasMore: res.hasMore, offline: false };
      } catch {
        // Offline fallback has no pagination — a single unpaginated page.
        const rows = await searchLocalFoods(searchQuery, sourceFilter).catch(() => []);
        return { items: mapLocalFoods(rows), hasMore: false, offline: true };
      }
    },
    [searchQuery, sourceFilter, sortBy]
  );

  // Debounced: reset to page 1 whenever the query, source filter, or sort
  // changes.
  useEffect(() => {
    const id = ++requestId.current;
    const handle = setTimeout(() => {
      setSearchLoading(true);
      fetchPage(0).then((res) => {
        if (id !== requestId.current) return; // superseded by a newer search
        setFoods(res.items);
        setHasMore(res.hasMore);
        setOfflineFallback(res.offline);
        setSearchLoading(false);
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [fetchPage]);

  const loadMore = () => {
    if (loadingMore || searchLoading || !hasMore || offlineFallback) return;
    setLoadingMore(true);
    fetchPage(foods.length).then((res) => {
      setFoods((prev) => [...prev, ...res.items]);
      setHasMore(res.hasMore);
      setLoadingMore(false);
    });
  };

  const toggleExpand = (food: SearchResultFood) => {
    if (expandedId === food.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(food.id);
    setQuantity(String(food.servingSize));
  };

  const addToCart = (food: SearchResultFood) => {
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      Alert.alert('Invalid quantity', 'Please enter a quantity greater than 0.');
      return;
    }
    const multiplier = qty / food.servingSize;
    setCart((prev) => [
      ...prev,
      {
        name: food.name,
        quantity: qty,
        unit: food.servingUnit,
        calories: Math.round(food.calories * multiplier),
        protein: Math.round(food.protein * multiplier * 10) / 10,
        carbs: Math.round(food.carbs * multiplier * 10) / 10,
        fat: Math.round(food.fat * multiplier * 10) / 10,
        fiber: food.fiber ? Math.round(food.fiber * multiplier * 10) / 10 : undefined,
      },
    ]);
    setExpandedId(null);
    setQuantity('');
  };

  const removeFromCart = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleLogMeal = async () => {
    if (cart.length === 0) return;
    setLogging(true);
    try {
      await api.logMeal({ mealType, date: selectedDate, items: cart });
      Alert.alert('Meal Logged', `${cart.length} item${cart.length > 1 ? 's' : ''} added to ${mealType}.`);
      setCart([]);
    } catch (err: any) {
      Alert.alert('Logging failed', err.message || 'Could not save this meal. Please try again.');
    } finally {
      setLogging(false);
    }
  };

  const cartTotalCalories = cart.reduce((sum, item) => sum + item.calories, 0);

  const handleCreateCustomFood = async () => {
    if (!customFood.name.trim()) {
      Alert.alert('Missing name', 'Please enter a food name.');
      return;
    }
    if (!customFood.servingUnit.trim()) {
      Alert.alert('Missing unit', 'Please enter a serving unit (e.g. g, item, cup).');
      return;
    }
    const servingSizeNum = parseFloat(customFood.servingSize);
    if (!servingSizeNum || servingSizeNum <= 0) {
      Alert.alert('Invalid serving size', 'Serving size must be greater than 0.');
      return;
    }

    setCreatingCustomFood(true);
    try {
      const res = await api.createCustomFood({
        name: customFood.name.trim(),
        brand: customFood.brand.trim() || undefined,
        servingSize: servingSizeNum,
        servingUnit: customFood.servingUnit.trim(),
        calories: parseFloat(customFood.calories) || 0,
        protein: parseFloat(customFood.protein) || 0,
        carbs: parseFloat(customFood.carbs) || 0,
        fat: parseFloat(customFood.fat) || 0,
      });
      setFoods((prev) => [res.food, ...prev]);
      setShowCustomForm(false);
      setCustomFood(EMPTY_CUSTOM_FOOD);
      Alert.alert('Food added', `"${res.food.name}" has been added to your food database.`);
    } catch (err: any) {
      Alert.alert('Could not add food', err.message || 'Please try again.');
    } finally {
      setCreatingCustomFood(false);
    }
  };

  const listHeader = (
    <View>
      <View className="pt-2 pb-4">
        <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Log Meal</Text>
        <Text className="text-white text-2xl font-black">Add Food</Text>
      </View>

      {/* Meal Category Selector */}
      <View className="flex-row bg-slate-900/80 p-1 rounded-2xl border border-slate-800 mb-4">
        {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            onPress={() => setMealType(type)}
            className={`flex-1 py-2 rounded-xl items-center ${
              mealType === type ? 'bg-emerald-500' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-xs font-semibold capitalize ${
                mealType === type ? 'text-white font-bold' : 'text-slate-400'
              }`}
            >
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* AI Shortcuts Banner */}
      <View className="flex-row space-x-3 mb-5">
        <TouchableOpacity
          onPress={() => router.push('/modal/ai-camera')}
          className="flex-1 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 items-center flex-row justify-center active:scale-98"
        >
          <Camera size={20} color="#10b981" />
          <Text className="text-emerald-400 font-bold text-sm ml-2">Photo AI</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/modal/ai-prompt')}
          className="flex-1 bg-violet-500/10 border border-violet-500/30 rounded-2xl p-4 items-center flex-row justify-center ml-2 active:scale-98"
        >
          <Sparkles size={20} color="#a78bfa" />
          <Text className="text-violet-400 font-bold text-sm ml-2">Describe AI</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View className="flex-row items-center bg-slate-900/80 border border-slate-800 rounded-2xl px-4 py-3 mb-3">
        <Search size={18} color="#64748b" />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search food database..."
          placeholderTextColor="#64748b"
          className="flex-1 text-white ml-2.5 text-sm"
        />
      </View>

      {/* Source Filter */}
      <View className="flex-row bg-slate-900/80 p-1 rounded-2xl border border-slate-800 mb-2">
        {SOURCE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            onPress={() => setSourceFilter(f.value)}
            className={`flex-1 py-2 rounded-xl items-center ${
              sourceFilter === f.value ? 'bg-sky-500' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                sourceFilter === f.value ? 'text-white font-bold' : 'text-slate-400'
              }`}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sort */}
      <View className="flex-row items-center mb-4">
        <Text className="text-slate-500 text-xs mr-2">Sort:</Text>
        {SORT_OPTIONS.map((s) => (
          <TouchableOpacity
            key={s.value}
            onPress={() => setSortBy(s.value)}
            className={`px-3 py-1.5 rounded-full mr-2 ${
              sortBy === s.value ? 'bg-emerald-500/20 border border-emerald-500/40' : 'bg-slate-900/60 border border-slate-800'
            }`}
          >
            <Text className={`text-xs font-semibold ${sortBy === s.value ? 'text-emerald-400' : 'text-slate-400'}`}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results List Header */}
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
          {searchQuery ? 'Search Results' : 'Foods'}
        </Text>
        <TouchableOpacity onPress={() => setShowCustomForm((prev) => !prev)}>
          <Text className="text-emerald-400 text-xs font-semibold">
            {showCustomForm ? 'Cancel' : '+ Custom Food'}
          </Text>
        </TouchableOpacity>
      </View>

      {offlineFallback && (
        <Text className="text-amber-400 text-xs mb-2">
          Offline — showing cached foods (no pagination while offline).
        </Text>
      )}

      {showCustomForm && (
        <View className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 mb-4">
          <Text className="text-white font-bold text-sm mb-3">New Custom Food</Text>

          <TextInput
            value={customFood.name}
            onChangeText={(v) => setCustomFood((prev) => ({ ...prev, name: v }))}
            placeholder="Food name"
            placeholderTextColor="#64748b"
            className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm mb-2"
          />
          <TextInput
            value={customFood.brand}
            onChangeText={(v) => setCustomFood((prev) => ({ ...prev, brand: v }))}
            placeholder="Brand (optional)"
            placeholderTextColor="#64748b"
            className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm mb-2"
          />
          <View className="flex-row space-x-2 mb-2">
            <TextInput
              value={customFood.servingSize}
              onChangeText={(v) => setCustomFood((prev) => ({ ...prev, servingSize: v }))}
              placeholder="Serving size"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm mr-2"
            />
            <TextInput
              value={customFood.servingUnit}
              onChangeText={(v) => setCustomFood((prev) => ({ ...prev, servingUnit: v }))}
              placeholder="Unit (g, item...)"
              placeholderTextColor="#64748b"
              className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm"
            />
          </View>
          <View className="flex-row space-x-2 mb-2">
            <TextInput
              value={customFood.calories}
              onChangeText={(v) => setCustomFood((prev) => ({ ...prev, calories: v }))}
              placeholder="Calories"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm mr-2"
            />
            <TextInput
              value={customFood.protein}
              onChangeText={(v) => setCustomFood((prev) => ({ ...prev, protein: v }))}
              placeholder="Protein (g)"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm"
            />
          </View>
          <View className="flex-row space-x-2 mb-3">
            <TextInput
              value={customFood.carbs}
              onChangeText={(v) => setCustomFood((prev) => ({ ...prev, carbs: v }))}
              placeholder="Carbs (g)"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm mr-2"
            />
            <TextInput
              value={customFood.fat}
              onChangeText={(v) => setCustomFood((prev) => ({ ...prev, fat: v }))}
              placeholder="Fat (g)"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm"
            />
          </View>

          <TouchableOpacity
            onPress={handleCreateCustomFood}
            disabled={creatingCustomFood}
            className="bg-emerald-500 active:bg-emerald-600 rounded-xl py-3 items-center"
          >
            {creatingCustomFood ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-bold text-sm">Save Custom Food</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {searchLoading && <ActivityIndicator color="#10b981" style={{ marginVertical: 16 }} />}
    </View>
  );

  const listFooter = (
    <View>
      {loadingMore && <ActivityIndicator color="#10b981" style={{ marginVertical: 12 }} />}

      {cart.length > 0 && (
        <>
          <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 mt-2">
            Queued for {mealType}
          </Text>
          {cart.map((item, idx) => (
            <View
              key={idx}
              className="flex-row items-center justify-between bg-slate-900/40 border border-slate-800/60 rounded-2xl p-3 mb-2"
            >
              <View className="flex-1 pr-2">
                <Text className="text-white text-sm font-medium">{item.name}</Text>
                <Text className="text-slate-500 text-xs mt-0.5">
                  {item.quantity}{item.unit} • {item.calories} kcal
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeFromCart(idx)} className="px-2 py-1">
                <Text className="text-red-400 text-xs font-semibold">Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      <View className="h-4" />
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-950 px-4">
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <FlatList
          data={foods}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          ListEmptyComponent={
            !searchLoading ? (
              <Text className="text-slate-500 text-sm text-center my-6">No foods found.</Text>
            ) : null
          }
          renderItem={({ item: food }) => (
            <View className="bg-slate-900/60 border border-slate-800/80 rounded-2xl mb-2.5 overflow-hidden">
              <TouchableOpacity
                onPress={() => toggleExpand(food)}
                className="flex-row items-center justify-between p-4"
              >
                <View className="flex-1 pr-2">
                  <Text className="text-white font-semibold text-sm">{food.name}</Text>
                  <Text className="text-slate-500 text-xs mt-0.5">
                    {food.servingSize}{food.servingUnit} • P: {food.protein}g | C: {food.carbs}g | F: {food.fat}g
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Text className="text-emerald-400 font-bold text-sm mr-3">{food.calories} kcal</Text>
                  <View className="w-8 h-8 rounded-full bg-emerald-500/20 items-center justify-center">
                    <Plus size={16} color="#10b981" />
                  </View>
                </View>
              </TouchableOpacity>

              {expandedId === food.id && (
                <View className="px-4 pb-4 flex-row items-center">
                  <TextInput
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                    autoFocus
                    className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm mr-3"
                  />
                  <Text className="text-slate-400 text-xs mr-3">{food.servingUnit}</Text>
                  <TouchableOpacity
                    onPress={() => addToCart(food)}
                    className="bg-emerald-500 active:bg-emerald-600 rounded-xl px-4 py-2"
                  >
                    <Text className="text-white font-bold text-xs">Add</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />

        {cart.length > 0 && (
          <View className="border-t border-slate-800 pt-3">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-slate-400 text-xs">
                {cart.length} item{cart.length > 1 ? 's' : ''} queued • {cartTotalCalories} kcal
              </Text>
              <TouchableOpacity onPress={() => setCart([])}>
                <Text className="text-slate-500 text-xs">Clear</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={handleLogMeal}
              disabled={logging}
              className="bg-emerald-500 active:bg-emerald-600 rounded-2xl py-3.5 items-center flex-row justify-center mb-3"
            >
              {logging ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-bold text-sm">
                  Log {cart.length} item{cart.length > 1 ? 's' : ''} to {mealType}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
