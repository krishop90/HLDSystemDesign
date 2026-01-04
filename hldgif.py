import graphviz
import imageio.v2 as imageio
import os
import io
import numpy as np
from PIL import Image

# 1. High-Clearance Infrastructure Definition
# We use a massive scale (x10) to ensure 'ortho' routing has enough lane width.
NODES = {
    'client':      {'label': 'Client\nBrowser', 'pos': '0,40!', 'shape': 'rect', 'fill': '#1A237E', 'color': '#5C6BC0'},
    'cdn':         {'label': 'CDN Edge\n(PoP)', 'pos': '10,40!', 'shape': 'hexagon', 'fill': '#311B92', 'color': '#7E57C2'},
    'waf':         {'label': 'Cloud\nWAF', 'pos': '20,40!', 'shape': 'pentagon', 'fill': '#004D40', 'color': '#26A69A'},
    'api_gw':      {'label': 'API Gateway\n(OIDC)', 'pos': '30,40!', 'shape': 'trapezium', 'fill': '#BF360C', 'color': '#FF7043'},
    'glb':         {'label': 'GLB\n(Anycast)', 'pos': '40,40!', 'shape': 'diamond', 'fill': '#1B5E20', 'color': '#66BB6A'},
    'resolver':    {'label': 'Recursive\nResolver', 'pos': '50,40!', 'shape': 'rect', 'fill': '#4A148C', 'color': '#AB47BC'},
    
    'root':        {'label': 'Root DNS (.)', 'pos': '60,55!', 'shape': 'component', 'fill': '#B71C1C', 'color': '#EF5350'},
    'tld':         {'label': 'TLD DNS (.com)', 'pos': '60,40!', 'shape': 'component', 'fill': '#B71C1C', 'color': '#EF5350'},
    'auth':        {'label': 'Auth DNS\n(Primary)', 'pos': '60,25!', 'shape': 'component', 'fill': '#B71C1C', 'color': '#EF5350'},
    
    'db_primary':  {'label': 'Zone DB\n(Reg A)', 'pos': '75,25!', 'shape': 'db', 'fill': '#212121', 'color': '#9E9E9E'},
    'db_replica':  {'label': 'Zone DB\n(Reg B)', 'pos': '75,10!', 'shape': 'db', 'fill': '#212121', 'color': '#9E9E9E'},
    
    'service_a':   {'label': 'Service A\n(Mesh)', 'pos': '0,25!', 'shape': 'rect', 'fill': '#37474F', 'color': '#90A4AE'},
    'service_b':   {'label': 'Service B\n(Mesh)', 'pos': '10,25!', 'shape': 'rect', 'fill': '#37474F', 'color': '#90A4AE'},
    
    'redis':       {'label': 'Redis Cluster', 'pos': '0,10!', 'shape': 'cylinder', 'fill': '#880E4F', 'color': '#EC407A'},
    'kafka':       {'label': 'Kafka Stream', 'pos': '10,10!', 'shape': 'cds', 'fill': '#263238', 'color': '#00B0FF'},
    'monitor':     {'label': 'Observability', 'pos': '30,25!', 'shape': 'note', 'fill': '#263238', 'color': '#90A4AE'}
}

FLOWS = [
    ('db_primary', 'db_replica', '1. Global DB Sync'),
    ('client', 'cdn', '2. User HTTPS Request'),
    ('cdn', 'waf', '3. Threat Filtering'),
    ('waf', 'api_gw', '4. API Ingress'),
    ('api_gw', 'api_gw', '5. OIDC Auth'),
    ('api_gw', 'glb', '6. DNS Ingress'),
    ('glb', 'resolver', '7. Forward Resolver'),
    ('resolver', 'root', '8. Query Root'),
    ('root', 'tld', '9. Refer TLD'),
    ('tld', 'auth', '10. Refer Auth'),
    ('auth', 'db_primary', '11. Shard Lookup'),
    ('db_primary', 'auth', '12. Record Found'),
    ('auth', 'resolver', '13. Auth Answer'),
    ('resolver', 'client', '14. IP Delivery'),
    ('client', 'service_a', '15. mTLS Conn'),
    ('service_a', 'service_b', '16. Service Mesh'),
    ('service_b', 'redis', '17. App Cache Hit'),
    ('redis', 'service_b', '18. Data Return'),
    ('service_b', 'service_a', '19. Mesh Response'),
    ('service_a', 'kafka', '20. Async Trace'),
    ('kafka', 'monitor', '21. Metric Consumption'),
    ('service_a', 'api_gw', '22. Proxy Handover'),
    ('api_gw', 'client', '23. Payload Delivery'),
    ('client', 'cdn', '24. Edge Caching'),
    ('cdn', 'client', '25. Finish (HIT)')
]

def generate_frame(active_index):
    dot = graphviz.Digraph(format='png', engine='neato')
    # esep and sep are set to small values to stop them from eating up routing space
    dot.attr(bgcolor='#121212', splines='ortho', esep='0.1', sep='0.1', overlap='false')
    
    dot.node('header', label='HLD OF DNS: ENTERPRISE SERVICE MESH PIPELINE', 
             pos='30,65!', shape='none', fontcolor='#FFFFFF', 
             fontname='Helvetica-Bold', fontsize='32')
    
    for node_id, attr in NODES.items():
        shape = 'cylinder' if attr['shape'] == 'db' else attr['shape']
        # Fixed small width/height to ensure they don't touch
        dot.node(
            node_id, label=attr['label'], shape=shape, 
            style='filled', fillcolor=attr['fill'], color=attr['color'], 
            fontcolor='#FFFFFF', pos=attr['pos'], width='1.8', height='1.0', 
            fontname='Helvetica-Bold', fontsize='10', penwidth='2'
        )

    for i, (src, dst, label) in enumerate(FLOWS):
        is_active = (i == active_index)
        edge_style = 'solid' if is_active else 'dashed'
        edge_color = '#00E5FF' if is_active else '#2A2A2A'
        pen_width = '5.0' if is_active else '1.0'
        font_color = '#00E5FF' if is_active else '#444444' 
        
        dot.edge(
            src, dst, xlabel=f"  {label}  ", 
            color=edge_color, penwidth=pen_width, 
            style=edge_style, fontcolor=font_color, 
            fontname='Helvetica-Bold' if is_active else 'Helvetica', fontsize='11'
        )
    
    return dot.pipe()

def main():
    frames = []
    temp_images = []
    max_w, max_h = 0, 0

    print("Generating High-Clearance Ortho HLD...")
    for i in range(len(FLOWS)):
        img_data = generate_frame(i)
        img = Image.open(io.BytesIO(img_data)).convert('RGBA')
        temp_images.append(img)
        max_w, max_h = max(max_w, img.width), max(max_h, img.height)

    for img in temp_images:
        final_frame = Image.new('RGBA', (max_w, max_h), (18, 18, 18, 255))
        final_frame.paste(img, ((max_w - img.width) // 2, (max_h - img.height) // 2), img)
        frames.append(np.array(final_frame.convert('RGB')))

    output_path = "dns_hld_flow.gif"
    imageio.mimsave(output_path, frames, fps=1.2, loop=0)
    print(f"Workflow Complete. Advanced HLD saved as: {output_path}")

if __name__ == "__main__":
    main()
