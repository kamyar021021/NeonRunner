import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { soundManager } from '../../utils/sound';

export const WaveManager = () => {
  const combatants = useGameStore((s) => s.combatants);
  const wave = useGameStore((s) => s.wave);
  const startBattle = useGameStore((s) => s.startBattle);
  const isGameOver = useGameStore((s) => s.isGameOver);
  const isGameStarted = useGameStore((s) => s.isGameStarted);
  
  const [countdown, setCountdown] = useState(0);
  const [nextWaveTime, setNextWaveTime] = useState<number | null>(null);
  const [showWaveTitle, setShowWaveTitle] = useState(false);

  const redCount = combatants.filter((c) => c.team === 'red').length;
  const blueCount = combatants.filter((c) => c.team === 'blue').length;

  // ===== وقتی همه دشمنان قرمز مردند، شمارش معکوس شروع شود =====
  useEffect(() => {
    if (!isGameStarted || isGameOver) return;
    
    if (redCount === 0 && nextWaveTime === null) {
      // اگر همه قرمزها مردند → موج بعدی
      const delay = wave === 0 ? 3000 : 4000;
      setNextWaveTime(Date.now() + delay);
    }
    
    // اگر موج شروع شد (قرمزها اسپاون شدند)، شمارش رو پاک کن
    if (redCount > 0 && nextWaveTime !== null) {
      setNextWaveTime(null);
      setCountdown(0);
    }
  }, [redCount, nextWaveTime, wave, isGameStarted, isGameOver]);

  // ===== تیک شمارش معکوس =====
  useEffect(() => {
    if (nextWaveTime === null) return;
    
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((nextWaveTime - Date.now()) / 1000));
      setCountdown(remaining);
      
      if (remaining <= 0) {
        // شروع موج جدید - بدون آرگومان
        soundManager.playWaveStart();
        startBattle(); // ← بدون پارامتر
        setNextWaveTime(null);
        setShowWaveTitle(true);
        setTimeout(() => setShowWaveTitle(false), 2000);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [nextWaveTime, startBattle]);

  // ===== اگر بازی تموم شده یا شروع نشده، چیزی نشون نده =====
  if (!isGameStarted || isGameOver) return null;
  if (countdown <= 0 && !showWaveTitle) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '25%',
      left: '50%',
      transform: 'translateX(-50%)',
      textAlign: 'center',
      color: '#1e3a8a',
      pointerEvents: 'none',
      fontFamily: 'monospace',
      zIndex: 10,
    }}>
      {showWaveTitle ? (
        // ===== نمایش عنوان موج جدید =====
        <div style={{
          fontSize: '96px',
          fontWeight: 'bold',
          textShadow: '4px 4px 0 #93c5fd',
          animation: 'pulse 0.8s infinite',
          letterSpacing: '8px',
        }}>
          WAVE {wave}
        </div>
      ) : (
        // ===== شمارش معکوس =====
        <>
          <div style={{
            fontSize: '48px',
            fontWeight: 'bold',
            textShadow: '3px 3px 0 #93c5fd',
            letterSpacing: '4px',
          }}>
            WAVE {wave + 1}
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: 'bold',
            textShadow: '2px 2px 0 #93c5fd',
            marginTop: '8px',
            letterSpacing: '2px',
          }}>
            {blueCount} ALLIES vs 5 ENEMIES
          </div>
          <div style={{
            fontSize: '72px',
            fontWeight: 'bold',
            textShadow: '4px 4px 0 #93c5fd',
            marginTop: '12px',
          }}>
            {countdown}
          </div>
        </>
      )}
    </div>
  );
};