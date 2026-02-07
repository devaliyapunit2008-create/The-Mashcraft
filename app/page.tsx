"use client";

import { signInWithPopup, GithubAuthProvider, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Github, Terminal } from "lucide-react";

export default function Home() {
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const provider = new GithubAuthProvider();
      await signInWithPopup(auth, provider);
      router.push("/dashboard");
    } catch (error) {
      console.error("Login failed:", error);
      alert("System Access Denied. Check console logs.");
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-black text-primary font-mono relative overflow-hidden selection:bg-primary selection:text-black">

      {/* Background Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,#39FF14_1px,transparent_1px),linear-gradient(to_bottom,#39FF14_1px,transparent_1px)] bg-[size:50px_50px]"></div>

      {/* Heavy Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,black_90%)]"></div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="z-10 text-center space-y-8 max-w-4xl px-4"
      >

        {/* Title Section */}
        <div className="flex items-center justify-center gap-2 md:gap-4 relative">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="text-primary mb-2 md:mb-4"
          >
            <span className="text-4xl md:text-6xl font-bold">_&gt;</span>
          </motion.div>

          <h1 className="text-6xl md:text-9xl font-black tracking-tighter text-[#39FF14] drop-shadow-[0_0_15px_rgba(57,255,20,0.5)]">
            DEVSTORY
          </h1>
        </div>

        {/* Subtitle & Tagline */}
        <div className="space-y-4">
          <p className="text-xl md:text-2xl text-muted-foreground/80 tracking-wide">
            Every line of code has it's own story
          </p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="text-xl md:text-2xl text-primary font-bold tracking-wider"
          >
            {">"} Generate winning packages instantly.
          </motion.p>
        </div>

        {/* Spacer */}
        <div className="h-12"></div>

        {/* Login Button */}
        <div className="flex justify-center">
          <button
            onClick={handleLogin}
            className="group relative px-8 py-4 bg-black border-2 border-primary text-primary font-bold text-lg tracking-widest hover:bg-primary hover:text-black transition-all duration-300 shadow-[0_0_20px_rgba(57,255,20,0.2)] hover:shadow-[0_0_40px_rgba(57,255,20,0.6)] flex items-center gap-4 uppercase"
          >
            <Github className="w-6 h-6" />
            <span>INITIALIZE_LOGIN</span>

            {/* Corner Accents */}
            <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-primary"></div>
            <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-primary"></div>
            <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-primary"></div>
            <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-primary"></div>
          </button>
        </div>

      </motion.div>

      {/* Footer Status */}
      <div className="absolute bottom-8 text-xs md:text-sm text-muted-foreground/60 font-bold tracking-widest uppercase animate-pulse">
        SYSTEM_READY // WAITING_FOR_USER_INPUT
      </div>

    </main>
  );
}
