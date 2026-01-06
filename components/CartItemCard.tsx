
import React from 'react';
import { CartItem } from '../types';

interface CartItemCardProps {
  item: CartItem;
}

const CartItemCard: React.FC<CartItemCardProps> = ({ item }) => {
  const isVerified = item.baggedQuantity >= item.cartQuantity;

  return (
    <div className={`bg-white rounded-2xl p-4 flex items-center space-x-4 border-2 transition-all ${isVerified ? 'border-emerald-100 bg-emerald-50/30' : 'border-transparent shadow-sm'}`}>
      <div className="relative">
        <img src={item.image} alt={item.name} className="w-20 h-20 rounded-xl object-cover" />
        {isVerified && (
          <div className="absolute -top-2 -right-2 bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">
            <i className="fa-solid fa-check"></i>
          </div>
        )}
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-slate-800">{item.name}</h3>
        <p className="text-sm text-slate-500">${item.price.toFixed(2)}</p>
        <div className="mt-2 flex items-center space-x-3">
          <div className="flex items-center text-xs font-semibold bg-slate-100 px-2 py-1 rounded">
            <span className="text-slate-400 mr-1">CART</span>
            <span className="text-slate-800">{item.cartQuantity}</span>
          </div>
          <div className={`flex items-center text-xs font-semibold px-2 py-1 rounded ${isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            <span className="opacity-70 mr-1">BAGGED</span>
            <span>{item.baggedQuantity}</span>
          </div>
        </div>
      </div>
      <div className="text-right font-bold text-slate-900">
        ${(item.price * item.cartQuantity).toFixed(2)}
      </div>
    </div>
  );
};

export default CartItemCard;
