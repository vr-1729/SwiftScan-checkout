
import React, { useState, useEffect, useMemo } from 'react';
import { AppView, Product, CartItem, PaymentMethod, ShoppingInsight } from './types';
import ScannerView from './components/ScannerView';
import CartItemCard from './components/CartItemCard';
import { getShoppingInsights } from './services/geminiService';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.BROWSE);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.APP);
  const [insights, setInsights] = useState<ShoppingInsight | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Derived state
  const totalAmount = useMemo(() => 
    cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0),
    [cart]
  );

  const totalCartQty = useMemo(() => cart.reduce((sum, item) => sum + item.cartQuantity, 0), [cart]);
  const totalBaggedQty = useMemo(() => cart.reduce((sum, item) => sum + item.baggedQuantity, 0), [cart]);
  
  const isVerified = totalCartQty > 0 && totalCartQty === totalBaggedQty;

  // AI Insights effect
  useEffect(() => {
    if (view === AppView.CART && cart.length > 0 && !insights) {
      setLoadingInsights(true);
      getShoppingInsights(cart).then(res => {
        setInsights(res);
        setLoadingInsights(false);
      });
    }
  }, [view, cart]);

  const handleScanCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.map(p => p.id === product.id ? { ...p, cartQuantity: p.cartQuantity + 1 } : p);
      }
      return [...prev, { ...product, cartQuantity: 1, baggedQuantity: 0 }];
    });
    setView(AppView.CART);
  };

  const handleScanBag = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing && existing.baggedQuantity < existing.cartQuantity) {
        return prev.map(p => p.id === product.id ? { ...p, baggedQuantity: p.baggedQuantity + 1 } : p);
      }
      return prev;
    });
    setView(AppView.CART);
  };

  const resetSession = () => {
    setCart([]);
    setView(AppView.BROWSE);
    setInsights(null);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-50 relative overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
            <i className="fa-solid fa-bolt"></i>
          </div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight italic">SWIFTSCAN</h1>
        </div>
        {cart.length > 0 && (
          <button onClick={() => setView(AppView.CART)} className="relative p-2">
            <i className="fa-solid fa-cart-shopping text-slate-600 text-xl"></i>
            <span className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {totalCartQty}
            </span>
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-32">
        {view === AppView.BROWSE && (
          <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-32 h-32 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
              <i className="fa-solid fa-barcode text-4xl text-emerald-600"></i>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Ready to Shop?</h2>
            <p className="text-slate-500 mb-8 max-w-[240px]">Scan items as you add them to your cart for a faster checkout.</p>
            <button 
              onClick={() => setView(AppView.SCAN_CART)}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 transition-all flex items-center justify-center space-x-2"
            >
              <i className="fa-solid fa-plus"></i>
              <span>START SCANNING</span>
            </button>
          </div>
        )}

        {view === AppView.CART && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">My Shopping</h2>
              <button 
                onClick={() => setView(AppView.SCAN_CART)}
                className="text-emerald-600 font-bold flex items-center space-x-1"
              >
                <i className="fa-solid fa-plus-circle"></i>
                <span>Add More</span>
              </button>
            </div>

            {/* Verification Banner */}
            {!isVerified && cart.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start space-x-3">
                <i className="fa-solid fa-circle-info text-amber-500 mt-1"></i>
                <div>
                  <h4 className="text-amber-800 font-bold text-sm">Security Verification Required</h4>
                  <p className="text-amber-700 text-xs leading-relaxed">
                    Please scan items again as you place them into your bags. 
                    <strong> {totalCartQty - totalBaggedQty} items remaining.</strong>
                  </p>
                  <button 
                    onClick={() => setView(AppView.SCAN_BAG)}
                    className="mt-3 bg-amber-500 text-white px-4 py-2 rounded-lg text-xs font-bold"
                  >
                    SCAN TO BAG
                  </button>
                </div>
              </div>
            )}

            {isVerified && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6 flex items-center space-x-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                  <i className="fa-solid fa-check"></i>
                </div>
                <div>
                  <h4 className="text-emerald-800 font-bold text-sm">Verification Complete!</h4>
                  <p className="text-emerald-700 text-xs">All items in your bag have been verified.</p>
                </div>
              </div>
            )}

            {/* List */}
            <div className="space-y-4">
              {cart.map(item => (
                <CartItemCard key={item.id} item={item} />
              ))}
            </div>

            {/* AI Insights Card */}
            {cart.length > 0 && (
              <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center space-x-2 mb-4">
                  <i className="fa-solid fa-wand-magic-sparkles text-indigo-500"></i>
                  <h3 className="font-bold text-slate-800">Smart Shopping Insights</h3>
                </div>
                {loadingInsights ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                  </div>
                ) : insights ? (
                  <div className="space-y-4">
                    <div className="bg-indigo-50 p-3 rounded-xl">
                      <p className="text-indigo-900 text-xs font-bold uppercase mb-1">Recipe Idea</p>
                      <p className="text-indigo-800 text-sm leading-snug">{insights.recipeSuggestion}</p>
                    </div>
                    <div className="flex justify-between items-center text-sm px-1">
                      <span className="text-slate-500">Estimated Total Calories</span>
                      <span className="font-bold text-slate-800">{insights.totalCalories} kcal</span>
                    </div>
                    <div className="text-xs text-slate-500 italic p-1 border-t">
                      💡 {insights.savingTips}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Add more items for personalized tips!</p>
                )}
              </div>
            )}
          </div>
        )}

        {view === AppView.CHECKOUT && (
          <div className="p-6">
            <button onClick={() => setView(AppView.CART)} className="mb-6 flex items-center space-x-2 text-slate-500 font-medium">
              <i className="fa-solid fa-arrow-left"></i>
              <span>Back to Cart</span>
            </button>
            <h2 className="text-2xl font-bold text-slate-800 mb-8">Payment Method</h2>

            <div className="space-y-4 mb-8">
              <button 
                onClick={() => setPaymentMethod(PaymentMethod.APP)}
                className={`w-full p-6 rounded-2xl flex items-center justify-between border-2 transition-all ${paymentMethod === PaymentMethod.APP ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-100 bg-white'}`}
              >
                <div className="flex items-center space-x-4 text-left">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 text-xl">
                    <i className="fa-solid fa-mobile-screen"></i>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">In-App Payment</h4>
                    <p className="text-slate-500 text-sm">Pay via Card or UPI</p>
                  </div>
                </div>
                {paymentMethod === PaymentMethod.APP && <i className="fa-solid fa-circle-check text-emerald-500 text-xl"></i>}
              </button>

              <button 
                onClick={() => setPaymentMethod(PaymentMethod.CASH)}
                className={`w-full p-6 rounded-2xl flex items-center justify-between border-2 transition-all ${paymentMethod === PaymentMethod.CASH ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-100 bg-white'}`}
              >
                <div className="flex items-center space-x-4 text-left">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 text-xl">
                    <i className="fa-solid fa-store"></i>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">Pay at Counter</h4>
                    <p className="text-slate-500 text-sm">Scan QR at terminal for Cash</p>
                  </div>
                </div>
                {paymentMethod === PaymentMethod.CASH && <i className="fa-solid fa-circle-check text-emerald-500 text-xl"></i>}
              </button>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-bold text-slate-800">${totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-500">Tax (5%)</span>
                <span className="font-bold text-slate-800">${(totalAmount * 0.05).toFixed(2)}</span>
              </div>
              <div className="border-t pt-4 mt-4 flex justify-between">
                <span className="text-lg font-bold text-slate-800">Total</span>
                <span className="text-2xl font-black text-emerald-600">${(totalAmount * 1.05).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {view === AppView.SUCCESS && (
          <div className="p-8 flex flex-col items-center justify-center min-h-[80vh] text-center">
            <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-xl shadow-emerald-200 animate-bounce">
              <i className="fa-solid fa-check text-4xl text-white"></i>
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-4">Payment Successful!</h2>
            <p className="text-slate-500 mb-8 max-w-[280px]">Your digital receipt has been sent to your email. You can now leave the store through the SwiftPass lane.</p>
            
            <div className="w-full bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-8">
              <div className="flex justify-between mb-4">
                <span className="text-slate-400 text-sm font-bold">RECEIPT ID</span>
                <span className="text-slate-800 text-sm font-mono">#SS-882-9901</span>
              </div>
              <div className="space-y-2 text-left mb-6">
                {cart.map(i => (
                  <div key={i.id} className="flex justify-between text-sm">
                    <span className="text-slate-600">{i.cartQuantity}x {i.name}</span>
                    <span className="text-slate-800 font-medium">${(i.price * i.cartQuantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed pt-4 flex justify-between items-center">
                <span className="font-bold text-slate-800">Paid Amount</span>
                <span className="text-xl font-black text-emerald-600">${(totalAmount * 1.05).toFixed(2)}</span>
              </div>
            </div>

            <button 
              onClick={resetSession}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg transition-all"
            >
              DONE
            </button>
          </div>
        )}
      </main>

      {/* Persistent Call-to-Action Bar */}
      {(view === AppView.CART || view === AppView.CHECKOUT) && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-lg border-t p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          {view === AppView.CART && (
            <div className="flex items-center justify-between space-x-4">
              <div className="flex flex-col">
                <span className="text-slate-400 text-xs font-bold uppercase">Total</span>
                <span className="text-2xl font-black text-slate-800">${totalAmount.toFixed(2)}</span>
              </div>
              <button 
                onClick={() => setView(AppView.CHECKOUT)}
                disabled={!isVerified}
                className={`flex-1 py-4 rounded-2xl font-bold transition-all flex items-center justify-center space-x-2 ${isVerified ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
              >
                <span>CHECKOUT</span>
                <i className="fa-solid fa-arrow-right"></i>
              </button>
            </div>
          )}
          
          {view === AppView.CHECKOUT && (
            <button 
              onClick={() => setView(AppView.SUCCESS)}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 transition-all flex items-center justify-center space-x-2"
            >
              <i className="fa-solid fa-lock"></i>
              <span>PAY ${(totalAmount * 1.05).toFixed(2)} NOW</span>
            </button>
          )}
        </div>
      )}

      {/* Scanner Modal Overlay */}
      {(view === AppView.SCAN_CART || view === AppView.SCAN_BAG) && (
        <ScannerView 
          mode={view} 
          onScan={view === AppView.SCAN_CART ? handleScanCart : handleScanBag}
          onClose={() => setView(AppView.CART)}
        />
      )}
    </div>
  );
};

export default App;
