
import React, { useState, useEffect, useRef } from 'react';
import { SUPPORTED_LANGUAGES, APP_NAME } from './constants';
import { AppTab, TranslationHistoryItem } from './types';
import { geminiService } from './services/geminiService';
import { 
  Languages, 
  History, 
  Volume2, 
  Copy, 
  Trash2, 
  ArrowRightLeft, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  Camera,
  Image as ImageIcon,
  Upload,
  X,
  ScanText
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.TRANSLATE);
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('es');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [history, setHistory] = useState<TranslationHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Image Upload & Camera States
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('globaltranslator_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('globaltranslator_history', JSON.stringify(history));
  }, [history]);

  const handleTranslate = async () => {
    if (!sourceText.trim() && !capturedImage) return;
    
    setIsLoading(true);
    setError(null);
    try {
      let result;
      if (capturedImage) {
        const base64Data = capturedImage.split(',')[1];
        const mimeType = capturedImage.split(';')[0].split(':')[1];
        result = await geminiService.translateImage(base64Data, mimeType, targetLang);
        setSourceText(result.originalText);
        setTranslatedText(result.translatedText);
        setSourceLang(result.detectedLang);
      } else {
        result = await geminiService.translate(sourceText, targetLang, sourceLang === 'auto' ? undefined : sourceLang);
        setTranslatedText(result.translatedText);
      }
      
      // Update history
      const newHistoryItem: TranslationHistoryItem = {
        id: Date.now().toString(),
        sourceText: result.originalText || sourceText,
        translatedText: result.translatedText,
        sourceLang: result.detectedLang || sourceLang,
        targetLang,
        timestamp: Date.now()
      };
      
      setHistory(prev => [newHistoryItem, ...prev.slice(0, 49)]);
      setCapturedImage(null); // Clear image after successful translation
    } catch (err: any) {
      setError(err.message || 'Translation failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwap = () => {
    if (sourceLang === 'auto') return;
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(translatedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSpeak = (text: string, lang: string) => {
    geminiService.speak(text, lang);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('globaltranslator_history');
  };

  // Camera Logic
  const openCamera = async () => {
    setIsCameraOpen(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Unable to access camera. Please check permissions.");
      setIsCameraOpen(false);
    }
  };

  const closeCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        closeCamera();
      }
    }
  };

  // File Upload Logic
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target?.result as string);
        setSourceText(''); // Prioritize image text
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center pb-24 font-sans text-slate-900">
      {/* Header */}
      <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-100">
            <Languages className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">{APP_NAME}</h1>
        </div>
      </header>

      <main className="w-full max-w-2xl px-4 mt-8 flex-1">
        {activeTab === AppTab.TRANSLATE ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Language Selectors */}
            <div className="flex flex-col sm:flex-row items-center justify-between bg-white p-2 rounded-2xl shadow-sm border border-slate-200 gap-2 sm:gap-0">
              <select 
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="w-full sm:w-auto bg-transparent text-sm font-semibold text-slate-700 px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
              >
                <option value="auto">Detect Language</option>
                {SUPPORTED_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>

              <button 
                onClick={handleSwap}
                disabled={sourceLang === 'auto'}
                className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-indigo-600 transition-all disabled:opacity-30"
              >
                <ArrowRightLeft size={20} />
              </button>

              <select 
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full sm:w-auto bg-transparent text-sm font-semibold text-slate-700 px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>

            {/* Input & Scan Options */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden transition-all focus-within:ring-2 focus-within:ring-indigo-500/20">
              <div className="p-6">
                {!capturedImage ? (
                  <textarea
                    placeholder="Type, paste, or upload an image to translate..."
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    className="w-full h-32 text-lg text-slate-800 placeholder:text-slate-400 bg-transparent resize-none border-none focus:ring-0 leading-relaxed"
                  />
                ) : (
                  <div className="relative group rounded-2xl overflow-hidden border border-slate-100 mb-4 bg-slate-50 flex justify-center">
                    <img src={capturedImage} alt="Captured" className="max-h-64 object-contain" />
                    <button 
                      onClick={() => setCapturedImage(null)}
                      className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur shadow-md rounded-full text-red-500 hover:bg-white transition-all"
                    >
                      <X size={20} />
                    </button>
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/50 to-transparent flex items-center gap-2">
                       <ScanText size={20} className="text-white" />
                       <span className="text-white text-xs font-bold uppercase tracking-widest">Image ready to scan</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center mt-4 border-t border-slate-50 pt-4">
                  <div className="flex gap-2">
                    <button 
                      onClick={openCamera}
                      className="p-3 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                      title="Take Photo"
                    >
                      <Camera size={20} />
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                      title="Upload Image"
                    >
                      <ImageIcon size={20} />
                    </button>
                    <button 
                      onClick={() => handleSpeak(sourceText, sourceLang)}
                      disabled={!sourceText}
                      className="p-3 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all disabled:opacity-30"
                      title="Listen"
                    >
                      <Volume2 size={20} />
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleFileUpload}
                    />
                  </div>
                  {!capturedImage && (
                    <span className="text-xs text-slate-400 font-medium">
                      {sourceText.length} / 5000
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleTranslate}
              disabled={isLoading || (!sourceText && !capturedImage)}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-2xl shadow-xl shadow-indigo-200 transition-all active:scale-[0.98] flex justify-center items-center gap-2 group"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  {capturedImage ? <ScanText size={20} /> : <Languages size={20} />}
                  <span>{capturedImage ? 'Scan & Translate' : 'Translate'}</span>
                </>
              )}
            </button>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 border border-red-100">
                <AlertCircle size={20} />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Result Area */}
            {translatedText && (
              <div className="bg-indigo-50/50 rounded-3xl border border-indigo-100 p-6 animate-in slide-in-from-top-4 duration-300">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                    {SUPPORTED_LANGUAGES.find(l => l.code === targetLang)?.name}
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleCopy}
                      className="p-3 bg-white text-slate-600 hover:text-indigo-600 rounded-xl shadow-sm border border-slate-100 transition-all active:scale-95"
                    >
                      {isCopied ? <CheckCircle2 size={18} className="text-green-500" /> : <Copy size={18} />}
                    </button>
                    <button 
                      onClick={() => handleSpeak(translatedText, targetLang)}
                      className="p-3 bg-white text-slate-600 hover:text-indigo-600 rounded-xl shadow-sm border border-slate-100 transition-all active:scale-95"
                    >
                      <Volume2 size={18} />
                    </button>
                  </div>
                </div>
                <p className="text-xl text-slate-900 font-medium leading-relaxed whitespace-pre-wrap">
                  {translatedText}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex justify-between items-center mb-6 px-2">
              <h2 className="text-lg font-bold text-slate-800">History</h2>
              {history.length > 0 && (
                <button 
                  onClick={clearHistory}
                  className="text-sm text-red-500 font-semibold flex items-center gap-1 hover:bg-red-50 px-3 py-1 rounded-lg transition-all"
                >
                  <Trash2 size={16} />
                  Clear All
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <History className="text-slate-300" size={32} />
                </div>
                <p className="text-slate-400 font-medium">No translation history yet</p>
                <button 
                  onClick={() => setActiveTab(AppTab.TRANSLATE)}
                  className="mt-4 text-indigo-600 font-bold hover:underline"
                >
                  Start translating
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((item) => (
                  <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-tighter">
                        <span>{SUPPORTED_LANGUAGES.find(l => l.code === item.sourceLang)?.name || item.sourceLang}</span>
                        <ArrowRightLeft size={10} />
                        <span className="text-indigo-600">{SUPPORTED_LANGUAGES.find(l => l.code === item.targetLang)?.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-300">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mb-2 line-clamp-2">{item.sourceText}</p>
                    <p className="text-base text-slate-800 font-semibold mb-3">{item.translatedText}</p>
                    <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                       <button 
                        onClick={() => {
                          setSourceText(item.sourceText);
                          setSourceLang(item.sourceLang);
                          setTargetLang(item.targetLang);
                          setTranslatedText(item.translatedText);
                          setActiveTab(AppTab.TRANSLATE);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Reuse"
                      >
                        <Languages size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Camera Modal Overlay */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="p-6 flex justify-between items-center bg-black/50 backdrop-blur text-white">
            <h2 className="font-bold">Scan Text</h2>
            <button onClick={closeCamera} className="p-2 hover:bg-white/10 rounded-full transition-all">
              <X size={24} />
            </button>
          </div>
          <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full max-h-full object-contain"
            />
            {/* Camera Guide */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
               <div className="w-64 h-64 border-2 border-white/30 rounded-3xl flex items-center justify-center">
                  <div className="w-8 h-8 border-t-2 border-l-2 border-indigo-500 absolute top-0 left-0 rounded-tl-xl" />
                  <div className="w-8 h-8 border-t-2 border-r-2 border-indigo-500 absolute top-0 right-0 rounded-tr-xl" />
                  <div className="w-8 h-8 border-b-2 border-l-2 border-indigo-500 absolute bottom-0 left-0 rounded-bl-xl" />
                  <div className="w-8 h-8 border-b-2 border-r-2 border-indigo-500 absolute bottom-0 right-0 rounded-br-xl" />
               </div>
            </div>
          </div>
          <div className="p-8 flex justify-center bg-black/50 backdrop-blur">
            <button 
              onClick={capturePhoto}
              className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center group"
            >
              <div className="w-12 h-12 bg-white rounded-full group-active:scale-90 transition-transform" />
            </button>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />

      {/* Navigation Bar */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-slate-900/90 backdrop-blur-md rounded-3xl p-2 shadow-2xl flex justify-around items-center border border-white/10 z-10">
        <button
          onClick={() => setActiveTab(AppTab.TRANSLATE)}
          className={`flex-1 py-3 rounded-2xl flex flex-col items-center gap-1 transition-all ${
            activeTab === AppTab.TRANSLATE ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-400'
          }`}
        >
          <Languages size={20} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Translate</span>
        </button>
        <button
          onClick={() => setActiveTab(AppTab.HISTORY)}
          className={`flex-1 py-3 rounded-2xl flex flex-col items-center gap-1 transition-all ${
            activeTab === AppTab.HISTORY ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-400'
          }`}
        >
          <History size={20} />
          <span className="text-[10px] font-bold uppercase tracking-widest">History</span>
        </button>
      </nav>
    </div>
  );
}
