import { calcSmartStopLoss, calcSmartTakeProfit } from '../engines/positionEngine';

export async function shareStockCard(stockData, stockSym, stockName, price, change) {
  try {
    if(!stockData) {
      alert('بيانات السهم غير متاحة');
      return;
    }
