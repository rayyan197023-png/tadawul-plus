/**
 * @module engines/fundamentalModels
 * @description نماذج التحليل الأساسي (Factor Model, Earnings Model, DCF, Earnings Quality)
 * (منقولة من analysisEngine.ts كجزء من تقسيم الملف لموديولات)
 */

import { STOCKS_LIVE as STOCKS } from '../constants/stocksData';
import { MACRO, RADAR_SECTOR_PE } from './analysisEngine';

// ... محتوى الدوال الأربع كاملة كما هي ...

export { calcFactorModel, calcEarningsModel, calcDCF, calcEarningsQuality };
