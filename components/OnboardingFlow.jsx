'use client';
/**
 * OnboardingFlow - Premium Design
 * Apple × Robinhood level
 */

import React, { useState, useEffect } from 'react';

const C = {
  ink: "#0a0e1a",
  void: "#111827",
  layer1: "#1a2236",
  layer2: "#232e4a",
  layer3: "#2d3a5c",
  line: "#3a4769",
  
  snow: "#ffffff",
  cream: "#f5f1e8",
  mist: "#d4d8e0",
  smoke: "#9ca3af",
  ash: "#6b7280",
  
  gold: "#d4af37",
  goldL: "#f7d560",
  goldDark: "#a08820",
  
  electric: "#3b82f6",
  plasma: "#8b5cf6",
  mint: "#10b981",
  coral: "#ef4444",
  amber: "#f59e0b",
  teal: "#06b6d4",
};

export default function OnboardingFlow({ onComplete }) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [userData, setUserData] = useState({
    goal: null,
    level: null,
  });
  const [transitionStage, setTransitionStage] = useState('visible');

  const nextScreen = () => {
    setTransitionStage('exit');
    setTimeout(() => {
      setCurrentScreen(prev => prev + 1);
      setTransitionStage('enter');
      setTimeout(() => setTransitionStage('visible'), 50);
    }, 300);
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

  const getTransitionStyle = () => {
    switch(transitionStage) {
      case 'exit':
        return { opacity: 0, transform: 'translateX(-30px)' };
      case 'enter':
        return { opacity: 0, transform: 'translateX(30px)' };
      default:
        return { opacity: 1, transform: 'translateX(0)' };
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: `radial-gradient(ellipse at top, ${C.layer1} 0%, ${C.ink} 100%)`,
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Cairo', sans-serif",
      direction: 'rtl',
      overflow: 'hidden',
    }}>
      <AmbientBackground />
      
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: `${C.layer1}`,
        zIndex: 100,
      }}>
        <div style={{
          height: '100%',
          width: progress + '%',
          background: `linear-gradient(90deg, ${C.gold}, ${C.goldL})`,
          transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: `0 0 16px ${C.gold}99`,
        }} />
      </div>

      {currentScreen < screens.length - 1 && (
        <button
          onClick={skipOnboarding}
          style={{
            position: 'fixed',
top: 'calc(env(safe-area-inset-top, 0px) + 20px)',
            left: 24,
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${C.line}`,
            color: C.mist,
            padding: '8px 16px',
            borderRadius: 24,
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: "'Cairo', sans-serif",
            zIndex: 100,
            letterSpacing: '0.5px',
          }}
        >
          تخطي
        </button>
      )}

      <div style={{
        position: 'fixed',
top: 'calc(env(safe-area-inset-top, 0px) + 20px)',
        right: 24,
        color: C.smoke,
        fontSize: 11,
        fontWeight: 600,
        zIndex: 100,
        letterSpacing: '1px',
        fontFamily: "'Cairo', sans-serif",
      }}>
        {String(currentScreen + 1).padStart(2, '0')} / {String(screens.length).padStart(2, '0')}
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '90px 24px 60px',
        position: 'relative',
        zIndex: 1,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 440,
          ...getTransitionStyle(),
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          {screens[currentScreen]}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 1️⃣ Welcome Screen
// ═══════════════════════════════════════════════
function WelcomeScreen({ next }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <LogoIllustration />
      
      <div style={{
        fontSize: 11,
        color: C.gold,
        fontWeight: 700,
        letterSpacing: '6px',
        marginBottom: 12,
        marginTop: 40,
      }}>
        TADAWUL PLUS
      </div>
      
      <h1 style={{
        fontSize: 36,
        fontWeight: 900,
        color: C.snow,
        marginBottom: 16,
        lineHeight: 1.2,
        letterSpacing: '-0.5px',
      }}>
        مستقبل الاستثمار
        <br />
        <span style={{
          background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          بين يديك
        </span>
      </h1>
      
      <p style={{
        fontSize: 15,
        color: C.mist,
        lineHeight: 1.8,
        marginBottom: 48,
        fontWeight: 400,
      }}>
        منصة تحليل ذكية للسوق السعودي
        <br />
        مبنية بدقة المحترفين
      </p>
      
      <PremiumButton onClick={next}>
        لنبدأ
      </PremiumButton>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 2️⃣ Goal Screen
// ═══════════════════════════════════════════════
function GoalScreen({ userData, setUserData, next }) {
  const goals = [
    { 
      id: 'long_term', 
      icon: <GrowthIcon />, 
      title: 'النمو طويل المدى', 
      desc: 'بناء ثروة على سنوات',
      color: C.mint,
    },
    { 
      id: 'short_term', 
      icon: <ShortTermIcon />,
      title: 'التداول النشط', 
      desc: 'صفقات أسابيع لشهور',
      color: C.electric,
    },
    { 
      id: 'day_trading', 
      icon: <DayTradingIcon />,
      title: 'المضاربة اليومية', 
      desc: 'فرص سريعة خلال اليوم',
      color: C.amber,
    },
    { 
      id: 'learn', 
      icon: <LearnIcon />,
      title: 'التعلم والاستكشاف', 
      desc: 'فهم السوق قبل البدء',
      color: C.plasma,
    },
  ];

  const selectGoal = (id) => {
    setUserData({ ...userData, goal: id });
    setTimeout(next, 500);
  };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h2 style={{
          fontSize: 26,
          fontWeight: 900,
          color: C.snow,
          marginBottom: 10,
          letterSpacing: '-0.3px',
        }}>
          ما رؤيتك الاستثمارية؟
        </h2>
        <p style={{ fontSize: 13, color: C.smoke, fontWeight: 400 }}>
          سنصمم التجربة لتناسبك
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {goals.map(goal => {
          const isSelected = userData.goal === goal.id;
          return (
            <button
              key={goal.id}
              onClick={() => selectGoal(goal.id)}
              style={{
                background: isSelected 
                  ? `linear-gradient(135deg, ${goal.color}20, ${goal.color}05)`
                  : 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${isSelected ? goal.color : C.line}`,
                borderRadius: 16,
                padding: '18px 20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                fontFamily: "'Cairo', sans-serif",
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                textAlign: 'right',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: `${goal.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {React.cloneElement(goal.icon, { color: goal.color })}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: isSelected ? goal.color : C.snow,
                  marginBottom: 3,
                }}>
                  {goal.title}
                </div>
                <div style={{ fontSize: 11, color: C.smoke, fontWeight: 400 }}>
                  {goal.desc}
                </div>
              </div>
              {isSelected && <CheckIcon color={goal.color} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 3️⃣ Level Screen
// ═══════════════════════════════════════════════
function LevelScreen({ userData, setUserData, next }) {
  const levels = [
    { 
      id: 'beginner', 
      icon: <SproutIcon />,
      title: 'مبتدئ', 
      desc: 'أول تجربة في الأسواق',
      color: C.mint,
    },
    { 
      id: 'intermediate',
      icon: <ChartIcon />,
      title: 'متوسط', 
      desc: 'لدي خبرة أساسية',
      color: C.electric,
    },
    { 
      id: 'expert', 
      icon: <CrownIcon />,
      title: 'محترف', 
      desc: 'خبرة متقدمة في السوق',
      color: C.gold,
    },
  ];

  const selectLevel = (id) => {
    setUserData({ ...userData, level: id });
    setTimeout(next, 500);
  };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h2 style={{
          fontSize: 26,
          fontWeight: 900,
          color: C.snow,
          marginBottom: 10,
          letterSpacing: '-0.3px',
        }}>
          ما مستوى خبرتك؟
        </h2>
        <p style={{ fontSize: 13, color: C.smoke, fontWeight: 400 }}>
          الصدق يساعدنا على تقديم أفضل تجربة
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {levels.map(level => {
          const isSelected = userData.level === level.id;
          return (
            <button
              key={level.id}
              onClick={() => selectLevel(level.id)}
              style={{
                background: isSelected 
                  ? `linear-gradient(135deg, ${level.color}20, ${level.color}05)`
                  : 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${isSelected ? level.color : C.line}`,
                borderRadius: 16,
                padding: '22px 22px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                fontFamily: "'Cairo', sans-serif",
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                textAlign: 'right',
                backdropFilter: 'blur(20px)',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: `${level.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {React.cloneElement(level.icon, { color: level.color })}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 18,
                  fontWeight: 900,
                  color: isSelected ? level.color : C.snow,
                  marginBottom: 4,
                }}>
                  {level.title}
                </div>
                <div style={{ fontSize: 12, color: C.smoke, fontWeight: 400 }}>
                  {level.desc}
                </div>
              </div>
              {isSelected && <CheckIcon color={level.color} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 4️⃣ AI Engine Screen
// ═══════════════════════════════════════════════
function AIEngineScreen({ next }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <AIBrainIllustration />
      
      <div style={{
        display: 'inline-block',
        background: `${C.electric}15`,
        border: `1px solid ${C.electric}44`,
        borderRadius: 20,
        padding: '6px 16px',
        marginBottom: 16,
        marginTop: 32,
      }}>
        <span style={{
          fontSize: 10,
          color: C.electric,
          fontWeight: 700,
          letterSpacing: '1.5px',
        }}>
          الذكاء الاصطناعي
        </span>
      </div>
      
      <h2 style={{
        fontSize: 28,
        fontWeight: 900,
        color: C.snow,
        marginBottom: 12,
        letterSpacing: '-0.3px',
      }}>
        تحليل متقدم ذكي
      </h2>
      
      <p style={{
        fontSize: 14,
        color: C.mist,
        lineHeight: 1.7,
        marginBottom: 32,
        fontWeight: 400,
      }}>
        تسع طبقات من التحليل المتقدم
        <br />
        تعمل في لحظات
      </p>

      <div style={{
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${C.line}`,
        borderRadius: 20,
        padding: 20,
        marginBottom: 32,
      }}>
        {[
          { icon: <WaterIcon />, text: 'قياس السيولة والتدفقات المالية', color: C.teal },
          { icon: <StructureIcon />, text: 'اكتشاف أنماط Wyckoff', color: C.gold },
          { icon: <CompareIcon />, text: 'الأداء مقارنة بالسوق', color: C.mint },
          { icon: <IndicatorIcon />, text: 'تأكيد المؤشرات الفنية', color: C.electric },
          { icon: <ProbIcon />, text: 'حساب احتمالات بايزية', color: C.plasma },
          { icon: <TargetIcon />, text: 'تحديد نقاط الفرصة', color: C.coral },
          { icon: <CalcIcon />, text: 'تحديد حجم المركز الأمثل', color: C.gold },
          { icon: <BalanceIcon />, text: 'توافق الحجم والحركة', color: C.mint },
          { icon: <WaveIcon />, text: 'انتظام واتجاه الحركة', color: C.electric },
        ].map((item, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '10px 0',
            borderBottom: i < 8 ? `1px solid ${C.line}33` : 'none',
          }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: `${item.color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {React.cloneElement(item.icon, { color: item.color, size: 16 })}
            </div>
            <div style={{ fontSize: 12, color: C.mist, flex: 1, textAlign: 'right', fontWeight: 500 }}>
              {item.text}
            </div>
          </div>
        ))}
      </div>

      <PremiumButton onClick={next} color={C.electric}>
        التالي
      </PremiumButton>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 5️⃣ Portfolio Screen
// ═══════════════════════════════════════════════
function PortfolioScreen({ next }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <PortfolioIllustration />
      
      <div style={{
        display: 'inline-block',
        background: `${C.gold}15`,
        border: `1px solid ${C.gold}44`,
        borderRadius: 20,
        padding: '6px 16px',
        marginBottom: 16,
        marginTop: 32,
      }}>
        <span style={{
          fontSize: 10,
          color: C.gold,
          fontWeight: 700,
          letterSpacing: '1.5px',
        }}>
          احترافية مطلقة
        </span>
      </div>
      
      <h2 style={{
        fontSize: 28,
        fontWeight: 900,
        color: C.snow,
        marginBottom: 12,
        letterSpacing: '-0.3px',
      }}>
        إدارة المحفظة
      </h2>
      
      <p style={{
        fontSize: 14,
        color: C.mist,
        lineHeight: 1.7,
        marginBottom: 32,
        fontWeight: 400,
      }}>
        ثمانية عشر مقياساً عالمياً
        <br />
        لقياس أداء ومخاطر محفظتك
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 12,
        marginBottom: 32,
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
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${metric.color}33`,
            borderRadius: 14,
            padding: '14px 12px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 10, color: C.smoke, marginBottom: 6, fontWeight: 600, letterSpacing: '0.5px' }}>
              {metric.label}
            </div>
            <div style={{
              fontSize: 18,
              fontWeight: 900,
              color: metric.color,
              letterSpacing: '-0.5px',
            }}>
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      <PremiumButton onClick={next} color={C.gold}>
        التالي
      </PremiumButton>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 6️⃣ Backtest Screen
// ═══════════════════════════════════════════════
function BacktestScreen({ next }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <LabIllustration />
      
      <div style={{
        display: 'inline-block',
        background: `${C.plasma}15`,
        border: `1px solid ${C.plasma}44`,
        borderRadius: 20,
        padding: '6px 16px',
        marginBottom: 16,
        marginTop: 32,
      }}>
        <span style={{
          fontSize: 10,
          color: C.plasma,
          fontWeight: 700,
          letterSpacing: '1.5px',
        }}>
          مختبر الاستراتيجيات
        </span>
      </div>
      
      <h2 style={{
        fontSize: 28,
        fontWeight: 900,
        color: C.snow,
        marginBottom: 12,
        letterSpacing: '-0.3px',
      }}>
        اختبر قبل الاستثمار
      </h2>
      
      <p style={{
        fontSize: 14,
        color: C.mist,
        lineHeight: 1.7,
        marginBottom: 32,
        fontWeight: 400,
      }}>
        محاكاة متقدمة لاستراتيجيتك
        <br />
        قبل المخاطرة برأس المال
      </p>

      <div style={{
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${C.plasma}44`,
        borderRadius: 20,
        padding: 24,
        marginBottom: 24,
      }}>
        <div style={{
          fontSize: 48,
          fontWeight: 900,
          background: `linear-gradient(135deg, ${C.plasma}, ${C.electric})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: 4,
          letterSpacing: '-2px',
        }}>
          5,000+
        </div>
        <div style={{ fontSize: 12, color: C.smoke, marginBottom: 20, fontWeight: 500 }}>
          محاكاة Monte Carlo
        </div>

        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          paddingTop: 16,
          borderTop: `1px solid ${C.line}33`,
        }}>
          {[
            { label: 'نسبة الربح', value: '72%', color: C.mint },
            { label: 'عامل الربح', value: '2.3', color: C.gold },
            { label: 'Sharpe', value: '1.8', color: C.electric },
          ].map((stat, i) => (
            <div key={i}>
              <div style={{
                fontSize: 20,
                fontWeight: 900,
                color: stat.color,
                letterSpacing: '-0.5px',
              }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 10, color: C.smoke, marginTop: 4, fontWeight: 500 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <PremiumButton onClick={next} color={C.plasma}>
        التالي
      </PremiumButton>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 7️⃣ Rebalancing Screen
// ═══════════════════════════════════════════════
function RebalancingScreen({ next }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <BalanceIllustration />
      
      <div style={{
        display: 'inline-block',
        background: `${C.teal}15`,
        border: `1px solid ${C.teal}44`,
        borderRadius: 20,
        padding: '6px 16px',
        marginBottom: 16,
        marginTop: 32,
      }}>
        <span style={{
          fontSize: 10,
          color: C.teal,
          fontWeight: 700,
          letterSpacing: '1.5px',
        }}>
          AI متقدم
        </span>
      </div>
      
      <h2 style={{
        fontSize: 28,
        fontWeight: 900,
        color: C.snow,
        marginBottom: 12,
        letterSpacing: '-0.3px',
      }}>
        التوازن الذكي
      </h2>
      
      <p style={{
        fontSize: 14,
        color: C.mist,
        lineHeight: 1.7,
        marginBottom: 32,
        fontWeight: 400,
      }}>
        تحسين تلقائي لمحفظتك
        <br />
        بتسعة سيناريوهات ذكية
      </p>

      <div style={{
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${C.line}`,
        borderRadius: 20,
        padding: 20,
        marginBottom: 32,
        textAlign: 'right',
      }}>
        {[
          'اكتشاف التركز الزائد',
          'تحسين التنوع القطاعي',
          'موازنة عدد المراكز',
          'تقليل التذبذب',
          'رفع نسبة Sharpe',
          'زيادة التوزيعات',
          'توازن النمو والقيمة',
          'تقليل الارتباط بين الأسهم',
          'إدارة الخسائر بذكاء',
        ].map((scenario, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '10px 0',
            borderBottom: i < 8 ? `1px solid ${C.line}33` : 'none',
          }}>
            <div style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: `${C.teal}15`,
              border: `1px solid ${C.teal}44`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: C.teal,
              fontSize: 10,
              fontWeight: 900,
            }}>
              {i + 1}
            </div>
            <div style={{ fontSize: 13, color: C.mist, flex: 1, fontWeight: 500 }}>
              {scenario}
            </div>
          </div>
        ))}
      </div>

      <PremiumButton onClick={next} color={C.teal}>
        التالي
      </PremiumButton>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 8️⃣ Education Screen
// ═══════════════════════════════════════════════
function EducationScreen({ next }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <BookIllustration />
      
      <div style={{
        display: 'inline-block',
        background: `${C.mint}15`,
        border: `1px solid ${C.mint}44`,
        borderRadius: 20,
        padding: '6px 16px',
        marginBottom: 16,
        marginTop: 32,
      }}>
        <span style={{
          fontSize: 10,
          color: C.mint,
          fontWeight: 700,
          letterSpacing: '1.5px',
        }}>
          تعلم ذكي
        </span>
      </div>
      
      <h2 style={{
        fontSize: 28,
        fontWeight: 900,
        color: C.snow,
        marginBottom: 12,
        letterSpacing: '-0.3px',
      }}>
        المعرفة قوة
      </h2>
      
      <p style={{
        fontSize: 14,
        color: C.mist,
        lineHeight: 1.7,
        marginBottom: 32,
        fontWeight: 400,
      }}>
        خمسون مصطلحاً مالياً
        <br />
        مشروحاً بلغة واضحة
      </p>

      <div style={{
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${C.mint}44`,
        borderRadius: 20,
        padding: 24,
        marginBottom: 32,
      }}>
        <div style={{
          fontSize: 56,
          fontWeight: 900,
          background: `linear-gradient(135deg, ${C.mint}, ${C.teal})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '-3px',
          marginBottom: 8,
        }}>
          50+
        </div>
        <div style={{ fontSize: 12, color: C.smoke, marginBottom: 20, fontWeight: 500 }}>
          مصطلح مالي احترافي
        </div>

        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 8, 
          justifyContent: 'center',
          paddingTop: 16,
          borderTop: `1px solid ${C.line}33`,
        }}>
          {['RSI', 'MACD', 'Sharpe', 'Kelly', 'VaR', 'Beta', 'BOS', 'Wyckoff'].map(term => (
            <div key={term} style={{
              background: `${C.mint}10`,
              border: `1px solid ${C.mint}33`,
              borderRadius: 10,
              padding: '6px 14px',
              fontSize: 11,
              color: C.mint,
              fontWeight: 700,
            }}>
              {term}
            </div>
          ))}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 10,
            padding: '6px 14px',
            fontSize: 11,
            color: C.smoke,
            fontWeight: 600,
          }}>
            +42 آخر
          </div>
        </div>
      </div>

      <PremiumButton onClick={next} color={C.mint}>
        التالي
      </PremiumButton>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 9️⃣ Saudi Market Screen
// ═══════════════════════════════════════════════
function SaudiMarketScreen({ next }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <SaudiIllustration />
      
      <div style={{
        display: 'inline-block',
        background: `${C.gold}15`,
        border: `1px solid ${C.gold}44`,
        borderRadius: 20,
        padding: '6px 16px',
        marginBottom: 16,
        marginTop: 32,
      }}>
        <span style={{
          fontSize: 10,
          color: C.gold,
          fontWeight: 700,
          letterSpacing: '1.5px',
        }}>
          محلي بامتياز
        </span>
      </div>
      
      <h2 style={{
        fontSize: 28,
        fontWeight: 900,
        color: C.snow,
        marginBottom: 12,
        letterSpacing: '-0.3px',
      }}>
        صُنع للسوق السعودي
      </h2>
      
      <p style={{
        fontSize: 14,
        color: C.mist,
        lineHeight: 1.7,
        marginBottom: 32,
        fontWeight: 400,
      }}>
        كل التفاصيل مُصممة خصيصاً
        <br />
        للمستثمر السعودي
      </p>

      <div style={{
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${C.gold}44`,
        borderRadius: 20,
        padding: 20,
        marginBottom: 32,
        textAlign: 'right',
      }}>
        {[
          { text: 'واجهة عربية كاملة ومتقنة', color: C.gold },
          { text: 'تكامل مباشر مع مؤشر تاسي', color: C.electric },
          { text: 'حساب الزكاة تلقائياً', color: C.mint },
          { text: 'معدل سايبور كمرجع', color: C.plasma },
          { text: 'متوافق مع رؤية 2030', color: C.teal },
        ].map((item, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '12px 0',
            borderBottom: i < 4 ? `1px solid ${C.line}33` : 'none',
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: `${item.color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <CheckIcon color={item.color} size={16} />
            </div>
            <div style={{ fontSize: 13, color: C.mist, flex: 1, fontWeight: 500 }}>
              {item.text}
            </div>
          </div>
        ))}
      </div>

      <PremiumButton onClick={next} color={C.gold}>
        التالي
      </PremiumButton>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 🔟 Final Screen
// ═══════════════════════════════════════════════
function FinalScreen({ userData, complete }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <RocketIllustration />
      
      <div style={{
        display: 'inline-block',
        background: `linear-gradient(135deg, ${C.gold}22, ${C.gold}08)`,
        border: `1px solid ${C.gold}66`,
        borderRadius: 20,
        padding: '6px 16px',
        marginBottom: 16,
        marginTop: 32,
      }}>
        <span style={{
          fontSize: 10,
          color: C.gold,
          fontWeight: 700,
          letterSpacing: '2px',
        }}>
          مرحباً بك
        </span>
      </div>
      
      <h1 style={{
        fontSize: 36,
        fontWeight: 900,
        color: C.snow,
        marginBottom: 16,
        lineHeight: 1.2,
        letterSpacing: '-0.5px',
      }}>
        <span style={{
          background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          رحلتك تبدأ الآن
        </span>
      </h1>
      
      <p style={{
        fontSize: 15,
        color: C.mist,
        lineHeight: 1.8,
        marginBottom: 40,
        fontWeight: 400,
      }}>
        كل الأدوات بين يديك
        <br />
        لاتخاذ قرارات استثمارية أذكى
      </p>

      <PremiumButton onClick={complete}>
        الدخول للتطبيق
      </PremiumButton>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Components
// ═══════════════════════════════════════════════
function PremiumButton({ children, onClick, color = C.gold }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: `linear-gradient(135deg, ${color}, ${color === C.gold ? C.goldL : color})`,
        color: color === C.gold ? C.ink : C.snow,
        border: 'none',
        padding: '16px 56px',
        borderRadius: 16,
        fontSize: 15,
        fontWeight: 800,
        cursor: 'pointer',
        fontFamily: "'Cairo', sans-serif",
        boxShadow: `0 10px 40px ${color}44`,
        letterSpacing: '0.3px',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)';
        e.currentTarget.style.boxShadow = `0 12px 48px ${color}66`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = `0 10px 40px ${color}44`;
      }}
    >
      {children}
    </button>
  );
}

function AmbientBackground() {
  return (
    <>
      <div style={{
        position: 'absolute',
        top: '10%',
        right: '10%',
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${C.gold}11 0%, transparent 70%)`,
        pointerEvents: 'none',
        animation: 'breathe 8s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        left: '10%',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${C.electric}11 0%, transparent 70%)`,
        pointerEvents: 'none',
        animation: 'breathe 10s ease-in-out infinite',
      }} />
      
      <style jsx>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }
      `}</style>
    </>
  );
}

// ═══════════════════════════════════════════════
// Icons
// ═══════════════════════════════════════════════
function CheckIcon({ color, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" stroke={color} strokeWidth="1.5" />
      <path d="M8 12l3 3 5-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function GrowthIcon({ color = "#10b981" }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M3 17l6-6 4 4 7-7M14 8h6v6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShortTermIcon({ color = "#3b82f6" }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M13 2l-9 11h7l-1 9 9-11h-7l1-9z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DayTradingIcon({ color = "#f59e0b" }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <polyline points="12,6 12,12 16,14" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LearnIcon({ color = "#8b5cf6" }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M12 14l9-5-9-5-9 5 9 5z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 14v7M6.5 10.5v6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SproutIcon({ color = "#10b981" }) {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <path d="M12 20v-8M12 12c-4-4-4-8 0-10 4 2 4 6 0 10zM12 12c4-2 8-2 8 4-4 0-8 0-8-4z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChartIcon({ color = "#3b82f6" }) {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="12" width="4" height="9" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <rect x="10" y="7" width="4" height="14" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <rect x="17" y="3" width="4" height="18" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function CrownIcon({ color = "#d4af37" }) {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <path d="M3 7l4 7 5-10 5 10 4-7v13H3V7z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WaterIcon({ color, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2C8 8 5 12 5 15a7 7 0 0014 0c0-3-3-7-7-13z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function StructureIcon({ color, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 9l4-4 4 4 4-4 4 4 2-2v13H1V7l2 2z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function CompareIcon({ color, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 12h18M12 3l9 9-9 9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IndicatorIcon({ color, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ProbIcon({ color, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth="2" />
      <circle cx="9" cy="9" r="1.5" fill={color} />
      <circle cx="15" cy="15" r="1.5" fill={color} />
    </svg>
  );
}

function TargetIcon({ color, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <circle cx="12" cy="12" r="6" stroke={color} strokeWidth="2" />
      <circle cx="12" cy="12" r="2" fill={color} />
    </svg>
  );
}

function CalcIcon({ color, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="2" width="16" height="20" rx="2" stroke={color} strokeWidth="2" />
      <path d="M8 6h8M8 10h2M12 10h2M16 10h0M8 14h2M12 14h2M16 14h0M8 18h8" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BalanceIcon({ color, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3v18M3 8h18M6 12L3 8h6l-3 4zm12 0l-3-4h6l-3 4z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WaveIcon({ color, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M2 12c3-4 6-4 10 0s7 4 10 0" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ═══════════════════════════════════════════════
// Illustrations
// ═══════════════════════════════════════════════
function LogoIllustration() {
  return (
    <div style={{
      width: 120,
      height: 120,
      margin: '0 auto',
      position: 'relative',
    }}>
      <svg viewBox="0 0 120 120" style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#f7d560" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="50" fill="none" stroke="url(#goldGrad)" strokeWidth="2" opacity="0.3" />
        <circle cx="60" cy="60" r="40" fill="none" stroke="url(#goldGrad)" strokeWidth="1.5" opacity="0.5" />
        <polyline points="35,75 50,55 65,65 85,40" fill="none" stroke="url(#goldGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="85" cy="40" r="4" fill="url(#goldGrad)" />
      </svg>
    </div>
  );
}

function AIBrainIllustration() {
  return (
    <div style={{ width: 100, height: 100, margin: '0 auto' }}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="aiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="35" fill="none" stroke="url(#aiGrad)" strokeWidth="2" opacity="0.3" />
        <path d="M30 50c0-11 9-20 20-20s20 9 20 20-9 20-20 20" stroke="url(#aiGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx="50" cy="50" r="6" fill="url(#aiGrad)" />
        <circle cx="25" cy="50" r="3" fill="url(#aiGrad)" opacity="0.6" />
        <circle cx="75" cy="50" r="3" fill="url(#aiGrad)" opacity="0.6" />
        <circle cx="50" cy="25" r="3" fill="url(#aiGrad)" opacity="0.6" />
        <circle cx="50" cy="75" r="3" fill="url(#aiGrad)" opacity="0.6" />
        <line x1="28" y1="50" x2="44" y2="50" stroke="url(#aiGrad)" strokeWidth="1.5" opacity="0.4" />
        <line x1="56" y1="50" x2="72" y2="50" stroke="url(#aiGrad)" strokeWidth="1.5" opacity="0.4" />
        <line x1="50" y1="28" x2="50" y2="44" stroke="url(#aiGrad)" strokeWidth="1.5" opacity="0.4" />
        <line x1="50" y1="56" x2="50" y2="72" stroke="url(#aiGrad)" strokeWidth="1.5" opacity="0.4" />
      </svg>
    </div>
  );
}

function PortfolioIllustration() {
  return (
    <div style={{ width: 100, height: 100, margin: '0 auto' }}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="portGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#f7d560" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="35" fill="none" stroke="url(#portGrad)" strokeWidth="2" opacity="0.3" />
        <path d="M50 20 A30 30 0 0 1 80 50 L50 50 Z" fill="url(#portGrad)" opacity="0.7" />
        <path d="M50 50 A30 30 0 0 1 65 75 L50 50 Z" fill="#10b981" opacity="0.7" />
        <path d="M50 50 A30 30 0 0 1 20 50 L50 50 Z" fill="#3b82f6" opacity="0.7" />
        <path d="M50 50 A30 30 0 0 1 35 75 L50 50 Z" fill="#8b5cf6" opacity="0.7" />
        <circle cx="50" cy="50" r="8" fill={C.ink} />
      </svg>
    </div>
  );
}

function LabIllustration() {
  return (
    <div style={{ width: 100, height: 100, margin: '0 auto' }}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="labGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <path d="M40 20 L60 20 L60 35 L75 65 Q75 80 60 80 L40 80 Q25 80 25 65 L40 35 Z" stroke="url(#labGrad)" strokeWidth="2" fill="none" />
        <path d="M35 50 L65 50 L72 65 Q72 75 60 75 L40 75 Q28 75 28 65 Z" fill="url(#labGrad)" opacity="0.3" />
        <circle cx="45" cy="62" r="3" fill="url(#labGrad)" opacity="0.8" />
        <circle cx="55" cy="58" r="2" fill="url(#labGrad)" opacity="0.6" />
        <circle cx="50" cy="70" r="2.5" fill="url(#labGrad)" opacity="0.7" />
      </svg>
    </div>
  );
}

function BalanceIllustration() {
  return (
    <div style={{ width: 100, height: 100, margin: '0 auto' }}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="balGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <line x1="50" y1="15" x2="50" y2="80" stroke="url(#balGrad)" strokeWidth="2" />
        <line x1="20" y1="30" x2="80" y2="30" stroke="url(#balGrad)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="50" cy="15" r="4" fill="url(#balGrad)" />
        <path d="M20 30 L15 45 L25 45 Z" fill="url(#balGrad)" opacity="0.6" />
        <path d="M80 30 L75 45 L85 45 Z" fill="url(#balGrad)" opacity="0.6" />
        <rect x="35" y="80" width="30" height="4" rx="1" fill="url(#balGrad)" />
      </svg>
    </div>
  );
}

function BookIllustration() {
  return (
    <div style={{ width: 100, height: 100, margin: '0 auto' }}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="bookGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <path d="M50 25 L50 80 M50 25 Q30 20 20 30 L20 75 Q30 70 50 75 M50 25 Q70 20 80 30 L80 75 Q70 70 50 75" stroke="url(#bookGrad)" strokeWidth="2" fill="none" strokeLinejoin="round" />
        <line x1="28" y1="40" x2="42" y2="38" stroke="url(#bookGrad)" strokeWidth="1.5" opacity="0.6" />
        <line x1="28" y1="48" x2="42" y2="46" stroke="url(#bookGrad)" strokeWidth="1.5" opacity="0.6" />
        <line x1="58" y1="38" x2="72" y2="40" stroke="url(#bookGrad)" strokeWidth="1.5" opacity="0.6" />
        <line x1="58" y1="46" x2="72" y2="48" stroke="url(#bookGrad)" strokeWidth="1.5" opacity="0.6" />
      </svg>
    </div>
  );
}

function SaudiIllustration() {
  return (
    <div style={{ width: 100, height: 100, margin: '0 auto' }}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="saudiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#f7d560" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="40" fill="none" stroke="url(#saudiGrad)" strokeWidth="2" opacity="0.3" />
        <path d="M30 55 Q50 30 70 55 Q65 60 50 60 Q35 60 30 55 Z" fill="url(#saudiGrad)" opacity="0.6" />
        <path d="M35 65 L50 45 L65 65" stroke="url(#saudiGrad)" strokeWidth="3" strokeLinecap="round" fill="none" />
        <circle cx="50" cy="35" r="3" fill="url(#saudiGrad)" />
      </svg>
    </div>
  );
}

function RocketIllustration() {
  return (
    <div style={{ width: 100, height: 100, margin: '0 auto' }}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="rocketGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#f7d560" />
          </linearGradient>
          <linearGradient id="fireGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        <path d="M50 15 L40 50 L40 70 L50 75 L60 70 L60 50 Z" fill="url(#rocketGrad)" />
        <circle cx="50" cy="40" r="5" fill={C.ink} />
        <path d="M40 60 L30 70 L35 55 Z" fill="url(#rocketGrad)" />
        <path d="M60 60 L70 70 L65 55 Z" fill="url(#rocketGrad)" />
        <path d="M45 75 Q50 90 55 75 L55 80 Q50 95 45 80 Z" fill="url(#fireGrad)" opacity="0.8" />
      </svg>
    </div>
  );
}
