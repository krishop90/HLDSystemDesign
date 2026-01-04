import { useState, useCallback, useRef, useMemo } from 'react';
import ReactFlow, { 
  ReactFlowProvider,
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState,
  addEdge,
  useReactFlow,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
import { Loader2, Zap } from 'lucide-react';

import Sidebar from './Sidebar';
import { DatabaseNode, CircleNode, ImageNode, TextNode } from './CustomNodes';

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
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const { screenToFlowPosition, setViewport } = useReactFlow(); 

  const nodeTypes = useMemo(() => ({
    database: DatabaseNode,
    circle: CircleNode,
    imageNode: ImageNode,
    textNode: TextNode,
    default: CircleNode
  }), []);

  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const generateDiagram = async () => {
    if (!topic) return;
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:8000/generate', { topic });
      setNodes(res.data.nodes);
      setEdges(res.data.edges);
    
      setTimeout(() => setViewport({ x: 0, y: 0, zoom: 1 }), 100);
    } catch (error) {
      console.error("Failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const addStickerToCanvas = (iconName: string) => {
    const newNode = {
      id: `sticker_${+new Date()}`,
      type: 'imageNode',
      position: { x: 100, y: 100 },
      data: { label: iconName, icon: iconName },
    };
    setNodes((nds) => nds.concat(newNode));
  };
  const onDragOver = useCallback((event: any) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: any) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow/type');
      const label = event.dataTransfer.getData('application/reactflow/label');

      if (!type) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      const newNode = {
        id: `dnd_${+new Date()}`,
        type,
        position,
        data: { label: label },
        style: type === 'textNode' ? { width: 200, height: 50 } : undefined
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes],
  );

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid #ddd', display: 'flex', gap: '12px', alignItems: 'center', background: 'white', zIndex: 10 }}>
        <Zap size={24} fill="#2563eb" color="#2563eb" />
        <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2563eb' }}>AI Architect</span>
        <input 
          type="text" 
          placeholder="Enter topic..." 
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', width: '300px' }}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && generateDiagram()}
        />
        <button onClick={generateDiagram} disabled={loading} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', display: 'flex', gap: '8px' }}>
          {loading ? "Generating..." : "Generate"}
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', height: '100%' }}>
        {/* Pass the addSticker function to Sidebar */}
        <Sidebar onAddSticker={addStickerToCanvas} />

        <div className="reactflow-wrapper" ref={reactFlowWrapper} style={{ flex: 1, height: '100%', position: 'relative' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onDrop={onDrop}
            onDragOver={onDragOver}
            fitView 
          >
            <Background gap={20} size={1} />
            <Controls />
            <Panel position="top-right" style={{color: '#888', fontSize: '12px'}}>
              Double-click nodes to edit text
            </Panel>
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};