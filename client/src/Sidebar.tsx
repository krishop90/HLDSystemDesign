import React, { useState } from 'react';
import { Image, Type, X } from 'lucide-react';

const STICKER_LIST = [
  'mysql', 'redis', 'kafka', 'user', 'react', 'python', 'aws', 'docker'
];

export default function Sidebar({ onAddSticker }: { onAddSticker: (icon: string) => void }) {
  const [showStickers, setShowStickers] = useState(false);

  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow/type', nodeType);
    event.dataTransfer.setData('application/reactflow/label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  const itemStyle = {
    padding: '10px',
    border: '1px solid #ddd',
    marginBottom: '10px',
    cursor: 'grab',
    borderRadius: '8px',
    background: 'white',
    display: 'flex', alignItems: 'center', gap: '8px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
  };

  return (
    <aside style={{ width: '260px', padding: '15px', borderRight: '1px solid #eee', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative' }}>
      
      <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#555', marginBottom: '10px' }}>Toolbox</h3>

      <div onDragStart={(event) => onDragStart(event, 'default', 'Service')} draggable style={itemStyle}>
        <div style={{width: 20, height: 20, border: '1px solid #333', borderRadius: 4}}></div> Service
      </div>

      <div onDragStart={(event) => onDragStart(event, 'circle', 'User')} draggable style={itemStyle}>
        <div style={{width: 20, height: 20, border: '1px solid #333', borderRadius: '50%'}}></div> User / LB
      </div>

      <div onDragStart={(event) => onDragStart(event, 'database', 'Database')} draggable style={itemStyle}>
        <div style={{width: 20, height: 25, border: '1px solid #333', borderRadius: '5px/10px'}}></div> Database
      </div>

      <div onDragStart={(event) => onDragStart(event, 'textNode', 'Double click to edit')} draggable style={itemStyle}>
        <Type size={18} /> Resizable Text
      </div>

      <hr style={{margin: '10px 0', border: 'none', borderTop: '1px solid #eee'}} />

      <button 
        onClick={() => setShowStickers(true)}
        style={{ ...itemStyle, cursor: 'pointer', background: '#e0f2fe', borderColor: '#bae6fd', color: '#0369a1', justifyContent: 'center' }}
      >
        <Image size={18} /> Open Sticker Library
      </button>

      {showStickers && (
        <div style={{
          position: 'absolute', top: '10px', left: '270px', width: '300px',
          background: 'white', border: '1px solid #ddd', borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', zIndex: 100, padding: '15px'
        }}>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
            <span style={{fontWeight: 'bold'}}>Select Sticker</span>
            <X size={18} style={{cursor: 'pointer'}} onClick={() => setShowStickers(false)} />
          </div>
          
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px'}}>
            {STICKER_LIST.map((icon) => (
              <div 
                key={icon}
                onClick={() => { onAddSticker(icon); setShowStickers(false); }}
                style={{
                  padding: '5px', border: '1px solid #eee', borderRadius: '8px',
                  cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = '#2563eb'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = '#eee'}
              >
                <img src={`/icons/${icon}.png`} alt={icon} style={{width: '100%', height: '40px', objectFit: 'contain'}} 
                     onError={(e:any) => e.target.src='https://via.placeholder.com/40'}/>
                <div style={{fontSize: '9px', marginTop: '4px'}}>{icon}</div>
              </div>
            ))}
          </div>
        </div>
      )}

    </aside>
  );
}