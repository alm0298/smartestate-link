import React, { useState } from 'react';

function TestApp() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>SmartEstate Link - Test App</h1>
      <p style={{ color: 'green', fontWeight: 'bold' }}>
        React application is working correctly!
      </p>
      <p>Count: {count}</p>
      <button 
        onClick={() => setCount(count + 1)}
        style={{
          padding: '8px 16px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Increment
      </button>
    </div>
  );
}

export default TestApp; 