/**
 * TOOLTIPS DATA
 * مكتبة شروحات شاملة لجميع المصطلحات المالية
 * 60+ مصطلح بشرح عربي سهل + أمثلة
 */

export const TOOLTIPS = {
  // ═══════════════════════════════════════════════
  // 📊 التحليل الفني
  // ═══════════════════════════════════════════════
  
  'RSI': {
    title: 'مؤشر القوة النسبية',
    subtitle: 'Relative Strength Index',
    description: 'مؤشر يقيس سرعة وحجم تغيّرات السعر، يتحرك بين 0 و 100.',
    details: [
      { label: 'فوق 70', value: '⚠️ تشبع شرائي - احتمال هبوط' },
      { label: 'تحت 30', value: '✅ تشبع بيعي - احتمال ارتداد' },
      { label: 'بين 30-70', value: '🟡 منطقة محايدة' },
    ],
    example: 'إذا RSI = 25 لسهم معين، فهذا يعني أن السهم في منطقة تشبع بيعي وقد يرتد قريباً.',
    category: 'technical',
  },
  
  'MACD': {
    title: 'مؤشر تقارب وتباعد المتوسطات',
    subtitle: 'Moving Average Convergence Divergence',
    description: 'مؤشر يُظهر العلاقة بين متوسطين متحركين للسعر، يساعد في تحديد الزخم واتجاه السهم.',
    details: [
      { label: 'تقاطع صاعد', value: '✅ إشارة شراء' },
      { label: 'تقاطع هابط', value: '⚠️ إشارة بيع' },
      { label: 'Histogram', value: '📊 يُظهر قوة الزخم' },
    ],
    example: 'عندما يخترق خط MACD خط الإشارة صعوداً، تكون هذه إشارة إيجابية للشراء.',
    category: 'technical',
  },
  
  'BOS': {
    title: 'كسر الهيكل',
    subtitle: 'Break of Structure',
    description: 'لحظة كسر السهم لقمة أو قاع سابق، مما يُشير إلى تغيّر اتجاه مؤكد.',
    details: [
      { label: 'BOS صاعد', value: '✅ كسر قمة سابقة - صعود قوي' },
      { label: 'BOS هابط', value: '⚠️ كسر قاع سابق - هبوط قوي' },
    ],
    example: 'إذا كسر السهم قمة 100 ريال بعد تجاوز 3 محاولات سابقة، فهذا BOS صاعد قوي.',
    category: 'technical',
  },
  
  'CHOCH': {
    title: 'تغيّر الطابع',
    subtitle: 'Change of Character',
    description: 'أول علامة على احتمال تغيّر الاتجاه -- كسر لأول قمة/قاع في الاتجاه الحالي.',
    details: [
      { label: 'CHOCH صاعد', value: '✅ بداية اتجاه صاعد محتمل' },
      { label: 'CHOCH هابط', value: '⚠️ بداية اتجاه هابط محتمل' },
    ],
    example: 'بعد ترند هابط طويل، CHOCH صاعد = أول مؤشر على احتمال انقلاب الاتجاه.',
    category: 'technical',
  },
  
  'VWAP': {
    title: 'السعر المرجّح بالحجم',
    subtitle: 'Volume Weighted Average Price',
    description: 'متوسط سعر السهم مع الأخذ في الاعتبار الحجم المتداول -- يستخدمه المحترفون كمرجع.',
    details: [
      { label: 'فوق VWAP', value: '✅ السهم في منطقة شراء' },
      { label: 'تحت VWAP', value: '⚠️ السهم في منطقة بيع' },
    ],
    example: 'إذا السعر فوق VWAP والحجم يدعم، هذا إشارة قوة مؤسسية.',
    category: 'technical',
  },
  
  'OBV': {
    title: 'حجم الرصيد المتوازن',
    subtitle: 'On-Balance Volume',
    description: 'يقيس ضغط البيع/الشراء التراكمي من خلال الحجم.',
    details: [
      { label: 'OBV صاعد', value: '✅ تراكم شرائي' },
      { label: 'OBV هابط', value: '⚠️ توزيع بيعي' },
      { label: 'تباعد', value: '🎯 إشارة قوية' },
    ],
    example: 'إذا السعر صاعد لكن OBV هابط = تباعد سلبي = تحذير.',
    category: 'technical',
  },
  
  'ATR': {
    title: 'متوسط المدى الحقيقي',
    subtitle: 'Average True Range',
    description: 'يقيس تذبذب السهم -- كلما ارتفع، زادت المخاطرة والفرصة.',
    details: [
      { label: 'ATR عالٍ', value: '⚡ تذبذب عالٍ - فرص + مخاطر' },
      { label: 'ATR منخفض', value: '🟢 استقرار - أقل مخاطرة' },
    ],
    example: 'سهم ATR = 2 ريال يتحرك في المتوسط 2 ريال يومياً.',
    category: 'technical',
  },
  
  'ADX': {
    title: 'مؤشر الاتجاه',
    subtitle: 'Average Directional Index',
    description: 'يقيس قوة الاتجاه (صاعد أو هابط) بغض النظر عن الاتجاه نفسه.',
    details: [
      { label: 'فوق 40', value: '💪 اتجاه قوي جداً' },
      { label: '25-40', value: '✅ اتجاه قوي' },
      { label: 'تحت 25', value: '🟡 ضعف الاتجاه' },
    ],
    example: 'ADX = 50 يعني اتجاه قوي جداً -- سواء صاعد أو هابط.',
    category: 'technical',
  },
  
  'CMF': {
    title: 'تدفق المال',
    subtitle: 'Chaikin Money Flow',
    description: 'يقيس حجم المال الداخل أو الخارج من السهم.',
    details: [
      { label: 'فوق 0', value: '✅ تدفق مالي إيجابي' },
      { label: 'تحت 0', value: '⚠️ خروج مالي' },
      { label: 'فوق 0.25', value: '💪 تدفق قوي جداً' },
    ],
    example: 'CMF = 0.30 يعني مؤسسات تشتري بقوة -- إشارة إيجابية.',
    category: 'technical',
  },
  
  'Stochastic': {
    title: 'الستوكاستيك',
    subtitle: 'Stochastic Oscillator',
    description: 'يقارن سعر الإغلاق مع نطاق السعر خلال فترة معينة.',
    details: [
      { label: 'فوق 80', value: '⚠️ تشبع شرائي' },
      { label: 'تحت 20', value: '✅ تشبع بيعي' },
    ],
    example: 'Stochastic = 15 مع RSI = 25 = إشارة قوية للارتداد.',
    category: 'technical',
  },
  
  // ═══════════════════════════════════════════════
  // 🧠 Wyckoff Patterns
  // ═══════════════════════════════════════════════
  
  'Wyckoff': {
    title: 'نموذج Wyckoff',
    subtitle: 'Richard Wyckoff Method',
    description: 'منهجية تحليل السوق من منظور "المال الذكي" -- تحديد مراحل التراكم والتوزيع.',
    details: [
      { label: 'Accumulation', value: '📥 تجميع قبل الصعود' },
      { label: 'Markup', value: '📈 مرحلة الصعود' },
      { label: 'Distribution', value: '📤 توزيع قبل الهبوط' },
      { label: 'Markdown', value: '📉 مرحلة الهبوط' },
    ],
    example: 'إذا السهم في مرحلة Accumulation + حجم عالٍ = فرصة شراء قوية.',
    category: 'technical',
  },
  
  'Accumulation': {
    title: 'مرحلة التجميع',
    subtitle: 'Accumulation Phase',
    description: 'مرحلة يُجمّع فيها المستثمرون الأذكياء الأسهم قبل الصعود الكبير.',
    details: [
      { label: 'السعر', value: '📊 يتحرك في نطاق ضيق' },
      { label: 'الحجم', value: '📈 يزداد تدريجياً' },
      { label: 'الإشارة', value: '✅ فرصة شراء قبل الصعود' },
    ],
    example: 'سهم يتذبذب بين 50-55 ريال لشهرين مع حجم متزايد = تجميع.',
    category: 'technical',
  },
  
  'Distribution': {
    title: 'مرحلة التوزيع',
    subtitle: 'Distribution Phase',
    description: 'مرحلة يبيع فيها المستثمرون الأذكياء أسهمهم للجمهور قبل الهبوط.',
    details: [
      { label: 'السعر', value: '📊 يتحرك في نطاق ضيق (قمة)' },
      { label: 'الحجم', value: '📉 يبدأ بالانخفاض' },
      { label: 'الإشارة', value: '⚠️ تحذير - احتمال هبوط' },
    ],
    example: 'سهم ارتفع 100% ثم توقف عند قمة لمدة شهر = توزيع محتمل.',
    category: 'technical',
  },
  
  'Order Block': {
    title: 'كتلة الطلب',
    subtitle: 'Order Block',
    description: 'منطقة سعرية حيث دخلت المؤسسات بكميات كبيرة -- تصبح دعماً أو مقاومة قوية.',
    details: [
      { label: 'Bull OB', value: '✅ دعم مؤسسي قوي' },
      { label: 'Bear OB', value: '⚠️ مقاومة مؤسسية قوية' },
    ],
    example: 'إذا السعر عاد إلى Order Block صاعد، فغالباً سيرتد من هناك.',
    category: 'technical',
  },
  
  'Liquidity Sweep': {
    title: 'اكتساح السيولة',
    subtitle: 'Liquidity Sweep',
    description: 'حركة سريعة تأخذ أوامر الإيقاف (Stop Loss) قبل عكس الاتجاه.',
    details: [
      { label: 'Buy-Side Sweep', value: '⚡ كسر قمة ثم هبوط' },
      { label: 'Sell-Side Sweep', value: '⚡ كسر قاع ثم صعود' },
    ],
    example: 'السهم كسر قاع 50 بسرعة ثم عاد فوق 52 = اكتساح سيولة = فرصة شراء.',
    category: 'technical',
  },
  
  // ═══════════════════════════════════════════════
  // 💼 المحفظة والأداء
  // ═══════════════════════════════════════════════
  
  'Sharpe Ratio': {
    title: 'نسبة شارب',
    subtitle: 'Sharpe Ratio',
    description: 'يقيس العائد مقابل المخاطرة -- كلما ارتفع، كان أداء المحفظة أفضل.',
    details: [
      { label: 'فوق 2', value: '🏆 استثنائي' },
      { label: '1 - 2', value: '✅ ممتاز' },
      { label: '0.5 - 1', value: '🟡 مقبول' },
      { label: 'تحت 0.5', value: '⚠️ ضعيف' },
    ],
    example: 'Sharpe = 1.5 يعني لكل وحدة مخاطرة، تحصل على 1.5 وحدة عائد.',
    category: 'portfolio',
  },
  
  'Sortino Ratio': {
    title: 'نسبة سورتينو',
    subtitle: 'Sortino Ratio',
    description: 'مثل Sharpe لكن يحسب فقط المخاطرة السلبية -- أدق للمستثمرين.',
    details: [
      { label: 'فوق 2', value: '🏆 ممتاز' },
      { label: '1 - 2', value: '✅ جيد' },
      { label: 'تحت 1', value: '⚠️ يحتاج تحسين' },
    ],
    example: 'Sortino = 2 أفضل من Sharpe = 2 لأنه يتجاهل التقلبات الإيجابية.',
    category: 'portfolio',
  },
  
  'Alpha': {
    title: 'الألفا',
    subtitle: 'Alpha - Excess Return',
    description: 'العائد الزائد عن مؤشر السوق (تاسي) -- مقياس مهارة المستثمر.',
    details: [
      { label: 'Alpha موجب', value: '✅ محفظتك تفوقت على السوق' },
      { label: 'Alpha = 0', value: '🟡 أداء مثل السوق' },
      { label: 'Alpha سالب', value: '⚠️ أقل من السوق' },
    ],
    example: 'Alpha = +5% يعني محفظتك تفوقت على تاسي بـ 5%.',
    category: 'portfolio',
  },
  
  'Beta': {
    title: 'البيتا',
    subtitle: 'Beta - Market Sensitivity',
    description: 'مدى حساسية محفظتك لحركة السوق.',
    details: [
      { label: 'β = 1', value: '🟡 تتحرك مع السوق' },
      { label: 'β > 1', value: '⚡ أكثر تقلباً من السوق' },
      { label: 'β < 1', value: '🛡️ أقل تقلباً من السوق' },
    ],
    example: 'β = 1.5 يعني إذا ارتفع تاسي 10%، محفظتك تصعد 15%.',
    category: 'portfolio',
  },
  
  'Maximum Drawdown': {
    title: 'أقصى تراجع',
    subtitle: 'Max Drawdown',
    description: 'أكبر خسارة من قمة إلى قاع في محفظتك -- يُظهر أسوأ فترة مررت بها.',
    details: [
      { label: '0% إلى -10%', value: '🏆 ممتاز' },
      { label: '-10% إلى -20%', value: '✅ مقبول' },
      { label: '-20% إلى -40%', value: '⚠️ مخيف' },
      { label: 'أكثر من -40%', value: '🚨 خطر' },
    ],
    example: 'محفظة 100,000 هبطت إلى 82,000 ثم عادت = Max DD = -18%.',
    category: 'risk',
  },
  
  'Calmar Ratio': {
    title: 'نسبة كالمار',
    subtitle: 'Calmar Ratio',
    description: 'العائد السنوي مقسوماً على أقصى تراجع -- يقيس كفاءة استرداد الخسائر.',
    details: [
      { label: 'فوق 3', value: '🏆 استثنائي' },
      { label: '1 - 3', value: '✅ جيد' },
      { label: 'تحت 1', value: '⚠️ يحتاج تحسين' },
    ],
    example: 'عائد +30% مع Max DD -10% = Calmar = 3 = ممتاز.',
    category: 'portfolio',
  },
  
  // ═══════════════════════════════════════════════
  // ⚠️ المخاطر
  // ═══════════════════════════════════════════════
  
  'VaR': {
    title: 'القيمة المعرّضة للمخاطرة',
    subtitle: 'Value at Risk',
    description: 'الحد الأقصى للخسارة المتوقعة في يوم عادي بنسبة ثقة 95%.',
    details: [
      { label: 'VaR منخفض', value: '🛡️ مخاطرة قليلة' },
      { label: 'VaR عالٍ', value: '⚠️ مخاطرة عالية' },
    ],
    example: 'VaR = -2% يعني: في 95% من الأيام، لن تخسر أكثر من 2%.',
    category: 'risk',
  },
  
  'CVaR': {
    title: 'القيمة الشرطية المعرّضة للمخاطرة',
    subtitle: 'Conditional VaR',
    description: 'متوسط الخسارة في أسوأ 5% من الأيام -- مقياس أكثر دقة من VaR.',
    details: [
      { label: 'الفرق عن VaR', value: '📊 يُظهر عمق الخسارة المحتملة' },
    ],
    example: 'إذا VaR = -2% و CVaR = -4%، يعني في الأسوأ قد تخسر 4%.',
    category: 'risk',
  },
  
  'Volatility': {
    title: 'التذبذب',
    subtitle: 'Volatility',
    description: 'مقياس تقلّب السعر -- كلما ارتفع، زادت الحركة السعرية.',
    details: [
      { label: 'تحت 15%', value: '🛡️ مستقر' },
      { label: '15-25%', value: '🟡 متوسط' },
      { label: 'فوق 30%', value: '⚡ عالي التذبذب' },
    ],
    example: 'Volatility = 40% يعني السهم يتحرك كثيراً -- فرص + مخاطر.',
    category: 'risk',
  },
  
  'Correlation': {
    title: 'الارتباط',
    subtitle: 'Correlation',
    description: 'مدى تحرك سهمين معاً -- مهم لتنويع المحفظة.',
    details: [
      { label: 'Corr = 1', value: '🔗 يتحركان معاً 100%' },
      { label: 'Corr = 0', value: '🎯 مستقلان تماماً (تنويع مثالي)' },
      { label: 'Corr = -1', value: '↔️ معاكسان 100%' },
    ],
    example: 'Corr = 0.05 بين بنكين = تنويع حقيقي ممتاز.',
    category: 'risk',
  },
  
  // ═══════════════════════════════════════════════
  // 🧪 Backtesting
  // ═══════════════════════════════════════════════
  
  'Monte Carlo': {
    title: 'محاكاة مونت كارلو',
    subtitle: 'Monte Carlo Simulation',
    description: 'تشغيل الاستراتيجية 10,000 مرة على سيناريوهات مختلفة لمعرفة النتائج المحتملة.',
    details: [
      { label: 'الفائدة', value: '🎯 فهم المخاطر الحقيقية' },
      { label: 'النتيجة', value: '📊 توزيع احتمالي للعوائد' },
    ],
    example: 'Monte Carlo أظهر 70% احتمال ربح و 30% احتمال خسارة.',
    category: 'backtest',
  },
  
  'Win Rate': {
    title: 'نسبة الربح',
    subtitle: 'Win Rate',
    description: 'نسبة الصفقات الرابحة من إجمالي الصفقات.',
    details: [
      { label: 'فوق 60%', value: '🏆 ممتاز' },
      { label: '50-60%', value: '✅ جيد' },
      { label: 'تحت 40%', value: '⚠️ ضعيف' },
    ],
    example: 'من 100 صفقة، ربحت 65 = Win Rate = 65%.',
    category: 'backtest',
  },
  
  'Profit Factor': {
    title: 'عامل الربح',
    subtitle: 'Profit Factor',
    description: 'إجمالي الأرباح مقسوماً على إجمالي الخسائر.',
    details: [
      { label: 'فوق 2', value: '🏆 استراتيجية قوية' },
      { label: '1.5 - 2', value: '✅ جيدة' },
      { label: 'تحت 1', value: '❌ خاسرة' },
    ],
    example: 'أرباح 30,000 ÷ خسائر 10,000 = Profit Factor = 3.',
    category: 'backtest',
  },
  
  'Kelly Criterion': {
    title: 'معيار كيلي',
    subtitle: 'Kelly Criterion',
    description: 'معادلة رياضية لتحديد حجم الصفقة المثالي بناءً على احتمال الربح.',
    details: [
      { label: 'Full Kelly', value: '⚡ مخاطرة عالية' },
      { label: 'Half Kelly', value: '🛡️ مخاطرة متوازنة (موصى به)' },
      { label: 'Quarter Kelly', value: '🟢 محافظ' },
    ],
    example: 'Kelly = 10% يعني استثمر 10% من رأس المال في الصفقة.',
    category: 'backtest',
  },
    // ═══════════════════════════════════════════════
  // 🎯 إدارة المخاطر المتقدمة
  // ═══════════════════════════════════════════════
  
  'Half-Kelly': {
    title: 'نصف كيلي',
    subtitle: 'Half-Kelly Position Sizing',
    description: 'استراتيجية متحفظة لتحديد حجم الصفقة -- تستخدم نصف القيمة المُحسبة من معادلة كيلي.',
    details: [
      { label: 'Full Kelly', value: '⚡ مخاطرة عالية - 100% من المُحسب' },
      { label: 'Half Kelly', value: '🛡️ المعتمد عالمياً - 50% من المُحسب' },
      { label: 'Quarter Kelly', value: '🟢 محافظ جداً - 25% من المُحسب' },
    ],
    example: 'إذا Kelly = 20%، Half-Kelly = 10% من رأس المال - أكثر أماناً.',
    category: 'risk',
  },
  
  'Position Size': {
    title: 'حجم المركز',
    subtitle: 'Position Size',
    description: 'النسبة المئوية المثالية من رأس المال لاستثمارها في صفقة واحدة.',
    details: [
      { label: 'صفقة قوية', value: '💪 5-10% من رأس المال' },
      { label: 'صفقة متوسطة', value: '✅ 2-5% من رأس المال' },
      { label: 'صفقة محفوفة', value: '⚠️ 1-2% من رأس المال' },
    ],
    example: 'إذا رأس مالك 100,000 ريال، حجم مركز 5% = 5,000 ريال للصفقة.',
    category: 'risk',
  },
  
  'حجم المركز': {
    title: 'حجم المركز',
    subtitle: 'Position Sizing',
    description: 'النسبة المثالية من رأس المال لاستثمارها في صفقة واحدة - مبنية على معادلة كيلي.',
    details: [
      { label: 'Half-Kelly', value: '🛡️ النصف من المُحسب (موصى به)' },
      { label: 'Quarter-Kelly', value: '🟢 الربع من المُحسب (محافظ)' },
      { label: 'Full-Kelly', value: '⚡ كامل المُحسب (خطر)' },
    ],
    example: 'حجم مركز 8% يعني استثمار 8% من رأس المال في هذه الصفقة.',
    category: 'risk',
  },
  
  'الثقة': {
    title: 'مستوى الثقة',
    subtitle: 'Confidence Level',
    description: 'مدى ثقة المحرك في التوصية - مبنية على عدد الإشارات المُتوافقة.',
    details: [
      { label: 'فوق 80%', value: '🏆 ثقة عالية جداً' },
      { label: '60-80%', value: '✅ ثقة جيدة' },
      { label: '40-60%', value: '🟡 ثقة متوسطة' },
      { label: 'تحت 40%', value: '⚠️ ثقة منخفضة' },
    ],
    example: 'ثقة 85% تعني 8.5 من 9 طبقات تُؤيد التوصية.',
    category: 'risk',
  },
  
  'Softmax': {
    title: 'الاحتمال الموزون',
    subtitle: 'Softmax Probability',
    description: 'تحويل النتائج إلى احتمالات (شراء/بيع/انتظار) باستخدام معادلة Softmax الرياضية.',
    details: [
      { label: 'شراء', value: '✅ احتمال الصعود' },
      { label: 'بيع', value: '⚠️ احتمال الهبوط' },
      { label: 'انتظار', value: '🟡 احتمال الاستقرار' },
    ],
    example: 'شراء 65% + بيع 20% + انتظار 15% = إشارة شراء قوية.',
    category: 'technical',
  },
  
  'الزخم': {
    title: 'الزخم',
    subtitle: 'Momentum',
    description: 'قوة وسرعة حركة السهم - يجمع RSI + MACD + Stochastic.',
    details: [
      { label: 'زخم قوي صاعد', value: '🚀 RSI > 60 + MACD موجب' },
      { label: 'زخم متوسط', value: '🟡 RSI = 40-60' },
      { label: 'زخم ضعيف', value: '⚠️ RSI < 40 + MACD سالب' },
    ],
    example: 'زخم قوي + حجم متزايد = استمرار الصعود محتمل.',
    category: 'technical',
  },
  
  'السيولة': {
    title: 'السيولة',
    subtitle: 'Liquidity',
    description: 'سهولة شراء/بيع السهم - تجمع OBV + CMF + الحجم.',
    details: [
      { label: 'سيولة عالية', value: '✅ سهل الدخول والخروج' },
      { label: 'سيولة متوسطة', value: '🟡 طبيعي' },
      { label: 'سيولة منخفضة', value: '⚠️ صعب الخروج بسرعة' },
    ],
    example: 'سيولة عالية + حجم كبير = أمان أكبر للصفقات الكبيرة.',
    category: 'technical',
  },
  
  'الهيكل': {
    title: 'هيكل السوق',
    subtitle: 'Market Structure',
    description: 'تحديد اتجاه السوق من خلال القمم والقيعان - يكتشف BOS و CHOCH.',
    details: [
      { label: 'BOS صاعد', value: '✅ كسر قمة - اتجاه صاعد مؤكد' },
      { label: 'BOS هابط', value: '⚠️ كسر قاع - اتجاه هابط' },
      { label: 'CHOCH', value: '🔄 احتمال انعكاس الاتجاه' },
    ],
    example: 'BOS صاعد + Order Block = فرصة شراء قوية.',
    category: 'technical',
  },

  // ═══════════════════════════════════════════════
  // ⚖️ Rebalancing
  // ═══════════════════════════════════════════════
  
  'Health Score': {
    title: 'درجة الصحة',
    subtitle: 'Portfolio Health Score',
    description: 'تقييم شامل لمحفظتك من 10 نقاط -- يأخذ في الاعتبار التنويع والمخاطر.',
    details: [
      { label: '9-10', value: '🏆 ممتازة' },
      { label: '7-8', value: '✅ جيدة' },
      { label: '5-6', value: '⚠️ متوسطة' },
      { label: 'تحت 5', value: '🚨 تحتاج تحسين' },
    ],
    example: 'Health Score = 8 يعني محفظتك قوية ومتنوعة.',
    category: 'rebalancing',
  },
  
  'Diversification': {
    title: 'التنويع',
    subtitle: 'Diversification',
    description: 'توزيع الاستثمار على قطاعات وأسهم مختلفة لتقليل المخاطر.',
    details: [
      { label: '5+ قطاعات', value: '🏆 متنوعة جداً' },
      { label: '3-4 قطاعات', value: '✅ مقبول' },
      { label: '1-2 قطاع', value: '⚠️ تركيز عالٍ - خطر' },
    ],
    example: 'محفظة في 5 قطاعات مختلفة أقل خطراً من واحدة في قطاع واحد.',
    category: 'rebalancing',
  },
  
  'Concentration Risk': {
    title: 'خطر التركيز',
    subtitle: 'Concentration Risk',
    description: 'مخاطرة زيادة نسبة سهم واحد أو قطاع واحد في المحفظة.',
    details: [
      { label: 'سهم > 35%', value: '🚨 تركيز عالٍ جداً' },
      { label: '20-35%', value: '⚠️ تحذير' },
      { label: '< 20%', value: '✅ جيد' },
    ],
    example: 'لو الراجحي = 50% من محفظتك، هذا تركيز خطر.',
    category: 'rebalancing',
  },
    
  // ═══════════════════════════════════════════════
  // 📊 مقاييس متقدمة
  // ═══════════════════════════════════════════════
  
  'HHI': {
    title: 'مؤشر هيرفيندال',
    subtitle: 'Herfindahl-Hirschman Index',
    description: 'يقيس مدى تركّز المحفظة في عدد قليل من الأسهم -- كلما ارتفع، كان التركز أعلى والمخاطرة أكبر.',
    details: [
      { label: 'تحت 1500', value: '✅ متنوعة جداً' },
      { label: '1500-2500', value: '🟡 متوسطة التنويع' },
      { label: 'فوق 2500', value: '⚠️ مركّزة - خطر' },
    ],
    example: 'محفظة 10 أسهم متساوية = HHI منخفض = تنويع ممتاز.',
    category: 'risk',
  },
  
  'Avg Corr': {
    title: 'متوسط الارتباط',
    subtitle: 'Average Correlation',
    description: 'مدى تحرك أسهم محفظتك معاً -- كلما قل، كان التنويع أفضل.',
    details: [
      { label: 'تحت 0.3', value: '🏆 تنويع ممتاز' },
      { label: '0.3 - 0.6', value: '✅ تنويع جيد' },
      { label: 'فوق 0.7', value: '⚠️ أسهم تتحرك معاً - خطر' },
    ],
    example: 'محفظة فيها بنوك + تقنية + عقار = Avg Corr منخفض = تنويع حقيقي.',
    category: 'risk',
  },
  
  'Score': {
    title: 'درجة المحفظة',
    subtitle: 'Portfolio Score',
    description: 'تقييم شامل لمحفظتك من 100 -- يأخذ في الاعتبار الأداء والمخاطر والتنويع.',
    details: [
      { label: '90+', value: '🏆 ممتازة' },
      { label: '70-89', value: '✅ جيدة جداً' },
      { label: '50-69', value: '🟡 متوسطة' },
      { label: 'تحت 50', value: '⚠️ تحتاج تحسين' },
    ],
    example: 'Score = 85 = محفظتك في أعلى 15% عالمياً.',
    category: 'portfolio',
  },
  
  'المتوسط μ': {
    title: 'متوسط العائد',
    subtitle: 'Mean Return (μ)',
    description: 'متوسط العائد اليومي/الشهري لمحفظتك -- يُحسب رياضياً.',
    details: [
      { label: 'موجب', value: '✅ المحفظة تربح في المتوسط' },
      { label: 'سالب', value: '⚠️ المحفظة تخسر' },
    ],
    example: 'μ = +0.5% يومياً = 125% سنوياً (نظرياً).',
    category: 'portfolio',
  },
  
  'VaR Distribution': {
    title: 'توزيع المخاطر',
    subtitle: 'Value at Risk Distribution',
    description: 'رسم بياني يُظهر توزيع الخسائر المحتملة لمحفظتك بنسب احتمالية مختلفة.',
    details: [
      { label: '95% من الأيام', value: '🟢 خسائر طبيعية' },
      { label: '5% من الأيام', value: '⚠️ خسائر حادة' },
      { label: '1% من الأيام', value: '🚨 خسائر استثنائية' },
    ],
    example: 'VaR 95% = -2% يعني: في 95% من الأيام، لن تخسر أكثر من 2%.',
    category: 'risk',
  },
  
  'Markowitz': {
    title: 'خريطة ماركويتز',
    subtitle: 'Markowitz Efficient Frontier',
    description: 'خريطة العائد مقابل المخاطرة لجميع المحافظ الممكنة -- تحدد المحفظة المثالية.',
    details: [
      { label: 'النقطة المثالية', value: '🎯 أعلى عائد مع أقل مخاطرة' },
      { label: 'الحدود الكفؤة', value: '✅ المحافظ الأمثل رياضياً' },
    ],
    example: 'محفظتك على الحدود الكفؤة = استثمار مثالي رياضياً.',
    category: 'portfolio',
  },

  // ═══════════════════════════════════════════════
  // 📊 التقييم الأساسي
  // ═══════════════════════════════════════════════
  
  'P/E': {
    title: 'نسبة السعر للأرباح',
    subtitle: 'Price-to-Earnings',
    description: 'مدى غلاء/رخص السهم مقارنة بأرباحه.',
    details: [
      { label: 'P/E منخفض', value: '✅ سهم رخيص' },
      { label: 'P/E عالٍ', value: '⚠️ سهم غالٍ أو نمو عالٍ' },
      { label: 'معدل السوق', value: '🟡 حوالي 15-20' },
    ],
    example: 'سهم P/E = 10 أرخص من سهم P/E = 30 في نفس القطاع.',
    category: 'fundamental',
  },
  
  'P/B': {
    title: 'نسبة السعر للقيمة الدفترية',
    subtitle: 'Price-to-Book',
    description: 'مقارنة سعر السهم بقيمته الدفترية (Assets - Liabilities).',
    details: [
      { label: 'P/B < 1', value: '✅ أقل من القيمة الدفترية' },
      { label: 'P/B = 1-3', value: '🟡 طبيعي' },
      { label: 'P/B > 3', value: '⚠️ غالٍ' },
    ],
    example: 'P/B = 0.8 يعني السهم يُباع بأقل من قيمته الحقيقية.',
    category: 'fundamental',
  },
  
  'ROE': {
    title: 'العائد على حقوق الملكية',
    subtitle: 'Return on Equity',
    description: 'مدى كفاءة الشركة في استخدام أموال المساهمين لتوليد الأرباح.',
    details: [
      { label: 'فوق 20%', value: '🏆 ممتاز' },
      { label: '15-20%', value: '✅ جيد جداً' },
      { label: '10-15%', value: '🟡 مقبول' },
      { label: 'تحت 10%', value: '⚠️ ضعيف' },
    ],
    example: 'ROE = 25% يعني الشركة تُحقق 25 ريال على كل 100 ريال استثمرتها.',
    category: 'fundamental',
  },
  
  'Dividend Yield': {
    title: 'عائد التوزيعات',
    subtitle: 'Dividend Yield',
    description: 'نسبة التوزيعات السنوية مقارنة بسعر السهم.',
    details: [
      { label: 'فوق 5%', value: '💰 عائد ممتاز' },
      { label: '3-5%', value: '✅ جيد' },
      { label: 'تحت 2%', value: '🟡 منخفض' },
    ],
    example: 'سهم 100 ريال يوزع 6 ريال = Dividend Yield = 6%.',
    category: 'fundamental',
  },
  
  // ═══════════════════════════════════════════════
  // 🌐 السوق
  // ═══════════════════════════════════════════════
  
  'TASI': {
    title: 'تاسي',
    subtitle: 'Tadawul All Share Index',
    description: 'المؤشر العام لسوق الأسهم السعودية -- يعكس أداء جميع الأسهم.',
    details: [
      { label: 'ارتفاع', value: '✅ السوق إيجابي' },
      { label: 'انخفاض', value: '⚠️ السوق سلبي' },
    ],
    example: 'تاسي = 12,000 نقطة مع +1% = جلسة إيجابية عامة.',
    category: 'market',
  },
  
  'SAIBOR': {
    title: 'سايبور',
    subtitle: 'Saudi Interbank Offered Rate',
    description: 'معدل الفائدة بين البنوك السعودية -- يُستخدم كمعدل خالي من المخاطر.',
    details: [
      { label: 'ارتفاع', value: '⚠️ تشديد نقدي' },
      { label: 'انخفاض', value: '✅ تيسير نقدي' },
    ],
    example: 'SAIBOR = 4% يعني البنوك تُقرض بعضها بفائدة 4%.',
    category: 'market',
  },
  
  'Market Cap': {
    title: 'القيمة السوقية',
    subtitle: 'Market Capitalization',
    description: 'القيمة الإجمالية للشركة = سعر السهم × عدد الأسهم.',
    details: [
      { label: 'Large Cap', value: '🏆 فوق 10 مليار ريال' },
      { label: 'Mid Cap', value: '✅ 2-10 مليار' },
      { label: 'Small Cap', value: '⚡ تحت 2 مليار' },
    ],
    example: 'أرامكو = تريليونات = Mega Cap.',
    category: 'market',
  },
};

/**
 * الحصول على شرح مصطلح
 * @param {string} key - مفتاح المصطلح (مثل "RSI")
 * @returns {object|null} - بيانات الشرح أو null
 */
export function getTooltip(key) {
  return TOOLTIPS[key] || null;
}

export default TOOLTIPS;
