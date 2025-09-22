import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Target, Zap, Star, Users, Award, Moon, Sun } from "lucide-react";
import { useLocation } from "wouter";
import { FloatingNav } from "@/components/floating-nav";
import { PageTransitionOverlay } from "@/components/page-transition";
import { useTheme } from "@/contexts/theme-context";

const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const FloatingCard = ({ children, delay = 0, isDark, colors }: { children: React.ReactNode; delay?: number; isDark?: boolean; colors?: any }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50, scale: 0.8 }}
      animate={isInView ? { 
        opacity: 1, 
        y: 0, 
        scale: 1,
        transition: { 
          duration: 0.6, 
          delay,
          ease: "easeOut" 
        }
      } : {}}
      whileHover={{ 
        scale: 1.05,
        transition: { duration: 0.2 }
      }}
      className="backdrop-blur-sm rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300"
      style={{
        backgroundColor: isDark ? `${colors?.card}88` : 'rgba(255, 242, 239, 0.3)',
        borderColor: isDark ? colors?.border : 'rgba(247, 165, 165, 0.3)',
        borderWidth: '1px',
        borderStyle: 'solid'
      }}
    >
      {children}
    </motion.div>
  );
};

const GlowingButton = ({ children, onClick, variant = "primary" }: { children: React.ReactNode; onClick: () => void; variant?: "primary" | "secondary" }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="relative group"
    >
      <div className={`absolute -inset-0.5 ${variant === "primary" ? "bg-gradient-to-r from-purple-600 to-blue-600" : "bg-gradient-to-r from-gray-300 to-gray-500"} rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse`}></div>
      <Button
        onClick={onClick}
        className={`relative px-8 py-3 ${variant === "primary" ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700" : "bg-white text-gray-900 hover:bg-gray-100"} rounded-2xl leading-none flex items-center gap-2 font-semibold text-lg shadow-xl`}
        size="lg"
      >
        {children}
      </Button>
    </motion.div>
  );
};

