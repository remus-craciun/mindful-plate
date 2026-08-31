import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, KeyboardAvoidingView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { BookOpen, Plus, ChefHat, X, Sparkles, Check, PenLine } from 'lucide-react-native';
import { api } from '../../src/services/api';
import { useStore } from '../../src/store/useStore';
import { MealType, RecipeIngredientDto, AiRecipeAnalysisResult } from '@mindful-plate/shared';
import { ErrorScreen } from '../../src/components/ErrorScreen';

interface Recipe {
  id: string;
  title: string;
  instructions: string | null;
  servings: number;
  caloriesPerServing: number;
  proteinPerServing: number;
  carbsPerServing: number;
  fatPerServing: number;
  ingredients: RecipeIngredientDto[];
}

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const EMPTY_INGREDIENT = { name: '', quantity: '', unit: '', calories: '', protein: '', carbs: '', fat: '' };

export default function RecipesScreen() {
  const { selectedDate } = useStore();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const [showCreate, setShowCreate] = useState(false);
  const [createMode, setCreateMode] = useState<'manual' | 'ai'>('manual');

  // Manual form
  const [title, setTitle] = useState('');
  const [servings, setServings] = useState('1');
  const [instructions, setInstructions] = useState('');
  const [ingredients, setIngredients] = useState([{ ...EMPTY_INGREDIENT }]);
  const [saving, setSaving] = useState(false);

  // AI form
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiRecipeAnalysisResult | null>(null);

  // Per-recipe "log a serving" row
  const [loggingRecipeId, setLoggingRecipeId] = useState<string | null>(null);
  const [logMealType, setLogMealType] = useState<MealType>('lunch');
  const [logServings, setLogServings] = useState('1');
  const [logging, setLogging] = useState(false);

  const runLoad = useCallback(async (onDone?: () => void) => {
    try {
      const res = await api.getRecipes();
      setRecipes(res.recipes);
      hasLoadedOnce.current = true;
      setLoadError(null);
    } catch (err: any) {
      if (!hasLoadedOnce.current) {
        setLoadError(err.message || "We couldn't reach the Mindful Plate server. Please check your connection and try again.");
      } else {
        Alert.alert('Could not refresh', err.message || 'Please try again.');
      }
    } finally {
      onDone?.();
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      runLoad(() => {
        if (active) setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [runLoad])
  );

  const onRefresh = () => {
    setRefreshing(true);
    runLoad(() => setRefreshing(false));
  };

  const resetCreateForm = () => {
    setTitle('');
    setServings('1');
    setInstructions('');
    setIngredients([{ ...EMPTY_INGREDIENT }]);
    setAiPrompt('');
    setAiResult(null);
    setCreateMode('manual');
  };

  const updateIngredient = (idx: number, field: keyof typeof EMPTY_INGREDIENT, value: string) => {
    setIngredients((prev) => prev.map((ing, i) => (i === idx ? { ...ing, [field]: value } : ing)));
  };

  const addIngredientRow = () => setIngredients((prev) => [...prev, { ...EMPTY_INGREDIENT }]);
  const removeIngredientRow = (idx: number) => setIngredients((prev) => prev.filter((_, i) => i !== idx));

  const handleSaveManual = async () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please name your recipe.');
      return;
    }
    const servingsNum = parseInt(servings, 10);
    if (!servingsNum || servingsNum <= 0) {
      Alert.alert('Invalid servings', 'Servings must be at least 1.');
      return;
    }
    const validIngredients: RecipeIngredientDto[] = [];
    for (const ing of ingredients) {
      if (!ing.name.trim()) continue;
      if (!ing.quantity || parseFloat(ing.quantity) <= 0 || !ing.unit.trim()) {
        Alert.alert('Incomplete ingredient', `"${ing.name}" needs a quantity and unit.`);
        return;
      }
      validIngredients.push({
        name: ing.name.trim(),
        quantity: parseFloat(ing.quantity),
        unit: ing.unit.trim(),
        calories: parseFloat(ing.calories) || 0,
        protein: parseFloat(ing.protein) || 0,
        carbs: parseFloat(ing.carbs) || 0,
        fat: parseFloat(ing.fat) || 0,
      });
    }
    if (validIngredients.length === 0) {
      Alert.alert('No ingredients', 'Add at least one ingredient.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.createRecipe({
        title: title.trim(),
        instructions: instructions.trim() || undefined,
        servings: servingsNum,
        ingredients: validIngredients,
      });
      setRecipes((prev) => [res.recipe, ...prev]);
      setShowCreate(false);
      resetCreateForm();
    } catch (err: any) {
      Alert.alert('Could not save recipe', err.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyzeRecipe = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const result = await api.parseRecipeText(aiPrompt);
      setAiResult(result);
    } catch (err: any) {
      Alert.alert('Analysis failed', err.message || 'Could not generate this recipe. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveAiRecipe = async () => {
    if (!aiResult) return;
    setSaving(true);
    try {
      const res = await api.createRecipe({
        title: aiResult.title,
        instructions: aiResult.instructions,
        servings: aiResult.servings,
        ingredients: aiResult.ingredients,
      });
      setRecipes((prev) => [res.recipe, ...prev]);
      setShowCreate(false);
      resetCreateForm();
    } catch (err: any) {
      Alert.alert('Could not save recipe', err.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecipe = (recipe: Recipe) => {
    Alert.alert('Delete Recipe', `Remove "${recipe.title}" from your recipes?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteRecipe(recipe.id);
            setRecipes((prev) => prev.filter((r) => r.id !== recipe.id));
          } catch (err: any) {
            Alert.alert('Could not delete', err.message || 'Please try again.');
          }
        },
      },
    ]);
  };

  const openLogRow = (recipe: Recipe) => {
    if (loggingRecipeId === recipe.id) {
      setLoggingRecipeId(null);
      return;
    }
    setLoggingRecipeId(recipe.id);
    setLogServings('1');
  };

  const handleLogServing = async (recipe: Recipe) => {
    const numServings = parseFloat(logServings);
    if (!numServings || numServings <= 0) {
      Alert.alert('Invalid amount', 'Enter a number of servings greater than 0.');
      return;
    }
    setLogging(true);
    try {
      await api.logMeal({
        mealType: logMealType,
        date: selectedDate,
        items: [
          {
            name: recipe.title,
            quantity: numServings,
            unit: numServings === 1 ? 'serving' : 'servings',
            calories: Math.round(recipe.caloriesPerServing * numServings),
            protein: Math.round(recipe.proteinPerServing * numServings * 10) / 10,
            carbs: Math.round(recipe.carbsPerServing * numServings * 10) / 10,
            fat: Math.round(recipe.fatPerServing * numServings * 10) / 10,
          },
        ],
      });
      Alert.alert('Logged', `${numServings} serving${numServings === 1 ? '' : 's'} of ${recipe.title} added to ${logMealType}.`);
      setLoggingRecipeId(null);
    } catch (err: any) {
      Alert.alert('Logging failed', err.message || 'Could not log this recipe. Please try again.');
    } finally {
      setLogging(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#10b981" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <ErrorScreen
        message={loadError}
        onRetry={() => {
          setLoading(true);
          runLoad(() => setLoading(false));
        }}
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-950 px-4">
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
        >
          <View className="flex-row items-center justify-between pt-2 pb-4">
            <View>
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Nutrition Library</Text>
              <Text className="text-white text-2xl font-black">My Recipes</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (showCreate) resetCreateForm();
                setShowCreate((prev) => !prev);
              }}
              className="flex-row items-center bg-emerald-500 rounded-2xl px-3.5 py-2 active:bg-emerald-600"
            >
              {showCreate ? (
                <X size={16} color="#ffffff" />
              ) : (
                <>
                  <Plus size={16} color="#ffffff" />
                  <Text className="text-white font-bold text-xs ml-1">New</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {showCreate && (
            <View className="bg-slate-900/60 border border-slate-800 rounded-3xl p-4 mb-5">
              {/* Mode toggle */}
              <View className="flex-row bg-slate-950/60 p-1 rounded-2xl border border-slate-800 mb-4">
                <TouchableOpacity
                  onPress={() => setCreateMode('manual')}
                  className={`flex-1 py-2 rounded-xl items-center flex-row justify-center ${
                    createMode === 'manual' ? 'bg-emerald-500' : 'bg-transparent'
                  }`}
                >
                  <PenLine size={14} color={createMode === 'manual' ? '#ffffff' : '#94a3b8'} />
                  <Text className={`text-xs font-semibold ml-1.5 ${createMode === 'manual' ? 'text-white font-bold' : 'text-slate-400'}`}>
                    Manual
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setCreateMode('ai')}
                  className={`flex-1 py-2 rounded-xl items-center flex-row justify-center ${
                    createMode === 'ai' ? 'bg-violet-600' : 'bg-transparent'
                  }`}
                >
                  <Sparkles size={14} color={createMode === 'ai' ? '#ffffff' : '#94a3b8'} />
                  <Text className={`text-xs font-semibold ml-1.5 ${createMode === 'ai' ? 'text-white font-bold' : 'text-slate-400'}`}>
                    Describe with AI
                  </Text>
                </TouchableOpacity>
              </View>

              {createMode === 'manual' ? (
                <View>
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Recipe title"
                    placeholderTextColor="#64748b"
                    className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm mb-2"
                  />
                  <View className="flex-row items-center mb-2">
                    <Text className="text-slate-400 text-xs mr-2">Servings</Text>
                    <TextInput
                      value={servings}
                      onChangeText={setServings}
                      keyboardType="numeric"
                      className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm w-16"
                    />
                  </View>
                  <TextInput
                    value={instructions}
                    onChangeText={setInstructions}
                    placeholder="Instructions (optional)"
                    placeholderTextColor="#64748b"
                    multiline
                    numberOfLines={3}
                    className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm mb-3 min-h-[70px]"
                  />

                  <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Ingredients</Text>
                  {ingredients.map((ing, idx) => (
                    <View key={idx} className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 mb-2">
                      <View className="flex-row items-center mb-2">
                        <TextInput
                          value={ing.name}
                          onChangeText={(v) => updateIngredient(idx, 'name', v)}
                          placeholder="Ingredient name"
                          placeholderTextColor="#64748b"
                          className="flex-1 bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-2 text-white text-xs mr-2"
                        />
                        {ingredients.length > 1 && (
                          <TouchableOpacity onPress={() => removeIngredientRow(idx)} className="p-1">
                            <X size={16} color="#ef4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                      <View className="flex-row space-x-2 mb-2">
                        <TextInput
                          value={ing.quantity}
                          onChangeText={(v) => updateIngredient(idx, 'quantity', v)}
                          placeholder="Qty"
                          placeholderTextColor="#64748b"
                          keyboardType="numeric"
                          className="flex-1 bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-2 text-white text-xs mr-2"
                        />
                        <TextInput
                          value={ing.unit}
                          onChangeText={(v) => updateIngredient(idx, 'unit', v)}
                          placeholder="Unit"
                          placeholderTextColor="#64748b"
                          className="flex-1 bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-2 text-white text-xs"
                        />
                      </View>
                      <View className="flex-row space-x-2">
                        <TextInput
                          value={ing.calories}
                          onChangeText={(v) => updateIngredient(idx, 'calories', v)}
                          placeholder="Cal"
                          placeholderTextColor="#64748b"
                          keyboardType="numeric"
                          className="flex-1 bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-2 text-white text-xs mr-2"
                        />
                        <TextInput
                          value={ing.protein}
                          onChangeText={(v) => updateIngredient(idx, 'protein', v)}
                          placeholder="Prot"
                          placeholderTextColor="#64748b"
                          keyboardType="numeric"
                          className="flex-1 bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-2 text-white text-xs mr-2"
                        />
                        <TextInput
                          value={ing.carbs}
                          onChangeText={(v) => updateIngredient(idx, 'carbs', v)}
                          placeholder="Carb"
                          placeholderTextColor="#64748b"
                          keyboardType="numeric"
                          className="flex-1 bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-2 text-white text-xs mr-2"
                        />
                        <TextInput
                          value={ing.fat}
                          onChangeText={(v) => updateIngredient(idx, 'fat', v)}
                          placeholder="Fat"
                          placeholderTextColor="#64748b"
                          keyboardType="numeric"
                          className="flex-1 bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-2 text-white text-xs"
                        />
                      </View>
                    </View>
                  ))}

                  <TouchableOpacity
                    onPress={addIngredientRow}
                    className="flex-row items-center justify-center py-2.5 mb-3 border border-dashed border-slate-700 rounded-xl"
                  >
                    <Plus size={14} color="#94a3b8" />
                    <Text className="text-slate-400 text-xs font-semibold ml-1.5">Add Ingredient</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSaveManual}
                    disabled={saving}
                    className="bg-emerald-500 active:bg-emerald-600 rounded-xl py-3 items-center"
                  >
                    {saving ? <ActivityIndicator color="#ffffff" /> : <Text className="text-white font-bold text-sm">Save Recipe</Text>}
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <Text className="text-slate-400 text-xs mb-2">
                    Describe the dish you want to cook (e.g. "high-protein turkey chili with beans, serves 4"):
                  </Text>
                  <TextInput
                    value={aiPrompt}
                    onChangeText={setAiPrompt}
                    multiline
                    numberOfLines={3}
                    placeholder="Describe your recipe..."
                    placeholderTextColor="#64748b"
                    className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm mb-3 min-h-[80px]"
                  />
                  <TouchableOpacity
                    onPress={handleAnalyzeRecipe}
                    disabled={aiLoading}
                    className="bg-violet-600 active:bg-violet-700 rounded-xl py-3 items-center flex-row justify-center mb-3"
                  >
                    {aiLoading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <>
                        <Sparkles size={16} color="#ffffff" />
                        <Text className="text-white font-bold text-sm ml-2">Generate with Gemini AI</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {aiResult && (
                    <View className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4">
                      <Text className="text-white font-bold text-base mb-1">{aiResult.title}</Text>
                      <Text className="text-slate-400 text-xs mb-3">{aiResult.servings} servings</Text>
                      {aiResult.instructions && (
                        <Text className="text-slate-400 text-xs mb-3">{aiResult.instructions}</Text>
                      )}
                      {aiResult.ingredients.map((ing, idx) => (
                        <View key={idx} className="py-1.5 border-b border-slate-800/80 last:border-b-0">
                          <Text className="text-slate-200 text-xs font-medium">
                            {ing.quantity}{ing.unit} {ing.name}
                          </Text>
                          <Text className="text-slate-500 text-[10px]">
                            {ing.calories} kcal • P: {ing.protein}g | C: {ing.carbs}g | F: {ing.fat}g
                          </Text>
                        </View>
                      ))}
                      <TouchableOpacity
                        onPress={handleSaveAiRecipe}
                        disabled={saving}
                        className="bg-emerald-500 active:bg-emerald-600 rounded-xl py-3 items-center flex-row justify-center mt-3"
                      >
                        {saving ? (
                          <ActivityIndicator color="#ffffff" />
                        ) : (
                          <>
                            <Check size={16} color="#ffffff" />
                            <Text className="text-white font-bold text-sm ml-2">Save Recipe</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {recipes.length === 0 && !showCreate && (
            <View className="items-center py-12">
              <BookOpen size={32} color="#334155" />
              <Text className="text-slate-500 text-sm text-center mt-3">
                No recipes yet. Create one manually or describe it with AI.
              </Text>
            </View>
          )}

          {recipes.map((rec) => (
            <View key={rec.id} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-white font-bold text-base flex-1 pr-2">{rec.title}</Text>
                <View className="flex-row items-center">
                  <View className="bg-emerald-500/20 px-2.5 py-1 rounded-full mr-2">
                    <Text className="text-emerald-400 font-bold text-xs">{rec.caloriesPerServing} kcal</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteRecipe(rec)} className="p-1 active:opacity-60">
                    <X size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>

              <View className="flex-row items-center mb-3">
                <ChefHat size={12} color="#64748b" />
                <Text className="text-slate-400 text-xs ml-1">{rec.servings} servings</Text>
              </View>

              <View className="flex-row justify-between bg-slate-950/50 rounded-2xl p-3 mb-4">
                <View className="items-center flex-1">
                  <Text className="text-purple-400 font-bold text-sm">{rec.proteinPerServing}g</Text>
                  <Text className="text-slate-500 text-[10px] uppercase">Protein</Text>
                </View>
                <View className="items-center flex-1 border-x border-slate-800">
                  <Text className="text-emerald-400 font-bold text-sm">{rec.carbsPerServing}g</Text>
                  <Text className="text-slate-500 text-[10px] uppercase">Carbs</Text>
                </View>
                <View className="items-center flex-1">
                  <Text className="text-amber-400 font-bold text-sm">{rec.fatPerServing}g</Text>
                  <Text className="text-slate-500 text-[10px] uppercase">Fat</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => openLogRow(rec)}
                className="bg-slate-800/80 active:bg-slate-700 py-2.5 rounded-xl items-center"
              >
                <Text className="text-slate-200 font-semibold text-xs">
                  {loggingRecipeId === rec.id ? 'Cancel' : '+ Log Serving to Diary'}
                </Text>
              </TouchableOpacity>

              {loggingRecipeId === rec.id && (
                <View className="mt-3 pt-3 border-t border-slate-800">
                  <View className="flex-row bg-slate-950/60 p-1 rounded-2xl border border-slate-800 mb-3">
                    {MEAL_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setLogMealType(type)}
                        className={`flex-1 py-1.5 rounded-xl items-center ${
                          logMealType === type ? 'bg-emerald-500' : 'bg-transparent'
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-semibold capitalize ${
                            logMealType === type ? 'text-white font-bold' : 'text-slate-400'
                          }`}
                        >
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View className="flex-row items-center">
                    <Text className="text-slate-400 text-xs mr-2">Servings</Text>
                    <TextInput
                      value={logServings}
                      onChangeText={setLogServings}
                      keyboardType="numeric"
                      className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm w-16 mr-3"
                    />
                    <TouchableOpacity
                      onPress={() => handleLogServing(rec)}
                      disabled={logging}
                      className="flex-1 bg-emerald-500 active:bg-emerald-600 rounded-xl py-2.5 items-center"
                    >
                      {logging ? <ActivityIndicator color="#ffffff" /> : <Text className="text-white font-bold text-xs">Log It</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))}

          <View className="h-10" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
