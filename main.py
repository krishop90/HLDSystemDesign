import warnings
# Silence specific warnings
warnings.filterwarnings("ignore", category=RuntimeWarning, module="duckduckgo_search")

print("⏳ Importing libraries...")
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import google.generativeai as genai
import graphviz
import json
import requests
from bs4 import BeautifulSoup
import time
import random
import re

# Try importing the robust search library
try:
    from duckduckgo_search import DDGS
except ImportError:
    print("❌ duckduckgo_search not installed. Run: pip install duckduckgo-search requests beautifulsoup4")
    DDGS = None

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TopicRequest(BaseModel):
    topic: str

# --- 🔍 ROBUST SCRAPING ENGINE ---
def get_search_results(query):
    """
    Tries 2 methods to get search results.
    """
    urls = []
    
    # METHOD 1: Library
    if DDGS:
        try:
            print("Trying Search Method 1 (Library)...")
            results = DDGS().text(query, max_results=5)
            if results:
                for r in results:
                    urls.append(r['href'])
                print(f"✅ Found {len(urls)} URLs via Library.")
                return urls
        except Exception as e:
            print(f"⚠️ Method 1 failed: {e}")

    # METHOD 2: Direct HTML Fallback
    print("Trying Search Method 2 (Direct HTML)...")
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        resp = requests.post(
            "https://html.duckduckgo.com/html/",
            data={'q': query},
            headers=headers,
            timeout=10
        )
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, 'html.parser')
            for link in soup.find_all('a', class_='result__a'):
                href = link.get('href')
                if href and 'http' in href:
                    urls.append(href)
                if len(urls) >= 5: break
            
            if urls:
                print(f"✅ Found {len(urls)} URLs via Direct HTML.")
                return urls
    except Exception as e:
        print(f"⚠️ Method 2 failed: {e}")

    return urls

def scrape_system_design_data(topic):
    print(f"🕵️ Searching web for: {topic} system design...")
    
    # 🎯 GENERIC QUERY to get better results
    # We remove "High Level Design" from search sometimes to get broader results
    query = f"{topic} system design architecture"
    
    urls = get_search_results(query)

    if not urls:
        print("❌ CRITICAL: No URLs found via any method.")
        return None

    best_content = ""
    
    for url in urls:
        try:
            print(f"📄 Scraping: {url}")
            headers = {'User-Agent': 'Mozilla/5.0'}
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                content_div = soup.find('article') or soup.find('div', class_='article-content') or soup.find('main')
                target = content_div if content_div else soup
                
                paragraphs = target.find_all(['p', 'li', 'h1', 'h2', 'h3'])
                text_content = "\n".join([t.get_text().strip() for t in paragraphs if len(t.get_text()) > 30])
                
                # ⚡️ RELAXED CHECK: Just checking if we got ANY text (> 200 chars)
                if len(text_content) > 200:
                    best_content = text_content[:15000] # Increased limit for AI
                    print(f"🏆 Found content ({len(best_content)} chars). Using this!")
                    return best_content 
                else:
                    print("⏩ Skipping: Content too short.")
                    
        except Exception as e:
            print(f"⚠️ Failed to scrape {url}: {e}")
            continue
            
    return None 

