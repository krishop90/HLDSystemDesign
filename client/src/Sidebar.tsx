import React, { useState } from 'react';
import { Image, Type, X, Square, Circle, Database, Hexagon, Triangle } from 'lucide-react';

// 🖼️ Define your available stickers here (must match filenames in public/icons)
const STICKER_LIST = [
  'mysql', 'redis', 'kafka', 'user', 'react', 'python', 'aws', 'docker', 'kubernetes', 'mongo', 'postgres', 'rabbitmq'
];

interface SidebarProps {
  onAddSticker: (icon: string) => void;
}

export default function Sidebar({ onAddSticker }: SidebarProps) {
  const [showStickers, setShowStickers] = useState(false);

  // 🚚 Drag Handler - Now supports passing 'icon' for stickers
  const onDragStart = (event: React.DragEvent, nodeType: string, label: string, icon?: string) => {
    event.dataTransfer.setData('application/reactflow/type', nodeType);
    event.dataTransfer.setData('application/reactflow/label', label);
    if (icon) {
      event.dataTransfer.setData('application/reactflow/icon', icon);
    }
    event.dataTransfer.effectAllowed = 'move';
  };

  const itemStyle = {
    padding: '10px',
    border: '1px solid #e2e8f0',
    marginBottom: '8px',
    cursor: 'grab',
    borderRadius: '6px',
    background: 'white',
    display: 'flex', 
    alignItems: 'center', 
    gap: '10px',
    fontSize: '13px',
    color: '#334155',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    transition: 'all 0.2s ease'
  };

  return (
    <aside style={{ width: '260px', padding: '16px', borderRight: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      
      <h3 style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: 'bold', color: '#94a3b8', marginBottom: '12px', letterSpacing: '0.5px' }}>Shapes</h3>

      {/* 🟦 Service (Square) */}
      <div onDragStart={(event) => onDragStart(event, 'default', 'Service')} draggable style={itemStyle}>
        <Square size={16} /> Service
      </div>

      {/* 🔷 Service (Diamond) */}
      <div onDragStart={(event) => onDragStart(event, 'diamond', 'Decision / Service')} draggable style={itemStyle}>
        <Hexagon size={16} style={{ transform: 'rotate(90deg)' }} /> Diamond Node
      </div>

      {/* ⚪ User (Circle) */}
      <div onDragStart={(event) => onDragStart(event, 'circle', 'User')} draggable style={itemStyle}>
        <Circle size={16} /> User / LB
      </div>

      {/* 🛢️ Database */}
      <div onDragStart={(event) => onDragStart(event, 'database', 'Database')} draggable style={itemStyle}>
        <Database size={16} /> Database
      </div>

      {/* 🔺 Triangle */}
      <div onDragStart={(event) => onDragStart(event, 'triangle', 'Logic')} draggable style={itemStyle}>
        <Triangle size={16} /> Logic / Trigger
      </div>

      {/* 📝 Text Tool */}
      <div onDragStart={(event) => onDragStart(event, 'textNode', 'Double click to edit')} draggable style={itemStyle}>
        <Type size={16} /> Resizable Text
      </div>

      <hr style={{margin: '16px 0', border: 'none', borderTop: '1px solid #e2e8f0'}} />
      
      <h3 style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: 'bold', color: '#94a3b8', marginBottom: '12px', letterSpacing: '0.5px' }}>Library</h3>

      {/* 🖼️ Sticker Library Button */}
      <button 
        onClick={() => setShowStickers(true)}
        style={{ ...itemStyle, width: '100%', cursor: 'pointer', background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8', justifyContent: 'center' }}
      >
        <Image size={18} /> Open Sticker Library
      </button>

      {/* 📂 The Sticker Modal (Popup) */}
      {showStickers && (
        <div style={{
          position: 'absolute', top: '10px', left: '270px', width: '320px',
          background: 'white', border: '1px solid #cbd5e1', borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', 
          zIndex: 100, padding: '16px', display: 'flex', flexDirection: 'column'
        }}>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center'}}>
            <span style={{fontWeight: 'bold', color: '#0f172a'}}>Select Sticker</span>
            <button onClick={() => setShowStickers(false)} style={{background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px'}}>
              <X size={18} color="#64748b" />
            </button>
          </div>
          
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px'}}>
            {STICKER_LIST.map((icon) => (
              <div 
                key={icon}
                draggable
                // 🚀 Enable dragging from library directly to canvas for swapping!
                onDragStart={(event) => onDragStart(event, 'imageNode', icon, icon)}
                onClick={() => { onAddSticker(icon); setShowStickers(false); }}
                style={{
                  padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px',
                  cursor: 'grab', textAlign: 'center', transition: 'all 0.2s',
                  background: '#f8fafc'
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
              >
                <img src={`/icons/${icon}.png`} alt={icon} style={{width: '100%', height: '32px', objectFit: 'contain', pointerEvents: 'none'}} 
                     onError={(e:any) => e.target.src='https://via.placeholder.com/40?text=?'}/>
                <div style={{fontSize: '9px', marginTop: '4px', color: '#475569', fontWeight: 500}}>{icon}</div>
              </div>
            ))}
          </div>
          <div style={{marginTop: '12px', fontSize: '10px', color: '#94a3b8', textAlign: 'center'}}>
            Drag to swap, or click to add
          </div>
        </div>
      )}

    </aside>
  );
}