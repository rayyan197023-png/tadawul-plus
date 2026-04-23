'use client';
/**
 * OnboardingFlow Component
 * أقوى Onboarding في العالم لتطبيق تداول+
 * 
 * 10 شاشات احترافية:
 * 1. Welcome مع animation
 * 2. من أنت؟ (أهداف)
 * 3. مستواك؟
 * 4. محرك AI (9 طبقات)
 * 5. المحفظة الاحترافية
 * 6. Backtesting (Monte Carlo)
 * 7. Rebalancing AI
 * 8. تعليم شامل
 * 9. السوق السعودي
 * 10. جاهز للبدء
 */

import React, { useState, useEffect } from 'react';

const C = {
  ink: "#06080f",
  void: "#0c1020",
  layer1: "#141d2b",
  layer2: "#1e2d42",
  layer3: "#243352",
  line: "#32426a",
  snow: "#f0f6ff",
  mist: "#c8d8f0",
  smoke: "#90a4c8",
  ash: "#5a6e94",
  gold: "#f0c050",
  goldL: "#ffd878",
  electric: "#4d9fff",
  plasma: "#a78bfa",
  mint: "#1ee68a",
  coral: "#ff5f6a",
  amber: "#fbbf24",
  teal: "#22d3ee",
};

export default function OnboardingFlow({ onComplete }) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [userData, setUserData] = useState({
    goal: null,
    level: null,
    name: '',
  });
  const [fadeIn, setFadeIn] = useState(true);

  // حفظ التقدم
  useEffect(() => {
    try {
      localStorage.setItem('onboarding_progress', currentScreen.toString());
    } catch(e) {}
  }, [currentScreen]);

  // تحميل التقدم
  useEffect(() => {
    try {
      const saved = localStorage.getItem('onboarding_progress');
      if (saved) setCurrentScreen(parseInt(saved));
    } catch(e) {}
  }, []);

  const nextScreen = () => {
    setFadeIn(false);
    setTimeout(() => {
      setCurrentScreen(prev => prev + 1);
      setFadeIn(true);
    }, 200);
  };

  const skipOnboarding = () => {
    try {
      localStorage.setItem('onboarding_completed', 'true');
      localStorage.setItem('user_profile', JSON.stringify(userData));
    } catch(e) {}
    if (onComplete) onComplete(userData);
  };

  const completeOnboarding = () => {
    try {
      localStorage.setItem('onboarding_completed', 'true');
      localStorage.setItem('user_profile', JSON.stringify(userData));
    } catch(e) {}
    if (onComplete) onComplete(userData);
  };

  // الشاشات
  const screens = [
    <WelcomeScreen key="welcome" next={nextScreen} />,
    <GoalScreen key="goal" userData={userData} setUserData={setUserData} next={nextScreen} />,
    <LevelScreen key="level" userData={userData} setUserData={setUserData} next={nextScreen} />,
    <AIEngineScreen key="ai" next={nextScreen} />,
    <PortfolioScreen key="portfolio" next={nextScreen} />,
    <BacktestScreen key="backtest" next={nextScreen} />,
    <RebalancingScreen key="rebalancing" next={nextScreen} />,
    <EducationScreen key="education" next={nextScreen} />,
    <SaudiMarketScreen key="saudi" next={nextScreen} />,
    <FinalScreen key="final" userData={userData} complete={completeOnboarding} />,
  ];

  const progress = ((currentScreen + 1) / screens.length) * 100;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: `linear-gradient(180deg, ${C.ink} 0%, ${C.void} 100%)`,
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Cairo, sans-serif',
      direction: 'rtl',
      overflow: 'hidden',
    }}>
      {/* Particles Background */}
      <ParticlesBackground />
      
      {/* Progress Bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: C.layer1,
        zIndex: 100,
      }}>
        <div style={{
          height: '100%',
          width: progress + '%',
          background: `linear-gradient(90deg, ${C.gold}, ${C.goldL})`,
          transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: `0 0 12px ${C.gold}88`,
        }} />
      </div>

      {/* Skip Button */}
      {currentScreen < screens.length - 1 && (
        <button
          onClick={skipOnboarding}
          style={{
            position: 'fixed',
            top: 40,
            left: 20,
            background: 'transparent',
            border: `1px solid ${C.line}`,
            color: C.smoke,
            padding: '6px 14px',
            borderRadius: 20,
            fontSize: 11,
            cursor: 'pointer',
            fontFamily: 'Cairo, sans-serif',
            zIndex: 100,
          }}
        >
          تخطي
        </button>
      )}

      {/* Screen Counter */}
      <div style={{
        position: 'fixed',
        top: 40,
        right: 20,
        color: C.smoke,
        fontSize: 11,
        fontFamily: 'IBM Plex Mono, monospace',
        zIndex: 100,
      }}>
        {currentScreen + 1} / {screens.length}
      </div>

      {/* Current Screen */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px 40px',
        opacity: fadeIn ? 1 : 0,
        transition: 'opacity 0.2s ease',
        position: 'relative',
        zIndex: 1,
      }}>
        {screens[currentScreen]}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 1️⃣ Welcome Screen
