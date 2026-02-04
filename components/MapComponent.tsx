import React, { useMemo, useState, useRef, useEffect } from 'react';
import ReactFlow, {
  Background,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';

// Importiamo gli stili
import './Map.css'; 
import './Timeline.css'; 

// --- CONFIGURAZIONE LAYOUT ---
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 250;
const nodeHeight = 140;

const getLayoutedElements = (nodes: any[], edges: any[]) => {
  dagreGraph.setGraph({ rankdir: 'TB' }); 
  
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });
  
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });
  
  dagre.layout(dagreGraph);
  
  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = Position.Top;
    node.sourcePosition = Position.Bottom;
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
  });
  
  return { nodes, edges };
};

// --- NODO CUSTOM ---
const CustomNode = ({ data }: any) => {
  const isRoot = data.isRoot;
  const borderStyle = isRoot ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.2)';
  const bgStyle = isRoot 
    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.4) 0%, rgba(30, 27, 75, 0.9) 100%)' 
    : 'rgba(18, 18, 28, 0.85)';
  
  return (
    <div 
      className="react-flow__node-custom jarvis-ar-node" 
      style={{ 
        border: borderStyle, 
        background: bgStyle,
        width: '240px', 
        padding: '15px',
        borderRadius: '12px',
        color: 'white',
        textAlign: 'center',
        boxShadow: isRoot 
          ? '0 0 30px rgba(99, 102, 241, 0.6), inset 0 0 20px rgba(99, 102, 241, 0.2)'
          : '0 0 20px rgba(99, 102, 241, 0.3), inset 0 0 15px rgba(99, 102, 241, 0.1)',
        backdropFilter: 'blur(10px)',
        fontSize: '0.9rem',
        transition: 'all 0.3s'
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#6366f1' }} />
      <div style={{ fontWeight: 'bold', marginBottom: '8px', color: data.color || '#fff', fontSize: isRoot ? '1.1rem' : '0.95rem' }}>
        {data.label}
      </div>
      {data.desc && (
        <div style={{ fontSize: '0.75rem', opacity: 0.8, lineHeight: '1.4', maxHeight: '80px', overflowY: 'auto' }}>
          {data.desc}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: '#6366f1' }} />
    </div>
  );
};

interface MapProps {
  rawText: string;
  sidebarCollapsed?: boolean;
}

const MapComponent: React.FC<MapProps> = ({ rawText, sidebarCollapsed = false }) => {
  // --- STATI DI MEMORIA (BUFFER) ---
  // Memorizziamo l'ultimo stato valido per non mostrare errori mentre l'AI scrive
  const [lastValidNodes, setLastValidNodes] = useState<any[]>([]);
  const [lastValidEdges, setLastValidEdges] = useState<any[]>([]);

  // Stati ReactFlow
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Stati Finestra - Dimensioni adattive al workspace ROI
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [rfInstance, setRfInstance] = useState<any>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, startW: 0, startH: 0 });

  const startDrag = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.nodrag')) return;
    e.preventDefault(); setIsDragging(true);
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };
  
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsResizing(true);
    resizeStartRef.current = { x: e.clientX, y: e.clientY, startW: size.w, startH: size.h };
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (isDragging) setPosition({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
      if (isResizing) {
         setSize({ 
           w: Math.max(400, resizeStartRef.current.startW + (e.clientX - resizeStartRef.current.x)), 
           h: Math.max(300, resizeStartRef.current.startH + (e.clientY - resizeStartRef.current.y)) 
         });
      }
    };
    const handleUp = () => { setIsDragging(false); setIsResizing(false); };
    if (isDragging || isResizing) { window.addEventListener('mousemove', handleMove); window.addEventListener('mouseup', handleUp); }
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [isDragging, isResizing]);

  useEffect(() => {
    if (rfInstance) {
      window.requestAnimationFrame(() => {
        rfInstance.fitView({ padding: 0.2, duration: 200 });
      });
    }
  }, [size, rfInstance]);

  // --- PARSER CORAZZATO ---
  // Analizza il testo e aggiorna la mappa SOLO se i dati sono validi
  useEffect(() => {
     const parseAndSetData = () => {
        const rootId = 'root';
        let newNodes: any[] = [];
        let newEdges: any[] = [];
        let isValidUpdate = false;
        
        const createNode = (id: string, label: string, desc: string, isRoot = false) => ({
           id, 
           type: 'custom', 
           data: { label, desc, isRoot, color: isRoot ? '#a5b4fc' : '#34d399' }, 
           position: { x: 0, y: 0 } 
        });

        const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // Caso 1: Sembra JSON (inizia con graffa)
        if (cleanJson.startsWith('{')) {
            try {
                // Cerchiamo di estrarre il JSON valido più grande possibile
                const firstBrace = cleanJson.indexOf('{');
                const lastBrace = cleanJson.lastIndexOf('}');
                
                if (firstBrace !== -1 && lastBrace !== -1) {
                    const jsonString = cleanJson.substring(firstBrace, lastBrace + 1);
                    const data = JSON.parse(jsonString);

                    // Se siamo qui, il JSON è valido!
                    const rootLabel = data.main || data.title || "Argomento";
                    newNodes.push(createNode(rootId, rootLabel, "Concetto Principale", true));

                    if (Array.isArray(data.nodes)) {
                        data.nodes.forEach((item: any, idx: number) => {
                            const childId = `child-${idx}`;
                            const label = item.title || item.label || `Punto ${idx+1}`;
                            const desc = item.detail || item.desc || "";
                            newNodes.push(createNode(childId, label, desc));
                            newEdges.push({ id: `e-${rootId}-${childId}`, source: rootId, target: childId, animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } });
                        });
                    }
                    isValidUpdate = true;
                }
            } catch (e) {
                // JSON incompleto (streaming in corso) -> IGNORA E ASPETTA
                // Non facciamo nulla, teniamo la mappa vecchia
                console.log("Waiting for complete JSON...");
                return; 
            }
        } 
        // Caso 2: Testo Semplice (Fallback)
        else {
            const lines = rawText.split('\n').filter(l => l.trim().length > 0);
            if (lines.length > 0) {
                 let title = lines[0].length < 60 ? lines[0] : "Concetto";
                 newNodes.push(createNode(rootId, title, "", true));
                 const childLines = lines.filter(l => l !== title).slice(0, 6);
                 childLines.forEach((line, idx) => {
                    const id = `child-${idx}`;
                    const words = line.split(' ');
                    const label = words.slice(0, 4).join(' ') + (words.length > 4 ? '...' : '');
                    newNodes.push(createNode(id, label, line));
                    newEdges.push({ id: `e-${rootId}-${id}`, source: rootId, target: id, animated: true, style: { stroke: '#34d399' } });
                 });
                 isValidUpdate = true;
            }
        }

        // Se abbiamo dati validi, calcoliamo il layout e aggiorniamo
        if (isValidUpdate && newNodes.length > 0) {
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges);
            setLastValidNodes(layoutedNodes);
            setLastValidEdges(layoutedEdges);
            setNodes(layoutedNodes);
            setEdges(layoutedEdges);
            
            if (rfInstance) {
                setTimeout(() => rfInstance.fitView({ padding: 0.2, duration: 500 }), 100);
            }
        }
     };

     parseAndSetData();
  }, [rawText, rfInstance, setNodes, setEdges]);

  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  return (
    <div 
      className="jarvis-ar-tool timeline-card" 
      style={{ 
        left: position.x, top: position.y, width: size.w, height: size.h,
        display: 'flex', flexDirection: 'column',
        position: 'absolute', 
        zIndex: 1000,
        borderRadius: '1rem',
        pointerEvents: 'auto'
      }}
    >
      <div className="jarvis-ar-header timeline-header" onMouseDown={startDrag}>
        <h3 className="jarvis-icon-glow">Mappa Concettuale ✥</h3>
      </div>
      
      <div className="jarvis-ar-body" style={{ flex: 1, position: 'relative', background: 'transparent' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          onInit={setRfInstance} 
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#aaa" gap={20} size={1} style={{ opacity: 0.05 }} />
        </ReactFlow>
      </div>

      <div className="jarvis-ar-resize-handle resize-handle" onMouseDown={startResize} />
    </div>
  );
};

export default MapComponent;