#!/usr/bin/env python3
"""
Preprocess LILA BLACK parquet data into optimized JSON for the web frontend.
Outputs: public/data/{day}/{map_id}.json
"""
import pyarrow.parquet as pq
import json
import os
import re
from collections import defaultdict
from datetime import datetime

BASE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE, "player_data")
OUT_DIR = os.path.join(BASE, "public", "data")

DAYS = ["February_10", "February_11", "February_12", "February_13", "February_14"]

def is_bot(user_id):
    """Bots have short numeric IDs, humans have UUIDs."""
    return not bool(re.match(r'^[0-9a-f]{8}-', user_id))

def ts_to_seconds(ts):
    """Convert timestamp to real game seconds.

    In the parquet data, 1 stored millisecond = 1 real second of game time.
    So we convert to total milliseconds from epoch to get real seconds.
    """
    if ts is None:
        return 0
    epoch = datetime(1970, 1, 1)
    delta = ts - epoch
    # Each millisecond in stored data = 1 real second
    return round(delta.total_seconds() * 1000)

def process_day(day_folder, day_name):
    """Process all files in a day folder, grouped by map_id."""
    folder_path = os.path.join(DATA_DIR, day_folder)
    if not os.path.exists(folder_path):
        print(f"  Skipping {day_folder} (not found)")
        return {}

    # Group by map_id -> match_id -> list of events
    maps = defaultdict(lambda: defaultdict(list))
    
    files = [f for f in os.listdir(folder_path) if not f.startswith('.')]
    print(f"  Processing {len(files)} files from {day_folder}...")
    
    for fname in files:
        fpath = os.path.join(folder_path, fname)
        try:
            table = pq.read_table(fpath)
        except Exception as e:
            print(f"    Error reading {fname}: {e}")
            continue
        
        n = table.num_rows
        if n == 0:
            continue
            
        # Extract columns
        user_ids = table.column('user_id')
        match_ids = table.column('match_id')
        map_ids = table.column('map_id')
        xs = table.column('x')
        zs = table.column('z')
        tss = table.column('ts')
        events = table.column('event')
        
        map_id = map_ids[0].as_py()
        match_id = match_ids[0].as_py()
        user_id = user_ids[0].as_py()
        bot = is_bot(user_id)
        
        for i in range(n):
            evt_raw = events[i].as_py()
            if isinstance(evt_raw, bytes):
                evt = evt_raw.decode('utf-8')
            else:
                evt = str(evt_raw)
            
            maps[map_id][match_id].append({
                'x': round(xs[i].as_py(), 1),
                'z': round(zs[i].as_py(), 1),
                't': ts_to_seconds(tss[i].as_py()),
                'e': evt,
                'u': user_id,
                'b': 1 if bot else 0,
            })
    
    return maps

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    
    # Also build a summary index
    index = {}
    
    for day in DAYS:
        print(f"\n=== {day} ===")
        day_out = os.path.join(OUT_DIR, day)
        os.makedirs(day_out, exist_ok=True)
        
        maps = process_day(day, day)
        
        day_summary = {}
        for map_id, matches in maps.items():
            # Sort events within each match by timestamp
            # and make timestamps match-relative (start from 0)
            for mid in matches:
                matches[mid].sort(key=lambda e: e['t'])
                if matches[mid]:
                    t_min = matches[mid][0]['t']
                    for e in matches[mid]:
                        e['t'] = e['t'] - t_min
            
            # Build match summaries
            match_summaries = {}
            for mid, events in matches.items():
                humans = set()
                bots = set()
                event_counts = defaultdict(int)
                for e in events:
                    if e['b']:
                        bots.add(e['u'])
                    else:
                        humans.add(e['u'])
                    event_counts[e['e']] += 1
                
                match_summaries[mid] = {
                    'humans': len(humans),
                    'bots': len(bots),
                    'events': dict(event_counts),
                    'total': len(events),
                }
            
            data = {
                'matches': {mid: evts for mid, evts in matches.items()},
            }
            
            out_path = os.path.join(day_out, f"{map_id}.json")
            with open(out_path, 'w') as f:
                json.dump(data, f, separators=(',', ':'))
            
            size_mb = os.path.getsize(out_path) / (1024 * 1024)
            print(f"  {map_id}: {len(matches)} matches, {sum(len(v) for v in matches.values())} events -> {size_mb:.1f} MB")
            
            day_summary[map_id] = {
                'matchCount': len(matches),
                'matches': match_summaries,
            }
        
        index[day] = day_summary
    
    # Write index file
    index_path = os.path.join(OUT_DIR, "index.json")
    with open(index_path, 'w') as f:
        json.dump(index, f, indent=2)
    print(f"\nIndex written to {index_path}")
    print("Done!")

if __name__ == '__main__':
    main()
