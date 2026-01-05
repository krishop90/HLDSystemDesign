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
  SelectionMode
} from 'reactflow'; 

import type { Node, Edge, Connection } from 'reactflow'; 

import 'reactflow/dist/style.css';
import axios from 'axios';
import { toPng } from 'html-to-image';
import download from 'downloadjs';
import GIF from 'gif.js'; 
import { 
  Loader2, Zap, Play, Pause, MousePointer2, Hand, PenTool, Eraser, 
  Camera, Download, Film
} from 'lucide-react';

import Sidebar from './Sidebar';
import HandWriter from './HandWriter';
import { DatabaseNode, CircleNode, ImageNode, TextNode, DiamondNode, TriangleNode, AnnotationNode } from './CustomNodes';

// Define Node Types OUTSIDE component
const nodeTypes = {
  database: DatabaseNode,
  circle: CircleNode,
  diamond: DiamondNode, 
  triangle: TriangleNode, 
  imageNode: ImageNode,
  textNode: TextNode,
  annotation: AnnotationNode, 
  default: DiamondNode 
};

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}

const FlowCanvas = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  
  // 🌍 Global State
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAnimated, setIsAnimated] = useState(true); 
  const [toolMode, setToolMode] = useState<'pan' | 'select' | 'draw' | 'eraser'>('pan');
  const [gifLoading, setGifLoading] = useState(false);
  
  // ✋ Hand State
  const [showHandWriter, setShowHandWriter] = useState(false); 
  const [handCursor, setHandCursor] = useState<{x: number, y: number} | null>(null);

  // ✏️ Drawing State
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<number[][]>([]); 

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const { screenToFlowPosition, setViewport, getNodes } = useReactFlow(); 

  // 🎬 Animation Effect
  useEffect(() => {
    setEdges((eds) => eds.map((edge) => ({
      ...edge, 
      animated: isAnimated, 
      style: { 
        ...edge.style, 
        stroke: isAnimated ? '#2563eb' : '#64748b', 
        strokeWidth: 2, 
        strokeDasharray: isAnimated ? '5' : (edge.data?.isDashed ? '5,5' : '0'),
        strokeDashoffset: undefined 
      }
    })));
  }, [isAnimated, setEdges]);

  // 🛠️ HELPER: The "Nuclear Fix" for Black Patches
  // This function forces all SVG backgrounds to be White before capturing
  const fixSvgBackgrounds = (clonedDoc: Document) => {
    // 1. Find all Edge Text Backgrounds (The boxes behind text)
    const textBgs = clonedDoc.querySelectorAll('.react-flow__edge-text-bg');
    textBgs.forEach((bg) => {
      bg.setAttribute('fill', 'white'); // Force White
      bg.setAttribute('fill-opacity', '1');
    });

    // 2. Find all Text Elements and ensure they are Black
    const texts = clonedDoc.querySelectorAll('.react-flow__edge-text');
    texts.forEach((txt) => {
      txt.setAttribute('fill', 'black'); // Force Black Text
    });
  };

  // 🖼️ DOWNLOAD IMAGE (STATIC)
  const downloadImage = async () => {
    if (reactFlowWrapper.current === null) return;
    
    // Pause animation for static image
    const wasAnimated = isAnimated;
    setIsAnimated(false);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Filter UI
    const filter = (node: HTMLElement) => {
      const exclusionClasses = ['react-flow__controls', 'react-flow__panel', 'lucide', 'hand-writer-ui'];
      return !exclusionClasses.some((classname) => node.classList?.contains(classname));
    };

    try {
      const dataUrl = await toPng(reactFlowWrapper.current, { 
        cacheBust: true, 
        backgroundColor: '#ffffff', // Main background white
        filter: filter, 
        style: { transform: 'scale(1)' },
        // 👇 APPLY THE FIX HERE
        onClone: fixSvgBackgrounds
      });
      download(dataUrl, 'architecture-diagram-static.png');
    } catch (err) {
      console.error(err);
    } finally {
      if (wasAnimated) setIsAnimated(true);
    }
  };

  // 🎞️ DOWNLOAD GIF (ANIMATED with Fix)
  const downloadGif = async () => {
    if (reactFlowWrapper.current === null) return;
    setGifLoading(true);

    try {
      const gif = new GIF({
        workers: 2,
        quality: 10,
        workerScript: '/gif.worker.js',
        width: reactFlowWrapper.current.clientWidth,
        height: reactFlowWrapper.current.clientHeight,
        background: '#ffffff'
      });

      const frames = 20; 
      const step = 1;    

      for (let i = 0; i < frames; i++) {
        // Manually move lines
        setEdges((eds) => eds.map((e) => ({
          ...e,
          animated: true, 
          style: { 
            ...e.style, 
            stroke: '#2563eb', 
            strokeDasharray: '5',
            strokeDashoffset: -i * step 
          }
        })));

        await new Promise(r => setTimeout(r, 50));

        // Capture Frame with FIX
        const dataUrl = await toPng(reactFlowWrapper.current, {
          cacheBust: true,
          backgroundColor: '#ffffff',
          filter: (node) => !['react-flow__controls', 'react-flow__panel', 'hand-writer-ui'].some(c => node.classList?.contains(c)),
          onClone: fixSvgBackgrounds // 👈 Fix applied to every frame
        });

        const img = new Image();
        img.src = dataUrl;
        await new Promise(resolve => img.onload = resolve);
        gif.addFrame(img, { delay: 100 });
      }

      gif.on('finished', (blob: Blob) => {
        download(blob, 'architecture-flow.gif');
        setGifLoading(false);
        setIsAnimated(true); 
      });

      gif.render();
    } catch (err) {
      console.error("GIF Error:", err);
      setGifLoading(false);
      setIsAnimated(true); 
    }
  };

  // ✍️ DRAWING HANDLERS
  const startDrawing = (x: number, y: number) => {
    if (toolMode !== 'draw') return;
    setIsDrawing(true);
    const bounds = reactFlowWrapper.current?.getBoundingClientRect();
    const relativeX = x - (bounds?.left || 0);
    const relativeY = y - (bounds?.top || 0);
    setCurrentPoints([[relativeX, relativeY]]);
  };

  const moveDrawing = (x: number, y: number) => {
    if (!isDrawing || toolMode !== 'draw') return;
    const bounds = reactFlowWrapper.current?.getBoundingClientRect();
    const relativeX = x - (bounds?.left || 0);
    const relativeY = y - (bounds?.top || 0);
    setCurrentPoints((pts) => [...pts, [relativeX, relativeY]]);
  };

  const finishDrawing = () => {
    setIsDrawing(false);
    if (currentPoints.length < 2) return;
    
    const flowPoints = currentPoints.map(p => {
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      const screenX = p[0] + (bounds?.left || 0);
      const screenY = p[1] + (bounds?.top || 0);
      const flowPos = screenToFlowPosition({ x: screenX, y: screenY });
      return [flowPos.x, flowPos.y];
    });

    const xs = flowPoints.map(p => p[0]); const ys = flowPoints.map(p => p[1]);
    const minX = Math.min(...xs); const minY = Math.min(...ys);
    const width = Math.max(Math.max(...xs) - minX, 1); const height = Math.max(Math.max(...ys) - minY, 1);
    const svgPath = `M ${flowPoints.map(p => `${p[0] - minX},${p[1] - minY}`).join(' L ')}`;
    
    const newNode: Node = {
      id: `stroke_${+new Date()}`, type: 'annotation', position: { x: minX, y: minY },
      data: { path: svgPath, width, height, color: '#ef4444' }, style: { zIndex: 9999, pointerEvents: 'none' } 
    };
    setNodes((nds) => nds.concat(newNode)); setCurrentPoints([]);
  };

  // Input Handlers
  const onMouseDown = (e: React.MouseEvent) => startDrawing(e.clientX, e.clientY);
  const onMouseMove = (e: React.MouseEvent) => moveDrawing(e.clientX, e.clientY);
  const onMouseUp = () => finishDrawing();

  const onHandCursorMove = useCallback((x: number, y: number) => {
    setHandCursor({ x, y });
    if (isDrawing) moveDrawing(x, y);
  }, [isDrawing]); 
  
  const onHandDrawStart = useCallback(() => {
    if (!handCursor) return;
    setToolMode('draw'); 
    startDrawing(handCursor.x, handCursor.y);
  }, [handCursor]);
  
  const onHandDrawEnd = useCallback(() => { finishDrawing(); }, [currentPoints]);

  const onConnect = useCallback((params: Connection | Edge) => {
    setEdges((eds) => addEdge({ ...params, animated: isAnimated, type: 'smoothstep', label: '' }, eds));
  }, [setEdges, isAnimated]);
  
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (toolMode === 'eraser') setNodes((nds) => nds.filter((n) => n.id !== node.id));
  }, [toolMode, setNodes]);
  
  const generateDiagram = async () => {
    if (!topic) return; setLoading(true);
    try {
      const res = await axios.post('http://localhost:8000/generate', { topic });
      setNodes(res.data.nodes);
      const formattedEdges = res.data.edges.map((e: any) => ({ ...e, animated: isAnimated, style: { stroke: '#64748b', strokeWidth: 2, strokeDasharray: e.data?.isDashed ? "5,5" : "0" } }));
      setEdges(formattedEdges); setTimeout(() => setViewport({ x: 0, y: 0, zoom: 0.8 }), 100);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };
  
  const addStickerToCanvas = (iconName: string) => {
    const newNode: Node = { id: `sticker_${+new Date()}`, type: 'imageNode', position: { x: Math.random() * 400, y: Math.random() * 400 }, data: { label: iconName, icon: iconName } };
    setNodes((nds) => nds.concat(newNode));
  };
  
  const onDragOver = (e: any) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  
  const onDrop = (e: any) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/reactflow/type'); const label = e.dataTransfer.getData('application/reactflow/label'); const icon = e.dataTransfer.getData('application/reactflow/icon');
    if (!type) return;
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const existingNodes = getNodes();
    const targetNode = existingNodes.find(n => { const dx = Math.abs(n.position.x - position.x); const dy = Math.abs(n.position.y - position.y); return dx < 60 && dy < 60; });
    if (targetNode && window.confirm(`Replace node '${targetNode.data.label}' with this ${label}?`)) {
      const newNodeId = `swapped_${+new Date()}`;
      const newNode: Node = { id: newNodeId, type, position: targetNode.position, data: { label: targetNode.data.label, icon: icon || label }, style: targetNode.style };
      setEdges((eds) => eds.map((e) => { if (e.source === targetNode.id) return { ...e, source: newNodeId }; if (e.target === targetNode.id) return { ...e, target: newNodeId }; return e; }));
      setNodes((nds) => nds.map((n) => n.id === targetNode.id ? newNode : n)); return; 
    }
    const newNode: Node = { id: `dnd_${+new Date()}`, type, position, data: { label: label, icon: icon }, style: type === 'textNode' ? { width: 200, height: 50 } : undefined };
    setNodes((nds) => nds.concat(newNode));
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {showHandWriter && (
        <>
          <HandWriter onClose={() => setShowHandWriter(false)} onCursorMove={onHandCursorMove} onDrawStart={onHandDrawStart} onDrawEnd={onHandDrawEnd} />
          {handCursor && <div style={{ position: 'fixed', left: handCursor.x, top: handCursor.y, width: '12px', height: '12px', background: 'red', borderRadius: '50%', zIndex: 999999, pointerEvents: 'none', transform: 'translate(-50%, -50%)', border: '2px solid white', boxShadow: '0 0 5px rgba(0,0,0,0.5)' }} />}
        </>
      )}

      <div style={{ padding: '12px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '16px', alignItems: 'center', background: 'white', zIndex: 10 }}>
        <Zap size={24} fill="#2563eb" color="#2563eb" />
        <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>AI Architect</span>
        
        <input type="text" placeholder="Enter system..." style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', width: '200px' }} value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && generateDiagram()}/>
        <button onClick={generateDiagram} disabled={loading} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>{loading ? <Loader2 className="spin" size={16} /> : "Gen"}</button>

        <div style={{ width: 1, height: 24, background: '#eee' }}></div>

        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '4px', gap: '2px' }}>
          <ToolBtn icon={Hand} mode="pan" current={toolMode} set={setToolMode} title="Pan" />
          <ToolBtn icon={MousePointer2} mode="select" current={toolMode} set={setToolMode} title="Select" />
          <ToolBtn icon={PenTool} mode="draw" current={toolMode} set={setToolMode} title="Draw" />
          <ToolBtn icon={Eraser} mode="eraser" current={toolMode} set={setToolMode} title="Erase" />
        </div>

        <button onClick={() => setShowHandWriter(!showHandWriter)} title="Air Write" style={{ background: showHandWriter ? '#dcfce7' : 'white', border: '1px solid #ddd', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}> <Camera size={18} color="#16a34a" /> </button>

        <div style={{ flex: 1 }}></div>

        <button onClick={downloadImage} title="Download PNG (Static)" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}> <Download size={20} color="#334155" /> </button>
        <button onClick={downloadGif} disabled={gifLoading} title="Download GIF (Animated)" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}> {gifLoading ? <Loader2 className="spin" size={20} color="#f59e0b" /> : <Film size={20} color="#f59e0b" />} </button>

        <button onClick={() => setIsAnimated(!isAnimated)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '20px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>
          {isAnimated ? <Pause size={14} /> : <Play size={14} />} {isAnimated ? "Flow" : "Stop"}
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', height: '100%' }}>
        <Sidebar onAddSticker={addStickerToCanvas} />
        <div 
          className="reactflow-wrapper" ref={reactFlowWrapper} 
          style={{ flex: 1, height: '100%', background: '#f8fafc', cursor: toolMode === 'draw' ? 'crosshair' : toolMode === 'eraser' ? 'cell' : 'default' }}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
        >
          <ReactFlow
            nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} 
            nodeTypes={nodeTypes} onDrop={onDrop} onDragOver={onDragOver} onNodeClick={onNodeClick} 
            deleteKeyCode={['Backspace', 'Delete']} fitView 
            panOnDrag={toolMode === 'pan'} selectionOnDrag={toolMode === 'select'} selectionMode={SelectionMode.Partial} panOnScroll={true} zoomOnScroll={toolMode !== 'draw'} 
          >
            {isDrawing && toolMode === 'draw' && (
              <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 99999, overflow: 'visible' }}>
                  <path d={`M ${currentPoints.map(p => `${p[0]},${p[1]}`).join(' L ')}`} fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
              </svg>
            )}
            <Background gap={24} size={1} />
            <Controls />
            <Panel position="bottom-center" style={{ background: 'white', padding: '8px 16px', borderRadius: '20px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px' }}>
              {showHandWriter ? '✋ Hand Mode: Pinch to Write' : toolMode === 'draw' ? '✏️ Drawing Mode' : toolMode === 'eraser' ? '🧽 Eraser Mode' : 'Select tools above'}
            </Panel>
          </ReactFlow>
        </div>
      </div>
      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const ToolBtn = ({ icon: Icon, mode, current, set, title }: any) => (
  <button onClick={() => set(mode)} title={title} style={{ background: current === mode ? 'white' : 'transparent', boxShadow: current === mode ? '0 1px 2px rgba(0,0,0,0.1)' : 'none', color: current === mode ? '#2563eb' : '#64748b', border: 'none', borderRadius: '4px', padding: '6px', cursor: 'pointer', display: 'flex' }}><Icon size={18} /></button>
);