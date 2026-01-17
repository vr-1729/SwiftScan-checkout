
export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  barcode: string;
}

export interface CartItem extends Product {
  cartQuantity: number;
  baggedQuantity: number;
}

export enum AppView {
  BROWSE = 'browse',
  SCAN_CART = 'scan_cart',
  SCAN_BAG = 'scan_bag',
  CART = 'cart',
  CHECKOUT = 'checkout',
  SUCCESS = 'success',
  AI_LAB = 'ai_lab'
}

export enum PaymentMethod {
  APP = 'app',
  CASH = 'cash'
}

export enum InAppMethod {
  CARD = 'card',
  UPI = 'upi'
}

export interface ShoppingInsight {
  totalCalories?: number;
  recipeSuggestion?: string;
  savingTips?: string;
}

export interface GroundingSource {
  title?: string;
  uri?: string;
}
