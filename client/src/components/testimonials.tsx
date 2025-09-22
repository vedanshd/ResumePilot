import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    id: 1,
    name: "Sarah Johnson",
    role: "Software Engineer",
    company: "Google",
    image: "👩‍💻",
    rating: 5,
    text: "ResumePilot helped me land my dream job at Google! The ATS optimization was incredible - I went from 0 callbacks to 5 interviews in just two weeks."
  },
  {
    id: 2,
    name: "Michael Chen",
    role: "Product Manager",
    company: "Microsoft",
    image: "👨‍💼",
    rating: 5,
    text: "The AI suggestions were spot-on. My resume transformation was amazing, and the cover letter generator saved me hours. Absolutely worth it!"
  },
  {
    id: 3,
    name: "Emily Rodriguez",
    role: "UX Designer",
    company: "Adobe",
    image: "👩‍🎨",
    rating: 5,
    text: "I was skeptical at first, but ResumePilot completely changed my job search game. The personalized feedback was exactly what I needed."
  },
  {
    id: 4,
    name: "David Kim",
    role: "Data Scientist",
    company: "Netflix",
    image: "👨‍🔬",
    rating: 5,
    text: "The ATS scoring feature is brilliant! I could see exactly how my resume would perform before applying. It's like having a career coach."
  }
];

export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative">
      <div className="flex justify-center mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex gap-1"
        >
          {testimonials.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => setCurrentIndex(index)}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentIndex ? "bg-purple-400" : "bg-white/30"
              }`}
            />
          ))}
        </motion.div>
      </div>

      <div className="relative h-80 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -100, scale: 0.9 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 max-w-2xl mx-auto text-center shadow-xl">
              <Quote className="w-12 h-12 text-purple-400 mx-auto mb-6" />
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg text-gray-200 mb-6 leading-relaxed italic"
              >
                "{testimonials[currentIndex].text}"
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center gap-2 mb-4"
              >
                {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center justify-center gap-4"
              >
                <div className="text-4xl">{testimonials[currentIndex].image}</div>
                <div>
                  <div className="font-semibold text-white">{testimonials[currentIndex].name}</div>
                  <div className="text-sm text-gray-300">
                    {testimonials[currentIndex].role} at {testimonials[currentIndex].company}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
