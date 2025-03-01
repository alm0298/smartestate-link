import { useState } from 'react';

function TestApp() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px'
    }}>
      <header style={{ 
        backgroundColor: '#333',
        color: 'white',
        padding: '20px',
        marginBottom: '20px',
        borderRadius: '5px'
      }}>
        <h1>SmartEstate Link</h1>
        <p>Property Management System</p>
      </header>

      <div style={{ 
        backgroundColor: '#f5f5f5',
        padding: '20px',
        borderRadius: '5px',
        marginBottom: '20px'
      }}>
        <h2>React Application is Working!</h2>
        <p>This is a simplified version of the application that doesn't require authentication.</p>
        <p>
          <button 
            onClick={() => setCount(count + 1)}
            style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Count: {count}
          </button>
        </p>
      </div>

      <div style={{ 
        border: '1px solid #ddd',
        borderRadius: '5px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h2>Sample Properties</h2>
        {[
          { id: 1, address: '123 Main St', price: '$350,000', type: 'Single Family' },
          { id: 2, address: '456 Oak Ave', price: '$425,000', type: 'Townhouse' },
          { id: 3, address: '789 Pine Rd', price: '$550,000', type: 'Condo' }
        ].map(property => (
          <div key={property.id} style={{ 
            border: '1px solid #ddd',
            borderRadius: '5px',
            padding: '15px',
            marginBottom: '10px'
          }}>
            <h3>{property.address}</h3>
            <p>Price: {property.price}</p>
            <p>Type: {property.type}</p>
            <button
              style={{
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              View Details
            </button>
          </div>
        ))}
      </div>

      <footer style={{ 
        textAlign: 'center',
        padding: '20px',
        borderTop: '1px solid #ddd',
        marginTop: '20px'
      }}>
        <p>SmartEstate Link &copy; 2025</p>
      </footer>
    </div>
  );
}

export default TestApp; 