export default function Landing() {
  const [, setLocation] = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { isDark, toggleTheme, colors } = useTheme();
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 300], [0, -50]);
  const y2 = useTransform(scrollY, [0, 300], [0, -100]);
  
  const handleNavigateToDashboard = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setLocation("/dashboard");
    }, 800);
  };
  
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const statsRef = useRef(null);
  const ctaRef = useRef(null);
  
  const heroInView = useInView(heroRef, { once: true });
  const featuresInView = useInView(featuresRef, { once: true });
  const statsInView = useInView(statsRef, { once: true });
  const ctaInView = useInView(ctaRef, { once: true });

  const stats = [
    { number: "50K+", label: "Resumes Optimized", icon: Users },
    { number: "98%", label: "ATS Pass Rate", icon: Target },
    { number: "24/7", label: "AI Support", icon: Award }
  ];

  const features = [
    {
      icon: Target,
      title: "ATS Optimization",
      description: "Advanced AI algorithms analyze job descriptions and optimize your resume for Applicant Tracking Systems.",
      color: "from-purple-500 to-purple-700"
    },
    {
      icon: Sparkles,
      title: "AI-Powered Suggestions",
      description: "Get intelligent recommendations to improve your resume content and increase interview chances.",
      color: "from-blue-500 to-blue-700"
    },
    {
      icon: Zap,
      title: "Instant Cover Letters",
      description: "Generate personalized cover letters that match your resume and the job requirements perfectly.",
      color: "from-green-500 to-green-700"
    }
  ];

  return (
    <div 
      className="min-h-screen overflow-hidden transition-all duration-500"
      style={{ 
        background: isDark 
          ? `linear-gradient(135deg, ${colors.background} 0%, ${colors.card} 50%, ${colors.muted} 100%)`
          : 'linear-gradient(135deg, #FFF2EF 0%, #FFDBB6 50%, #F7A5A5 100%)',
        color: isDark ? colors.foreground : '#5D688A'
      }}
    >
      {/* Theme Toggle Button */}
      <div className="fixed top-6 right-6 z-50">
        <Button
          size="icon"
          onClick={toggleTheme}
          className="w-10 h-10 rounded-full shadow-lg transition-all duration-300 backdrop-blur-sm"
          style={{ 
            backgroundColor: isDark ? colors.primary : '#A2D5C6',
            color: isDark ? colors.primaryForeground : '#000000'
          }}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>
      
      {/* Floating Navigation */}
      <FloatingNav />
      
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          style={{ y: y1 }}
          className="absolute top-20 left-20 w-72 h-72 bg-[#F7A5A5]/20 rounded-full blur-3xl"
        />
        <motion.div
          style={{ y: y2 }}
          className="absolute top-40 right-20 w-96 h-96 bg-[#5D688A]/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-20 left-1/2 w-64 h-64 bg-[#FFDBB6]/20 rounded-full blur-2xl"
        />
      </div>

      {/* Hero Section */}
      <motion.section 
        id="home"
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center px-6"
        initial="hidden"
        animate={heroInView ? "visible" : "hidden"}
        variants={staggerContainer}
      >
        <div className="max-w-6xl mx-auto text-center">
          <motion.div variants={fadeInUp} className="mb-6">
            <h1 
              className="text-7xl md:text-8xl font-bold bg-clip-text text-transparent leading-tight"
              style={{
                backgroundImage: isDark 
                  ? `linear-gradient(to right, ${colors.primary}, ${colors.secondary}, ${colors.accent})`
                  : 'linear-gradient(to right, #5D688A, #F7A5A5, #FFDBB6)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text'
              }}
            >
              ResumePilot
            </h1>
          </motion.div>
          
          <motion.p 
            variants={fadeInUp}
            className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto leading-relaxed"
            style={{ color: isDark ? colors.secondary : '#722F37' }}
          >
            Transform your career with AI-powered resume optimization. 
            Beat ATS systems, land more interviews, and get your dream job.
          </motion.p>
          
          <motion.div variants={fadeInUp} className="flex justify-center">
            <GlowingButton onClick={handleNavigateToDashboard}>
              Start Generating
              <ArrowRight className="w-5 h-5" />
            </GlowingButton>
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section 
        id="features"
        ref={featuresRef}
        className="relative py-20 px-6"
        initial="hidden"
        animate={featuresInView ? "visible" : "hidden"}
        variants={staggerContainer}
      >
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeInUp} className="text-center mb-16">
            <h2 
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{ color: isDark ? colors.secondary : '#722F37' }}
            >
              Why Choose ResumePilot?
            </h2>
            <p 
              className="text-xl max-w-2xl mx-auto"
              style={{ color: isDark ? colors.accent : '#722F37CC' }}
            >
              Our AI-powered platform gives you everything you need to create winning resumes and cover letters.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FloatingCard key={index} delay={index * 0.1} isDark={isDark} colors={colors}>
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 
                  className="text-xl font-semibold mb-3"
                  style={{ color: isDark ? colors.foreground : '#722F37' }}
                >
                  {feature.title}
                </h3>
                <p 
                  className="leading-relaxed"
                  style={{ color: isDark ? colors.mutedForeground : '#722F37CC' }}
                >
                  {feature.description}
                </p>
              </FloatingCard>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Stats Section */}
      <motion.section 
        id="stats"
        ref={statsRef}
        className="relative py-20 px-6"
        initial="hidden"
        animate={statsInView ? "visible" : "hidden"}
        variants={staggerContainer}
      >
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeInUp} className="text-center mb-16">
            <h2 
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{ color: isDark ? colors.secondary : '#722F37' }}
            >
              Trusted by Professionals Worldwide
            </h2>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8 justify-center">
            {stats.map((stat, index) => (
              <FloatingCard key={index} delay={index * 0.1} isDark={isDark} colors={colors}>
                <div className="text-center">
                  <stat.icon 
                    className="w-8 h-8 mx-auto mb-4"
                    style={{ color: isDark ? colors.primary : '#A78BFA' }}
                  />
                  <div 
                    className="text-3xl font-bold mb-2"
                    style={{
                      backgroundImage: isDark 
                        ? `linear-gradient(to right, ${colors.primary}, ${colors.secondary})`
                        : 'linear-gradient(to right, #A78BFA, #60A5FA)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      color: 'transparent'
                    }}
                  >
                    {stat.number}
                  </div>
                  <div style={{ color: isDark ? colors.mutedForeground : '#722F37CC' }}>
                    {stat.label}
                  </div>
                </div>
              </FloatingCard>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <motion.footer className="relative py-12 px-6">
      </motion.footer>

      {/* Page Transition Overlay */}
      <AnimatePresence>
        {isTransitioning && <PageTransitionOverlay />}
      </AnimatePresence>
    </div>
  );
}
