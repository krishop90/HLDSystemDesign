from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import google.generativeai as genai
import graphviz
import json

load_dotenv()
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

def parse_graphviz_to_reactflow(dot_code):
    try:
        src = graphviz.Source(dot_code)
        src.engine = 'dot'
        
        json_str = src.pipe(format='json').decode('utf-8')
        layout_data = json.loads(json_str)
        
        nodes = []
        edges = []
        
        SHAPE_RULES = {
            "user": "circle",
            "actor": "circle",
            "client": "circle",
            "load balancer": "circle",
            "ec2": "circle",        
            "gateway": "circle",
            
            "database": "database",
            "db": "database",
            "store": "database",
            "cache": "database",
            "redis": "database",
            "s3": "database",
            "bucket": "database",
            "queue": "default",     
            "kafka": "default",
            "service": "default"
        }

        for obj in layout_data.get('objects', []):
            if not obj.get('name') or obj.get('name').startswith('%'):
                continue
            
            pos = obj.get('pos', '0,0').split(',')
            x = float(pos[0]) * 1.5
            y = -float(pos[1]) * 1.5
            
            raw_label = obj.get('label', obj['name'])
            label = raw_label.replace('\\n', '\n') 
            label_lower = label.lower()

            node_type = 'default' 
            
            gv_shape = obj.get('shape', '')
            if gv_shape == 'cylinder': node_type = 'database'
            elif gv_shape in ['circle', 'oval', 'ellipse']: node_type = 'circle'
            
            for keyword, shape_type in SHAPE_RULES.items():
                if keyword in label_lower:
                    node_type = shape_type
                    break

            nodes.append({
                "id": obj['name'],
                "type": node_type, 
                "position": {"x": x, "y": y},
                "data": { "label": label }
            })

        for edge in layout_data.get('edges', []):
            source_id = layout_data['objects'][edge['tail']]['name']
            target_id = layout_data['objects'][edge['head']]['name']
            
            edges.append({
                "id": f"e_{source_id}_{target_id}",
                "source": source_id,
                "target": target_id,
                "animated": True
            })
            
        return {"nodes": nodes, "edges": edges}

    except Exception as e:
        print(f"Graphviz Error: {e}")
        return None

@app.post("/generate")
async def generate_diagram(request: TopicRequest):
    topic = request.topic
    print(f"Generating Architecture for: {topic}")

    prompt = f"""
    You are a System Design Expert.
    Create a High-Level Design (HLD) for: "{topic}".
    
    OUTPUT FORMAT:
    Return ONLY valid Graphviz DOT code. 
    - Use strict digraph.
    - Nodes should have clear labels (e.g. "Load Balancer", "Database").
    - Use shapes: box for services, cylinder for databases.
    - Keep it simple: No clusters or subgraphs yet.
    """

    try:
        model = genai.GenerativeModel('gemini-2.5-flash-lite')
        response = model.generate_content(prompt)
        dot_code = response.text.replace("```dot", "").replace("```", "").strip()
        
        frontend_data = parse_graphviz_to_reactflow(dot_code)
        
        if not frontend_data:
            raise HTTPException(status_code=500, detail="Failed to generate layout")

        return frontend_data

    except Exception as e:
        print(f"Server Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)