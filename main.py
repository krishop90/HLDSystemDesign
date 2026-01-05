import warnings
warnings.simplefilter("ignore", FutureWarning) # 🔇 Silence the Google warning

print("⏳ Importing libraries...")
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import google.generativeai as genai
import graphviz
import json

print("✅ Libraries imported successfully.")

# 1. Load Keys
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("❌ ERROR: GEMINI_API_KEY not found in .env file!")
else:
    print("🔑 API Key found.")
    genai.configure(api_key=api_key)

app = FastAPI()
print("🚀 Starting FastAPI app...")
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TopicRequest(BaseModel):
    topic: str

# --- REPLACE THIS FUNCTION IN main.py ---

# --- REPLACE THIS ENTIRE FUNCTION IN main.py ---

def parse_graphviz_to_reactflow(dot_code):
    try:
        # Ask Graphviz for the full JSON data
        src = graphviz.Source(dot_code)
        src.engine = 'dot'
        json_str = src.pipe(format='json').decode('utf-8')
        layout_data = json.loads(json_str)
        
        nodes = []
        edges = []
        
        # 🧠 SHAPE MAPPING RULES
        # Graphviz Shape -> React Flow Type
        SHAPE_MAP = {
            "diamond": "diamond",
            "Mdiamond": "diamond",
            "triangle": "triangle",
            "box": "default", # Square/Rectangle
            "rect": "default",
            "rectangle": "default",
            "circle": "circle",
            "doublecircle": "circle",
            "oval": "circle",
            "ellipse": "circle",
            "cylinder": "database",
            "note": "default"
        }

        # 🖼️ ICON MAPPING (Keep your existing list)
        ICON_MAP = {
            "mysql": "mysql", "cassandra": "cassandra", "postgres": "postgres",
            "mongo": "mongo", "redis": "redis", "kafka": "kafka",
            "rabbit": "rabbitmq", "docker": "docker", "k8s": "kubernetes",
            "react": "react", "python": "python", "user": "user",
            "aws": "aws", "ec2": "server", "lb": "load-balancer"
        }

        # --- HELPER: Process a list of objects (Recursive for Clusters) ---
        def process_objects(obj_list, parent_id=None):
            for obj in obj_list:
                # 1. Handle Subgraphs (Clusters/Wrappers)
                if obj.get('name', '').startswith('cluster') or obj.get('name', '').startswith('subgraph'):
                    # Create a Group Node
                    bb = obj.get('bb', '0,0,0,0').split(',') # Bounding Box
                    width = float(bb[2]) - float(bb[0])
                    height = float(bb[3]) - float(bb[1])
                    # Graphviz BB is bottom-left based. We need center for React Flow logic usually, 
                    # but for groups, we often just need the container.
                    # Simplified: We treat clusters as transparent containers for now.
                    # Recursively process children
                    if 'subgraph' in obj: # Old graphviz versions
                        process_objects(obj['subgraph'], parent_id)
                    elif 'objects' in obj: # New graphviz versions
                        process_objects(obj['objects'], obj['name'])
                    continue

                if not obj.get('name') or obj.get('name').startswith('%'):
                    continue

                # 2. Position
                pos = obj.get('pos', '0,0').split(',')
                x = float(pos[0]) * 1.5
                y = -float(pos[1]) * 1.5
                
                # 3. Label Logic (Fix empty names)
                raw_label = obj.get('label', obj['name'])
                if raw_label == '\\N' or not raw_label.strip():
                    raw_label = obj['name']
                
                label = raw_label.replace('\\n', '\n')
                label_lower = label.lower()

                # 4. Determine Type
                node_type = "default" # Default is rectangle/square
                icon_name = None

                # Check Icons
                for keyword, icon_file in ICON_MAP.items():
                    if keyword in label_lower:
                        node_type = "imageNode"
                        icon_name = icon_file
                        break
                
                # Check Shapes if no icon
                if node_type == "default":
                    gv_shape = obj.get('shape', 'box')
                    if gv_shape in SHAPE_MAP:
                        node_type = SHAPE_MAP[gv_shape]
                    
                    # Override for specifics
                    if 'service' in label_lower and node_type == 'circle':
                        node_type = 'diamond' # You asked for Service = Diamond

                nodes.append({
                    "id": obj['name'],
                    "type": node_type,
                    "position": {"x": x, "y": y},
                    "data": { "label": label, "icon": icon_name },
                    "parentNode": parent_id # Connects to cluster if exists
                })

        # Start processing
        process_objects(layout_data.get('objects', []))

        # --- PROCESS EDGES ---
        # ... (Keep the rest of your function logic same) ...

        # --- PROCESS EDGES ---
        for edge in layout_data.get('edges', []):
            source_id = layout_data['objects'][edge['tail']]['name']
            target_id = layout_data['objects'][edge['head']]['name']
            
            # 1. Capture Line Style
            style = edge.get('style', 'solid')
            is_dashed = style == 'dashed' or style == 'dotted'

            # 2. Capture Label (Text on Arrow)
            # Graphviz might put it in 'label' or 'xlabel'
            edge_label = edge.get('label', '') or edge.get('xlabel', '')
            
            # Clean up label
            if edge_label:
                edge_label = edge_label.replace('\\n', '\n')

            edges.append({
                "id": f"e_{source_id}_{target_id}",
                "source": source_id,
                "target": target_id,
                "animated": True, 
                "label": edge_label, # 👈 THIS sends the text to React
                "type": "smoothstep",
                "style": {
                    "stroke": "#555", 
                    "strokeWidth": 2,
                    "strokeDasharray": "5,5" if is_dashed else "0"
                },
                "data": { "isDashed": is_dashed }
            })
            
        return {"nodes": nodes, "edges": edges}

    except Exception as e:
        print(f"Graphviz Error: {e}")
        return None