# --- GRAPHVIZ PARSER ---
def parse_graphviz_to_reactflow(dot_code):
    try:
        src = graphviz.Source(dot_code)
        src.engine = 'dot'
        json_str = src.pipe(format='json').decode('utf-8')
        layout_data = json.loads(json_str)
        
        nodes = []
        edges = []
        
        SHAPE_MAP = {
            "diamond": "diamond", "Mdiamond": "diamond", "triangle": "triangle",
            "box": "default", "rect": "default", "rectangle": "default",
            "circle": "circle", "doublecircle": "circle", "oval": "circle",
            "ellipse": "circle", "cylinder": "database", "note": "default"
        }

        ICON_MAP = {
            "mysql": "mysql", "cassandra": "cassandra", "postgres": "postgres",
            "mongo": "mongo", "redis": "redis", "kafka": "kafka",
            "rabbit": "rabbitmq", "docker": "docker", "k8s": "kubernetes",
            "react": "react", "python": "python", "user": "user",
            "aws": "aws", "ec2": "server", "lb": "load-balancer"
        }

        def process_objects(obj_list, parent_id=None):
            for obj in obj_list:
                if obj.get('name', '').startswith('cluster') or obj.get('name', '').startswith('subgraph'):
                    if 'objects' in obj: process_objects(obj['objects'], obj['name'])
                    continue

                if not obj.get('name') or obj.get('name').startswith('%'): continue

                pos = obj.get('pos', '0,0').split(',')
                x = float(pos[0]) * 1.5
                y = -float(pos[1]) * 1.5
                
                raw_label = obj.get('label', obj['name'])
                if raw_label == '\\N' or not raw_label.strip(): raw_label = obj['name']
                
                label = raw_label.replace('\\n', '\n')
                label_lower = label.lower()

                node_type = "default"
                icon_name = None

                for keyword, icon_file in ICON_MAP.items():
                    if keyword in label_lower:
                        node_type = "imageNode"
                        icon_name = icon_file
                        break
                
                if node_type == "default":
                    gv_shape = obj.get('shape', 'box')
                    if gv_shape in SHAPE_MAP: node_type = SHAPE_MAP[gv_shape]
                    if 'service' in label_lower and node_type == 'circle': node_type = 'diamond'

                nodes.append({
                    "id": obj['name'],
                    "type": node_type,
                    "position": {"x": x, "y": y},
                    "data": { "label": label, "icon": icon_name },
                    "parentNode": parent_id
                })

        process_objects(layout_data.get('objects', []))

        for edge in layout_data.get('edges', []):
            source_id = layout_data['objects'][edge['tail']]['name']
            target_id = layout_data['objects'][edge['head']]['name']
            style = edge.get('style', 'solid')
            is_dashed = style == 'dashed' or style == 'dotted'
            edge_label = edge.get('label', '') or edge.get('xlabel', '')
            if edge_label: edge_label = edge_label.replace('\\n', '\n')

            edges.append({
                "id": f"e_{source_id}_{target_id}",
                "source": source_id,
                "target": target_id,
                "animated": True, 
                "label": edge_label,
                "type": "smoothstep",
                "style": { "stroke": "#555", "strokeWidth": 2, "strokeDasharray": "5,5" if is_dashed else "0" },
                "data": { "isDashed": is_dashed }
            })
            
        return {"nodes": nodes, "edges": edges}

    except Exception as e:
        print(f"Graphviz Error: {e}")
        return None

# --- MAIN GENERATION ENDPOINT ---
@app.post("/generate")
async def generate_diagram(request: TopicRequest):
    topic = request.topic
    print(f"🚀 Processing request for: {topic}")

    # 1. SCRAPING (Relaxed)
    context_data = scrape_system_design_data(topic)
    
    if not context_data:
        print("❌ Scraping failed to find GOOD data, but we will ask Gemini to fallback to its own knowledge.")
        context_data = f"The user wants a system design for {topic}. Please generate it based on your own knowledge."

    print("📝 Generating diagram with available context...")
    
    # 2. CONSTRUCT PROMPT
    prompt = f"""
    You are a Software Architect.
    
    Request: Create a High-Level System Design for "{topic}".
    
    Context from Web (Use if helpful, otherwise rely on general knowledge):
    {context_data[:5000]} 
    
    INSTRUCTIONS:
    Create a Graphviz DOT diagram.
    """

    # Constraints
    prompt += """
    CRITICAL OUTPUT RULES:
    1. Return ONLY valid Graphviz DOT code. No markdown, no explanations.
    2. Start exactly with 'strict digraph G {'.
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
        # 3. CALL AI
        model = genai.GenerativeModel('gemini-2.5-flash-lite') 
        response = model.generate_content(prompt)
        
        # 4. CLEANUP
        raw_dot = response.text.replace("```dot", "").replace("```", "").strip()
        
        if "digraphviz" in raw_dot: raw_dot = raw_dot.replace("digraphviz", "")
        if "--" in raw_dot: raw_dot = raw_dot.replace("--", "->")
        first_brace_index = raw_dot.find("{")
        if first_brace_index != -1:
            body = raw_dot[first_brace_index:]
            raw_dot = f"strict digraph G {body}"
        
        # 5. PARSE
        frontend_data = parse_graphviz_to_reactflow(raw_dot)
        
        if not frontend_data:
            raise HTTPException(status_code=500, detail="Failed to parse Graphviz output")

        return frontend_data

    except Exception as e:
        print(f"❌ Server Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    print("🦄 Server is starting on http://localhost:8000")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)