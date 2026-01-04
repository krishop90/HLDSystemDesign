import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';

const EditableLabel = ({ value, onChange, istextNode = false }: any) => {
  const [text, setText] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [text]);

  return (
    <textarea
      ref={textareaRef}
      className="nodrag"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(e.target.value);
      }}
      placeholder="Type..."
      style={{
        width: '100%',
        background: 'transparent',
        border: 'none',
        resize: 'none',
        textAlign: 'center',
        color: '#333',
        fontSize: istextNode ? '16px' : '10px',
        fontWeight: istextNode ? 'bold' : 'normal',
        outline: 'none',
        overflow: 'hidden',
        pointerEvents: 'all'
      }}
    />
  );
};

export const DatabaseNode = ({ data }: any) => {
  return (
    <div style={{ width: '60px', minHeight: '80px', background: 'white', border: '2px solid #333', borderRadius: '10px / 20px', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '15px' }}>
      <div style={{ position: 'absolute', top: '-10px', width: '100%', height: '20px', background: 'white', border: '2px solid #333', borderRadius: '50%' }} />
      <div style={{ padding: '5px', width: '100%', zIndex: 5 }}>
        <EditableLabel value={data.label} onChange={(val: string) => data.label = val} />
      </div>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export const CircleNode = ({ data }: any) => {
  return (
    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'white', border: '2px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', overflow: 'hidden' }}>
      <EditableLabel value={data.label} onChange={(val: string) => data.label = val} />
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export const ImageNode = ({ data }: any) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '80px' }}>
      <div style={{ width: '60px', height: '60px', background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={`/icons/${data.icon}.png`} alt="sticker" style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
             onError={(e:any) => e.target.src='https://via.placeholder.com/50?text=?'}/>
      </div>
      <div style={{ marginTop: '5px', background: 'rgba(255,255,255,0.8)', padding: '2px 5px', borderRadius: '4px' }}>
        <EditableLabel value={data.label} onChange={(val: string) => data.label = val} />
      </div>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export const TextNode = ({ data, selected }: any) => {
  return (
    <>
      <NodeResizer color="#2563eb" isVisible={selected} minWidth={100} minHeight={50} />
      <div style={{ width: '100%', height: '100%', background: 'transparent', border: selected ? '1px dashed #2563eb' : 'none', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <EditableLabel value={data.label} onChange={(val: string) => data.label = val} istextNode={true} />
      </div>
    </>
  );
};