
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OverlayUIProps {
  isConfigOpen: boolean;
  setIsConfigOpen: (isOpen: boolean) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  photoCount: number;
  letterContent: string;
  setLetterContent: (content: string) => void;
}

const OverlayUI: React.FC<OverlayUIProps> = ({
  isConfigOpen,
  setIsConfigOpen,
  onFileUpload,
  fileInputRef,
  photoCount,
  letterContent,
  setLetterContent
}) => {
  const MotionButton = motion.button as any;
  const MotionDiv = motion.div as any;

  return (
    <>
      <AnimatePresence>
        {!isConfigOpen && (
          <MotionButton
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.1, opacity: 1.0 }}
            onClick={() => setIsConfigOpen(true)}
            className="absolute bottom-6 right-6 z-50 p-3 bg-black/40 backdrop-blur-md border border-yellow-500/20 rounded-full text-yellow-400 transition-all hover:bg-black/60 hover:border-yellow-500/50 hover:shadow-[0_0_15px_rgba(255,215,0,0.2)] group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </MotionButton>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isConfigOpen && (
          <MotionDiv
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            className="absolute top-0 right-0 h-full w-full md:w-[400px] bg-[#050505] z-[60] shadow-[-20px_0_60px_rgba(0,0,0,0.9)] flex flex-col font-serif-display border-l border-white/5"
          >
            <div className="p-10 pt-16">
               <h2 className="text-[0.65rem] text-white/30 uppercase tracking-[0.6em] mb-2">Setup Console</h2>
               <h1 className="text-4xl text-yellow-500 font-christmas">Digital Epistle</h1>
            </div>

            <div className="flex-1 px-10 space-y-10 overflow-y-auto pb-10 custom-scrollbar">
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="group border border-white/10 hover:border-yellow-500/40 p-6 rounded-sm cursor-pointer transition-all bg-white/[0.02]"
                >
                    <input type="file" accept="image/*" multiple ref={fileInputRef} className="hidden" onChange={onFileUpload} />
                    <p className="text-[0.6rem] text-white/40 uppercase tracking-widest group-hover:text-yellow-200">Import Photographs</p>
                    <p className="text-[0.5rem] text-white/20 mt-1">{photoCount} pieces stored</p>
                </div>

                <div className="space-y-4">
                    <h4 className="text-[0.6rem] text-white/30 uppercase tracking-[0.5em]">Letter Content</h4>
                    <div className="relative bg-black border border-white/5 p-1">
                        <textarea 
                            value={letterContent}
                            onChange={(e) => setLetterContent(e.target.value)}
                            className="w-full h-60 bg-[#0a0a0a] border-none text-yellow-500/90 font-handwriting text-xl p-6 focus:outline-none resize-none leading-relaxed"
                            placeholder="Begin your story..."
                        />
                        <div className="absolute bottom-4 right-6 text-[0.5rem] text-white/10 italic tracking-widest">Secretly nested in the tree</div>
                    </div>
                </div>

                <div className="space-y-6 pt-4 border-t border-white/5">
                    <h4 className="text-[0.55rem] text-white/20 uppercase tracking-[0.4em] text-center italic">Magic Commands</h4>
                    <div className="grid grid-cols-1 gap-6 text-[0.6rem] text-white/40 tracking-widest uppercase">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-yellow-600 font-bold">I</div>
                          <span>Open Hand <span className="text-white/10 italic">- unleash & scroll</span></span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-yellow-600 font-bold">II</div>
                          <span>Pinch Fingers <span className="text-white/10 italic">- select memory</span></span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-yellow-600 font-bold">III</div>
                          <span>Make Fist <span className="text-white/10 italic">- restore tree</span></span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-10 border-t border-white/5 bg-black">
                <button
                    onClick={() => setIsConfigOpen(false)}
                    className="w-full py-5 bg-gradient-to-r from-[#8a6d1d] to-[#d4af37] text-black text-[0.65rem] font-bold uppercase tracking-[0.4em] hover:brightness-110 transition-all shadow-[0_0_30px_rgba(212,175,55,0.2)]"
                >
                    Initialize System
                </button>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </>
  );
};

export default OverlayUI;
