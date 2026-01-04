import graphviz
import imageio.v2 as imageio
import io
import os
import numpy as np
from PIL import Image

# 1. System Config
Image.MAX_IMAGE_PIXELS = 100_000_000 

# 2. Uber LLD Infrastructure Definition
# Layers: Frontend Logic (40), Services/Patterns (20), Persistence/Storage (0)
NODES = {
    'rider_loc': {'label': 'RiderLocation\n(Lat/Long Object)', 'pos': '0,40!', 'shape': 'rect', 'fill': '#1A237E'},
    'driver_loc':{'label': 'DriverLocation\n(Lat/Long Object)', 'pos': '30,40!', 'shape': 'rect', 'fill': '#1B5E20'},
    
    'ws_session':{'label': 'WSSessionManager\n(Observer Pattern)', 'pos': '15,30!', 'shape': 'hexagon', 'fill': '#263238'},
    
    'match_eng': {'label': 'MatchEngine\n(Strategy Pattern)', 'pos': '0,20!', 'shape': 'diamond', 'fill': '#0D47A1'},
    'trip_mgr':  {'label': 'TripManager\n(State Machine)', 'pos': '10,20!', 'shape': 'rect', 'fill': '#4A148C'},
    'geo_shard': {'label': 'SpatialIndex\n(H3Hexagon Logic)', 'pos': '20,20!', 'shape': 'parallelogram', 'fill': '#004D40'},
    'ledger':    {'label': 'PaymentGateway\n(Command Pattern)', 'pos': '30,20!', 'shape': 'rect', 'fill': '#B71C1C'},
    
    'redis_geo': {'label': 'RedisGeo\n(ZSET / GeoHash)', 'pos': '5,5!', 'shape': 'cylinder', 'fill': '#880E4F'},
    'kafka_log': {'label': 'KafkaEventBus\n(Producer/Consumer)', 'pos': '15,5!', 'shape': 'cds', 'fill': '#BF360C'},
    'db_trip':   {'label': 'CassandraStorage\n(Trip Schema)', 'pos': '25,5!', 'shape': 'cylinder', 'fill': '#212121'}
}

FLOWS = [
    ('driver_loc', 'ws_session', '1. LocationStream(ID, Lat, Lng)'),
    ('ws_session', 'redis_geo', '2. GEOADD(DriverSet, Lng, Lat, ID)'),
    ('rider_loc', 'match_eng', '3. requestRide(User, PickUp, Drop)'),
    ('match_eng', 'geo_shard', '4. getNearbyCells(H3Index)'),
    ('geo_shard', 'redis_geo', '5. GEORADIUS(PickUp, 5km)'),
    ('redis_geo', 'match_eng', '6. return CandidateList[]'),
    ('match_eng', 'match_eng', '7. executeStrategy(FastestArrival)'),
    ('match_eng', 'trip_mgr', '8. createTrip(TripID, Rider, Driver)'),
    ('trip_mgr', 'ws_session', '9. pushMatchNotification()'),
    ('ws_session', 'driver_loc', '10. notifyDriver(Accept/Decline)'),
    ('trip_mgr', 'trip_mgr', '11. updateState(EN_ROUTE)'),
    ('trip_mgr', 'kafka_log', '12. publishTripStarted()'),
    ('kafka_log', 'db_trip', '13. persistInitialSnapshot()'),
    ('trip_mgr', 'ledger', '14. authorizePayment(Amount)'),
    ('ledger', 'trip_mgr', '15. paymentStatus(SUCCESS)')
]

def generate_frame(active_index):
    dot = graphviz.Digraph(format='png', engine='neato')
    dot.attr(bgcolor='#121212', splines='polyline', overlap='false', dpi='72')
    
    dot.node('header', label='UBER LLD: COMPONENT LOGIC & DESIGN PATTERNS', 
             pos='15,48!', shape='none', fontcolor='#FFFFFF', 
             fontname='Helvetica-Bold', fontsize='28')
    
    for node_id, attr in NODES.items():
        dot.node(node_id, label=attr['label'], shape=attr['shape'], 
                 style='filled,bold', fillcolor=attr['fill'], color='#FFFFFF', 
                 fontcolor='#FFFFFF', pos=attr['pos'], width='2.4', height='1.3', 
                 fontname='Helvetica-Bold', fontsize='10', penwidth='2')

    for i, (src, dst, label) in enumerate(FLOWS):
        is_active = (i == active_index)
        color = '#00E5FF' if is_active else '#333333'
        width = '7.0' if is_active else '1.5'
        f_color = '#00E5FF' if is_active else '#607D8B'
        
        dot.edge(src, dst, xlabel=f" {label} ", style='dashed', color=color, 
                 penwidth=width, fontcolor=f_color, fontname='Helvetica-Bold', fontsize='10')
    
    return dot.pipe()

def main():
    output_path = "uber_lld_advanced.gif"
    print("--- Starting Uber LLD Generation (Streaming Mode) ---")
    
    with imageio.get_writer(output_path, mode='I', fps=1.0) as writer:
        for i in range(len(FLOWS)):
            print(f"Rendering step {i+1}/{len(FLOWS)}...")
            img_data = generate_frame(i)
            with Image.open(io.BytesIO(img_data)) as img:
                rgb_img = img.convert('RGB')
                writer.append_data(np.array(rgb_img))
                
    print(f"\nSuccess! Uber LLD saved as: {output_path}")

if __name__ == "__main__":
    main()
