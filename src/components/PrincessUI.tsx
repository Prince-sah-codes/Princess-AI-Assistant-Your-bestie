import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Power, Sparkles, Volume2, VolumeX, Heart, Zap, Ghost, Smile } from 'lucide-react';
import { LiveClient } from '../lib/live-client';
import { AudioRecorder } from '../lib/audio-recorder';
import { AudioPlayer } from '../lib/audio-player';
import { SoundManager } from '../lib/sound-manager';

const MODE_CONFIG: Record<string, { color: string, icon: any, label: string }> = {
  cute: { color: 'bg-pink-400', icon: Heart, label: 'Cute Mode 🥺' },
  savage: { color: 'bg-orange-500', icon: Zap, label: 'Savage Mode 😈' },
  romantic: { color: 'bg-red-500', icon: Heart, label: 'Romantic Mode ❤️' },
  jealous: { color: 'bg-green-500', icon: Ghost, label: 'Jealous Mode 💚' },
  normal: { color: 'bg-purple-600', icon: Smile, label: 'Princess' },
};

const PrincessUI: React.FC = () => {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [mode, setMode] = useState('normal');
  
  const liveClientRef = useRef<LiveClient | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const soundManagerRef = useRef<SoundManager | null>(null);

  useEffect(() => {
    playerRef.current = new AudioPlayer();
    soundManagerRef.current = new SoundManager();
    
    return () => {
      liveClientRef.current?.disconnect();
      recorderRef.current?.stop();
      playerRef.current?.stop();
    };
  }, []);

  const toggleConnection = async () => {
    if (status === 'connected') {
      soundManagerRef.current?.playDeactivation();
      liveClientRef.current?.disconnect();
      recorderRef.current?.stop();
      playerRef.current?.stop();
      setStatus('disconnected');
      setIsListening(false);
      setIsSpeaking(false);
      setMode('normal');
    } else {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        alert('Gemini API Key is missing!');
        return;
      }

      soundManagerRef.current?.playActivation();

      liveClientRef.current = new LiveClient(apiKey, {
        onAudioData: (base64) => {
          playerRef.current?.playChunk(base64);
          setIsSpeaking(true);
          soundManagerRef.current?.playSpeaking();
        },
        onInterrupted: () => {
          playerRef.current?.stop();
          setIsSpeaking(false);
          soundManagerRef.current?.playError();
        },
        onStateChange: (newState) => {
          setStatus(newState);
          if (newState === 'connected') {
            startRecording();
          } else if (newState === 'error') {
            soundManagerRef.current?.playError();
          }
        },
        onModeChange: (newMode) => {
          setMode(newMode);
        },
        onTranscription: (text, isInput) => {
          setTranscription(text);
          if (isInput) {
            soundManagerRef.current?.playListening();
          }
          // Auto-clear transcription after a few seconds
          setTimeout(() => setTranscription(''), 5000);
        }
      });

      try {
        await liveClientRef.current.connect();
      } catch (err) {
        console.error(err);
        setStatus('error');
        soundManagerRef.current?.playError();
      }
    }
  };

  const startRecording = async () => {
    recorderRef.current = new AudioRecorder((base64) => {
      liveClientRef.current?.sendAudio(base64);
      setIsListening(true);
    });
    await recorderRef.current.start();
  };

  // Check if speaking status should be updated based on player
  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current) {
        setIsSpeaking(playerRef.current.getIsPlaying());
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const currentMode = MODE_CONFIG[mode] || MODE_CONFIG.normal;
  const ModeIcon = currentMode.icon;

  return (
    <div className="fixed inset-0 bg-[#050505] text-white flex flex-col items-center justify-center overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className={`absolute -top-1/4 -left-1/4 w-full h-full ${currentMode.color} rounded-full blur-[120px] transition-colors duration-1000`} 
        />
        <motion.div 
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear", delay: 2 }}
          className="absolute -bottom-1/4 -right-1/4 w-full h-full bg-pink-600 rounded-full blur-[120px]" 
        />
      </div>

      {/* Header */}
      <div className="absolute top-8 left-0 right-0 flex justify-between px-8 items-center z-10">
        <div className="flex items-center gap-2">
          <ModeIcon className={`${currentMode.color.replace('bg-', 'text-')} w-5 h-5 transition-colors duration-500`} />
          <span className="text-sm font-medium tracking-widest uppercase opacity-70">{currentMode.label}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className={`w-2 h-2 rounded-full ${
            status === 'connected' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 
            status === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
            status === 'error' ? 'bg-red-500' : 'bg-gray-600'
          }`} />
          <span className="text-[10px] uppercase tracking-tighter opacity-50">{status}</span>
        </div>
      </div>

      {/* Main Visualizer Area */}
      <div className="relative flex flex-col items-center justify-center w-full max-w-md aspect-square">
        {/* Outer Rings */}
        <AnimatePresence>
          {status === 'connected' && (
            <>
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="absolute inset-0 border border-white/10 rounded-full"
              />
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className={`absolute inset-4 border border-dashed ${currentMode.color.replace('bg-', 'border-')}/20 rounded-full transition-colors duration-500`}
              />
            </>
          )}
        </AnimatePresence>

        {/* Waveform/Pulse */}
        <div className="relative z-10 flex items-center justify-center">
          <AnimatePresence>
            {isSpeaking && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2] }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 1, repeat: Infinity }}
                className={`absolute w-72 h-72 ${currentMode.color}/30 rounded-full blur-3xl transition-colors duration-500`}
              />
            )}
            {isListening && !isSpeaking && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [1, 1.05, 1], opacity: [0.1, 0.3, 0.1] }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute w-64 h-64 bg-white/10 rounded-full blur-2xl"
              />
            )}
          </AnimatePresence>

          {/* Central Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={status === 'connected' && !isSpeaking && !isListening ? {
              boxShadow: [
                "0 0 20px rgba(255,255,255,0.1)",
                "0 0 40px rgba(255,255,255,0.3)",
                "0 0 20px rgba(255,255,255,0.1)"
              ]
            } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            onClick={toggleConnection}
            className={`relative z-20 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${
              status === 'connected' 
                ? 'bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.4)]' 
                : 'bg-pink-600 text-white shadow-[0_0_20px_rgba(219,39,119,0.4)]'
            }`}
          >
            {status === 'connected' ? (
              <ModeIcon className="w-10 h-10" />
            ) : status === 'connecting' ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-10 h-10" />
              </motion.div>
            ) : (
              <Mic className="w-10 h-10" />
            )}
          </motion.button>
        </div>

        {/* Status Text */}
        <div className="absolute bottom-[-60px] flex flex-col items-center gap-2">
          <motion.p 
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`text-xs uppercase tracking-[0.3em] font-light ${currentMode.color.replace('bg-', 'text-')} transition-colors duration-500`}
          >
            {status === 'connected' ? (isSpeaking ? 'Princess is speaking...' : isListening ? 'Listening...' : 'Ready for you') : 
             status === 'connecting' ? 'Establishing link...' : 
             status === 'error' ? 'Connection failed' : 'Tap to wake me up'}
          </motion.p>
        </div>
      </div>

      {/* Transcription Overlay */}
      <AnimatePresence>
        {transcription && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="absolute bottom-24 px-8 text-center max-w-lg"
          >
            <p className="text-lg font-light italic text-white/80 leading-relaxed">
              "{transcription}"
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Controls */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-8 px-8 z-10">
        <div className="flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity cursor-pointer">
          {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          <span className="text-[10px] uppercase tracking-widest">Mic</span>
        </div>
        <div className="flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity cursor-pointer">
          {isSpeaking ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          <span className="text-[10px] uppercase tracking-widest">Audio</span>
        </div>
      </div>
    </div>
  );
};

export default PrincessUI;
