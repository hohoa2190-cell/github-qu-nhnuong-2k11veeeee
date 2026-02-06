
import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Image as ImageIcon, 
  Sparkles, 
  Wand2, 
  Download, 
  Trash2, 
  Play, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  Palette
} from 'lucide-react';
import { Photo, StickerInstance } from './types';
import { STICKERS } from './constants';
import PhotoFrame from './components/PhotoFrame';
import Sticker from './components/Sticker';
import SparkleEffect from './components/SparkleEffect';
import { 
  generateCaption, 
  enhanceImageStyle, 
  generateAISticker, 
  generateNarration, 
  decodeAudio, 
  decodeAudioData 
} from './services/geminiService';

const PHOTOS_PER_PAGE = 4;

const App: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [stickers, setStickers] = useState<StickerInstance[]>([]);
  const [stickerPrompt, setStickerPrompt] = useState("");
  const [isGeneratingSticker, setIsGeneratingSticker] = useState(false);
  const [isNarrating, setIsNarrating] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [activeFilter, setActiveFilter] = useState('none');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(photos.length / PHOTOS_PER_PAGE)), [photos.length]);
  
  const currentPhotos = useMemo(() => {
    const start = currentPage * PHOTOS_PER_PAGE;
    return photos.slice(start, start + PHOTOS_PER_PAGE);
  }, [photos, currentPage]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const newPhoto: Photo = {
        id: Math.random().toString(36).substr(2, 9),
        url: event.target?.result as string,
        caption: "",
        rotation: (Math.random() - 0.5) * 10,
        scale: 1,
        filter: activeFilter,
        isAIProcessing: false
      };
      setPhotos(prev => [...prev, newPhoto]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const addSticker = (url: string) => {
    const newSticker: StickerInstance = {
      id: Math.random().toString(36).substr(2, 9),
      url,
      x: window.innerWidth / 2 - 32 + (Math.random() - 0.5) * 100,
      y: window.innerHeight / 2 - 32 + (Math.random() - 0.5) * 100,
      scale: 1,
      rotation: (Math.random() - 0.5) * 30
    };
    setStickers(prev => [...prev, newSticker]);
  };

  const handleCreateAISticker = async () => {
    if (!stickerPrompt.trim()) return;
    setIsGeneratingSticker(true);
    const stickerUrl = await generateAISticker(stickerPrompt);
    if (stickerUrl) {
      addSticker(stickerUrl);
      setStickerPrompt("");
    }
    setIsGeneratingSticker(false);
  };

  const playNarration = async () => {
    if (photos.length === 0) return;
    setIsNarrating(true);

    const fullStory = photos.map(p => p.caption || "A happy moment").join(". ");
    const audioBase64 = await generateNarration(fullStory);

    if (audioBase64) {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      const audioBytes = decodeAudio(audioBase64);
      const audioBuffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => setIsNarrating(false);
      source.start();
    } else {
      setIsNarrating(false);
    }
  };

  const applyGlobalFilter = (filter: string) => {
    setActiveFilter(filter);
    setPhotos(prev => prev.map(p => ({ ...p, filter })));
  };

  const removePhoto = (id: string) => {
    setPhotos(prev => {
      const updated = prev.filter(p => p.id !== id);
      const newTotalPages = Math.max(1, Math.ceil(updated.length / PHOTOS_PER_PAGE));
      if (currentPage >= newTotalPages) {
        setCurrentPage(Math.max(0, newTotalPages - 1));
      }
      return updated;
    });
  };

  const removeSticker = (id: string) => setStickers(prev => prev.filter(s => s.id !== id));
  const updateCaption = (id: string, caption: string) => setPhotos(prev => prev.map(p => p.id === id ? { ...p, caption } : p));

  const applyAIMagic = async (id: string) => {
    const photo = photos.find(p => p.id === id);
    if (!photo) return;
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, isAIProcessing: true } : p));
    try {
      const [newCaption, enhancedUrl] = await Promise.all([
        generateCaption(photo.url),
        enhanceImageStyle(photo.url)
      ]);
      setPhotos(prev => prev.map(p => p.id === id ? { 
        ...p, 
        caption: newCaption || p.caption,
        url: enhancedUrl || p.url,
        isAIProcessing: false 
      } : p));
    } catch (error) {
      setPhotos(prev => prev.map(p => p.id === id ? { ...p, isAIProcessing: false } : p));
    }
  };

  const clearCanvas = () => {
    if (confirm("Xác nhận xóa sổ ảnh? Mọi thay đổi sẽ không thể khôi phục!")) {
      setPhotos([]);
      setStickers([]);
      setCurrentPage(0);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="relative min-h-screen p-4 md:p-8 flex flex-col items-center select-none overflow-x-hidden">
      <SparkleEffect />

      {/* Header */}
      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-8 z-10"
      >
        <div className="flex items-center justify-center gap-4 mb-4">
           <button 
            onClick={playNarration}
            disabled={isNarrating || photos.length === 0}
            className={`p-3 rounded-full shadow-lg transition-all ${isNarrating ? 'bg-pink-200 text-pink-500' : 'bg-white hover:bg-pink-50 text-pink-400'}`}
            title="Nghe giọng đọc kỳ diệu"
          >
            {isNarrating ? <Loader2 className="animate-spin" /> : <Play fill="currentColor" size={20} />}
          </button>
        </div>
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-pink-400 drop-shadow-sm flex items-center justify-center gap-3">
          <span className="animate-pulse shrink-0">🌸</span> 
          <span className="font-handwriting">Photobook Quỳnh Nương 2K11</span>
          <span className="animate-pulse shrink-0">🌸</span>
        </h1>
        <p className="text-pink-300 mt-3 font-medium tracking-wide text-lg md:text-xl">Lưu giữ khoảnh khắc theo phong cách Hàn Quốc</p>
      </motion.header>

      {/* Main Book Area */}
      <main className="w-full max-w-5xl bg-white/60 backdrop-blur-md rounded-[40px] p-6 md:p-12 shadow-2xl border-8 border-white min-h-[60vh] relative z-10 flex flex-col items-center">
        
        <div className="w-full flex flex-wrap justify-center items-start gap-4 min-h-[400px]">
          <AnimatePresence mode="wait">
            {photos.length === 0 ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full flex flex-col items-center justify-center text-pink-200 py-20"
              >
                <ImageIcon size={64} className="mb-4 opacity-30" />
                <p className="text-xl font-medium">Sổ ảnh còn trống...</p>
                <p className="text-sm">Tải ảnh lên để bắt đầu câu chuyện của bạn</p>
              </motion.div>
            ) : (
              <motion.div 
                key={currentPage}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full flex flex-wrap justify-center gap-4"
              >
                {currentPhotos.map(photo => (
                  <PhotoFrame 
                    key={photo.id} 
                    photo={photo} 
                    onRemove={removePhoto}
                    onUpdateCaption={updateCaption}
                    onEnhance={applyAIMagic}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Pagination Controls */}
        {photos.length > 0 && (
          <div className="mt-8 flex items-center gap-6">
            <button 
              onClick={prevPage}
              disabled={currentPage === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-pink-400 font-bold shadow-md hover:bg-pink-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={20} />
              Trang trước
            </button>
            <span className="text-pink-400 font-bold bg-white px-4 py-2 rounded-full shadow-inner">
              {currentPage + 1} / {totalPages}
            </span>
            <button 
              onClick={nextPage}
              disabled={currentPage === totalPages - 1}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-pink-400 font-bold shadow-md hover:bg-pink-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Trang sau
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Floating Stickers Layer */}
        <div className="absolute inset-0 pointer-events-none">
          {stickers.map(sticker => (
            <div key={sticker.id} className="pointer-events-auto">
              <Sticker sticker={sticker} onRemove={removeSticker} />
            </div>
          ))}
        </div>
      </main>

      {/* Controls Bar - Sticky at bottom */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-xl border-4 border-pink-100 rounded-[32px] shadow-2xl p-3 px-6 flex items-center gap-4 z-50 flex-wrap justify-center max-w-[95vw]"
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleFileUpload}
        />
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 bg-pink-400 text-white px-5 py-2.5 rounded-full hover:bg-pink-500 transition-all shadow-md active:scale-95"
        >
          <Plus size={20} />
          <span className="hidden md:inline font-semibold">Tải Ảnh</span>
        </button>

        <div className="h-8 w-px bg-pink-100" />

        {/* Global Filter Buttons */}
        <div className="flex items-center gap-2 bg-pink-50 px-3 py-1.5 rounded-full border border-pink-100">
          <Palette size={16} className="text-pink-300" />
          <button 
            onClick={() => applyGlobalFilter('none')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${activeFilter === 'none' ? 'bg-pink-400 text-white' : 'text-pink-300 hover:bg-pink-100'}`}
          >
            Gốc
          </button>
          <button 
            onClick={() => applyGlobalFilter('sepia(40%) saturate(120%) contrast(90%)')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${activeFilter.includes('sepia') ? 'bg-pink-400 text-white' : 'text-pink-300 hover:bg-pink-100'}`}
          >
            Vintage
          </button>
          <button 
            onClick={() => applyGlobalFilter('brightness(1.2) saturate(1.1) contrast(1.1)')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${activeFilter.includes('brightness') ? 'bg-pink-400 text-white' : 'text-pink-300 hover:bg-pink-100'}`}
          >
            Glow
          </button>
        </div>

        <div className="h-8 w-px bg-pink-100 hidden md:block" />

        {/* AI Sticker Generator */}
        <div className="flex items-center bg-pink-50 rounded-full px-3 py-1 gap-2 border border-pink-100 focus-within:ring-2 ring-pink-200 transition-all">
          <input 
            type="text"
            placeholder="Tạo sticker AI..."
            value={stickerPrompt}
            onChange={(e) => setStickerPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateAISticker()}
            className="bg-transparent border-none focus:ring-0 text-sm text-pink-500 placeholder-pink-200 w-24 md:w-32"
          />
          <button 
            onClick={handleCreateAISticker}
            disabled={isGeneratingSticker || !stickerPrompt.trim()}
            className="p-1.5 bg-white rounded-full text-pink-400 hover:text-pink-600 shadow-sm disabled:opacity-50"
          >
            {isGeneratingSticker ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}
          </button>
        </div>

        <div className="h-8 w-px bg-pink-100 hidden md:block" />

        {/* Sticker Library */}
        <div className="flex gap-2 overflow-x-auto max-w-[150px] md:max-w-none no-scrollbar py-1">
          {STICKERS.slice(0, 4).map((s, idx) => (
            <motion.button
              key={idx}
              whileHover={{ scale: 1.2, rotate: 10 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => addSticker(s)}
              className="w-9 h-9 p-1 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors shrink-0"
            >
              <img src={s} alt="sticker" className="w-full h-full object-contain" />
            </motion.button>
          ))}
        </div>

        <div className="h-8 w-px bg-pink-100" />

        <div className="flex gap-1">
          <button 
            onClick={clearCanvas}
            className="p-2 text-pink-300 hover:text-red-400 transition-colors rounded-full hover:bg-red-50"
            title="Xóa Tất Cả"
          >
            <Trash2 size={20} />
          </button>
          <button 
            onClick={() => window.print()}
            className="p-2 text-pink-300 hover:text-pink-500 transition-colors rounded-full hover:bg-pink-50"
            title="In Sổ Ảnh"
          >
            <Download size={20} />
          </button>
        </div>
      </motion.div>

      <footer className="mt-20 pb-20 text-pink-400 font-medium text-sm flex flex-col items-center gap-2 opacity-70">
        <div className="made text-center text-base md:text-lg">
          ✨ Made by Quỳnh Nương 2K11 Photobook ✨
        </div>
        <p className="text-[10px] uppercase tracking-widest font-bold">Pastel Dream Collection 2024</p>
      </footer>
    </div>
  );
};

export default App;
