import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { X, Hand, PenTool } from 'lucide-react';

interface HandWriterProps {
  onClose: () => void;
  onCursorMove: (x: number, y: number) => void;
  onDrawStart: () => void;
  onDrawEnd: () => void;
}

export default function HandWriter({ onClose, onCursorMove, onDrawStart, onDrawEnd }: HandWriterProps) {
  const webcamRef = useRef<Webcam>(null);
  const [isPinching, setIsPinching] = useState(false);
  const [debugInfo, setDebugInfo] = useState("Initializing...");

  // 🔒 KEEP LATEST CALLBACKS IN REFS (Fixes Stale Closure Bug)
  const propsRef = useRef({ onCursorMove, onDrawStart, onDrawEnd });
  
  // Update refs whenever props change
  useEffect(() => {
    propsRef.current = { onCursorMove, onDrawStart, onDrawEnd };
  }, [onCursorMove, onDrawStart, onDrawEnd]);

  const onResults = (results: Results) => {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      setDebugInfo("No hand detected");
      return;
    }

    const landmarks = results.multiHandLandmarks[0];

    // 📍 Landmarks
    const indexTip = landmarks[8];
    const thumbTip = landmarks[4];
    const wrist = landmarks[0];

    // 🖥️ Move Cursor (Mirror X)
    const x = (1 - indexTip.x) * window.innerWidth;
    const y = indexTip.y * window.innerHeight;
    
    // Call the LATEST callback
    propsRef.current.onCursorMove(x, y);

    // 📏 Adaptive Pinch
    const pinchDist = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
    const handSize = Math.hypot(indexTip.x - wrist.x, indexTip.y - wrist.y);

    // ⚡ EASIER THRESHOLD: Increased to 0.18 (Was 0.12)
    const THRESHOLD = 0.18; 
    const isPinchNow = pinchDist < (handSize * THRESHOLD);

    setDebugInfo(`Gap: ${(pinchDist/handSize).toFixed(2)} / ${THRESHOLD}`);

    if (isPinchNow) {
      if (!isPinching) {
        setIsPinching(true);
        propsRef.current.onDrawStart(); // Call LATEST
      }
    } else {
      if (isPinching) {
        setIsPinching(false);
        propsRef.current.onDrawEnd(); // Call LATEST
      }
    }
  };

  useEffect(() => {
    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    hands.onResults(onResults);

    if (webcamRef.current && webcamRef.current.video) {
      const camera = new Camera(webcamRef.current.video, {
        onFrame: async () => {
          if (webcamRef.current?.video) {
            await hands.send({ image: webcamRef.current.video });
          }
        },
        width: 320,
        height: 240,
      });
      camera.start();
    }
  }, []); // Run once on mount

  return (
    <div style={{
      position: 'fixed', bottom: '20px', right: '20px', width: '260px', 
      background: 'white', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', 
      zIndex: 99999, overflow: 'hidden', 
      border: isPinching ? '4px solid #16a34a' : '4px solid white',
      transition: 'border 0.2s'
    }}>
      <div style={{ padding: '8px', background: isPinching ? '#dcfce7' : '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee' }}>
        <div style={{display: 'flex', gap: '6px', alignItems: 'center', fontSize: '12px', fontWeight: 'bold', color: isPinching ? '#16a34a' : '#64748b'}}>
          {isPinching ? <PenTool size={14} /> : <Hand size={14} />} 
          {isPinching ? "WRITING!" : "Pinch to Write"}
        </div>
        <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={16}/></button>
      </div>
      <div style={{ position: 'relative', height: '180px' }}>
        <Webcam ref={webcamRef} mirrored={true} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        
        {/* Debug Info Overlay */}
        <div style={{position: 'absolute', bottom: 2, right: 5, fontSize: '10px', color: 'white', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px'}}>
          {debugInfo}
        </div>
        
        {/* Visual Helper for Pinch */}
        {isPinching && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            border: '2px solid #16a34a', borderRadius: '50%', width: '50px', height: '50px',
            boxShadow: '0 0 10px #16a34a'
          }} />
        )}
      </div>
    </div>
  );
}