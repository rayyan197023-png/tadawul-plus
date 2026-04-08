/**
 * NEWS API SERVICE
 *
 * DATA STATUS: MOCK — all articles are static, not real-time
 *
 * To connect real news:
 *   1. Subscribe to EODHD news API or similar
 *   2. Set config.features.liveNews = true
 *   3. Uncomment the fetch() call below
 *
 * Mock data serves as realistic placeholder for UI development.
 * Do NOT show this data to users as real financial news.
 */

import config from '../../constants/config';

const MOCK_NEWS = [
  { id:'1', title:'أرامكو السعودية تعلن نتائج الربع الأول 2026', cat:'أرامكو', sym:'2222', time:'منذ 15 دقيقة', body:'أعلنت شركة أرامكو السعودية عن نتائج الربع الأول من عام 2026 محققةً أرباحاً صافية بلغت 27 مليار دولار، متجاوزةً توقعات المحللين.' },
  { id:'2', title:'مؤشر تاسي يرتفع بدعم قطاع البنوك', cat:'السوق', sym:'', time:'منذ 32 دقيقة', body:'ارتفع مؤشر تاسي في بداية التداول اليوم مدعوماً بمكاسب قطاع البنوك وارتفاع أسعار النفط عالمياً.' },
  { id:'3', title:'الراجحي يطلق خدمات الاستثمار الرقمي للأفراد', cat:'بنوك', sym:'1120', time:'منذ ساعة', body:'أطلق بنك الراجحي منصته الجديدة للاستثمار الرقمي التي تتيح للأفراد الاستثمار في الأسهم والصناديق.' },
  { id:'4', title:'سابك توقع اتفاقية شراكة استراتيجية آسيوية', cat:'بتروكيم', sym:'2010', time:'منذ 2 ساعة', body:'أعلنت سابك عن توقيع اتفاقية شراكة استراتيجية مع مجموعة صناعية آسيوية لتطوير مواد بتروكيماوية.' },
  { id:'5', title:'معادن تكشف عن اكتشاف جديد للذهب في الحجاز', cat:'تعدين', sym:'1211', time:'منذ 3 ساعات', body:'أعلنت شركة معادن عن اكتشاف احتياطيات ذهبية جديدة في منطقة الحجاز بطاقة إنتاجية واعدة.' },
  { id:'6', title:'STC تطلق خدمة 5G في 30 مدينة جديدة', cat:'تقنية', sym:'7010', time:'منذ 4 ساعات', body:'أعلنت شركة الاتصالات السعودية عن توسعة شبكة الجيل الخامس لتشمل 30 مدينة جديدة في المملكة.' },
  { id:'7', title:'أكوا باور تفوز بعقد تحلية مياه بالسعودية', cat:'طاقة', sym:'2082', time:'منذ 5 ساعات', body:'فازت شركة أكوا باور بعقد لإنشاء محطة تحلية مياه جديدة بطاقة إنتاجية تبلغ 500 ألف متر مكعب يومياً.' },
  { id:'8', title:'رؤية 2030: إطار زمني جديد لمشاريع التطوير', cat:'الاقتصاد', sym:'', time:'منذ 6 ساعات', body:'أعلنت الحكومة السعودية عن إطار زمني جديد لمشاريع التطوير الكبرى ضمن رؤية 2030 خلال السنوات القادمة.' },
];

/**
 * Fetch news articles
 * @param {{ category?, sym?, limit? }} options
 * @returns {Promise<Array>}
 */
export async function fetchNews({ category, sym, limit = 20 } = {}) {
  if (config.features.liveNews) {
    // INTEGRATION: Replace with Argaam API or EODHD news endpoint when available
    // const res = await fetch(`${config.newsApiUrl}/articles?sym=${sym}&limit=${limit}`);
    // return res.json();
  }

  let results = [...MOCK_NEWS];
  if (category && category !== 'كل الأخبار') results = results.filter(n => n.cat === category);
  if (sym) results = results.filter(n => n.sym === sym);
  return results.slice(0, limit);
}

export const NEWS_CATEGORIES = ['كل الأخبار', 'السوق', 'الاقتصاد', 'أرامكو', 'بنوك', 'بتروكيم', 'تعدين', 'تقنية', 'طاقة'];
