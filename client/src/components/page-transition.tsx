import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  isVisible: boolean;
}

export function PageTransition({ children, isVisible }: PageTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          transition={{ 
            duration: 0.6, 
            ease: [0.22, 1, 0.36, 1],
            type: "tween"
          }}
          className="w-full h-full"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function PageTransitionOverlay() {
  return (
    <motion.div
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      exit={{ scaleX: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformOrigin: "left" }}
      className="fixed inset-0 bg-gradient-to-r from-[#5D688A] via-[#F7A5A5] to-[#FFDBB6] z-[100]"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.2 }}
        transition={{ 
          delay: 0.2, 
          duration: 0.6,
          ease: [0.22, 1, 0.36, 1]
        }}
        className="flex flex-col items-center justify-center h-full"
      >
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -30, opacity: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }}
            className="w-16 h-16 border-4 border-white border-t-transparent rounded-full mx-auto mb-6"
          />
          <motion.h1
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="text-4xl md:text-6xl font-bold text-white mb-2"
          >
            ResumePilot
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.7, duration: 0.3 }}
            className="text-xl text-white/80"
          >
            Preparing your dashboard...
          </motion.p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
