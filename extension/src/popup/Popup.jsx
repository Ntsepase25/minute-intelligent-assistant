import React, { useState, useEffect } from 'react';
import './Popup.css';

const Popup = () => {
  const [count, setCount] = useState(0);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    // Get current tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      setCurrentUrl(tabs[0].url);
    });

    // Load saved count from storage
    chrome.storage.local.get(['count'], (result) => {
      setCount(result.count || 0);
    });
  }, []);

  const incrementCount = () => {
    const newCount = count + 1;
    setCount(newCount);
    chrome.storage.local.set({ count: newCount });
  };

  const changePageColor = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'changeColor' });
    });
  };

  return (
    <div className="popup-container">
      <h1>React Chrome Extension</h1>
      <div className="counter">
        <p>Count: {count}</p>
        <button onClick={incrementCount}>Increment</button>
      </div>
      <div className="current-url">
        <p>Current URL:</p>
        <small>{currentUrl}</small>
      </div>
      <button onClick={changePageColor} className="color-btn">
        Change Page Color
      </button>
    </div>
  );
};

export default Popup;