// ═══════════════════════════════════════════════
function WelcomeScreen({ next }) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 500 }}>
      <div style={{
        fontSize: 80,
        marginBottom: 20,
        animation: 'float 3s ease-in-out infinite',
      }}>
        📊
      </div>
      
      <div style={{
        fontSize: 14,
        color: C.gold,
        fontWeight: 800,
        letterSpacing: '4px',
        marginBottom: 8,
      }}>
        TADAWUL+
      </div>
      
      <div style={{
        fontSize: 32,
        fontWeight: 900,
        color: C.snow,
        marginBottom: 12,
        background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>
        مرحباً بك في تداول+
      </div>
      
      <div style={{
        fontSize: 14,
        color: C.mist,
        lineHeight: 1.8,
        marginBottom: 40,
      }}>
        الذكاء الاصطناعي للسوق السعودي
        <br />
        بمستوى Bloomberg Terminal
      </div>
      
      <button
        onClick={next}
        style={{
          background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`,
          color: C.ink,
          border: 'none',
          padding: '14px 48px',
          borderRadius: 16,
          fontSize: 15,
          fontWeight: 900,
          cursor: 'pointer',
          fontFamily: 'Cairo, sans-serif',
          boxShadow: `0 8px 32px ${C.gold}44`,
          transition: 'all 0.3s',
        }}
      >
        ابدأ الرحلة ←
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 2️⃣ Goal Screen
// ═══════════════════════════════════════════════
function GoalScreen({ userData, setUserData, next }) {
  const goals = [
    { id: 'long_term', icon: '📈', title: 'استثمار طويل المدى', desc: 'نمو رأس المال على سنوات' },
    { id: 'short_term', icon: '⚡', title: 'تداول قصير المدى', desc: 'صفقات أسابيع لشهور' },
    { id: 'day_trading', icon: '🎯', title: 'مضاربة يومية', desc: 'دخول وخروج في نفس اليوم' },
    { id: 'learn', icon: '📚', title: 'تعلم السوق', desc: 'أريد أفهم قبل الاستثمار' },
  ];

  const selectGoal = (id) => {
    setUserData({ ...userData, goal: id });
    setTimeout(next, 400);
  };

  return (
    <div style={{ maxWidth: 500, width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: C.snow, marginBottom: 8 }}>
          ما هدفك من الاستثمار؟
        </div>
        <div style={{ fontSize: 12, color: C.smoke }}>
          سنُخصّص التجربة بناءً على إجابتك
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {goals.map(goal => (
          <button
            key={goal.id}
            onClick={() => selectGoal(goal.id)}
            style={{
              background: userData.goal === goal.id 
                ? `linear-gradient(135deg, ${C.gold}22, ${C.gold}08)`
                : C.layer2,
              border: `1.5px solid ${userData.goal === goal.id ? C.gold : C.line}`,
              borderRadius: 14,
              padding: '16px 18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              fontFamily: 'Cairo, sans-serif',
              transition: 'all 0.3s',
              textAlign: 'right',
            }}
          >
            <div style={{ fontSize: 28 }}>{goal.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 14,
                fontWeight: 800,
                color: userData.goal === goal.id ? C.gold : C.snow,
                marginBottom: 2,
              }}>
                {goal.title}
              </div>
              <div style={{ fontSize: 10, color: C.smoke }}>
                {goal.desc}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 3️⃣ Level Screen
// ═══════════════════════════════════════════════
function LevelScreen({ userData, setUserData, next }) {
  const levels = [
    { id: 'beginner', icon: '🌱', title: 'مبتدئ', desc: 'لم أستثمر من قبل', color: C.mint },
    { id: 'intermediate', icon: '📊', title: 'متوسط', desc: 'عندي خبرة أساسية', color: C.electric },
    { id: 'expert', icon: '🏆', title: 'خبير', desc: 'محترف في الأسواق', color: C.gold },
  ];

  const selectLevel = (id) => {
    setUserData({ ...userData, level: id });
    setTimeout(next, 400);
  };

  return (
    <div style={{ maxWidth: 500, width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: C.snow, marginBottom: 8 }}>
          ما مستوى خبرتك؟
        </div>
        <div style={{ fontSize: 12, color: C.smoke }}>
          صدقنا في إجابتك لأفضل تجربة
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {levels.map(level => (
          <button
            key={level.id}
            onClick={() => selectLevel(level.id)}
            style={{
              background: userData.level === level.id
                ? `linear-gradient(135deg, ${level.color}22, ${level.color}08)`
                : C.layer2,
              border: `1.5px solid ${userData.level === level.id ? level.color : C.line}`,
              borderRadius: 14,
              padding: '18px 20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              fontFamily: 'Cairo, sans-serif',
              transition: 'all 0.3s',
              textAlign: 'right',
            }}
          >
            <div style={{ fontSize: 32 }}>{level.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 16,
                fontWeight: 900,
                color: userData.level === level.id ? level.color : C.snow,
                marginBottom: 3,
              }}>
                {level.title}
              </div>
              <div style={{ fontSize: 11, color: C.smoke }}>
                {level.desc}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 4️⃣ AI Engine Screen
// ═══════════════════════════════════════════════
function AIEngineScreen({ next }) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 500 }}>
      <div style={{
        fontSize: 72,
        marginBottom: 20,
        animation: 'pulse 2s ease-in-out infinite',
      }}>
        🧠
      </div>
      
      <div style={{
        fontSize: 12,
        color: C.electric,
        fontWeight: 800,
        letterSpacing: '2px',
        marginBottom: 8,
      }}>
        🎯 الميزة الأقوى
      </div>
      
      <div style={{
        fontSize: 24,
        fontWeight: 900,
        color: C.snow,
        marginBottom: 16,
      }}>
        محرك الذكاء الاصطناعي
      </div>
      
      <div style={{
        fontSize: 13,
        color: C.mist,
        lineHeight: 1.8,
        marginBottom: 24,
      }}>
        9 طبقات تحليل متقدم
      </div>

      <div style={{
        background: `linear-gradient(135deg, ${C.layer1}, ${C.layer2})`,
        border: `1px solid ${C.electric}33`,
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
      }}>
        {[
          { icon: '💧', text: 'قوة السيولة + OBV + CMF' },
          { icon: '🏗', text: 'Wyckoff + BOS + CHOCH' },
          { icon: '💪', text: 'الأداء النسبي مقابل السوق' },
          { icon: '🔗', text: 'RSI + MACD + Stochastic' },
          { icon: '🧮', text: 'Softmax + Bayesian Probability' },
          { icon: '🎯', text: 'Wyckoff Order Blocks' },
          { icon: '📐', text: 'Half-Kelly Position Sizing' },
          { icon: '⚖️', text: 'Volume-Price Confirmation' },
          { icon: '📊', text: 'Entropy + Regime Detection' },
        ].map((item, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 0',
            borderBottom: i < 8 ? `1px solid ${C.line}22` : 'none',
          }}>
            <div style={{ fontSize: 18 }}>{item.icon}</div>
            <div style={{ fontSize: 11, color: C.mist, flex: 1, textAlign: 'right' }}>
              {item.text}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        background: `${C.gold}15`,
        border: `1px solid ${C.gold}44`,
        borderRadius: 12,
        padding: '10px 14px',
        marginBottom: 24,
        fontSize: 11,
        color: C.gold,
      }}>
        🏆 بنفس قوة Bloomberg Terminal ($24,000/سنة)
      </div>

      <button
        onClick={next}
        style={{
          background: `linear-gradient(135deg, ${C.electric}, ${C.plasma})`,
          color: C.snow,
          border: 'none',
          padding: '12px 40px',
          borderRadius: 14,
          fontSize: 14,
          fontWeight: 800,
          cursor: 'pointer',
          fontFamily: 'Cairo, sans-serif',
          boxShadow: `0 6px 20px ${C.electric}44`,
        }}
      >
        التالي ←
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 5️⃣ Portfolio Screen
// ═══════════════════════════════════════════════
function PortfolioScreen({ next }) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 500 }}>
      <div style={{ fontSize: 72, marginBottom: 20 }}>💼</div>
      
      <div style={{
        fontSize: 12,
        color: C.gold,
        fontWeight: 800,
        letterSpacing: '2px',
        marginBottom: 8,
      }}>
        💎 الاحترافية
      </div>
      
      <div style={{
        fontSize: 24,
        fontWeight: 900,
        color: C.snow,
        marginBottom: 16,
      }}>
        المحفظة الاحترافية
      </div>

      <div style={{
        fontSize: 13,
        color: C.mist,
        lineHeight: 1.8,
        marginBottom: 24,
      }}>
        18 مقياس احترافي
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 10,
        marginBottom: 24,
      }}>
        {[
          { label: 'Sharpe', value: '1.85', color: C.mint },
          { label: 'Sortino', value: '2.14', color: C.mint },
          { label: 'Alpha', value: '+5.2%', color: C.gold },
          { label: 'Beta', value: '0.95', color: C.electric },
          { label: 'Calmar', value: '3.1', color: C.mint },
          { label: 'Max DD', value: '-12%', color: C.amber },
          { label: 'VaR', value: '-2.3%', color: C.coral },
          { label: 'CVaR', value: '-3.8%', color: C.coral },
        ].map((metric, i) => (
          <div key={i} style={{
            background: C.layer2,
            border: `1px solid ${metric.color}33`,
            borderRadius: 10,
            padding: '10px 12px',
          }}>
            <div style={{ fontSize: 9, color: C.smoke, marginBottom: 4 }}>
              {metric.label}
            </div>
            <div style={{
              fontSize: 16,
              fontWeight: 900,
              color: metric.color,
              fontFamily: 'IBM Plex Mono, monospace',
            }}>
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        background: `${C.gold}15`,
        border: `1px solid ${C.gold}44`,
        borderRadius: 12,
        padding: '10px 14px',
        marginBottom: 24,
        fontSize: 11,
        color: C.gold,
      }}>
        🏆 بمستوى Interactive Brokers
      </div>

      <button
        onClick={next}
        style={{
          background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`,
          color: C.ink,
          border: 'none',
          padding: '12px 40px',
          borderRadius: 14,
          fontSize: 14,
          fontWeight: 800,
          cursor: 'pointer',
          fontFamily: 'Cairo, sans-serif',
          boxShadow: `0 6px 20px ${C.gold}44`,
        }}
      >
        التالي ←
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 6️⃣ Backtest Screen
// ═══════════════════════════════════════════════
function BacktestScreen({ next }) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 500 }}>
      <div style={{
        fontSize: 72,
        marginBottom: 20,
        animation: 'pulse 2s ease-in-out infinite',
      }}>🧪</div>
      
      <div style={{
        fontSize: 12,
        color: C.plasma,
        fontWeight: 800,
        letterSpacing: '2px',
        marginBottom: 8,
      }}>
        ⚡ نادر عالمياً
      </div>
      
      <div style={{
        fontSize: 24,
        fontWeight: 900,
        color: C.snow,
        marginBottom: 16,
      }}>
        Backtesting Lab
      </div>

      <div style={{
        fontSize: 13,
        color: C.mist,
        lineHeight: 1.8,
        marginBottom: 24,
      }}>
        اختبر استراتيجيتك قبل تطبيقها
      </div>

      <div style={{
        background: `linear-gradient(135deg, ${C.layer1}, ${C.layer2})`,
        border: `1px solid ${C.plasma}33`,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
      }}>
        <div style={{
          fontSize: 40,
          fontWeight: 900,
          color: C.plasma,
          marginBottom: 4,
          fontFamily: 'IBM Plex Mono, monospace',
        }}>
          5,000
        </div>
        <div style={{ fontSize: 12, color: C.smoke, marginBottom: 16 }}>
          محاكاة Monte Carlo
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 16 }}>
          {[
            { label: 'Win Rate', value: '72%', color: C.mint },
            { label: 'Profit Factor', value: '2.3', color: C.gold },
            { label: 'Sharpe', value: '1.8', color: C.electric },
          ].map((stat, i) => (
            <div key={i}>
              <div style={{
                fontSize: 18,
                fontWeight: 900,
                color: stat.color,
                fontFamily: 'IBM Plex Mono, monospace',
              }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 9, color: C.smoke, marginTop: 2 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        background: `${C.plasma}15`,
        border: `1px solid ${C.plasma}44`,
        borderRadius: 12,
        padding: '10px 14px',
        marginBottom: 24,
        fontSize: 11,
        color: C.plasma,
      }}>
        🎯 ميزة موجودة فقط في أقوى التطبيقات عالمياً
      </div>

      <button
        onClick={next}
        style={{
          background: `linear-gradient(135deg, ${C.plasma}, ${C.electric})`,
          color: C.snow,
          border: 'none',
          padding: '12px 40px',
          borderRadius: 14,
          fontSize: 14,
          fontWeight: 800,
          cursor: 'pointer',
          fontFamily: 'Cairo, sans-serif',
          boxShadow: `0 6px 20px ${C.plasma}44`,
        }}
      >
        التالي ←
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 7️⃣ Rebalancing Screen
// ═══════════════════════════════════════════════
function RebalancingScreen({ next }) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 500 }}>
      <div style={{
        fontSize: 72,
        marginBottom: 20,
        animation: 'rotate 8s linear infinite',
      }}>⚖️</div>
      
      <div style={{
        fontSize: 12,
        color: C.teal,
        fontWeight: 800,
        letterSpacing: '2px',
        marginBottom: 8,
      }}>
        🤖 AI متقدم
      </div>
      
      <div style={{
        fontSize: 24,
        fontWeight: 900,
        color: C.snow,
        marginBottom: 16,
      }}>
        Rebalancing Assistant
      </div>

      <div style={{
        fontSize: 13,
        color: C.mist,
        lineHeight: 1.8,
        marginBottom: 24,
      }}>
        AI يحسّن محفظتك تلقائياً
      </div>

      <div style={{
        background: `linear-gradient(135deg, ${C.layer1}, ${C.layer2})`,
        border: `1px solid ${C.teal}33`,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, color: C.smoke, marginBottom: 12 }}>
          9 سيناريوهات ذكية:
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            '🎯 تركز زائد في سهم واحد',
            '🏢 عدم تنوع قطاعي',
            '📊 عدم تنويع عدد المراكز',
            '🌊 تذبذب عالٍ',
            '📈 Sharpe منخفض',
            '💰 عدم توزيعات كافية',
            '⚖️ عدم توازن Growth/Value',
            '🔗 ارتباط عالٍ',
            '⚠️ خسائر كبيرة',
          ].map((scenario, i) => (
            <div key={i} style={{
              fontSize: 11,
              color: C.mist,
              padding: '4px 0',
              textAlign: 'right',
            }}>
              {scenario}
            </div>
          ))}
        </div>
      </div>

      <div style={{
        background: `${C.teal}15`,
        border: `1px solid ${C.teal}44`,
        borderRadius: 12,
        padding: '10px 14px',
        marginBottom: 24,
        fontSize: 11,
        color: C.teal,
      }}>
        🏆 بمستوى Betterment + Wealthfront
      </div>

      <button
        onClick={next}
        style={{
          background: `linear-gradient(135deg, ${C.teal}, ${C.mint})`,
          color: C.ink,
          border: 'none',
          padding: '12px 40px',
          borderRadius: 14,
          fontSize: 14,
          fontWeight: 800,
          cursor: 'pointer',
          fontFamily: 'Cairo, sans-serif',
          boxShadow: `0 6px 20px ${C.teal}44`,
        }}
      >
        التالي ←
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 8️⃣ Education Screen
// ═══════════════════════════════════════════════
function EducationScreen({ next }) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 500 }}>
      <div style={{ fontSize: 72, marginBottom: 20 }}>📚</div>
      
      <div style={{
        fontSize: 12,
        color: C.mint,
        fontWeight: 800,
        letterSpacing: '2px',
        marginBottom: 8,
      }}>
        🎓 تعلم ذكي
      </div>
      
      <div style={{
        fontSize: 24,
        fontWeight: 900,
        color: C.snow,
        marginBottom: 16,
      }}>
        تعليم شامل
      </div>

      <div style={{
        fontSize: 13,
        color: C.mist,
        lineHeight: 1.8,
        marginBottom: 24,
      }}>
        50+ مصطلح مشروح بالعربي
      </div>

      <div style={{
        background: `linear-gradient(135deg, ${C.layer1}, ${C.layer2})`,
        border: `1px solid ${C.mint}33`,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
      }}>
        <div style={{
          fontSize: 48,
          fontWeight: 900,
          color: C.mint,
          fontFamily: 'IBM Plex Mono, monospace',
          marginBottom: 8,
        }}>
          50+
        </div>
        <div style={{ fontSize: 12, color: C.smoke, marginBottom: 16 }}>
          مصطلح مالي مشروح
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
          {['RSI', 'MACD', 'BOS', 'Wyckoff', 'Sharpe', 'Kelly', 'VaR', 'Beta'].map(term => (
            <div key={term} style={{
              background: `${C.mint}15`,
              border: `1px solid ${C.mint}33`,
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: 10,
              color: C.mint,
              fontWeight: 700,
            }}>
              {term}
            </div>
          ))}
          <div style={{
            background: C.layer3,
            borderRadius: 8,
            padding: '4px 10px',
            fontSize: 10,
            color: C.smoke,
          }}>
            +42 مصطلح آخر
          </div>
        </div>
      </div>

      <div style={{
        background: `${C.mint}15`,
        border: `1px solid ${C.mint}44`,
        borderRadius: 12,
        padding: '10px 14px',
        marginBottom: 24,
        fontSize: 11,
        color: C.mint,
      }}>
        🏆 بمستوى eToro Academy
      </div>

      <button
        onClick={next}
        style={{
          background: `linear-gradient(135deg, ${C.mint}, ${C.teal})`,
          color: C.ink,
          border: 'none',
          padding: '12px 40px',
          borderRadius: 14,
          fontSize: 14,
          fontWeight: 800,
          cursor: 'pointer',
          fontFamily: 'Cairo, sans-serif',
          boxShadow: `0 6px 20px ${C.mint}44`,
        }}
      >
        التالي ←
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 9️⃣ Saudi Market Screen
// ═══════════════════════════════════════════════
function SaudiMarketScreen({ next }) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 500 }}>
      <div style={{ fontSize: 72, marginBottom: 20 }}>🇸🇦</div>
      
      <div style={{
        fontSize: 12,
        color: C.gold,
        fontWeight: 800,
        letterSpacing: '2px',
        marginBottom: 8,
      }}>
        🏆 الأول محلياً
      </div>
      
      <div style={{
        fontSize: 24,
        fontWeight: 900,
        color: C.snow,
        marginBottom: 16,
      }}>
        السوق السعودي
      </div>

      <div style={{
        fontSize: 13,
        color: C.mist,
        lineHeight: 1.8,
        marginBottom: 24,
      }}>
        مصمم خصيصاً للمستثمر السعودي
      </div>

      <div style={{
        background: `linear-gradient(135deg, ${C.layer1}, ${C.layer2})`,
        border: `1px solid ${C.gold}33`,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { icon: '🇸🇦', text: '100% عربي RTL مثالي' },
            { icon: '📊', text: 'تكامل مع تاسي (TASI)' },
            { icon: '💰', text: 'حساب الزكاة تلقائياً' },
            { icon: '🏦', text: 'SAIBOR كمرجع' },
            { icon: '💎', text: 'كل أسهم تداول' },
            { icon: '🌟', text: 'Vision 2030 aligned' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '6px 0',
              borderBottom: i < 5 ? `1px solid ${C.line}22` : 'none',
            }}>
              <div style={{ fontSize: 22 }}>{item.icon}</div>
              <div style={{ fontSize: 12, color: C.mist, flex: 1, textAlign: 'right' }}>
                {item.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        background: `${C.gold}15`,
        border: `1px solid ${C.gold}44`,
        borderRadius: 12,
        padding: '10px 14px',
        marginBottom: 24,
        fontSize: 11,
        color: C.gold,
      }}>
        🏆 الأفضل محلياً - بلا منافس!
      </div>

      <button
        onClick={next}
        style={{
          background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`,
          color: C.ink,
          border: 'none',
          padding: '12px 40px',
          borderRadius: 14,
          fontSize: 14,
          fontWeight: 800,
          cursor: 'pointer',
          fontFamily: 'Cairo, sans-serif',
          boxShadow: `0 6px 20px ${C.gold}44`,
        }}
      >
        التالي ←
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 🔟 Final Screen
// ═══════════════════════════════════════════════
function FinalScreen({ userData, complete }) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 500 }}>
      <div style={{
        fontSize: 80,
        marginBottom: 20,
        animation: 'bounce 1s ease-in-out infinite',
      }}>
        🚀
      </div>
      
      <div style={{
        fontSize: 14,
        color: C.gold,
        fontWeight: 800,
        letterSpacing: '4px',
        marginBottom: 8,
      }}>
        جاهز!
      </div>
      
      <div style={{
        fontSize: 28,
        fontWeight: 900,
        color: C.snow,
        marginBottom: 16,
        background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>
        كل شي جاهز!
      </div>
      
      <div style={{
        fontSize: 13,
        color: C.mist,
        lineHeight: 1.8,
        marginBottom: 32,
      }}>
        ابدأ رحلتك الاستثمارية
        <br />
        مع أقوى تطبيق تحليل للسوق السعودي
      </div>

      <div style={{
        background: `linear-gradient(135deg, ${C.gold}15, ${C.gold}05)`,
        border: `1px solid ${C.gold}44`,
        borderRadius: 14,
        padding: 16,
        marginBottom: 24,
        fontSize: 11,
        color: C.mist,
        lineHeight: 1.7,
      }}>
        💎 التطبيق يحتوي على:
        <br />
        🧠 محرك AI بـ 9 طبقات
        <br />
        💼 18 مقياس احترافي
        <br />
        🧪 Monte Carlo Backtesting
        <br />
        ⚖️ Rebalancing ذكي
        <br />
        📚 50+ مصطلح مشروح
      </div>

      <button
        onClick={complete}
        style={{
          background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`,
          color: C.ink,
          border: 'none',
          padding: '16px 56px',
          borderRadius: 16,
          fontSize: 16,
          fontWeight: 900,
          cursor: 'pointer',
          fontFamily: 'Cairo, sans-serif',
          boxShadow: `0 8px 32px ${C.gold}55`,
        }}
      >
        ابدأ الآن 🚀
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Particles Background
// ═══════════════════════════════════════════════
function ParticlesBackground() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 10 + 10,
  }));

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
      opacity: 0.3,
    }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: p.left + '%',
          top: p.top + '%',
          width: p.size,
          height: p.size,
          background: C.gold,
          borderRadius: '50%',
          boxShadow: `0 0 ${p.size * 4}px ${C.gold}`,
          animation: `float ${p.duration}s ease-in-out infinite`,
        }} />
      ))}
      
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-30px) translateX(10px); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
      `}</style>
    </div>
  );
}
