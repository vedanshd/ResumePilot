import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Home, Rocket, Target, Star } from "lucide-react";
import { useLocation } from "wouter";

const navItems = [
  { name: "Home", icon: Home, href: "#home" },
  { name: "Features", icon: Target, href: "#features" },
  { name: "Stats", icon: Star, href: "#stats" },
  { name: "Dashboard", icon: Rocket, href: "/dashboard" }
];

export function FloatingNav() {
  const [isVisible, setIsVisible] = useState(false);
  const [, setLocation] = useLocation();
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsVisible(latest > 100);
  });

  const handleNavClick = (href: string) => {
    if (href.startsWith("#")) {
      const element = document.querySelector(href);
      element?.scrollIntoView({ behavior: "smooth" });
    } else {
      setLocation(href);
    }
  };

  return (
    <motion.nav
      initial={{ x: -100, opacity: 0 }}
      animate={isVisible ? { x: 0, opacity: 1 } : { x: -100, opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed left-6 top-1/2 transform -translate-y-1/2 z-50"
    >
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="flex flex-col items-center gap-4 bg-[#FFF2EF]/80 backdrop-blur-md border border-[#F7A5A5]/30 rounded-3xl px-3 py-6 shadow-xl"
      >
        {navItems.map((item, index) => (
          <motion.button
            key={item.name}
            onClick={() => handleNavClick(item.href)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center justify-center gap-1 p-3 rounded-2xl text-[#5D688A]/80 hover:text-[#5D688A] hover:bg-[#F7A5A5]/20 transition-all duration-200 w-16"
          >
            <item.icon className="w-5 h-5" />
            <span className="text-xs font-medium">{item.name}</span>
          </motion.button>
        ))}
      </motion.div>
    </motion.nav>
  );
}
