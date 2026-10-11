import { useGameStore } from '../../store/useGameStore';
import { soundManager } from '../../utils/sound';

export const StartMenu = () => {
  const { isGameStarted, isGameOver, highScore, score, wave, startGame, resetGame, soundEnabled, toggleSound } = useGameStore();

  // منوی اصلی
  if (!isGameStarted) {
    return (
      <div style={{
        position: 'absolute',
        top: 0, left: 0,
        width: '100%', height: '100%',
        background: 'linear-gradient(180deg, #f4f1ea 0%, #e8e3d8 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        color: '#1e3a8a',
        pointerEvents: 'auto',
        userSelect: 'none',
      }}>
        {/* دکور خطوط دفتر */}
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%',
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 39px, #93c5fd 39px, #93c5fd 40px)',
          opacity: 0.3,
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <h1 style={{
            fontSize: '120px',
            fontWeight: 'bold',
            letterSpacing: '8px',
            textShadow: '6px 6px 0 #93c5fd',
            margin: 0,
            lineHeight: 1,
          }}>
            INKBOUND
          </h1>
          
          <p style={{
            fontSize: '20px',
            marginTop: '20px',
            marginBottom: '60px',
            color: '#1e40af',
            letterSpacing: '4px',
          }}>
            ✒️ Doodle Shooter ✒️
          </p>

          <button
            onClick={() => {
              startGame();
              soundManager.playWaveStart();
            }}
            style={{
              pointerEvents: 'auto',
              fontSize: '32px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              padding: '24px 80px',
              background: '#1e3a8a',
              color: '#fdfbf7',
              border: '4px solid #1e3a8a',
              cursor: 'pointer',
              boxShadow: '8px 8px 0 #93c5fd',
              transition: 'all 0.1s',
              letterSpacing: '4px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translate(-4px, -4px)';
              e.currentTarget.style.boxShadow = '12px 12px 0 #93c5fd';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translate(0, 0)';
              e.currentTarget.style.boxShadow = '8px 8px 0 #93c5fd';
            }}
          >
            ▶ PLAY
          </button>

          {highScore > 0 && (
            <div style={{
              fontSize: '24px',
              marginTop: '48px',
              color: '#1e40af',
            }}>
              🏆 HIGH SCORE: <strong>{highScore}</strong>
            </div>
          )}

          <div style={{
            fontSize: '14px',
            marginTop: '40px',
            opacity: 0.6,
            lineHeight: 1.8,
          }}>
            WASD Move · SHIFT Sprint · SPACE Jump<br/>
            LMB Shoot · RMB Aim · R Reload
          </div>

          {/* دکمه صدا */}
          <button
            onClick={toggleSound}
            style={{
              marginTop: '30px',
              fontSize: '24px',
              padding: '8px 16px',
              background: 'transparent',
              border: '2px solid #1e3a8a',
              cursor: 'pointer',
              color: '#1e3a8a',
            }}
          >
            {soundEnabled ? '🔊 SOUND ON' : '🔇 SOUND OFF'}
          </button>
        </div>
      </div>
    );
  }

  // صفحه Game Over
  if (isGameOver) {
    return (
      <div style={{
        position: 'absolute',
        top: 0, left: 0,
        width: '100%', height: '100%',
        background: 'rgba(244, 241, 234, 0.96)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        pointerEvents: 'auto',
        userSelect: 'none',
      }}>
        <h1 style={{
          fontSize: '120px',
          fontWeight: 'bold',
          color: '#dc2626',
          textShadow: '6px 6px 0 #fecaca',
          letterSpacing: '8px',
          margin: 0,
        }}>
          GAME OVER
        </h1>

        <div style={{
          fontSize: '32px',
          color: '#1e3a8a',
          marginTop: '30px',
        }}>
          Final Score: <strong>{score}</strong>
        </div>
        
        <div style={{
          fontSize: '24px',
          color: '#1e3a8a',
          marginTop: '12px',
        }}>
          Reached Wave <strong>{wave}</strong>
        </div>

        {score >= highScore && score > 0 && (
          <div style={{
            fontSize: '28px',
            color: '#f59e0b',
            marginTop: '20px',
            fontWeight: 'bold',
            textShadow: '2px 2px 0 #fcd34d',
          }}>
            🏆 NEW HIGH SCORE! 🏆
          </div>
        )}

        {score < highScore && (
          <div style={{
            fontSize: '20px',
            color: '#64748b',
            marginTop: '20px',
          }}>
            🏆 Best: {highScore}
          </div>
        )}

        <button
          onClick={() => {
            resetGame();
            soundManager.playWaveStart();
          }}
          style={{
            pointerEvents: 'auto',
            fontSize: '28px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            padding: '20px 60px',
            marginTop: '48px',
            background: '#1e3a8a',
            color: '#fdfbf7',
            border: '4px solid #1e3a8a',
            cursor: 'pointer',
            boxShadow: '6px 6px 0 #93c5fd',
            transition: 'all 0.1s',
            letterSpacing: '4px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translate(-3px, -3px)';
            e.currentTarget.style.boxShadow = '9px 9px 0 #93c5fd';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translate(0, 0)';
            e.currentTarget.style.boxShadow = '6px 6px 0 #93c5fd';
          }}
        >
          ▶ PLAY AGAIN
        </button>

        <button
          onClick={() => {
            useGameStore.setState({ isGameStarted: false, isGameOver: false });
          }}
          style={{
            fontSize: '18px',
            fontFamily: 'monospace',
            padding: '12px 32px',
            marginTop: '20px',
            background: 'transparent',
            color: '#1e3a8a',
            border: '2px solid #1e3a8a',
            cursor: 'pointer',
          }}
        >
          ← MAIN MENU
        </button>
      </div>
    );
  }

  return null;
};