/**
 * @module constants/stocksData
 * @description مصدر البيانات الثابتة -- القطاعات الرسمية من تاسي والتقييمات
 * الأسماء والأسعار تأتي من sahmk API عبر usePriceUpdater
 * القطاعات مبنية على تصنيف تاسي الرسمي (sectors endpoint)
 */

// ═══════════════════════════════════════════════════════════
// 📊 STOCKS -- رموز تاسي مع القطاع الرسمي والتقييم
// المصدر: sahmk companies endpoint + تصنيف تاسي الرسمي
// ═══════════════════════════════════════════════════════════

export const STOCKS = [
  // ── البنوك (Banks) ──
  { sym:"1010", sec:"البنوك", sectorId:"banks", rating:75 },
  { sym:"1020", sec:"البنوك", sectorId:"banks", rating:70 },
  { sym:"1030", sec:"البنوك", sectorId:"banks", rating:70 },
  { sym:"1050", sec:"البنوك", sectorId:"banks", rating:72 },
  { sym:"1060", sec:"البنوك", sectorId:"banks", rating:74 },
  { sym:"1080", sec:"البنوك", sectorId:"banks", rating:73 },
  { sym:"1120", sec:"البنوك", sectorId:"banks", rating:82 },
  { sym:"1140", sec:"البنوك", sectorId:"banks", rating:74 },
  { sym:"1150", sec:"البنوك", sectorId:"banks", rating:74 },
  { sym:"1180", sec:"البنوك", sectorId:"banks", rating:78 },

  // ── الخدمات المالية (Diversified Financials) ──
  { sym:"1111", sec:"الخدمات المالية", sectorId:"financial", rating:70 },
  { sym:"1182", sec:"الخدمات المالية", sectorId:"financial", rating:60 },
  { sym:"1183", sec:"الخدمات المالية", sectorId:"financial", rating:65 },
  { sym:"2120", sec:"الخدمات المالية", sectorId:"financial", rating:63 },
  { sym:"4081", sec:"الخدمات المالية", sectorId:"financial", rating:63 },
  { sym:"4082", sec:"الخدمات المالية", sectorId:"financial", rating:65 },
  { sym:"4083", sec:"الخدمات المالية", sectorId:"financial", rating:65 },
  { sym:"4084", sec:"الخدمات المالية", sectorId:"financial", rating:65 },
  { sym:"4130", sec:"الخدمات المالية", sectorId:"financial", rating:63 },
  { sym:"4280", sec:"الخدمات المالية", sectorId:"financial", rating:75 },

  // ── السلع الرأسمالية (Capital Goods) ──
  { sym:"1212", sec:"السلع الرأسمالية", sectorId:"capgoods", rating:62 },
  { sym:"1214", sec:"السلع الرأسمالية", sectorId:"capgoods", rating:62 },
  { sym:"1302", sec:"السلع الرأسمالية", sectorId:"capgoods", rating:65 },
  { sym:"1303", sec:"السلع الرأسمالية", sectorId:"capgoods", rating:63 },
  { sym:"2040", sec:"السلع الرأسمالية", sectorId:"capgoods", rating:65 },
  { sym:"2110", sec:"السلع الرأسمالية", sectorId:"capgoods", rating:63 },
  { sym:"2160", sec:"السلع الرأسمالية", sectorId:"capgoods", rating:62 },
  { sym:"2320", sec:"السلع الرأسمالية", sectorId:"capgoods", rating:65 },
  { sym:"2370", sec:"السلع الرأسمالية", sectorId:"capgoods", rating:62 },
  { sym:"4110", sec:"السلع الرأسمالية", sectorId:"capgoods", rating:62 },
  { sym:"4140", sec:"السلع الرأسمالية", sectorId:"capgoods", rating:62 },
  { sym:"4141", sec:"السلع الرأسمالية", sectorId:"capgoods", rating:62 },
  { sym:"4142", sec:"السلع الرأسمالية", sectorId:"capgoods", rating:65 },
  { sym:"4144", sec:"السلع الرأسمالية", sectorId:"capgoods", rating:62 },
  { sym:"4145", sec:"السلع الرأسمالية", sectorId:"capgoods", rating:65 },
  { sym:"4146", sec:"السلع الرأسمالية", sectorId:"capgoods", rating:65 },
  { sym:"4147", sec:"السلع الرأسمالية", sectorId:"capgoods", rating:65 },
  { sym:"4148", sec:"السلع الرأسمالية", sectorId:"capgoods", rating:62 },

  // ── المواد الأساسية (Materials) ──
  { sym:"1201", sec:"المواد الأساسية", sectorId:"materials", rating:62 },
  { sym:"1202", sec:"المواد الأساسية", sectorId:"materials", rating:62 },
  { sym:"1210", sec:"المواد الأساسية", sectorId:"materials", rating:62 },
  { sym:"1211", sec:"المواد الأساسية", sectorId:"materials", rating:74 },
  { sym:"1301", sec:"المواد الأساسية", sectorId:"materials", rating:62 },
  { sym:"1304", sec:"المواد الأساسية", sectorId:"materials", rating:63 },
  { sym:"1320", sec:"المواد الأساسية", sectorId:"materials", rating:63 },
  { sym:"1321", sec:"المواد الأساسية", sectorId:"materials", rating:62 },
  { sym:"1322", sec:"المواد الأساسية", sectorId:"materials", rating:63 },
  { sym:"1323", sec:"المواد الأساسية", sectorId:"materials", rating:62 },
  { sym:"1324", sec:"المواد الأساسية", sectorId:"materials", rating:62 },
  { sym:"2001", sec:"المواد الأساسية", sectorId:"materials", rating:63 },
  { sym:"2010", sec:"المواد الأساسية", sectorId:"materials", rating:72, oilCorr:0.65 },
  { sym:"2020", sec:"المواد الأساسية", sectorId:"materials", rating:68, oilCorr:0.60 },
  { sym:"2060", sec:"المواد الأساسية", sectorId:"materials", rating:67 },
  { sym:"2090", sec:"المواد الأساسية", sectorId:"materials", rating:63 },
  { sym:"2150", sec:"المواد الأساسية", sectorId:"materials", rating:63 },
  { sym:"2170", sec:"المواد الأساسية", sectorId:"materials", rating:63 },
  { sym:"2180", sec:"المواد الأساسية", sectorId:"materials", rating:62 },
  { sym:"2200", sec:"المواد الأساسية", sectorId:"materials", rating:62 },
  { sym:"2210", sec:"المواد الأساسية", sectorId:"materials", rating:62 },
  { sym:"2220", sec:"المواد الأساسية", sectorId:"materials", rating:62 },
  { sym:"2223", sec:"المواد الأساسية", sectorId:"materials", rating:70, oilCorr:0.75 },
  { sym:"2240", sec:"المواد الأساسية", sectorId:"materials", rating:65 },
  { sym:"2250", sec:"المواد الأساسية", sectorId:"materials", rating:63 },
  { sym:"2290", sec:"المواد الأساسية", sectorId:"materials", rating:67, oilCorr:0.55 },
  { sym:"2300", sec:"المواد الأساسية", sectorId:"materials", rating:62 },
  { sym:"2310", sec:"المواد الأساسية", sectorId:"materials", rating:65 },
  { sym:"2330", sec:"المواد الأساسية", sectorId:"materials", rating:67, oilCorr:0.55 },
  { sym:"2350", sec:"المواد الأساسية", sectorId:"materials", rating:63 },
  { sym:"2360", sec:"المواد الأساسية", sectorId:"materials", rating:62 },
  { sym:"3002", sec:"المواد الأساسية", sectorId:"materials", rating:63 },
  { sym:"3003", sec:"المواد الأساسية", sectorId:"materials", rating:63 },
  { sym:"3004", sec:"المواد الأساسية", sectorId:"materials", rating:63 },
  { sym:"3005", sec:"المواد الأساسية", sectorId:"materials", rating:63 },
  { sym:"3007", sec:"المواد الأساسية", sectorId:"materials", rating:62 },
  { sym:"3008", sec:"المواد الأساسية", sectorId:"materials", rating:62 },
  { sym:"3010", sec:"المواد الأساسية", sectorId:"materials", rating:65 },
  { sym:"3020", sec:"المواد الأساسية", sectorId:"materials", rating:65 },
  { sym:"3030", sec:"المواد الأساسية", sectorId:"materials", rating:67 },
  { sym:"3040", sec:"المواد الأساسية", sectorId:"materials", rating:65 },
  { sym:"3050", sec:"المواد الأساسية", sectorId:"materials", rating:65 },
  { sym:"3060", sec:"المواد الأساسية", sectorId:"materials", rating:65 },
  { sym:"3080", sec:"المواد الأساسية", sectorId:"materials", rating:65 },
  { sym:"3090", sec:"المواد الأساسية", sectorId:"materials", rating:63 },
  { sym:"3091", sec:"المواد الأساسية", sectorId:"materials", rating:63 },
  { sym:"3092", sec:"المواد الأساسية", sectorId:"materials", rating:63 },

  // ── الطاقة (Energy) ──
  { sym:"2030", sec:"الطاقة", sectorId:"energy", rating:65, oilCorr:0.70 },
  { sym:"2222", sec:"الطاقة", sectorId:"energy", rating:88, oilCorr:0.85 },
  { sym:"2380", sec:"الطاقة", sectorId:"energy", rating:62, oilCorr:0.70 },
  { sym:"2381", sec:"الطاقة", sectorId:"energy", rating:68, oilCorr:0.60 },
  { sym:"2382", sec:"الطاقة", sectorId:"energy", rating:65 },
  { sym:"4030", sec:"الطاقة", sectorId:"energy", rating:70, oilCorr:0.55 },

  // ── المرافق العامة (Utilities) ──
  { sym:"2080", sec:"المرافق العامة", sectorId:"utilities", rating:67, oilCorr:0.70 },
  { sym:"2081", sec:"المرافق العامة", sectorId:"utilities", rating:63 },
  { sym:"2082", sec:"المرافق العامة", sectorId:"utilities", rating:80 },
  { sym:"2083", sec:"المرافق العامة", sectorId:"utilities", rating:72 },
  { sym:"2084", sec:"المرافق العامة", sectorId:"utilities", rating:65 },
  { sym:"5110", sec:"المرافق العامة", sectorId:"utilities", rating:75 },

  // ── الخدمات التجارية والمهنية (Commercial & Professional Svc) ──
  { sym:"1831", sec:"الخدمات التجارية والمهنية", sectorId:"commercial", rating:65 },
  { sym:"1832", sec:"الخدمات التجارية والمهنية", sectorId:"commercial", rating:65 },
  { sym:"1833", sec:"الخدمات التجارية والمهنية", sectorId:"commercial", rating:63 },
  { sym:"1834", sec:"الخدمات التجارية والمهنية", sectorId:"commercial", rating:63 },
  { sym:"1835", sec:"الخدمات التجارية والمهنية", sectorId:"commercial", rating:63 },
  { sym:"4270", sec:"الخدمات التجارية والمهنية", sectorId:"commercial", rating:63 },

  // ── النقل (Transportation) ──
  { sym:"2190", sec:"النقل", sectorId:"transport", rating:65 },
  { sym:"4031", sec:"النقل", sectorId:"transport", rating:68 },
  { sym:"4040", sec:"النقل", sectorId:"transport", rating:63 },
  { sym:"4260", sec:"النقل", sectorId:"transport", rating:65 },
  { sym:"4261", sec:"النقل", sectorId:"transport", rating:68 },
  { sym:"4262", sec:"النقل", sectorId:"transport", rating:65 },
  { sym:"4263", sec:"النقل", sectorId:"transport", rating:68 },
  { sym:"4264", sec:"النقل", sectorId:"transport", rating:65 },
  { sym:"4265", sec:"النقل", sectorId:"transport", rating:63 },

  // ── السلع طويلة الأجل (Consumer Durables) ──
  { sym:"1213", sec:"السلع طويلة الأجل", sectorId:"durables", rating:62 },
  { sym:"2130", sec:"السلع طويلة الأجل", sectorId:"durables", rating:62 },
  { sym:"2340", sec:"السلع طويلة الأجل", sectorId:"durables", rating:62 },
  { sym:"4011", sec:"السلع طويلة الأجل", sectorId:"durables", rating:65 },
  { sym:"4012", sec:"السلع طويلة الأجل", sectorId:"durables", rating:63 },
  { sym:"4180", sec:"السلع طويلة الأجل", sectorId:"durables", rating:63 },

  // ── الخدمات الإستهلاكية (Consumer Services) ──
  { sym:"1810", sec:"الخدمات الإستهلاكية", sectorId:"services", rating:65 },
  { sym:"1820", sec:"الخدمات الإستهلاكية", sectorId:"services", rating:62 },
  { sym:"1830", sec:"الخدمات الإستهلاكية", sectorId:"services", rating:67 },
  { sym:"4170", sec:"الخدمات الإستهلاكية", sectorId:"services", rating:63 },
  { sym:"4290", sec:"الخدمات الإستهلاكية", sectorId:"services", rating:65 },
  { sym:"4291", sec:"الخدمات الإستهلاكية", sectorId:"services", rating:65 },
  { sym:"4292", sec:"الخدمات الإستهلاكية", sectorId:"services", rating:65 },
  { sym:"6002", sec:"الخدمات الإستهلاكية", sectorId:"services", rating:68 },
  { sym:"6012", sec:"الخدمات الإستهلاكية", sectorId:"services", rating:63 },
  { sym:"6013", sec:"الخدمات الإستهلاكية", sectorId:"services", rating:63 },
  { sym:"6014", sec:"الخدمات الإستهلاكية", sectorId:"services", rating:65 },
  { sym:"6015", sec:"الخدمات الإستهلاكية", sectorId:"services", rating:68 },
  { sym:"6016", sec:"الخدمات الإستهلاكية", sectorId:"services", rating:65 },
  { sym:"6017", sec:"الخدمات الإستهلاكية", sectorId:"services", rating:68 },
  { sym:"6018", sec:"الخدمات الإستهلاكية", sectorId:"services", rating:63 },
  { sym:"6019", sec:"الخدمات الإستهلاكية", sectorId:"services", rating:63 },

  // ── الإعلام والترفيه (Media & Entertainment) ──
  { sym:"4070", sec:"الإعلام والترفيه", sectorId:"media", rating:62 },
  { sym:"4071", sec:"الإعلام والترفيه", sectorId:"media", rating:63 },
  { sym:"4072", sec:"الإعلام والترفيه", sectorId:"media", rating:68 },
  { sym:"4210", sec:"الإعلام والترفيه", sectorId:"media", rating:65 },

  // ── التجزئة وتوزيع السلع الكمالية (Retailing) ──
  { sym:"4003", sec:"التجزئة", sectorId:"retail", rating:70 },
  { sym:"4008", sec:"التجزئة", sectorId:"retail", rating:68 },
  { sym:"4050", sec:"التجزئة", sectorId:"retail", rating:65 },
  { sym:"4051", sec:"التجزئة", sectorId:"retail", rating:62 },
  { sym:"4190", sec:"التجزئة", sectorId:"retail", rating:80 },
  { sym:"4191", sec:"التجزئة", sectorId:"retail", rating:65 },
  { sym:"4192", sec:"التجزئة", sectorId:"retail", rating:65 },
  { sym:"4193", sec:"التجزئة", sectorId:"retail", rating:63 },
  { sym:"4194", sec:"التجزئة", sectorId:"retail", rating:63 },
  { sym:"4200", sec:"التجزئة", sectorId:"retail", rating:65 },
  { sym:"4240", sec:"التجزئة", sectorId:"retail", rating:65 },

  // ── تجزئة الأغذية (Food & Staples Retailing) ──
  { sym:"4001", sec:"تجزئة الأغذية", sectorId:"foodretail", rating:75 },
  { sym:"4006", sec:"تجزئة الأغذية", sectorId:"foodretail", rating:68 },
  { sym:"4061", sec:"تجزئة الأغذية", sectorId:"foodretail", rating:63 },
  { sym:"4160", sec:"تجزئة الأغذية", sectorId:"foodretail", rating:63 },
  { sym:"4161", sec:"تجزئة الأغذية", sectorId:"foodretail", rating:75 },
  { sym:"4162", sec:"تجزئة الأغذية", sectorId:"foodretail", rating:68 },
  { sym:"4163", sec:"تجزئة الأغذية", sectorId:"foodretail", rating:68 },
  { sym:"4164", sec:"تجزئة الأغذية", sectorId:"foodretail", rating:78 },

  // ── المنتجات المنزلية والشخصية (Household & Personal Products) ──
  { sym:"4165", sec:"المنتجات المنزلية والشخصية", sectorId:"household", rating:65 },

  // ── إنتاج الأغذية (Food & Beverages) ──
  { sym:"2050", sec:"إنتاج الأغذية", sectorId:"food", rating:68 },
  { sym:"2100", sec:"إنتاج الأغذية", sectorId:"food", rating:62 },
  { sym:"2270", sec:"إنتاج الأغذية", sectorId:"food", rating:67 },
  { sym:"2280", sec:"إنتاج الأغذية", sectorId:"food", rating:74 },
  { sym:"2281", sec:"إنتاج الأغذية", sectorId:"food", rating:65 },
  { sym:"2282", sec:"إنتاج الأغذية", sectorId:"food", rating:65 },
  { sym:"2283", sec:"إنتاج الأغذية", sectorId:"food", rating:65 },
  { sym:"2284", sec:"إنتاج الأغذية", sectorId:"food", rating:65 },
  { sym:"2285", sec:"إنتاج الأغذية", sectorId:"food", rating:65 },
  { sym:"2286", sec:"إنتاج الأغذية", sectorId:"food", rating:65 },
  { sym:"2287", sec:"إنتاج الأغذية", sectorId:"food", rating:63 },
  { sym:"2288", sec:"إنتاج الأغذية", sectorId:"food", rating:63 },
  { sym:"4080", sec:"إنتاج الأغذية", sectorId:"food", rating:63 },
  { sym:"6001", sec:"إنتاج الأغذية", sectorId:"food", rating:65 },
  { sym:"6010", sec:"إنتاج الأغذية", sectorId:"food", rating:65 },
  { sym:"6020", sec:"إنتاج الأغذية", sectorId:"food", rating:63 },
  { sym:"6040", sec:"إنتاج الأغذية", sectorId:"food", rating:63 },
  { sym:"6050", sec:"إنتاج الأغذية", sectorId:"food", rating:62 },
  { sym:"6060", sec:"إنتاج الأغذية", sectorId:"food", rating:62 },
  { sym:"6070", sec:"إنتاج الأغذية", sectorId:"food", rating:63 },
  { sym:"6090", sec:"إنتاج الأغذية", sectorId:"food", rating:65, oilCorr:0.55 },

  // ── الرعاية الصحية (Health Care Equipment & Svc) ──
  { sym:"2140", sec:"الرعاية الصحية", sectorId:"healthcare", rating:65 },
  { sym:"2230", sec:"الرعاية الصحية", sectorId:"healthcare", rating:68 },
  { sym:"4002", sec:"الرعاية الصحية", sectorId:"healthcare", rating:78 },
  { sym:"4004", sec:"الرعاية الصحية", sectorId:"healthcare", rating:75 },
  { sym:"4005", sec:"الرعاية الصحية", sectorId:"healthcare", rating:70 },
  { sym:"4007", sec:"الرعاية الصحية", sectorId:"healthcare", rating:68 },
  { sym:"4009", sec:"الرعاية الصحية", sectorId:"healthcare", rating:70 },
  { sym:"4013", sec:"الرعاية الصحية", sectorId:"healthcare", rating:80 },
  { sym:"4014", sec:"الرعاية الصحية", sectorId:"healthcare", rating:67 },
  { sym:"4017", sec:"الرعاية الصحية", sectorId:"healthcare", rating:70 },
  { sym:"4018", sec:"الرعاية الصحية", sectorId:"healthcare", rating:67 },
  { sym:"4019", sec:"الرعاية الصحية", sectorId:"healthcare", rating:67 },
  { sym:"4021", sec:"الرعاية الصحية", sectorId:"healthcare", rating:67 },

  // ── الأدوية (Pharma & Life Science) ──
  { sym:"2070", sec:"الأدوية", sectorId:"pharma", rating:65 },
  { sym:"4015", sec:"الأدوية", sectorId:"pharma", rating:72 },
  { sym:"4016", sec:"الأدوية", sectorId:"pharma", rating:68 },

  // ── إدارة وتطوير العقارات (Real Estate Mgmt & Development) ──
  { sym:"4020", sec:"إدارة وتطوير العقارات", sectorId:"realestate", rating:63 },
  { sym:"4090", sec:"إدارة وتطوير العقارات", sectorId:"realestate", rating:63 },
  { sym:"4100", sec:"إدارة وتطوير العقارات", sectorId:"realestate", rating:65 },
  { sym:"4150", sec:"إدارة وتطوير العقارات", sectorId:"realestate", rating:63 },
  { sym:"4220", sec:"إدارة وتطوير العقارات", sectorId:"realestate", rating:63 },
  { sym:"4230", sec:"إدارة وتطوير العقارات", sectorId:"realestate", rating:63 },
  { sym:"4250", sec:"إدارة وتطوير العقارات", sectorId:"realestate", rating:65 },
  { sym:"4300", sec:"إدارة وتطوير العقارات", sectorId:"realestate", rating:62 },
  { sym:"4310", sec:"إدارة وتطوير العقارات", sectorId:"realestate", rating:63 },
  { sym:"4320", sec:"إدارة وتطوير العقارات", sectorId:"realestate", rating:63 },
  { sym:"4321", sec:"إدارة وتطوير العقارات", sectorId:"realestate", rating:65 },
  { sym:"4322", sec:"إدارة وتطوير العقارات", sectorId:"realestate", rating:65 },
  { sym:"4323", sec:"إدارة وتطوير العقارات", sectorId:"realestate", rating:63 },
  { sym:"4324", sec:"إدارة وتطوير العقارات", sectorId:"realestate", rating:63 },
  { sym:"4325", sec:"إدارة وتطوير العقارات", sectorId:"realestate", rating:63 },
  { sym:"4326", sec:"إدارة وتطوير العقارات", sectorId:"realestate", rating:62 },
  { sym:"4327", sec:"إدارة وتطوير العقارات", sectorId:"realestate", rating:62 },

  // ── الإتصالات (Telecommunication Services) ──
  { sym:"7010", sec:"الإتصالات", sectorId:"telecom", rating:80 },
  { sym:"7020", sec:"الإتصالات", sectorId:"telecom", rating:72 },
  { sym:"7030", sec:"الإتصالات", sectorId:"telecom", rating:70 },
  { sym:"7040", sec:"الإتصالات", sectorId:"telecom", rating:65 },

  // ── التطبيقات وخدمات التقنية (Software & Services) ──
  { sym:"7200", sec:"التطبيقات وخدمات التقنية", sectorId:"tech", rating:68 },
  { sym:"7201", sec:"التطبيقات وخدمات التقنية", sectorId:"tech", rating:65 },
  { sym:"7202", sec:"التطبيقات وخدمات التقنية", sectorId:"tech", rating:75 },
  { sym:"7203", sec:"التطبيقات وخدمات التقنية", sectorId:"tech", rating:80 },
  { sym:"7204", sec:"التطبيقات وخدمات التقنية", sectorId:"tech", rating:65 },
  { sym:"7205", sec:"التطبيقات وخدمات التقنية", sectorId:"tech", rating:65 },
  { sym:"7211", sec:"التطبيقات وخدمات التقنية", sectorId:"tech", rating:65 },
  { sym:"8313", sec:"التطبيقات وخدمات التقنية", sectorId:"tech", rating:70 },

  // ── التأمين (Insurance) ──
  { sym:"8010", sec:"التأمين", sectorId:"insurance", rating:72 },
  { sym:"8012", sec:"التأمين", sectorId:"insurance", rating:65 },
  { sym:"8020", sec:"التأمين", sectorId:"insurance", rating:63 },
  { sym:"8030", sec:"التأمين", sectorId:"insurance", rating:63 },
  { sym:"8040", sec:"التأمين", sectorId:"insurance", rating:65 },
  { sym:"8050", sec:"التأمين", sectorId:"insurance", rating:62 },
  { sym:"8060", sec:"التأمين", sectorId:"insurance", rating:65 },
  { sym:"8070", sec:"التأمين", sectorId:"insurance", rating:65 },
  { sym:"8100", sec:"التأمين", sectorId:"insurance", rating:63 },
  { sym:"8120", sec:"التأمين", sectorId:"insurance", rating:62 },
  { sym:"8150", sec:"التأمين", sectorId:"insurance", rating:63 },
  { sym:"8160", sec:"التأمين", sectorId:"insurance", rating:63 },
  { sym:"8170", sec:"التأمين", sectorId:"insurance", rating:65 },
  { sym:"8180", sec:"التأمين", sectorId:"insurance", rating:62 },
  { sym:"8190", sec:"التأمين", sectorId:"insurance", rating:65 },
  { sym:"8200", sec:"التأمين", sectorId:"insurance", rating:65 },
  { sym:"8210", sec:"التأمين", sectorId:"insurance", rating:78 },
  { sym:"8230", sec:"التأمين", sectorId:"insurance", rating:70 },
  { sym:"8240", sec:"التأمين", sectorId:"insurance", rating:65 },
  { sym:"8250", sec:"التأمين", sectorId:"insurance", rating:65 },
  { sym:"8260", sec:"التأمين", sectorId:"insurance", rating:62 },
  { sym:"8280", sec:"التأمين", sectorId:"insurance", rating:62 },
  { sym:"8300", sec:"التأمين", sectorId:"insurance", rating:65 },
  { sym:"8310", sec:"التأمين", sectorId:"insurance", rating:62 },
  { sym:"8311", sec:"التأمين", sectorId:"insurance", rating:63 },
];

