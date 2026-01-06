
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Product, AppView } from '../types';
import { MOCK_PRODUCTS } from '../constants';

interface ScannerViewProps {
  mode: AppView.SCAN_CART | AppView.SCAN_BAG;
  onScan: (product: Product) => void;
  onClose: () => void;
}

const ScannerView: React.FC<ScannerViewProps> = ({ mode, onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const lastScanTime = useRef<number>(0);

  // Initialize camera and find devices
  const startCamera = useCallback(async (deviceId?: string) => {
    try {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId 
          ? { deviceId: { exact: deviceId } } 
          : { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      };

      const s = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(s);
      
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }

      // Check for torch capability
      const track = s.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;
      setHasTorch(!!capabilities.torch);

      // Get all cameras
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
      setDevices(videoDevices);
      
      const activeTrack = s.getVideoTracks()[0].getSettings();
      if (activeTrack.deviceId) setCurrentDeviceId(activeTrack.deviceId);

    } catch (err) {
      console.error("Camera error:", err);
    }
  }, [stream]);

  useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Real-time Barcode Detection (Experimental Browser API)
  useEffect(() => {
    let animationFrameId: number;
    const detectBarcode = async () => {
      if (!videoRef.current || !('BarcodeDetector' in window)) return;

      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'code_128', 'qr_code', 'upc_a']
      });

      const detect = async () => {
        if (videoRef.current && videoRef.current.readyState >= 2) {
          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const now = Date.now();
              // Prevent rapid double scans (2 second cooldown)
              if (now - lastScanTime.current > 2000) {
                const detectedValue = barcodes[0].rawValue;
                const matchedProduct = MOCK_PRODUCTS.find(p => p.barcode === detectedValue);
                if (matchedProduct) {
                  handleSuccess(matchedProduct);
                }
              }
            }
          } catch (e) {
            // Detector error
          }
        }
        animationFrameId = requestAnimationFrame(detect);
      };
      detect();
    };

    detectBarcode();
    return () => cancelAnimationFrame(animationFrameId);
  }, [stream]);

  const handleSuccess = (product: Product) => {
    lastScanTime.current = Date.now();
    setIsScanning(true);
    
    // Feedback
    if ('vibrate' in navigator) navigator.vibrate(100);
    
    setTimeout(() => {
      setIsScanning(false);
      onScan(product);
    }, 400);
  };

  const toggleTorch = async () => {
    if (!stream || !hasTorch) return;
    const track = stream.getVideoTracks()[0];
    try {
      await track.applyConstraints({
        advanced: [{ torch: !torchOn } as any]
      });
      setTorchOn(!torchOn);
    } catch (err) {
      console.error("Torch error:", err);
    }
  };

  const switchCamera = () => {
    const currentIndex = devices.findIndex(d => d.deviceId === currentDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    startCamera(devices[nextIndex].deviceId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Scan Flash Overlay */}
      <div className={`absolute inset-0 z-10 bg-white transition-opacity duration-300 pointer-events-none ${isScanning ? 'opacity-40' : 'opacity-0'}`} />

      <div className="relative flex-1 bg-black">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover"
        />
        
        {/* Scanner Overlay UI */}
        <div className="absolute inset-0 flex flex-col items-center justify-between py-12 pointer-events-none">
          <div className="px-6 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/20">
            <p className="text-white text-sm font-bold tracking-widest uppercase">
              {mode === AppView.SCAN_CART ? '🛒 Scanning to Cart' : '🛍️ Verifying in Bag'}
            </p>
          </div>

          <div className="w-72 h-72 border-2 border-emerald-400 rounded-[2rem] relative shadow-[0_0_50px_rgba(52,211,153,0.3)]">
            <div className="absolute inset-0 border-[6px] border-emerald-400/20 rounded-[1.8rem]"></div>
            <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-[scanLine_2s_ease-in-out_infinite]"></div>
            
            {/* Corners */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl"></div>
          </div>

          <div className="text-white/60 text-xs font-medium bg-black/20 px-4 py-2 rounded-lg">
            Align barcode within the frame
          </div>
        </div>

        {/* Controls Overlay */}
        <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-auto">
          <button 
            onClick={onClose}
            className="w-12 h-12 bg-black/40 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white border border-white/10"
          >
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>

          <div className="flex flex-col space-y-4">
            {hasTorch && (
              <button 
                onClick={toggleTorch}
                className={`w-12 h-12 backdrop-blur-xl rounded-2xl flex items-center justify-center border transition-all ${torchOn ? 'bg-amber-400 text-black border-amber-300' : 'bg-black/40 text-white border-white/10'}`}
              >
                <i className={`fa-solid ${torchOn ? 'fa-lightbulb' : 'fa-lightbulb-slash'} text-xl`}></i>
              </button>
            )}
            
            {devices.length > 1 && (
              <button 
                onClick={switchCamera}
                className="w-12 h-12 bg-black/40 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white border border-white/10"
              >
                <i className="fa-solid fa-camera-rotate text-xl"></i>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Manual Simulation Area */}
      <div className="bg-slate-900 px-6 pt-6 pb-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white/50 text-[10px] font-black uppercase tracking-[0.2em]">Manual Entry Simulation</h3>
          <span className="text-emerald-500 text-[10px] flex items-center">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
            CAMERA ACTIVE
          </span>
        </div>
        
        <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
          {MOCK_PRODUCTS.map(product => (
            <button
              key={product.id}
              onClick={() => handleSuccess(product)}
              className="flex-shrink-0 w-28 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-3 transition-all flex flex-col items-center active:scale-95"
            >
              <div className="relative">
                <img src={product.image} alt={product.name} className="w-16 h-16 rounded-xl object-cover mb-2 grayscale-[0.5]" />
                <div className="absolute bottom-2 right-0 bg-black/60 backdrop-blur-sm text-white text-[8px] px-1.5 py-0.5 rounded border border-white/10">
                  {product.barcode}
                </div>
              </div>
              <span className="text-white text-[10px] text-center font-bold truncate w-full">{product.name}</span>
            </button>
          ))}
        </div>
      </div>

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

export default ScannerView;
