
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
  SUCCESS = 'success'
}

export enum PaymentMethod {
  APP = 'app',
  CASH = 'cash'
}

export interface ShoppingInsight {
  totalCalories?: number;
  recipeSuggestion?: string;
  savingTips?: string;
}
