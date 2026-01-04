import graphviz
import imageio.v2 as imageio
import io
import os
import numpy as np
from PIL import Image

# 1. System Config
Image.MAX_IMAGE_PIXELS = 100_000_000 

# 2. Uber Infrastructure Definition
# Layers: Frontend (40), Gateway (30), Core Logic (20), Data/Event (0)
NODES = {
    'rider':     {'label': 'Rider App\n(Mobile)', 'pos': '0,40!', 'shape': 'iphone', 'fill': '#000000'},
    'driver':    {'label': 'Driver App\n(Mobile)', 'pos': '30,40!', 'shape': 'iphone', 'fill': '#000000'},
    
    'api_gw':    {'label': 'API Gateway\n(Envoy)', 'pos': '15,30!', 'shape': 'trapezium', 'fill': '#263238'},
    'ws_gw':     {'label': 'WebSocket GW\n(Push)', 'pos': '25,30!', 'shape': 'hexagon', 'fill': '#1A237E'},
    
    'demand':    {'label': 'Demand Srv\n(Matching)', 'pos': '0,20!', 'shape': 'rect', 'fill': '#0D47A1'},
    'supply':    {'label': 'Supply Srv\n(Tracking)', 'pos': '10,20!', 'shape': 'rect', 'fill': '#1B5E20'},
    'geospatial':{'label': 'H3 Index\n(Geo-Sharding)', 'pos': '20,20!', 'shape': 'diamond', 'fill': '#4A148C'},
    'payments':  {'label': 'Payment Srv\n(Stripe/Braintree)', 'pos': '30,20!', 'shape': 'rect', 'fill': '#B71C1C'},
    
    'kafka':     {'label': 'Kafka Cluster\n(Event Stream)', 'pos': '15,5!', 'shape': 'cds', 'fill': '#BF360C'},
    'redis':     {'label': 'Redis\n(Driver Locations)', 'pos': '5,5!', 'shape': 'cylinder', 'fill': '#880E4F'},
    'cassandra': {'label': 'Cassandra\n(Trip History)', 'pos': '25,5!', 'shape': 'cylinder', 'fill': '#212121'}
}

FLOWS = [
    ('driver', 'ws_gw', '1. GPS Update (WS)'),
    ('ws_gw', 'redis', '2. Update Location'),
    ('rider', 'api_gw', '3. Request Ride'),
    ('api_gw', 'demand', '4. Initiate Trip'),
    ('demand', 'geospatial', '5. Query Nearby Drivers'),
    ('geospatial', 'redis', '6. Fetch Geo-IDs'),
    ('demand', 'ws_gw', '7. Notify Best Driver'),
    ('ws_gw', 'driver', '8. Dispatch Offer'),
    ('driver', 'ws_gw', '9. Accept Trip'),
    ('ws_gw', 'demand', '10. Confirm Match'),
    ('demand', 'ws_gw', '11. Notify Rider'),
    ('ws_gw', 'rider', '12. Driver Arriving'),
    ('demand', 'kafka', '13. Trip Started Event'),
    ('kafka', 'cassandra', '14. Persistence'),
    ('payments', 'api_gw', '15. Authorize Hold'),
    ('rider', 'driver', '16. Real-time mTLS sync')
]

def generate_frame(active_index):
    dot = graphviz.Digraph(format='png', engine='neato')
    dot.attr(bgcolor='#121212', splines='polyline', overlap='false', dpi='72')
    
    # Title
    dot.node('header', label='UBER HLD: SYSTEM DISPATCH & MATCHING FLOW', 
             pos='15,47!', shape='none', fontcolor='#FFFFFF', 
             fontname='Helvetica-Bold', fontsize='30')
    
    for node_id, attr in NODES.items():
        # Mapping custom shape names to graphviz
        shape = 'rect' if attr['shape'] == 'iphone' else attr['shape']
        dot.node(node_id, label=attr['label'], shape=shape, 
                 style='filled,bold', fillcolor=attr['fill'], color='#FFFFFF', 
                 fontcolor='#FFFFFF', pos=attr['pos'], width='2.2', height='1.2', 
                 fontname='Helvetica-Bold', fontsize='10', penwidth='2')

    for i, (src, dst, label) in enumerate(FLOWS):
        is_active = (i == active_index)
        color = '#00E5FF' if is_active else '#2D2D2D'
        width = '6.0' if is_active else '1.5'
        f_color = '#00E5FF' if is_active else '#546E7A'
        
        dot.edge(src, dst, xlabel=f" {label} ", style='dashed', color=color, 
                 penwidth=width, fontcolor=f_color, fontname='Helvetica-Bold', fontsize='10')
    
    return dot.pipe()

def main():
    output_path = "uber_hld_advanced.gif"
    print("--- Starting Uber HLD Generation (Memory Safe) ---")
    
    with imageio.get_writer(output_path, mode='I', fps=1.0) as writer:
        for i in range(len(FLOWS)):
            print(f"Processing Step {i+1}/{len(FLOWS)}...")
            img_data = generate_frame(i)
            with Image.open(io.BytesIO(img_data)) as img:
                rgb_img = img.convert('RGB')
                writer.append_data(np.array(rgb_img))
                
    print(f"\nSuccess! Uber HLD saved as: {output_path}")

if __name__ == "__main__":
    main()
