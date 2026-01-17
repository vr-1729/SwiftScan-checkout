
import React, { useState, useRef } from 'react';
import { editImageWithPrompt, generateVeoVideo, groundedSearchQuery, groundedMapsQuery } from '../services/geminiService';
import { GroundingSource } from '../types';

// Define the correct GeminiAIStudio interface to resolve TypeScript global declaration conflicts.
// Renamed from AIStudio to avoid potential name collisions with global types.
interface GeminiAIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

declare global {
  interface Window {
    // Made optional to match existing environment modifiers and avoid "identical modifiers" errors.
    aistudio?: GeminiAIStudio;
  }
}

const AiHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'edit' | 'video' | 'chat'>('chat');
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resultVideo, setResultVideo] = useState<string | null>(null);
  
  const [chatQuery, setChatQuery] = useState('');
  const [chatResults, setChatResults] = useState<{text: string, sources: GroundingSource[]}[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = async () => {
    if (!image || !prompt) return;
    setLoading(true);
    const res = await editImageWithPrompt(image, prompt);
    setResultImage(res);
    setLoading(false);
  };

  const handleAnimate = async () => {
    if (!image) return;
    try {
      // Verify API key selection for Veo generation models as mandatory step.
      // Using optional chaining as aistudio is declared as optional.
      const hasKey = await window.aistudio?.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio?.openSelectKey();
      }
      // Note: Proceeding directly after openSelectKey as per race condition guidelines.
      setLoading(true);
      const res = await generateVeoVideo(image, (msg) => setLoadingMsg(msg));
      setResultVideo(res);
    } catch (error: any) {
      console.error("Veo Animation Error:", error);
      // Reset key selection if the error suggests an invalid project/key setup.
      if (error?.message?.includes("Requested entity was not found.")) {
        await window.aistudio?.openSelectKey();
      }
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };

  const handleChat = async (type: 'search' | 'maps') => {
    if (!chatQuery) return;
    setLoading(true);
    let res;
    if (type === 'maps') {
      res = await groundedMapsQuery(chatQuery);
    } else {
      res = await groundedSearchQuery(chatQuery);
    }
    setChatResults(prev => [res, ...prev]);
    setLoading(false);
    setChatQuery('');
  };

  return (
    <div className="p-6 pb-32">
      <div className="flex items-center space-x-2 mb-6">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
          <i className="fa-solid fa-wand-magic-sparkles"></i>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">AI Magic Lab</h2>
          <p className="text-slate-500 text-xs">Powered by Gemini & Veo</p>
        </div>
      </div>

      <div className="flex bg-slate-200 p-1 rounded-xl mb-6">
        <button onClick={() => setActiveTab('chat')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'chat' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>ASSISTANT</button>
        <button onClick={() => setActiveTab('edit')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'edit' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>EDIT IMAGE</button>
        <button onClick={() => setActiveTab('video')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'video' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>VEO ANIMATE</button>
      </div>

      {activeTab === 'chat' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <textarea 
              value={chatQuery}
              onChange={(e) => setChatQuery(e.target.value)}
              placeholder="Ask about store hours, locations, or item prices..."
              className="w-full bg-slate-50 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4 h-24 resize-none"
            />
            <div className="flex space-x-2">
              <button 
                onClick={() => handleChat('search')}
                disabled={loading}
                className="flex-1 bg-slate-900 text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2"
              >
                <i className="fa-brands fa-google"></i>
                <span>SEARCH</span>
              </button>
              <button 
                onClick={() => handleChat('maps')}
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2"
              >
                <i className="fa-solid fa-location-dot"></i>
                <span>MAPS</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {chatResults.map((res, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">{res.text}</p>
                {res.sources.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sources</p>
                    <div className="flex flex-wrap gap-2">
                      {res.sources.map((s, si) => (
                        <a key={si} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md font-medium flex items-center space-x-1">
                          <i className="fa-solid fa-link text-[8px]"></i>
                          <span className="truncate max-w-[120px]">{s.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {(activeTab === 'edit' || activeTab === 'video') && (
        <div className="space-y-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-[9/16] bg-slate-100 rounded-3xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative"
          >
            {image ? (
              <img src={image} className="w-full h-full object-cover" alt="Source" />
            ) : (
              <>
                <i className="fa-solid fa-cloud-arrow-up text-3xl text-slate-400 mb-2"></i>
                <p className="text-slate-500 font-bold text-sm">Upload Photo</p>
              </>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} hidden accept="image/*" />
          </div>

          {activeTab === 'edit' && (
            <div className="space-y-4">
              <input 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., 'Add a neon glow' or 'Make it retro'"
                className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              />
              <button 
                onClick={handleEdit}
                disabled={loading || !image || !prompt}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 disabled:bg-slate-300 disabled:shadow-none transition-all flex items-center justify-center space-x-2"
              >
                {loading ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-wand-sparkles"></i>}
                <span>MAGIC EDIT</span>
              </button>
            </div>
          )}

          {activeTab === 'video' && (
            <div className="space-y-4">
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                <p className="text-[10px] text-amber-800 font-black uppercase mb-1">Veo 3.1 Preview</p>
                <p className="text-xs text-amber-700 leading-relaxed">Video generation requires a paid API key. <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline font-bold">Billing Docs</a></p>
              </div>
              <button 
                onClick={handleAnimate}
                disabled={loading || !image}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg disabled:bg-slate-300 transition-all flex items-center justify-center space-x-2"
              >
                {loading ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-film"></i>}
                <span>ANIMATE WITH VEO</span>
              </button>
            </div>
          )}

          {loading && loadingMsg && (
             <div className="flex flex-col items-center justify-center py-4">
                <p className="text-indigo-600 font-black animate-pulse text-sm">{loadingMsg}</p>
             </div>
          )}

          {resultImage && (
            <div className="bg-white rounded-3xl p-4 shadow-xl border border-slate-100">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Result</p>
              <img src={resultImage} className="w-full rounded-2xl shadow-sm" alt="Edit result" />
            </div>
          )}

          {resultVideo && (
            <div className="bg-white rounded-3xl p-4 shadow-xl border border-slate-100">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Veo Video Result</p>
              <video src={resultVideo} controls className="w-full rounded-2xl shadow-sm" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AiHub;
