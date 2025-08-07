// background.js - 處理截圖請求

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureTab') {
    // 截取當前分頁
    chrome.tabs.captureVisibleTab(null, {format: 'png'}, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error('截圖失敗:', chrome.runtime.lastError);
        sendResponse({success: false, error: chrome.runtime.lastError.message});
      } else {
        console.log('截圖成功');
        sendResponse({success: true, dataUrl: dataUrl});
      }
    });
    return true; // 保持消息通道開放
  }
  
  if (request.action === 'captureArea') {
    // 截取整個頁面，讓content script處理裁切
    chrome.tabs.captureVisibleTab(null, {format: 'png'}, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error('區域截圖失敗:', chrome.runtime.lastError);
        sendResponse({success: false, error: chrome.runtime.lastError.message});
      } else {
        console.log('全頁截圖成功，返回給content script處理裁切');
        sendResponse({success: true, dataUrl: dataUrl, area: request.area});
      }
    });
    return true; // 保持消息通道開放
  }
});