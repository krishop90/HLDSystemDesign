import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import ReactFlow, { 
  ReactFlowProvider, 
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  useReactFlow, 
  Panel,
  SelectionMode // 👈 Import this
} from 'reactflow'; 

import type { Node, Edge, Connection } from 'reactflow'; 
import 'reactflow/dist/style.css';
import axios from 'axios';
import { Loader2, Zap, Play, Pause, MousePointer2, Hand } from 'lucide-react'; // 👈 New Icons

import Sidebar from './Sidebar';
import { DatabaseNode, CircleNode, ImageNode, TextNode, DiamondNode, TriangleNode } from './CustomNodes';

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}

const FlowCanvas = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAnimated, setIsAnimated] = useState(true); 
  
  // 🛠️ TOOL STATE: 'pan' (Hand) or 'select' (Pointer)
  const [toolMode, setToolMode] = useState<'pan' | 'select'>('pan');

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const { screenToFlowPosition, setViewport, getNodes } = useReactFlow(); 

  const nodeTypes = useMemo(() => ({
    database: DatabaseNode,
    circle: CircleNode,
    diamond: DiamondNode, 
    triangle: TriangleNode, 
    imageNode: ImageNode,
    textNode: TextNode,
    default: DiamondNode 
  }), []);

  useEffect(() => {
    setEdges((eds) => 
      eds.map((edge) => ({
        ...edge,
        animated: isAnimated,
        style: { ...edge.style, strokeDasharray: edge.data?.isDashed ? "5,5" : "0" }
      }))
    );
  }, [isAnimated, setEdges]);

  const onConnect = useCallback((params: Connection | Edge) => {
    setEdges((eds) => addEdge({ ...params, animated: isAnimated, type: 'smoothstep', label: '' }, eds));
  }, [setEdges, isAnimated]);

  const generateDiagram = async () => {
    if (!topic) return;
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:8000/generate', { topic });
      setNodes(res.data.nodes);
      
      const formattedEdges = res.data.edges.map((e: any) => ({
        ...e,
        animated: isAnimated,
        style: { stroke: '#64748b', strokeWidth: 2, strokeDasharray: e.data?.isDashed ? "5,5" : "0" }
      }));
      setEdges(formattedEdges);
      setTimeout(() => setViewport({ x: 0, y: 0, zoom: 0.8 }), 100);
    } catch (error) {
      console.error("Failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const addStickerToCanvas = (iconName: string) => {
    const newNode: Node = {
      id: `sticker_${+new Date()}`,
      type: 'imageNode',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label: iconName, icon: iconName },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow/type');
      const label = event.dataTransfer.getData('application/reactflow/label');
      const icon = event.dataTransfer.getData('application/reactflow/icon');

      if (!type) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const existingNodes = getNodes();
      const targetNode = existingNodes.find(n => {
        const dx = Math.abs(n.position.x - position.x);
        const dy = Math.abs(n.position.y - position.y);
        return dx < 60 && dy < 60; 
      });

      if (targetNode) {
        const confirmReplace = window.confirm(`Replace node '${targetNode.data.label}' with this ${label}?`);
        if (confirmReplace) {
          const newNodeId = `swapped_${+new Date()}`;
          const newNode: Node = {
            id: newNodeId, type, position: targetNode.position, 
            data: { label: targetNode.data.label, icon: icon || label }, 
            style: targetNode.style
          };
          setEdges((eds) => eds.map((e) => {
            if (e.source === targetNode.id) return { ...e, source: newNodeId };
            if (e.target === targetNode.id) return { ...e, target: newNodeId };
            return e;
          }));
          setNodes((nds) => nds.map((n) => n.id === targetNode.id ? newNode : n));
          return; 
        }
      }

      const newNode: Node = {
        id: `dnd_${+new Date()}`, type, position,
        data: { label: label, icon: icon },
        style: type === 'textNode' ? { width: 200, height: 50 } : undefined
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes, setEdges, getNodes],
  );

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ padding: '12px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '16px', alignItems: 'center', background: 'white', zIndex: 10 }}>
        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <Zap size={24} fill="#2563eb" color="#2563eb" />
          <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>AI Geeks</span>
        </div>
        
        <input 
          type="text" 
          placeholder="Enter system..." 
          style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', width: '250px' }}
          value={topic} 
          onChange={(e) => setTopic(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && generateDiagram()}
        />
        
        <button onClick={generateDiagram} disabled={loading} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>
          {loading && <Loader2 className="spin" size={16} />} Generate
        </button>

        <div style={{ height: '24px', width: '1px', background: '#e2e8f0', margin: '0 8px' }}></div>

        {/* 🛠️ TOOL SWITCHER (Hand vs Pointer) */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '4px' }}>
          <button 
            onClick={() => setToolMode('pan')}
            title="Hand Tool (Pan)"
            style={{ 
              background: toolMode === 'pan' ? 'white' : 'transparent', 
              boxShadow: toolMode === 'pan' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
              border: 'none', borderRadius: '4px', padding: '6px', cursor: 'pointer', display: 'flex'
            }}
          >
            <Hand size={18} color={toolMode === 'pan' ? '#2563eb' : '#64748b'} />
          </button>
          <button 
            onClick={() => setToolMode('select')}
            title="Selection Tool (Drag to Select)"
            style={{ 
              background: toolMode === 'select' ? 'white' : 'transparent', 
              boxShadow: toolMode === 'select' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
              border: 'none', borderRadius: '4px', padding: '6px', cursor: 'pointer', display: 'flex'
            }}
          >
            <MousePointer2 size={18} color={toolMode === 'select' ? '#2563eb' : '#64748b'} />
          </button>
        </div>

        <div style={{ flex: 1 }}></div>

        <button 
          onClick={() => setIsAnimated(!isAnimated)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '20px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}
        >
          {isAnimated ? <Pause size={14} /> : <Play size={14} />}
          {isAnimated ? "Flow Active" : "Flow Paused"}
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', height: '100%' }}>
        <Sidebar onAddSticker={addStickerToCanvas} />
        <div className="reactflow-wrapper" ref={reactFlowWrapper} style={{ flex: 1, height: '100%', background: '#f8fafc' }}>
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect} nodeTypes={nodeTypes}
            onDrop={onDrop} onDragOver={onDragOver}
            deleteKeyCode={['Backspace', 'Delete']}
            fitView 
            
            // 👇 THE MAGIC PROPS FOR SELECTION
            panOnDrag={toolMode === 'pan'}        // If Hand: Drag moves canvas
            selectionOnDrag={toolMode === 'select'} // If Pointer: Drag selects nodes
            selectionMode={SelectionMode.Partial}   // Partial overlap counts as selected
            panOnScroll={true} // Allow panning with mouse wheel even in select mode
          >
            <Background gap={24} size={1} />
            <Controls />
            <Panel position="bottom-center" style={{ 
              background: 'white', padding: '8px 16px', borderRadius: '20px', 
              border: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' 
            }}>
              {toolMode === 'pan' ? '✋ Hand Mode: Drag to move canvas' : '⬚ Select Mode: Drag to select nodes'}
            </Panel>
          </ReactFlow>
        </div>
      </div>
      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};