// ═══════════════════════════════════════════════════════════
// 🗺️ STOCKS_MAP -- وصول سريع بالرمز للقطاع والتقييم
// ═══════════════════════════════════════════════════════════

export const STOCKS_MAP = Object.fromEntries(STOCKS.map(s => [s.sym, s]));


// ═══════════════════════════════════════════════════════════
// 🎯 STOCK CATEGORIES -- فئات ذكية للتصفية
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// 🌍 DIVERSE UNIVERSE BUILDER - بناء universe متنوّع
// ═══════════════════════════════════════════════════════════

/**
 * يبني universe متنوّع من ٥٠ سهم:
 * - ١٠ قياديّة (rating ≥ 75)
 * - ١٠ عالية الجودة (rating 70-74)
 * - ١٠ متوسّطة (rating 65-69)
 * - ١٠ نموّ محتمل (rating 60-64)
 * - ١٠ مرتبطة بالنفط (تنوّع إضافيّ)
 * 
 * @param {number} seed - بذرة عشوائية (اختياريّة)
 * @returns {Array} - مصفوفة من ٥٠ سهم
 */
export function buildDiverseUniverse(seed) {
  const leaders = STOCKS.filter(s => s.rating >= 75);
  const quality = STOCKS.filter(s => s.rating >= 70 && s.rating < 75);
  const medium = STOCKS.filter(s => s.rating >= 65 && s.rating < 70);
  const growth = STOCKS.filter(s => s.rating >= 60 && s.rating < 65);
  const oilLinked = STOCKS.filter(s => (s.oilCorr || 0) >= 0.55);

  // ✨ مولّد عشوائي ببذرة ثابتة (LCG -- Knuth) -- نفس البذرة تُنتج نفس العالم دائماً
  let _s = (typeof seed === 'number' && seed > 0) ? Math.floor(seed) : 20260101;
  function rnd() {
    _s = (_s * 1664525 + 1013904223) % 4294967296;
    return _s / 4294967296;
  }

  // ✨ Fisher-Yates -- خلط غير منحاز (sort بـrandom يعطي توزيعاً مشوّهاً)
  function pickRandom(arr, count) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, count);
  }

  const selected = [
    ...pickRandom(leaders, 10),
    ...pickRandom(quality, 10),
    ...pickRandom(medium, 10),
    ...pickRandom(growth, 10),
    ...pickRandom(oilLinked, 10),
  ];

  const seen = new Set();
  const unique = selected.filter(s => {
    if (seen.has(s.sym)) return false;
    seen.add(s.sym);
    return true;
  });

  if (unique.length < 50) {
    const remaining = STOCKS.filter(s => !seen.has(s.sym));
    const fill = pickRandom(remaining, 50 - unique.length);
    return [...unique, ...fill];
  }

  return unique.slice(0, 50);
}
export const STOCK_CATEGORIES = {
  diverse: {
    id: 'diverse',
    name: 'السوق المتنوّع',
    icon: '🌍',
    description: '٥٠ سهم متنوّعة (ثابتة لنفس البذرة)',
    color: '#10b981',
    filter: null,
  },
};

