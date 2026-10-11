import { useGameStore } from '../../store/useGameStore';

export const HUD = () => {
  const { 
    ammo, maxAmmo, isReloading, score, highScore, health, maxHealth, wave, 
    combatants, isAiming, isGameOver, resetGame, blueTeamAlive, redTeamAlive 
  } = useGameStore();
  const healthRatio = health / maxHealth;

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0,
      width: '100%', height: '100%',
      pointerEvents: isGameOver ? 'auto' : 'none',
      padding: '24px',
      color: '#1e3a8a',
      userSelect: 'none',
      fontFamily: 'monospace',
    }}>
      {/* ===== امتیاز (بالا وسط) ===== */}
      <div style={{
        position: 'absolute', top: '20px', left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '28px', fontWeight: 'bold',
          textShadow: '2px 2px 0 #93c5fd',
        }}>
          SCORE: {score}
        </div>
        {highScore > 0 && (
          <div style={{
            fontSize: '14px',
            marginTop: '4px',
            opacity: 0.7,
          }}>
            🏆 Best: {highScore}
          </div>
        )}
      </div>

      {/* ===== موج و تیم‌ها (بالا راست) ===== */}
      <div style={{
        position: 'absolute', top: '20px', right: '24px',
        textAlign: 'right',
      }}>
        <div style={{
          fontSize: '22px', fontWeight: 'bold',
          textShadow: '2px 2px 0 #93c5fd',
        }}>
          WAVE {wave}
        </div>
        
        {/* نمایش تیم‌ها */}
        <div style={{
          fontSize: '18px',
          marginTop: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          alignItems: 'flex-end',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 10px',
            background: 'rgba(37, 99, 235, 0.15)',
            border: '2px solid #2563eb',
            borderRadius: '2px',
          }}>
            <span style={{ color: '#2563eb', fontWeight: 'bold' }}>🔵 BLUE</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e3a8a' }}>
              {blueTeamAlive + (health > 0 ? 1 : 0)}
            </span>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 10px',
            background: 'rgba(220, 38, 38, 0.15)',
            border: '2px solid #dc2626',
            borderRadius: '2px',
          }}>
            <span style={{ color: '#dc2626', fontWeight: 'bold' }}>🔴 RED</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#7f1d1d' }}>
              {redTeamAlive}
            </span>
          </div>
        </div>
      </div>

      {/* ===== نشانه‌گیری ===== */}
      {!isGameOver && (
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          transition: 'all 0.1s',
        }}>
          {isAiming ? (
            // رتیکل ADS دقیق
            <div style={{
              width: '28px', height: '28px',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                width: '4px', height: '4px',
                background: '#dc2626',
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 6px #dc2626',
              }} />
              <div style={{
                position: 'absolute', top: '0', left: '50%',
                width: '1px', height: '10px',
                background: '#1e3a8a',
                transform: 'translateX(-50%)',
              }} />
              <div style={{
                position: 'absolute', bottom: '0', left: '50%',
                width: '1px', height: '10px',
                background: '#1e3a8a',
                transform: 'translateX(-50%)',
              }} />
              <div style={{
                position: 'absolute', left: '0', top: '50%',
                width: '10px', height: '1px',
                background: '#1e3a8a',
                transform: 'translateY(-50%)',
              }} />
              <div style={{
                position: 'absolute', right: '0', top: '50%',
                width: '10px', height: '1px',
                background: '#1e3a8a',
                transform: 'translateY(-50%)',
              }} />
            </div>
          ) : (
            <div style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#1e3a8a',
            }}>
              +
            </div>
          )}
        </div>
      )}

      {/* ===== نوار سلامت (پایین چپ) ===== */}
      {!isGameOver && (
        <div style={{
          position: 'absolute', bottom: '40px', left: '40px',
        }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>HP</span>
            <span style={{ fontSize: '14px', color: '#2563eb' }}>🔵 BLUE TEAM</span>
          </div>
          <div style={{
            width: '260px', height: '24px',
            border: '3px solid #1e3a8a',
            position: 'relative',
            background: '#fdfbf7',
          }}>
            <div style={{
              height: '100%',
              width: `${healthRatio * 100}%`,
              background: healthRatio > 0.5 ? '#3b82f6' : healthRatio > 0.25 ? '#f59e0b' : '#dc2626',
              transition: 'width 0.2s, background 0.2s',
            }} />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', marginTop: '4px' }}>
            {Math.ceil(health)} / {maxHealth}
          </div>
        </div>
      )}

      {/* ===== خشاب (پایین راست) ===== */}
      {!isGameOver && (
        <div style={{
          position: 'absolute', bottom: '40px', right: '40px',
          textAlign: 'right',
        }}>
          <div style={{ fontSize: '56px', fontWeight: 'bold', lineHeight: '1' }}>
            {ammo} <span style={{ fontSize: '28px' }}>/ {maxAmmo}</span>
          </div>
          {isReloading && (
            <div style={{ fontSize: '18px', color: '#dc2626', marginTop: '8px' }}>
              RELOADING...
            </div>
          )}
          {ammo === 0 && !isReloading && (
            <div style={{ fontSize: '18px', color: '#dc2626', marginTop: '8px' }}>
              PRESS R TO RELOAD
            </div>
          )}
          {isAiming && (
            <div style={{ fontSize: '14px', color: '#dc2626', marginTop: '8px', fontWeight: 'bold' }}>
              🎯 ADS MODE
            </div>
          )}
        </div>
      )}

      {/* ===== راهنما (پایین وسط) ===== */}
      {!isGameOver && (
        <div style={{
          position: 'absolute', bottom: '10px', left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '12px', opacity: 0.5,
        }}>
          WASD Move | SHIFT Sprint | Space Jump | LMB Shoot | RMB Aim | R Reload
        </div>
      )}

      {/* ====== صفحه Game Over ====== */}
      {isGameOver && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%', height: '100%',
          background: 'rgba(244, 241, 234, 0.96)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'auto',
        }}>
          <div style={{
            fontSize: '110px',
            fontWeight: 'bold',
            color: '#dc2626',
            textShadow: '6px 6px 0 #fecaca',
            marginBottom: '20px',
            letterSpacing: '8px',
          }}>
            GAME OVER
          </div>

          <div style={{
            fontSize: '32px',
            color: '#1e3a8a',
            marginBottom: '12px',
          }}>
            Final Score: <strong>{score}</strong>
          </div>
          
          <div style={{
            fontSize: '24px',
            color: '#1e3a8a',
            marginBottom: '8px',
          }}>
            Reached Wave <strong>{wave}</strong>
          </div>

          {score >= highScore && score > 0 && (
            <div style={{
              fontSize: '28px',
              color: '#f59e0b',
              marginTop: '16px',
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
              marginTop: '12px',
            }}>
              🏆 Best: {highScore}
            </div>
          )}

          <button
            onClick={resetGame}
            style={{
              pointerEvents: 'auto',
              fontSize: '28px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              padding: '20px 60px',
              marginTop: '40px',
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
        </div>
      )}
    </div>
  );
};