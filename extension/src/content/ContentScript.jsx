import React from 'react';
import ReactDOM from 'react-dom/client';

// Component that will be injected into pages
const ContentApp = () => {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'changeColor') {
        // Toggle background color
        document.body.style.backgroundColor = 
          document.body.style.backgroundColor === 'lightcyan' ? '' : 'lightcyan';
        
        // Show/hide our component
        setVisible(!visible);
      }
    });
  }, [visible]);

  if (!visible) return null;

  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: '#764abc',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      zIndex: 10000,
      fontSize: '14px'
    }}>
      React Content Script Active!
    </div>,
    document.body
  );
};

// Inject our React component
const app = document.createElement('div');
app.id = 'react-chrome-extension';
document.body.appendChild(app);

const root = ReactDOM.createRoot(app);
root.render(<ContentApp />);