// دالة جلب أسهم فئة معينة
export function getStocksByCategory(categoryId, seed) {
  const category = STOCK_CATEGORIES[categoryId];
  if (!category) return [];

  // ✨ نمرّر البذرة لضمان قابلية التكرار
  if (categoryId === 'diverse') {
    return buildDiverseUniverse(seed);
  }

  return STOCKS.filter(category.filter);
}

// ═══════════════════════════════════════════════════════════
// 🏭 SECTORS -- القطاعات الرسمية من تاسي
// ═══════════════════════════════════════════════════════════

export const SECTORS = [
  { id:'banks',       name:'البنوك',                       color:'#4d9fff' },
  { id:'financial',   name:'الخدمات المالية',              color:'#a78bfa' },
  { id:'capgoods',    name:'السلع الرأسمالية',             color:'#78716c' },
  { id:'materials',   name:'المواد الأساسية',              color:'#f0c050' },
  { id:'energy',      name:'الطاقة',                       color:'#fbbf24' },
  { id:'utilities',   name:'المرافق العامة',               color:'#6ee7b7' },
  { id:'commercial',  name:'الخدمات التجارية والمهنية',    color:'#94a3b8' },
  { id:'transport',   name:'النقل',                        color:'#60a5fa' },
  { id:'durables',    name:'السلع طويلة الأجل',            color:'#fb7185' },
  { id:'services',    name:'الخدمات الإستهلاكية',          color:'#ffd878' },
  { id:'media',       name:'الإعلام والترفيه',             color:'#90a4c8' },
  { id:'retail',      name:'التجزئة',                      color:'#34d399' },
  { id:'foodretail',  name:'تجزئة الأغذية',                color:'#22d3ee' },
  { id:'household',   name:'المنتجات المنزلية والشخصية',   color:'#c4b5fd' },
  { id:'food',        name:'إنتاج الأغذية',                color:'#10b981' },
  { id:'healthcare',  name:'الرعاية الصحية',               color:'#f472b6' },
  { id:'pharma',      name:'الأدوية',                      color:'#e879f9' },
  { id:'realestate',  name:'إدارة وتطوير العقارات',        color:'#fb7185' },
  { id:'telecom',     name:'الإتصالات',                    color:'#22d3ee' },
  { id:'tech',        name:'التطبيقات وخدمات التقنية',     color:'#06b6d4' },
  { id:'insurance',   name:'التأمين',                      color:'#818cf8' },
];

export const SECTORS_EXTENDED = [...SECTORS];

// ═══════════════════════════════════════════════════════════
// 📈 INDICES -- المؤشرات الرئيسية
// ═══════════════════════════════════════════════════════════

export const INDICES = [
  { id:'TASI', name:'تاسي', sym:'TASI.SR', type:'main' },
  { id:'NOMU', name:'نمو',  sym:'NOMU.SR', type:'main' },
];

export default STOCKS;

// ═══════════════════════════════════════════════════════════
// 🔄 STOCKS_LIVE -- تبدأ فارغة وتُملأ من sahmk API
// ═══════════════════════════════════════════════════════════

export let STOCKS_LIVE = [];

export function updateLiveStocks(newStocks) {
  if (!Array.isArray(newStocks) || newStocks.length === 0) return;
  STOCKS_LIVE = newStocks;
}