@app.post("/generate")
# --- UPDATE THIS FUNCTION IN main.py ---

@app.post("/generate")
async def generate_diagram(request: TopicRequest):
    topic = request.topic
    print(f"🚀 Generating Architecture for: {topic}")

    # 1. PROMPT
    prompt = f"""
    You are a System Design Architect. Create a High-Level Design (HLD) for "{topic}".
    
    CRITICAL OUTPUT RULES:
    1. Return ONLY valid Graphviz DOT code. No markdown, no explanations.
    2. Start exactly with 'strict digraph G {{'.
    3. Use '->' for connections (NOT '--').
    4. Use these specific shapes:
       - Database/Storage -> shape=cylinder
       - User/Client -> shape=circle
       - Service/App -> shape=diamond
    5. Styling:
       - If a connection is async (like Kafka), use style=dashed.
       - If a connection is standard, use style=solid.
    """

    try:
        # Switch back to 'gemini-pro' or 'gemini-1.5-flash' depending on what works for you
        model = genai.GenerativeModel('gemini-2.5-flash-lite') 
        response = model.generate_content(prompt)
        
        # 🧹 CLEANUP & SANITIZATION
        raw_dot = response.text.replace("```dot", "").replace("```", "").strip()
        
        # 🚑 AUTO-FIXER 2.0 (The Bulletproof Update)
        
        # 1. Remove the hallucinated "digraphviz" keyword
        if "digraphviz" in raw_dot:
            raw_dot = raw_dot.replace("digraphviz", "")

        # 2. Fix lines connecting with '--' instead of '->'
        if "--" in raw_dot:
            raw_dot = raw_dot.replace("--", "->")

        # 3. Ensure it starts correctly
        # Sometimes AI adds text before the graph, so we find the first '{' 
        # and wrap it properly if the header is messed up.
        first_brace_index = raw_dot.find("{")
        if first_brace_index != -1:
            # We explicitly force the header to be correct
            body = raw_dot[first_brace_index:]
            raw_dot = f"strict digraph G {body}"
        
        # Now parse it
        frontend_data = parse_graphviz_to_reactflow(raw_dot)
        
        if not frontend_data:
            raise HTTPException(status_code=500, detail="Failed to parse Graphviz output")

        return frontend_data

    except Exception as e:
        print(f"❌ Server Error: {e}")
        if 'raw_dot' in locals():
            print(f"--- BAD DOT CODE ---\n{raw_dot}\n--------------------")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    print("🦄 Server is starting on http://localhost:8000")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)