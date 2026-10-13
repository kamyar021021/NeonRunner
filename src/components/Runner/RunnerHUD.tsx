import { useEffect, useState } from 'react';
import { useRunnerStore, gameRef } from '../../store/useRunnerStore';
import { soundManager } from '../../utils/sound';
import { ACHIEVEMENTS, MILESTONES, getAchievement } from '../../utils/achievements';

const LANE_NAMES = ['LEFT', 'MIDDLE', 'RIGHT'];

const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    ('ontouchstart' in window && window.innerWidth < 1024);
};

const vibrate = (duration: number | number[], enabled: boolean) => {
  if (!enabled) return;
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { (navigator as any).vibrate(duration); } catch {}
  }
};

export const RunnerHUD = () => {
  const score = useRunnerStore((s) => s.score);
  const highScore = useRunnerStore((s) => s.highScore);
  const speedDisplay = useRunnerStore((s) => s.speedDisplay);
  const isGameStarted = useRunnerStore((s) => s.isGameStarted);
  const isGameOver = useRunnerStore((s) => s.isGameOver);
  const isPaused = useRunnerStore((s) => s.isPaused);
  const startGame = useRunnerStore((s) => s.startGame);
  const togglePause = useRunnerStore((s) => s.togglePause);
  const exitToMenu = useRunnerStore((s) => s.exitToMenu);
  const currentLane = useRunnerStore((s) => s.currentLane);
  const soundEnabled = useRunnerStore((s) => s.soundEnabled);
  const vibrationEnabled = useRunnerStore((s) => s.vibrationEnabled);
  const toggleSound = useRunnerStore((s) => s.toggleSound);
  const toggleVibration = useRunnerStore((s) => s.toggleVibration);
  const newlyUnlocked = useRunnerStore((s) => s.newlyUnlocked);
  const clearNewlyUnlocked = useRunnerStore((s) => s.clearNewlyUnlocked);
  const unlockedAchievements = useRunnerStore((s) => s.unlockedAchievements);

  const [countdown, setCountdown] = useState<number | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [scoreFlash, setScoreFlash] = useState(0);
  const [lastScore, setLastScore] = useState(0);
  const [mobile, setMobile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [milestoneText, setMilestoneText] = useState<string | null>(null);
  const [lastMilestone, setLastMilestone] = useState(0);
  const [achievementQueue, setAchievementQueue] = useState<string[]>([]);
  const [shareToast, setShareToast] = useState(false);  // ⭐ اضافه شد

  useEffect(() => { setMobile(isMobile()); }, []);

  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    if (score > lastScore) {
      setScoreFlash(1);
      setLastScore(score);
    } else if (score < lastScore) {
      setLastScore(score);
    }
  }, [score, lastScore]);

  useEffect(() => {
    if (scoreFlash > 0) {
      const t = setTimeout(() => setScoreFlash(0), 200);
      return () => clearTimeout(t);
    }
  }, [scoreFlash]);

  // ⭐ game loop
  useEffect(() => {
    if (!isGameStarted || isGameOver || isPaused) return;
    let raf = 0;
    let lastTime = performance.now();
    let lastUI = 0;

    const loop = (now: number) => {
      const state = useRunnerStore.getState();
      if (state.isPaused) {
        lastTime = now;
        raf = requestAnimationFrame(loop);
        return;
      }

      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      gameRef.distance += gameRef.speed * dt;
      gameRef.speed = Math.min(gameRef.maxSpeed, gameRef.speed + dt * 1.2);

      const dist = Math.floor(gameRef.distance);
      const nextMilestone = MILESTONES.find((m) => m > lastMilestone && dist >= m);
      if (nextMilestone) {
        setLastMilestone(nextMilestone);
        setMilestoneText(`${nextMilestone}m!`);
        vibrate(50, vibrationEnabled);
        setTimeout(() => setMilestoneText(null), 1500);
      }

      if (now - lastUI > 100) {
        lastUI = now;
        useRunnerStore.getState().updateStats(Math.floor(gameRef.distance), gameRef.speed);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isGameStarted, isGameOver, isPaused, lastMilestone, vibrationEnabled]);

  useEffect(() => {
    if (isGameStarted && !isGameOver) {
      setLastMilestone(0);
    }
  }, [isGameStarted, isGameOver]);

  useEffect(() => {
    if (isGameStarted && !isGameOver && !isPaused && soundEnabled) {
      soundManager.startMusic();
    } else {
      soundManager.stopMusic();
    }
    return () => { soundManager.stopMusic(); };
  }, [isGameStarted, isGameOver, isPaused, soundEnabled]);

  useEffect(() => {
    if (!showTutorial) return;
    const i = setInterval(() => setTutorialStep((s) => (s + 1) % 3), 2000);
    return () => clearInterval(i);
  }, [showTutorial]);

  useEffect(() => {
    if (!isGameStarted || isGameOver) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        togglePause();
        return;
      }
      if (isPaused) return;
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        e.preventDefault();
        useRunnerStore.getState().moveLane(-1);
        soundManager.playLaneChange();
      } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        e.preventDefault();
        useRunnerStore.getState().moveLane(1);
        soundManager.playLaneChange();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isGameStarted, isGameOver, isPaused, togglePause]);

  useEffect(() => {
    if (achievementQueue.length === 0 && newlyUnlocked.length > 0) {
      setAchievementQueue([...newlyUnlocked]);
      clearNewlyUnlocked();
    }
  }, [newlyUnlocked, achievementQueue.length, clearNewlyUnlocked]);

  useEffect(() => {
    if (achievementQueue.length === 0) return;
    const t = setTimeout(() => {
      setAchievementQueue((q) => q.slice(1));
    }, 2500);
    return () => clearTimeout(t);
  }, [achievementQueue]);

  const handleStart = () => {
    soundManager.playStart();
    vibrate(30, vibrationEnabled);
    setShowSettings(false);
    setShowAchievements(false);
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      const t = setTimeout(() => {
        setCountdown(null);
        startGame();
        if (!localStorage.getItem('tutorial_seen')) {
          setShowTutorial(true);
          localStorage.setItem('tutorial_seen', '1');
          setTimeout(() => setShowTutorial(false), 6000);
        }
      }, 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCountdown(countdown - 1), 800);
    return () => clearTimeout(t);
  }, [countdown, startGame]);

  const handleLeft = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const state = useRunnerStore.getState();
    if (state.isPaused) return;
    state.moveLane(-1);
    soundManager.playLaneChange();
    vibrate(15, vibrationEnabled);
  };

  const handleRight = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const state = useRunnerStore.getState();
    if (state.isPaused) return;
    state.moveLane(1);
    soundManager.playLaneChange();
    vibrate(15, vibrationEnabled);
  };

  // ⭐ Share - فقط کپی لینک
  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    } catch {
      // Fallback برای مرورگرهای قدیمی
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2000);
      } catch {}
      document.body.removeChild(ta);
    }
  };

  const handleEndRun = () => {
    const state = useRunnerStore.getState();
    if (state.score > 0) {
      const newHigh = Math.max(state.score, state.highScore);
      try { localStorage.setItem('runner_high', newHigh.toString()); } catch {}
      useRunnerStore.setState({ highScore: newHigh });
    }
    soundManager.stopMusic();
    exitToMenu();
  };

  const buttonSize = mobile ? 130 : 110;
  const buttonFontSize = mobile ? 60 : 50;
  const currentAchievement = achievementQueue.length > 0 ? getAchievement(achievementQueue[0]) : null;

  return (
    <>
      {/* ═══════════ IN-GAME HUD ═══════════ */}
      {isGameStarted && !isGameOver && (
        <>
          <div style={{
            position: 'absolute',
            top: `calc(20px + env(safe-area-inset-top, 0px))`,
            left: '50%',
            transform: `translateX(-50%) scale(${1 + scoreFlash * 0.1})`,
            fontFamily: 'monospace', textAlign: 'center',
            pointerEvents: 'none', zIndex: 10,
            transition: 'transform 0.15s',
          }}>
            <div style={{
              fontSize: mobile ? 'clamp(48px, 12vw, 72px)' : 'clamp(40px, 7vw, 64px)',
              fontWeight: 'bold', color: '#22d3ee',
              textShadow: `0 0 20px #22d3ee, 0 0 ${20 + scoreFlash * 30}px #22d3ee`,
              letterSpacing: '4px', lineHeight: 1,
            }}>{score}</div>
            <div style={{
              fontSize: mobile ? '11px' : '10px',
              color: 'rgba(167, 139, 250, 0.7)',
              marginTop: '6px', letterSpacing: '4px',
            }}>HIGH {highScore}</div>
          </div>

          <div style={{
            position: 'absolute',
            top: `calc(20px + env(safe-area-inset-top, 0px))`,
            right: mobile ? '16px' : '20px',
            fontFamily: 'monospace', textAlign: 'right',
            pointerEvents: 'none', zIndex: 10,
          }}>
            <div style={{ fontSize: mobile ? '11px' : '10px', color: '#a78bfa', letterSpacing: '4px' }}>SPEED</div>
            <div style={{
              fontSize: mobile ? 'clamp(26px, 5vw, 40px)' : 'clamp(22px, 3.5vw, 36px)',
              fontWeight: 'bold', color: '#a78bfa',
              textShadow: '0 0 15px #a78bfa', lineHeight: 1,
            }}>{speedDisplay.toFixed(0)}</div>
          </div>

          <button
            onPointerDown={(e) => { e.stopPropagation(); togglePause(); }}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              position: 'absolute',
              top: `calc(20px + env(safe-area-inset-top, 0px))`,
              left: mobile ? '16px' : '20px',
              width: mobile ? '52px' : '48px',
              height: mobile ? '52px' : '48px',
              borderRadius: '50%',
              background: 'rgba(34, 211, 238, 0.12)',
              border: '2px solid #22d3ee',
              color: '#22d3ee',
              fontSize: mobile ? '22px' : '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(34, 211, 238, 0.4)',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
              touchAction: 'manipulation',
              zIndex: 40,
            }}
          >❚❚</button>

          {milestoneText && (
            <div style={{
              position: 'absolute', top: '35%', left: '50%',
              transform: 'translate(-50%, -50%)',
              fontFamily: 'monospace',
              fontSize: mobile ? '54px' : '72px',
              fontWeight: 'bold', color: '#fbbf24',
              textShadow: '0 0 30px #fbbf24, 0 0 60px #fbbf24',
              letterSpacing: '6px',
              pointerEvents: 'none',
              animation: 'milestonePop 1.5s ease-out forwards',
              zIndex: 50,
              whiteSpace: 'nowrap',
            }}>{milestoneText}</div>
          )}

          {currentAchievement && (
            <div style={{
              position: 'absolute',
              top: `calc(90px + env(safe-area-inset-top, 0px))`,
              left: '50%',
              transform: 'translateX(-50%)',
              fontFamily: 'monospace',
              background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.95), rgba(167, 139, 250, 0.95))',
              color: '#050114',
              padding: '12px 22px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 0 30px rgba(34, 211, 238, 0.8)',
              animation: 'achievementSlide 0.5s ease-out',
              pointerEvents: 'none',
              zIndex: 60,
              maxWidth: '90%',
            }}>
              <div style={{ fontSize: '32px' }}>{currentAchievement.icon}</div>
              <div>
                <div style={{ fontSize: '11px', opacity: 0.7, letterSpacing: '2px' }}>ACHIEVEMENT</div>
                <div style={{ fontSize: '15px', fontWeight: 'bold', letterSpacing: '1px' }}>
                  {currentAchievement.title}
                </div>
              </div>
            </div>
          )}

          <div style={{
            position: 'absolute',
            bottom: mobile ? '240px' : '170px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex', gap: mobile ? '6px' : '8px',
            pointerEvents: 'none', zIndex: 10,
          }}>
            {LANE_NAMES.map((name, i) => (
              <div key={i} style={{
                fontFamily: 'monospace',
                fontSize: mobile ? '12px' : '11px',
                fontWeight: 'bold',
                color: currentLane === i ? '#22d3ee' : 'rgba(34, 211, 238, 0.25)',
                letterSpacing: mobile ? '2px' : '3px',
                padding: mobile ? '7px 13px' : '6px 12px',
                borderRadius: '4px',
                border: `1px solid ${currentLane === i ? '#22d3ee' : 'rgba(34, 211, 238, 0.15)'}`,
                background: currentLane === i ? 'rgba(34, 211, 238, 0.15)' : 'transparent',
                textShadow: currentLane === i ? '0 0 10px #22d3ee' : 'none',
                transition: 'all 0.2s',
                boxShadow: currentLane === i ? '0 0 20px rgba(34, 211, 238, 0.4)' : 'none',
              }}>{name}</div>
            ))}
          </div>

          <div style={{
            position: 'absolute',
            bottom: mobile ? `calc(120px + env(safe-area-inset-bottom, 0px))` : '80px',
            left: 0, right: 0,
            display: 'flex', justifyContent: 'space-between',
            padding: mobile ? '0 20px' : '0 25px',
            pointerEvents: 'none', zIndex: 30,
          }}>
            <button
              onPointerDown={handleLeft}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                width: buttonSize, height: buttonSize, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(34, 211, 238, 0.35), rgba(34, 211, 238, 0.08))',
                border: '3px solid #22d3ee',
                color: '#ffffff', fontSize: buttonFontSize, fontWeight: 'bold',
                fontFamily: 'monospace', cursor: 'pointer',
                boxShadow: '0 0 40px rgba(34, 211, 238, 0.8), inset 0 0 30px rgba(34, 211, 238, 0.25)',
                WebkitTapHighlightColor: 'transparent', userSelect: 'none',
                touchAction: 'manipulation', pointerEvents: 'auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                textShadow: '0 0 20px #ffffff', transition: 'transform 0.08s',
              }}
              onPointerDownCapture={(e) => { e.currentTarget.style.transform = 'scale(0.92)'; }}
              onPointerUpCapture={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >←</button>

            <button
              onPointerDown={handleRight}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                width: buttonSize, height: buttonSize, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(34, 211, 238, 0.35), rgba(34, 211, 238, 0.08))',
                border: '3px solid #22d3ee',
                color: '#ffffff', fontSize: buttonFontSize, fontWeight: 'bold',
                fontFamily: 'monospace', cursor: 'pointer',
                boxShadow: '0 0 40px rgba(34, 211, 238, 0.8), inset 0 0 30px rgba(34, 211, 238, 0.25)',
                WebkitTapHighlightColor: 'transparent', userSelect: 'none',
                touchAction: 'manipulation', pointerEvents: 'auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                textShadow: '0 0 20px #ffffff', transition: 'transform 0.08s',
              }}
              onPointerDownCapture={(e) => { e.currentTarget.style.transform = 'scale(0.92)'; }}
              onPointerUpCapture={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >→</button>
          </div>
        </>
      )}

      {/* ═══════════ PAUSE OVERLAY ═══════════ */}
      {isGameStarted && !isGameOver && isPaused && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'monospace',
          background: 'rgba(5, 1, 20, 0.85)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 90,
          animation: 'fadeIn 0.2s ease-out',
        }}>
          <div style={{
            fontSize: 'clamp(48px, 10vw, 88px)',
            fontWeight: 'bold', color: '#22d3ee',
            textShadow: '0 0 30px #22d3ee, 0 0 60px #22d3ee',
            letterSpacing: 'clamp(4px, 1.5vw, 12px)',
            marginBottom: '50px',
          }}>PAUSED</div>

          <button
            onClick={togglePause}
            style={{
              fontSize: 'clamp(16px, 2vw, 22px)',
              fontFamily: 'monospace', fontWeight: 'bold',
              padding: '18px 60px',
              background: 'rgba(34, 211, 238, 0.15)',
              color: '#22d3ee',
              border: '2px solid #22d3ee', borderRadius: '8px',
              cursor: 'pointer', letterSpacing: '4px',
              boxShadow: '0 0 30px rgba(34, 211, 238, 0.6)',
              transition: 'all 0.15s',
              marginBottom: '16px',
            }}
          >▶ RESUME</button>

          <button
            onClick={handleEndRun}
            style={{
              fontSize: 'clamp(14px, 1.8vw, 18px)',
              fontFamily: 'monospace', fontWeight: 'bold',
              padding: '14px 50px',
              background: 'rgba(244, 63, 94, 0.15)',
              color: '#f43f5e',
              border: '2px solid #f43f5e', borderRadius: '8px',
              cursor: 'pointer', letterSpacing: '4px',
              transition: 'all 0.15s',
              WebkitTapHighlightColor: 'transparent',
            }}
          >↻ END RUN</button>
        </div>
      )}

      {/* ═══════════ COUNTDOWN OVERLAY ═══════════ */}
      {countdown !== null && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'monospace',
          background: 'radial-gradient(circle, rgba(34, 211, 238, 0.15), rgba(5, 1, 20, 0.9) 70%)',
          pointerEvents: 'none',
          zIndex: 95,
        }}>
          <div
            key={countdown}
            style={{
              fontSize: 'clamp(120px, 25vw, 240px)',
              fontWeight: 'bold',
              color: countdown === 0 ? '#22c55e' : '#22d3ee',
              textShadow: `0 0 60px ${countdown === 0 ? '#22c55e' : '#22d3ee'}, 0 0 120px ${countdown === 0 ? '#22c55e' : '#22d3ee'}`,
              letterSpacing: '8px',
              lineHeight: 1,
              animation: 'countdownPop 0.8s ease-out',
            }}
          >
            {countdown === 0 ? 'GO!' : countdown}
          </div>
        </div>
      )}

      {/* ═══════════ TUTORIAL ═══════════ */}
      {showTutorial && isGameStarted && !isGameOver && (
        <div style={{
          position: 'absolute', top: '30%', left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'monospace', textAlign: 'center',
          pointerEvents: 'none', zIndex: 50,
          animation: 'tutorialFade 2s ease-in-out',
          width: '90%', maxWidth: '400px',
        }}>
          <div style={{
            fontSize: mobile ? '20px' : '22px',
            color: '#ffffff',
            background: 'rgba(34, 211, 238, 0.2)',
            border: '2px solid #22d3ee', borderRadius: '8px',
            padding: '16px 24px', letterSpacing: '3px',
            textShadow: '0 0 15px #22d3ee',
            boxShadow: '0 0 30px rgba(34, 211, 238, 0.6)',
          }}>
            {tutorialStep === 0 && '← TAP LEFT'}
            {tutorialStep === 1 && 'TAP RIGHT →'}
            {tutorialStep === 2 && 'AVOID OBSTACLES!'}
          </div>
        </div>
      )}

      {/* ═══════════ SETTINGS OVERLAY ═══════════ */}
      {showSettings && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'monospace',
          background: 'rgba(5, 1, 20, 0.9)',
          backdropFilter: 'blur(10px)',
          zIndex: 200,
          padding: '20px',
        }}>
          <div style={{
            background: 'rgba(15, 8, 35, 0.95)',
            border: '2px solid #22d3ee',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '400px', width: '100%',
            boxShadow: '0 0 40px rgba(34, 211, 238, 0.5)',
          }}>
            <div style={{
              fontSize: '26px', fontWeight: 'bold', color: '#22d3ee',
              textAlign: 'center', marginBottom: '24px',
              letterSpacing: '4px',
              textShadow: '0 0 15px #22d3ee',
            }}>⚙ SETTINGS</div>

            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 0', borderBottom: '1px solid rgba(34, 211, 238, 0.15)',
            }}>
              <div style={{ color: '#fff', fontSize: '15px', letterSpacing: '2px' }}>
                🔊 SOUND
              </div>
              <button
                onClick={toggleSound}
                style={{
                  padding: '8px 20px',
                  background: soundEnabled ? 'rgba(34, 211, 238, 0.2)' : 'rgba(100, 100, 100, 0.2)',
                  color: soundEnabled ? '#22d3ee' : '#666',
                  border: `2px solid ${soundEnabled ? '#22d3ee' : '#666'}`,
                  borderRadius: '6px',
                  fontFamily: 'monospace', fontWeight: 'bold',
                  fontSize: '13px', letterSpacing: '2px',
                  cursor: 'pointer',
                  minWidth: '70px',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >{soundEnabled ? 'ON' : 'OFF'}</button>
            </div>

            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 0', borderBottom: '1px solid rgba(34, 211, 238, 0.15)',
            }}>
              <div style={{ color: '#fff', fontSize: '15px', letterSpacing: '2px' }}>
                📳 VIBRATION
              </div>
              <button
                onClick={toggleVibration}
                style={{
                  padding: '8px 20px',
                  background: vibrationEnabled ? 'rgba(34, 211, 238, 0.2)' : 'rgba(100, 100, 100, 0.2)',
                  color: vibrationEnabled ? '#22d3ee' : '#666',
                  border: `2px solid ${vibrationEnabled ? '#22d3ee' : '#666'}`,
                  borderRadius: '6px',
                  fontFamily: 'monospace', fontWeight: 'bold',
                  fontSize: '13px', letterSpacing: '2px',
                  cursor: 'pointer',
                  minWidth: '70px',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >{vibrationEnabled ? 'ON' : 'OFF'}</button>
            </div>

            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 0',
            }}>
              <div style={{ color: '#fff', fontSize: '15px', letterSpacing: '2px' }}>
                🏆 ACHIEVEMENTS
              </div>
              <div style={{
                color: '#fbbf24', fontWeight: 'bold',
                fontSize: '15px',
                textShadow: '0 0 10px #fbbf24',
              }}>
                {unlockedAchievements.length}/{ACHIEVEMENTS.length}
              </div>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              style={{
                width: '100%', marginTop: '20px',
                padding: '14px',
                background: 'rgba(34, 211, 238, 0.15)',
                color: '#22d3ee',
                border: '2px solid #22d3ee', borderRadius: '8px',
                fontFamily: 'monospace', fontWeight: 'bold',
                fontSize: '15px', letterSpacing: '4px',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >CLOSE</button>
          </div>
        </div>
      )}

      {/* ═══════════ ACHIEVEMENTS OVERLAY ═══════════ */}
      {showAchievements && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'monospace',
          background: 'rgba(5, 1, 20, 0.9)',
          backdropFilter: 'blur(10px)',
          zIndex: 200,
          padding: '20px',
        }}>
          <div style={{
            background: 'rgba(15, 8, 35, 0.95)',
            border: '2px solid #fbbf24',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px', width: '100%',
            maxHeight: '80vh', overflowY: 'auto',
            boxShadow: '0 0 40px rgba(251, 191, 36, 0.5)',
          }}>
            <div style={{
              fontSize: '24px', fontWeight: 'bold', color: '#fbbf24',
              textAlign: 'center', marginBottom: '20px',
              letterSpacing: '4px',
              textShadow: '0 0 15px #fbbf24',
            }}>🏆 ACHIEVEMENTS</div>

            {ACHIEVEMENTS.map((ach) => {
              const unlocked = unlockedAchievements.includes(ach.id);
              return (
                <div key={ach.id} style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '12px',
                  marginBottom: '8px',
                  borderRadius: '8px',
                  background: unlocked ? 'rgba(251, 191, 36, 0.1)' : 'rgba(100, 100, 100, 0.1)',
                  border: `1px solid ${unlocked ? 'rgba(251, 191, 36, 0.5)' : 'rgba(100, 100, 100, 0.3)'}`,
                  opacity: unlocked ? 1 : 0.5,
                }}>
                  <div style={{ fontSize: '32px' }}>{unlocked ? ach.icon : '🔒'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '15px', fontWeight: 'bold',
                      color: unlocked ? '#fbbf24' : '#888',
                      letterSpacing: '1px',
                    }}>{ach.title}</div>
                    <div style={{
                      fontSize: '11px', color: unlocked ? '#a78bfa' : '#666',
                      marginTop: '2px',
                    }}>{ach.description}</div>
                  </div>
                </div>
              );
            })}

            <button
              onClick={() => setShowAchievements(false)}
              style={{
                width: '100%', marginTop: '20px',
                padding: '14px',
                background: 'rgba(251, 191, 36, 0.15)',
                color: '#fbbf24',
                border: '2px solid #fbbf24', borderRadius: '8px',
                fontFamily: 'monospace', fontWeight: 'bold',
                fontSize: '15px', letterSpacing: '4px',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >CLOSE</button>
          </div>
        </div>
      )}

      {/* ═══════════ START MENU ═══════════ */}
      {!isGameStarted && countdown === null && (
        <div
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            fontFamily: 'monospace',
            background: 'radial-gradient(circle at center, rgba(5, 1, 20, 0.15) 0%, rgba(5, 1, 20, 0.75) 70%)',
            zIndex: 100, cursor: 'pointer',
            padding: `max(20px, env(safe-area-inset-top)) 20px max(20px, env(safe-area-inset-bottom))`,
            overflow: 'hidden',
          }}
          onClick={handleStart}
        >
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage:
              'linear-gradient(rgba(34, 211, 238, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.08) 1px, transparent 1px)',
            backgroundSize: mobile ? '30px 30px' : '40px 40px',
            animation: 'gridScroll 3s linear infinite',
            pointerEvents: 'none',
          }} />

          <div style={{
            position: 'absolute',
            top: `calc(16px + env(safe-area-inset-top, 0px))`,
            right: '16px',
            display: 'flex', gap: '10px',
            zIndex: 10,
            pointerEvents: 'auto',
          }}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowAchievements(true); }}
              style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: 'rgba(251, 191, 36, 0.12)',
                border: '2px solid #fbbf24',
                color: '#fbbf24', fontSize: '20px',
                cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 15px rgba(251, 191, 36, 0.4)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >🏆</button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowSettings(true); }}
              style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: 'rgba(34, 211, 238, 0.12)',
                border: '2px solid #22d3ee',
                color: '#22d3ee', fontSize: '22px',
                cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 15px rgba(34, 211, 238, 0.4)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >⚙</button>
          </div>

          <div style={{
            position: 'relative',
            fontSize: mobile ? 'clamp(42px, 13vw, 80px)' : 'clamp(48px, 11vw, 130px)',
            fontWeight: 'bold', color: '#22d3ee',
            textShadow: '0 0 30px #22d3ee, 0 0 60px #22d3ee, 0 0 100px #22d3ee',
            letterSpacing: mobile ? 'clamp(4px, 1.2vw, 12px)' : 'clamp(6px, 1.6vw, 20px)',
            lineHeight: 1, textAlign: 'center',
            marginBottom: mobile ? '12px' : '20px',
            animation: 'titlePulse 3s ease-in-out infinite',
          }}>NEON RUNNER</div>

          <div style={{
            fontSize: mobile ? 'clamp(10px, 2.6vw, 13px)' : 'clamp(11px, 1.5vw, 15px)',
            color: '#a78bfa',
            letterSpacing: mobile ? '6px' : '10px',
            marginBottom: mobile ? '30px' : '50px',
            textShadow: '0 0 15px #a78bfa',
          }}>✦ ENDLESS CHASE ✦</div>

          {highScore > 0 && (
            <div style={{
              fontSize: mobile ? 'clamp(14px, 3.2vw, 18px)' : 'clamp(13px, 1.6vw, 16px)',
              color: '#fbbf24',
              letterSpacing: '4px',
              marginBottom: mobile ? '24px' : '30px',
              padding: mobile ? '10px 24px' : '8px 20px',
              border: '1px solid rgba(251, 191, 36, 0.4)',
              borderRadius: '4px',
              background: 'rgba(251, 191, 36, 0.05)',
              textShadow: '0 0 10px #fbbf24',
            }}>BEST {highScore}</div>
          )}

          <div style={{
            display: 'flex',
            gap: mobile ? '20px' : '30px',
            fontSize: mobile ? '11px' : '12px',
            color: 'rgba(167, 139, 250, 0.8)',
            letterSpacing: '2px',
            marginBottom: mobile ? '30px' : '50px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            maxWidth: '600px',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: mobile ? '22px' : '24px', marginBottom: '6px' }}>← →</div>
              <div>{mobile ? 'TAP BUTTONS' : 'A / D KEYS'}</div>
            </div>
            {mobile && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '22px', marginBottom: '6px' }}>👆</div>
                <div>SWIPE</div>
              </div>
            )}
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); handleStart(); }}
            style={{
              fontSize: mobile ? 'clamp(20px, 3vw, 28px)' : 'clamp(18px, 2.4vw, 26px)',
              fontFamily: 'monospace', fontWeight: 'bold',
              padding: mobile ? '24px 90px' : '22px 80px',
              background: 'rgba(34, 211, 238, 0.08)',
              color: '#22d3ee',
              border: '3px solid #22d3ee', borderRadius: '12px',
              cursor: 'pointer',
              letterSpacing: mobile ? '10px' : '8px',
              boxShadow: '0 0 30px rgba(34, 211, 238, 0.6), inset 0 0 30px rgba(34, 211, 238, 0.1)',
              transition: 'all 0.2s',
              animation: 'buttonPulse 2s ease-in-out infinite',
              WebkitTapHighlightColor: 'transparent',
            }}
          >▶ RUN</button>

          <div style={{
            position: 'absolute',
            bottom: `max(20px, env(safe-area-inset-bottom, 20px))`,
            fontSize: mobile ? '10px' : '11px',
            color: 'rgba(167, 139, 250, 0.4)',
            letterSpacing: '3px',
          }}>v1.0 — STAY ALIVE</div>
        </div>
      )}

      {/* ═══════════ GAME OVER ═══════════ */}
      {isGameOver && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'monospace',
          background: 'radial-gradient(circle, rgba(244, 63, 94, 0.25), rgba(5, 1, 20, 0.75) 70%)',
          zIndex: 100,
          padding: `max(20px, env(safe-area-inset-top)) 20px max(20px, env(safe-area-inset-bottom))`,
          animation: 'crashIn 0.5s ease-out',
        }}>
          <div style={{
            fontSize: mobile ? 'clamp(50px, 13vw, 90px)' : 'clamp(48px, 11vw, 110px)',
            fontWeight: 'bold', color: '#f43f5e',
            textShadow: '0 0 40px #f43f5e, 0 0 80px #f43f5e, 0 0 120px #f43f5e',
            letterSpacing: mobile ? 'clamp(4px, 1.2vw, 12px)' : 'clamp(6px, 1.6vw, 16px)',
            lineHeight: 1,
            marginBottom: mobile ? '28px' : '40px',
            animation: 'crashShake 0.5s ease-out',
          }}>CRASHED</div>

          <div style={{
            fontSize: mobile ? '12px' : 'clamp(11px, 1.4vw, 14px)',
            color: '#a78bfa', letterSpacing: '6px',
            marginBottom: '12px',
          }}>DISTANCE</div>
          <div style={{
            fontSize: mobile ? 'clamp(60px, 14vw, 100px)' : 'clamp(56px, 10vw, 110px)',
            color: '#22d3ee', fontWeight: 'bold',
            textShadow: '0 0 30px #22d3ee, 0 0 60px #22d3ee',
            lineHeight: 1,
            marginBottom: mobile ? '28px' : '40px',
          }}>{score}</div>

          {score >= highScore && score > 0 && (
            <div style={{
              fontSize: mobile ? 'clamp(15px, 3.2vw, 19px)' : 'clamp(14px, 2vw, 20px)',
              color: '#fbbf24', textShadow: '0 0 30px #fbbf24',
              letterSpacing: '6px',
              marginBottom: mobile ? '20px' : '28px',
              animation: 'pulse 1s infinite',
              textAlign: 'center',
            }}>✦ NEW HIGH SCORE ✦</div>
          )}

          {score < highScore && (
            <div style={{
              fontSize: mobile ? '14px' : 'clamp(12px, 1.6vw, 16px)',
              color: 'rgba(167, 139, 250, 0.6)',
              letterSpacing: '4px',
              marginBottom: mobile ? '20px' : '28px',
            }}>BEST {highScore}</div>
          )}

          <div style={{
            display: 'flex', gap: '14px', flexWrap: 'wrap',
            justifyContent: 'center',
            marginTop: mobile ? '10px' : '20px',
          }}>
            <button
              onClick={() => { soundManager.playStart(); vibrate(30, vibrationEnabled); handleStart(); }}
              style={{
                fontSize: mobile ? 'clamp(16px, 2.8vw, 22px)' : 'clamp(16px, 2.2vw, 22px)',
                fontFamily: 'monospace', fontWeight: 'bold',
                padding: mobile ? '20px 60px' : '20px 70px',
                background: 'rgba(34, 211, 238, 0.08)',
                color: '#22d3ee',
                border: '3px solid #22d3ee', borderRadius: '12px',
                cursor: 'pointer',
                letterSpacing: '6px',
                boxShadow: '0 0 30px rgba(34, 211, 238, 0.6), inset 0 0 30px rgba(34, 211, 238, 0.1)',
                transition: 'all 0.15s',
                WebkitTapHighlightColor: 'transparent',
              }}
            >↻ PLAY AGAIN</button>

            <button
              onClick={handleShare}
              style={{
                fontSize: mobile ? 'clamp(16px, 2.8vw, 22px)' : 'clamp(16px, 2.2vw, 22px)',
                fontFamily: 'monospace', fontWeight: 'bold',
                padding: mobile ? '20px 40px' : '20px 50px',
                background: 'rgba(167, 139, 250, 0.08)',
                color: '#a78bfa',
                border: '3px solid #a78bfa', borderRadius: '12px',
                cursor: 'pointer',
                letterSpacing: '4px',
                boxShadow: '0 0 20px rgba(167, 139, 250, 0.5), inset 0 0 20px rgba(167, 139, 250, 0.1)',
                transition: 'all 0.15s',
                WebkitTapHighlightColor: 'transparent',
              }}
            >SHARE GAME</button>
          </div>

          <button
            onClick={() => { soundManager.stopMusic(); exitToMenu(); }}
            style={{
              fontSize: mobile ? '13px' : '14px',
              fontFamily: 'monospace', fontWeight: 'bold',
              padding: '10px 30px',
              marginTop: '20px',
              background: 'transparent',
              color: 'rgba(167, 139, 250, 0.6)',
              border: '1px solid rgba(167, 139, 250, 0.3)',
              borderRadius: '6px',
              cursor: 'pointer',
              letterSpacing: '4px',
              transition: 'all 0.15s',
              WebkitTapHighlightColor: 'transparent',
            }}
          >← MAIN MENU</button>
        </div>
      )}

      {/* ⭐ Share Toast — اگه shareToast=true باشه نشون داده می‌شه */}
      {shareToast && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontFamily: 'monospace',
          fontSize: mobile ? '18px' : '20px',
          fontWeight: 'bold',
          color: '#22d3ee',
          background: 'rgba(5, 1, 20, 0.95)',
          border: '2px solid #22d3ee',
          borderRadius: '12px',
          padding: '20px 40px',
          letterSpacing: '3px',
          boxShadow: '0 0 40px rgba(34, 211, 238, 0.8), inset 0 0 20px rgba(34, 211, 238, 0.2)',
          zIndex: 300,
          pointerEvents: 'none',
          animation: 'toastPop 0.3s ease-out',
          textShadow: '0 0 15px #22d3ee',
          textAlign: 'center',
          maxWidth: '90%',
        }}>
          📋 LINK COPIED!
        </div>
      )}
    </>
  );
};