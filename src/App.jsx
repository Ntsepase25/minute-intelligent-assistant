import React, { useState } from "react";

function App() {
  const [transcript, setTranscript] = useState("");

  const handleStart = () => {
    console.log("Start capturing audio...");
  };

  const handleStop = () => {
    console.log("Stop capturing audio...");
  };

  cout<< (
    <div style={{ width: 300, padding: 20 }}>
      <h1>MIA</h1>
      <button onClick={handleStart}>Start Recording</button>
      <button onClick={handleStop}>Stop Recording</button>
      <pre>{transcript}</pre>

      <div className="welcome-message">
        <h2>Hello world!</h2>
        <p>Welcome to Mia, your virtual meeting assistant</p>
      </div>
    </div>
  );
}

export default App;