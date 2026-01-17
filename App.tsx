
import React, { useState, useEffect, useMemo } from 'react';
import { AppView, Product, CartItem, PaymentMethod, InAppMethod, ShoppingInsight } from './types';
import ScannerView from './components/ScannerView';
import CartItemCard from './components/CartItemCard';
import { getShoppingInsights } from './services/geminiService';
import AiHub from './components/AiHub';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.BROWSE);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.APP);
  const [inAppMethod, setInAppMethod] = useState<InAppMethod>(InAppMethod.CARD);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'selection' | 'details'>('selection');
  
  // Payment Form States
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [upiId, setUpiId] = useState('');

  const [insights, setInsights] = useState<ShoppingInsight | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const totalAmount = useMemo(() => 
    cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0),
    [cart]
  );

  const totalCartQty = useMemo(() => cart.reduce((sum, item) => sum + item.cartQuantity, 0), [cart]);
  const totalBaggedQty = useMemo(() => cart.reduce((sum, item) => sum + item.baggedQuantity, 0), [cart]);
  const isVerified = totalCartQty > 0 && totalCartQty === totalBaggedQty;

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

  const processFinalPayment = () => {
    setIsProcessing(true);
    // Simulate API delay
    setTimeout(() => {
      setIsProcessing(false);
      setView(AppView.SUCCESS);
    }, 2500);
  };

  const resetSession = () => {
    setCart([]);
    setView(AppView.BROWSE);
    setInsights(null);
    setPaymentStep('selection');
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
    setUpiId('');
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-50 relative overflow-x-hidden">
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

      <main className="flex-1">
        {view === AppView.BROWSE && (
          <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-32 h-32 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
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
          <div className="p-6 pb-32">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">My Shopping</h2>
              <button onClick={() => setView(AppView.SCAN_CART)} className="text-emerald-600 font-bold flex items-center space-x-1">
                <i className="fa-solid fa-plus-circle"></i>
                <span>Add More</span>
              </button>
            </div>

            {!isVerified && cart.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start space-x-3">
                <i className="fa-solid fa-circle-info text-amber-500 mt-1"></i>
                <div>
                  <h4 className="text-amber-800 font-bold text-sm">Security Verification Required</h4>
                  <p className="text-amber-700 text-xs leading-relaxed">
                    Please scan items again as you place them into your bags. 
                    <strong> {totalCartQty - totalBaggedQty} items remaining.</strong>
                  </p>
                  <button onClick={() => setView(AppView.SCAN_BAG)} className="mt-3 bg-amber-500 text-white px-4 py-2 rounded-lg text-xs font-bold">SCAN TO BAG</button>
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

            <div className="space-y-4">
              {cart.map(item => <CartItemCard key={item.id} item={item} />)}
            </div>

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
                    <div className="text-xs text-slate-500 italic p-1 border-t">💡 {insights.savingTips}</div>
                  </div>
                ) : <p className="text-xs text-slate-400">Add more items for personalized tips!</p>}
              </div>
            )}
          </div>
        )}

        {view === AppView.AI_LAB && <AiHub />}

        {view === AppView.CHECKOUT && (
          <div className="p-6 pb-32">
            <button 
              onClick={() => paymentStep === 'details' ? setPaymentStep('selection') : setView(AppView.CART)} 
              className="mb-6 flex items-center space-x-2 text-slate-500 font-medium active:scale-95 transition-transform"
            >
              <i className="fa-solid fa-arrow-left"></i>
              <span>{paymentStep === 'details' ? 'Back to Selection' : 'Back to Cart'}</span>
            </button>

            {paymentStep === 'selection' ? (
              <>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Checkout</h2>
                <p className="text-slate-500 text-sm mb-8">How would you like to pay?</p>

                <div className="space-y-4 mb-8">
                  <button 
                    onClick={() => setPaymentMethod(PaymentMethod.APP)} 
                    className={`w-full p-6 rounded-2xl flex items-center justify-between border-2 transition-all ${paymentMethod === PaymentMethod.APP ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-100 bg-white'}`}
                  >
                    <div className="flex items-center space-x-4 text-left">
                      <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 text-xl"><i className="fa-solid fa-mobile-screen"></i></div>
                      <div><h4 className="font-bold text-slate-800 text-lg">In-App Payment</h4><p className="text-slate-500 text-sm">Card, UPI, or Wallet</p></div>
                    </div>
                    {paymentMethod === PaymentMethod.APP && <i className="fa-solid fa-circle-check text-emerald-500 text-xl"></i>}
                  </button>

                  <button 
                    onClick={() => setPaymentMethod(PaymentMethod.CASH)} 
                    className={`w-full p-6 rounded-2xl flex items-center justify-between border-2 transition-all ${paymentMethod === PaymentMethod.CASH ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-100 bg-white'}`}
                  >
                    <div className="flex items-center space-x-4 text-left">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 text-xl"><i className="fa-solid fa-store"></i></div>
                      <div><h4 className="font-bold text-slate-800 text-lg">Pay at Counter</h4><p className="text-slate-500 text-sm">For Cash or External Card</p></div>
                    </div>
                    {paymentMethod === PaymentMethod.CASH && <i className="fa-solid fa-circle-check text-emerald-500 text-xl"></i>}
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-6">
                {paymentMethod === PaymentMethod.APP ? (
                  <>
                    <div className="flex bg-slate-200 p-1 rounded-xl mb-4">
                      <button 
                        onClick={() => setInAppMethod(InAppMethod.CARD)}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${inAppMethod === InAppMethod.CARD ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500'}`}
                      >CARD</button>
                      <button 
                        onClick={() => setInAppMethod(InAppMethod.UPI)}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${inAppMethod === InAppMethod.UPI ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500'}`}
                      >UPI</button>
                    </div>

                    {inAppMethod === InAppMethod.CARD ? (
                      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        {/* Virtual Card Visual */}
                        <div className="w-full h-48 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden mb-8">
                          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20"></div>
                          <div className="flex justify-between items-start mb-8">
                            <i className="fa-solid fa-microchip text-4xl text-amber-400"></i>
                            <div className="text-xl font-bold italic opacity-60">VISA</div>
                          </div>
                          <div className="text-xl font-mono tracking-[0.2em] mb-4">
                            {cardNumber ? cardNumber.match(/.{1,4}/g)?.join(' ') : '•••• •••• •••• ••••'}
                          </div>
                          <div className="flex justify-between">
                            <div>
                              <p className="text-[10px] opacity-60 uppercase">Expiry</p>
                              <p className="font-mono">{cardExpiry || 'MM/YY'}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] opacity-60 uppercase">CVV</p>
                              <p className="font-mono">***</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <input 
                            type="text" 
                            placeholder="Card Number" 
                            maxLength={16}
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none" 
                          />
                          <div className="flex space-x-3">
                            <input 
                              type="text" 
                              placeholder="MM/YY" 
                              maxLength={5}
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(e.target.value)}
                              className="w-1/2 bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none" 
                            />
                            <input 
                              type="password" 
                              placeholder="CVV" 
                              maxLength={3}
                              value={cardCvv}
                              onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                              className="w-1/2 bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none" 
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                        <div className="grid grid-cols-4 gap-4">
                          {['Google Pay', 'PhonePe', 'Paytm', 'Amazon Pay'].map(app => (
                            <button key={app} className="flex flex-col items-center space-y-2 active:scale-90 transition-transform">
                              <div className="w-12 h-12 bg-white border border-slate-100 rounded-xl shadow-sm flex items-center justify-center text-slate-400">
                                <i className="fa-solid fa-paper-plane text-xs"></i>
                              </div>
                              <span className="text-[10px] text-slate-500 font-bold">{app}</span>
                            </button>
                          ))}
                        </div>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-4 flex items-center text-slate-400 font-bold">@</div>
                          <input 
                            type="text" 
                            placeholder="Enter UPI ID" 
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none" 
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in-95">
                    <div className="p-8 bg-white border-4 border-slate-900 rounded-3xl shadow-xl">
                      <i className="fa-solid fa-qrcode text-8xl text-slate-900"></i>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">Scan at Terminal</h3>
                      <p className="text-sm text-slate-500 max-w-[240px] mt-2">Present this QR code to the store executive to finalize your payment.</p>
                    </div>
                    <div className="w-full bg-slate-100 p-4 rounded-xl flex items-center justify-between">
                      <div className="text-left">
                        <p className="text-[10px] text-slate-400 font-bold">TXN ID</p>
                        <p className="text-xs font-mono font-bold">DMART-990-21X</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 font-bold">CART ITEMS</p>
                        <p className="text-xs font-bold">{totalCartQty} Units</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Price Summary */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mt-8 mb-6">
              <div className="flex justify-between mb-2"><span className="text-slate-500">Subtotal</span><span className="font-bold text-slate-800">${totalAmount.toFixed(2)}</span></div>
              <div className="flex justify-between mb-2"><span className="text-slate-500">Tax (5%)</span><span className="font-bold text-slate-800">${(totalAmount * 0.05).toFixed(2)}</span></div>
              <div className="border-t pt-4 mt-4 flex justify-between"><span className="text-lg font-bold text-slate-800">Total</span><span className="text-2xl font-black text-emerald-600">${(totalAmount * 1.05).toFixed(2)}</span></div>
            </div>
          </div>
        )}

        {view === AppView.SUCCESS && (
          <div className="p-8 flex flex-col items-center justify-center min-h-[80vh] text-center">
            <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-xl shadow-emerald-200 animate-bounce"><i className="fa-solid fa-check text-4xl text-white"></i></div>
            <h2 className="text-3xl font-black text-slate-800 mb-4">Payment Successful!</h2>
            <p className="text-slate-500 mb-8 max-w-[280px]">Your digital receipt has been sent to your email.</p>
            <div className="w-full bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-8 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
              <div className="flex justify-between mb-4"><span className="text-slate-400 text-sm font-bold">RECEIPT ID</span><span className="text-slate-800 text-sm font-mono">#SS-882-9901</span></div>
              <div className="space-y-2 text-left mb-6">{cart.map(i => <div key={i.id} className="flex justify-between text-sm"><span className="text-slate-600">{i.cartQuantity}x {i.name}</span><span className="text-slate-800 font-medium">${(i.price * i.cartQuantity).toFixed(2)}</span></div>)}</div>
              <div className="border-t border-dashed pt-4 flex justify-between items-center"><span className="font-bold text-slate-800">Paid Amount</span><span className="text-xl font-black text-emerald-600">${(totalAmount * 1.05).toFixed(2)}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full">
              <button onClick={() => window.print()} className="py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold flex items-center justify-center space-x-2">
                <i className="fa-solid fa-download"></i>
                <span>RECEIPT</span>
              </button>
              <button onClick={resetSession} className="py-4 bg-slate-900 text-white rounded-2xl font-bold">DONE</button>
            </div>
          </div>
        )}
      </main>

      {/* Persistent Bottom Bar */}
      {view !== AppView.SUCCESS && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-xl border-t p-2 flex items-center justify-around z-50">
          <button onClick={() => setView(AppView.BROWSE)} className={`flex flex-col items-center p-2 rounded-xl transition-all ${view === AppView.BROWSE ? 'text-emerald-600' : 'text-slate-400'}`}>
            <i className="fa-solid fa-house text-lg"></i>
            <span className="text-[10px] font-bold mt-1">Home</span>
          </button>
          <button onClick={() => setView(AppView.CART)} className={`flex flex-col items-center p-2 rounded-xl transition-all ${view === AppView.CART ? 'text-emerald-600' : 'text-slate-400'}`}>
            <i className="fa-solid fa-basket-shopping text-lg"></i>
            <span className="text-[10px] font-bold mt-1">Cart</span>
          </button>
          <button onClick={() => setView(AppView.SCAN_CART)} className="flex flex-col items-center -mt-8 p-3 bg-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-200 ring-4 ring-white">
            <i className="fa-solid fa-barcode text-xl"></i>
          </button>
          <button onClick={() => setView(AppView.AI_LAB)} className={`flex flex-col items-center p-2 rounded-xl transition-all ${view === AppView.AI_LAB ? 'text-indigo-600' : 'text-slate-400'}`}>
            <i className="fa-solid fa-wand-magic-sparkles text-lg"></i>
            <span className="text-[10px] font-bold mt-1">AI Magic</span>
          </button>
          <button onClick={() => setView(AppView.CHECKOUT)} className={`flex flex-col items-center p-2 rounded-xl transition-all ${view === AppView.CHECKOUT ? 'text-emerald-600' : 'text-slate-400'}`}>
            <i className="fa-solid fa-credit-card text-lg"></i>
            <span className="text-[10px] font-bold mt-1">Pay</span>
          </button>
        </div>
      )}

      {/* Payment Action Bar */}
      {view === AppView.CHECKOUT && (
        <div className="fixed bottom-[72px] left-0 right-0 max-w-md mx-auto px-6 z-40">
           <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between">
              {isProcessing ? (
                <div className="w-full flex items-center justify-center space-x-3 py-1">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span className="text-sm font-bold tracking-widest uppercase">Processing Transaction...</span>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Payable</p>
                    <p className="text-xl font-black">${(totalAmount * 1.05).toFixed(2)}</p>
                  </div>
                  {paymentStep === 'selection' ? (
                    <button 
                      onClick={() => setPaymentStep('details')}
                      className="px-6 py-2 bg-emerald-500 text-white rounded-xl font-bold transition-all hover:bg-emerald-600"
                    >
                      Continue
                    </button>
                  ) : (
                    <button 
                      onClick={processFinalPayment}
                      disabled={paymentMethod === PaymentMethod.APP && (inAppMethod === InAppMethod.CARD ? !cardNumber : !upiId)}
                      className="px-6 py-2 bg-emerald-500 text-white rounded-xl font-bold transition-all hover:bg-emerald-600 disabled:opacity-50 disabled:grayscale"
                    >
                      Pay Now
                    </button>
                  )}
                </>
              )}
           </div>
        </div>
      )}

      {(view === AppView.SCAN_CART || view === AppView.SCAN_BAG) && (
        <ScannerView mode={view} onScan={view === AppView.SCAN_CART ? handleScanCart : handleScanBag} onClose={() => setView(AppView.CART)} />
      )}

      <style>{`
        @keyframes scanLine {
          0%, 100% { top: 10%; opacity: 0.2; }
          50% { top: 90%; opacity: 0.8; }
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default App;
