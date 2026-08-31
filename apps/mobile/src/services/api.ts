import {
  UserStats,
  CalculatedTargets,
  ParsedMealItem,
  AiMealAnalysisResult,
  FoodItemDto,
} from '@mindful-plate/shared';

// Configurable backend URL: defaults to localhost:3000 for simulator or local dev
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

// Routes validate bodies with zod and send `error` as a flattened
// { fieldErrors, formErrors } object rather than a plain string.
function extractErrorMessage(errorBody: any): string | undefined {
  if (typeof errorBody.message === 'string') return errorBody.message;
  if (typeof errorBody.error === 'string') return errorBody.error;

  const flattened = errorBody.error;
  if (flattened && typeof flattened === 'object') {
    const firstFieldError = Object.values(flattened.fieldErrors ?? {}).flat()[0];
    if (typeof firstFieldError === 'string') return firstFieldError;
    if (typeof flattened.formErrors?.[0] === 'string') return flattened.formErrors[0];
  }

  return undefined;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errorBody) || `HTTP error ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Auth
  checkAuthStatus: () =>
    request<{ hasAccount: boolean; email: string | null }>('/api/auth/status'),

  register: (email: string, password: string) =>
    request<{ user: { id: string; email: string }; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ user: { id: string; email: string }; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getMe: () => request<{ user: any }>('/api/auth/me'),

  // Profile & Targets
  previewTargets: (stats: UserStats) =>
    request<{ targets: CalculatedTargets }>('/api/users/preview-targets', {
      method: 'POST',
      body: JSON.stringify(stats),
    }),

  updateProfile: (stats: UserStats) =>
    request<{ profile: any; targets: CalculatedTargets }>('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(stats),
    }),

  // Daily Meals & Water
  getDailySummary: (date?: string) =>
    request<{
      date: string;
      meals: any[];
      summary: {
        calories: { consumed: number; target: number; remaining: number };
        protein: { consumed: number; target: number };
        carbs: { consumed: number; target: number };
        fat: { consumed: number; target: number };
      };
    }>(`/api/meals/daily${date ? `?date=${date}` : ''}`),

  logMeal: (payload: { mealType: string; date: string; items: ParsedMealItem[]; notes?: string }) =>
    request<{ meal: any }>('/api/meals/log', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteMeal: (id: string) =>
    request<{ success: boolean }>(`/api/meals/${id}`, {
      method: 'DELETE',
    }),

  // Water
  getWater: (date?: string) =>
    request<{
      date: string;
      totalMl: number;
      targetMl: number;
      percentage: number;
      logs: any[];
    }>(`/api/water${date ? `?date=${date}` : ''}`),

  logWater: (amountMl: number, date?: string) =>
    request<{ log: any }>('/api/water/log', {
      method: 'POST',
      body: JSON.stringify({
        amountMl,
        date: date || new Date().toISOString().split('T')[0],
      }),
    }),

  // Foods
  searchFoods: (query: string) =>
    request<{ foods: any[] }>(`/api/foods/search?q=${encodeURIComponent(query)}`),

  createCustomFood: (food: FoodItemDto) =>
    request<{ food: any }>('/api/foods/custom', {
      method: 'POST',
      body: JSON.stringify(food),
    }),

  // Incremental sync for the local SQLite cache: omit `since` for a full pull.
  syncFoods: (since?: string) =>
    request<{ foods: any[]; syncedAt: string }>(
      `/api/foods/sync${since ? `?since=${encodeURIComponent(since)}` : ''}`
    ),

  // Recipes
  getRecipes: () => request<{ recipes: any[] }>('/api/recipes'),
  createRecipe: (recipe: any) =>
    request<{ recipe: any }>('/api/recipes', {
      method: 'POST',
      body: JSON.stringify(recipe),
    }),

  // AI Meal Analysis
  parseMealText: (prompt: string) =>
    request<AiMealAnalysisResult>('/api/ai/parse-text', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }),

  parseMealImage: async (imageUri: string, mimeType = 'image/jpeg'): Promise<AiMealAnalysisResult> => {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'photo.jpg';

    // @ts-ignore
    formData.append('image', {
      uri: imageUri,
      name: filename,
      type: mimeType,
    });

    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await fetch(`${API_BASE_URL}/api/ai/parse-image`, {
      method: 'POST',
      body: formData,
      headers,
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(extractErrorMessage(errorBody) || `Failed to analyze image (HTTP ${res.status})`);
    }

    return res.json();
  },
};
